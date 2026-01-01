import * as THREE from 'three';
import { SCALE_FACTOR } from './world_bounds.js';

export class Sheep {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = false;
        this.isDead = false;
        this.type = 'sheep';

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const dist = pos.length();
        this.level = Math.floor(Math.min(100, 1 + (dist / 100)));

        this.setupMesh();

        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 2;
        this.state = 'idle'; // idle, wander, flee
        this.moveSpeed = 2.2 * SCALE_FACTOR;
        this.fleeSpeed = 7 * SCALE_FACTOR;
        
        this.maxHealth = 2;
        this.health = this.maxHealth;

        this._tempVec1 = new THREE.Vector3();
    }

    setupMesh() {
        const woolMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee }); // White wool
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Black face/legs
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        // Body (Fluffy wool)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), woolMat);
        body.position.y = 0.45 * SCALE_FACTOR;
        body.castShadow = true;
        this.group.add(body);

        // Head
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.6 * SCALE_FACTOR, 0.55 * SCALE_FACTOR);
        this.group.add(this.headGroup);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.45).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), skinMat);
        this.headGroup.add(head);

        // Wool on head
        const headWool = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.3).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), woolMat);
        headWool.position.y = 0.15 * SCALE_FACTOR;
        headWool.position.z = -0.05 * SCALE_FACTOR;
        this.headGroup.add(headWool);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.02, 0.06).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(0.16 * SCALE_FACTOR, 0.05 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
        this.headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(-0.16 * SCALE_FACTOR, 0.05 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
        this.headGroup.add(rEye);

        // Legs (Thin compared to body)
        const legGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.legs = [];
        const legPositions = [
            { x: 0.2, z: 0.35 }, { x: -0.2, z: 0.35 },
            { x: 0.2, z: -0.35 }, { x: -0.2, z: -0.35 }
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, skinMat);
            leg.position.set(pos.x * SCALE_FACTOR, 0.1 * SCALE_FACTOR, pos.z * SCALE_FACTOR);
            leg.castShadow = true;
            this.group.add(leg);
            this.legs.push(leg);
        });

        this.mesh = body;
        this.addLevelLabel();
    }

    addLevelLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv. ${this.level} SHEEP`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 1.3 * SCALE_FACTOR;
        this.label.scale.set(2.0, 0.5, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.die(fromPos, player);
        }
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        
        const dir = this._tempVec1.subVectors(this.group.position, fromPos).normalize();
        this.velocity.set(dir.x * 10, 12, dir.z * 10);

        import('./audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.5);
        });

        if (player && player.inventory) {
            const meatCount = Math.floor(Math.random() * 3) + 1;
            player.inventory.addItem({ 
                type: 'meat', 
                name: 'Raw Meat', 
                icon: 'meat_icon.png', 
                count: meatCount,
                stackLimit: 99
            });
            // Could add wool later if an item exists
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

        const myRadius = 0.5 * SCALE_FACTOR;

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
                this.group.rotation.z += 10 * delta;
                if (this.group.position.y < floorY) {
                    this.group.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.group.rotation.z = Math.PI / 2;
                }
            }
            return;
        }

        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;
        const detectRange = 9 * SCALE_FACTOR;

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
            this.animateLegs(t * 2.2);
        } else {
            if (this.timer <= 0) {
                if (this.state === 'idle') {
                    this.state = 'wander';
                    this.timer = 4 + Math.random() * 5;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                } else {
                    this.state = 'idle';
                    this.timer = 3 + Math.random() * 4;
                }
            }

            if (this.state === 'wander') {
                const moveVec = this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
                this.group.position.addScaledVector(moveVec, this.moveSpeed * delta);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 4 * delta);
                this.animateLegs(t);
            } else {
                this.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 5 * delta));
            }
        }

        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = floorY;
        this.checkCollisions(player);
    }

    animateLegs(time) {
        this.legs.forEach((leg, i) => {
            const phase = (i < 2) ? 0 : Math.PI;
            const side = (i % 2 === 0) ? 0 : Math.PI * 0.5;
            leg.rotation.x = Math.sin(time + phase + side) * 0.45;
        });
    }
}
