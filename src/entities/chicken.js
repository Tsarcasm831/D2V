import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class Chicken {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = false;
        this.isDead = false;
        this.type = 'chicken';

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const levelCenter = (shard && shard.worldManager && shard.worldManager.levelCenter) ? shard.worldManager.levelCenter : new THREE.Vector3(0, 0, 0);
        const dist = pos.distanceTo(levelCenter);
        this.level = Math.floor(Math.min(100, 1 + (dist / 100)));

        this.setupMesh();

        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 2;
        this.state = 'idle'; // idle, wander, flee
        this.moveSpeed = 3.0 * SCALE_FACTOR;
        this.fleeSpeed = 9 * SCALE_FACTOR;
        
        this.maxHealth = 1;
        this.health = this.maxHealth;

        this._tempVec1 = new THREE.Vector3();
    }

    setupMesh() {
        const featherMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xffa500 }); // Orange
        const combMat = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
        const legMat = new THREE.MeshStandardMaterial({ color: 0xffa500 }); // Orange

        // Body (Small and round-ish)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), featherMat);
        body.position.y = 0.3 * SCALE_FACTOR;
        body.castShadow = true;
        this.group.add(body);

        // Head
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.5 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
        this.group.add(this.headGroup);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.2).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), featherMat);
        this.headGroup.add(head);

        // Beak
        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.15).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), beakMat);
        beak.position.z = 0.15 * SCALE_FACTOR;
        beak.position.y = -0.02 * SCALE_FACTOR;
        this.headGroup.add(beak);

        // Comb
        const comb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.15).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), combMat);
        comb.position.y = 0.15 * SCALE_FACTOR;
        this.headGroup.add(comb);

        // Legs (Just two)
        const legGeo = new THREE.BoxGeometry(0.05, 0.2, 0.05).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.legs = [];
        const legPositions = [{ x: 0.08, z: 0 }, { x: -0.08, z: 0 }];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos.x * SCALE_FACTOR, 0.1 * SCALE_FACTOR, pos.z * SCALE_FACTOR);
            leg.castShadow = true;
            this.group.add(leg);
            this.legs.push(leg);
        });

        // Wings
        const wingGeo = new THREE.BoxGeometry(0.05, 0.2, 0.3).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.lWing = new THREE.Mesh(wingGeo, featherMat);
        this.lWing.position.set(0.18 * SCALE_FACTOR, 0.35 * SCALE_FACTOR, 0);
        this.group.add(this.lWing);

        this.rWing = new THREE.Mesh(wingGeo, featherMat);
        this.rWing.position.set(-0.18 * SCALE_FACTOR, 0.35 * SCALE_FACTOR, 0);
        this.group.add(this.rWing);

        this.mesh = body;
        this.addLevelLabel();
    }

    addLevelLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#ffffcc';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv. ${this.level} CHICKEN`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 1.0 * SCALE_FACTOR;
        this.label.scale.set(1.5, 0.4, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;
        if (this.health > 0) {
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('chicken_distressed', 0.5);
            });
        }
        if (this.health <= 0) {
            this.die(fromPos, player);
        }
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        
        const dir = this._tempVec1.subVectors(this.group.position, fromPos).normalize();
        this.velocity.set(dir.x * 12, 15, dir.z * 12);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('chicken_short', 0.55);
        });

        if (player && player.inventory) {
            const meatCount = 1;
            player.inventory.addItem({ 
                type: 'meat', 
                name: 'Raw Meat', 
                icon: 'assets/icons/meat_icon.png', 
                count: meatCount,
                stackLimit: 99
            });
        }
    }

    checkCollisions(player) {
        if (!this.shard || this.isDead) return;
        const myPos = this.group.position;

        // Performance: skip collision check if player is far
        if (player && player.mesh) {
            const distSqToPlayer = myPos.distanceToSquared(player.mesh.position);
            if (distSqToPlayer > 2500) return; // Skip if > 50m
        }

        const myRadius = 0.25 * SCALE_FACTOR;

        const resources = this.shard.resources;
        for (const res of resources) {
            if (res.isDead) continue;
            const resPos = res.group.position;
            const dx = myPos.x - resPos.x;
            const dz = myPos.z - resPos.z;
            const distSq = dx * dx + dz * dz;
            let resRadius = (res.radius || (res.type === 'tree' ? 0.5 : 1.2)) * SCALE_FACTOR;
            const minDist = myRadius + resRadius;
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist);
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        if (player && player.mesh) {
            const pPos = player.mesh.position;
            const dx = myPos.x - pPos.x;
            const dz = myPos.z - pPos.z;
            const distSq = dx * dx + dz * dz;
            const pRadius = 0.5 * SCALE_FACTOR;
            const minDist = myRadius + pRadius;
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) return;
                const overlap = (minDist - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }
    }

    update(delta, player) {
        if (this.isDead) {
            const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
            if (this.group.position.y > floorY || this.velocity.y > 0) {
                this.group.position.addScaledVector(this.velocity, delta);
                this.velocity.y -= 30 * delta;
                this.group.rotation.x += 15 * delta;
                if (this.group.position.y < floorY) {
                    this.group.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.group.rotation.x = Math.PI / 2;
                }
            }
            return;
        }

        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;
        const detectRange = 6 * SCALE_FACTOR;

        if (distToPlayer < detectRange) {
            this.state = 'flee';
        } else if (this.state === 'flee') {
            this.state = 'idle';
            this.timer = 2.0;
        }

        this.timer -= delta;
        const t = performance.now() * 0.01;

        if (this.state === 'flee') {
            const fleeDir = this._tempVec1.subVectors(this.group.position, player.mesh.position).normalize();
            const targetRot = Math.atan2(fleeDir.x, fleeDir.z);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 10 * delta);
            this.group.position.addScaledVector(fleeDir, this.fleeSpeed * delta);
            
            // Flap wings when fleeing
            this.lWing.rotation.z = Math.sin(t * 10) * 0.8;
            this.rWing.rotation.z = -Math.sin(t * 10) * 0.8;
            this.animateLegs(t * 3.0);
        } else {
            if (this.timer <= 0) {
                if (this.state === 'idle') {
                    this.state = 'wander';
                    this.timer = 2 + Math.random() * 3;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                } else {
                    this.state = 'idle';
                    this.timer = 1 + Math.random() * 2;
                }
            }

            if (this.state === 'wander') {
                const moveVec = this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
                this.group.position.addScaledVector(moveVec, this.moveSpeed * delta);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 6 * delta);
                this.animateLegs(t * 1.5);
                this.headGroup.rotation.x = Math.sin(t * 5) * 0.2; // Pecking/bobbing head
            } else {
                this.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 5 * delta));
                this.lWing.rotation.z = THREE.MathUtils.lerp(this.lWing.rotation.z, 0, 5 * delta);
                this.rWing.rotation.z = THREE.MathUtils.lerp(this.rWing.rotation.z, 0, 5 * delta);
                if (Math.random() < 0.01) this.headGroup.rotation.x = 0.5; // Occasional peck
                else this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0, 5 * delta);
            }
        }

        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = floorY;
        this.checkCollisions(player);
    }

    animateLegs(time) {
        this.legs.forEach((leg, i) => {
            const phase = (i === 0) ? 0 : Math.PI;
            leg.rotation.x = Math.sin(time + phase) * 0.6;
        });
    }
}
