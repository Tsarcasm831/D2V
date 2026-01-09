import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class Cow {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = false;
        this.isDead = false;
        this.type = 'cow';

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
        this.moveSpeed = 2.0 * SCALE_FACTOR; // Slow move speed
        this.fleeSpeed = 6 * SCALE_FACTOR; // Fleeing is still somewhat slow
        
        this.maxHealth = 4; // Cows are hardy
        this.health = this.maxHealth;

        this._tempVec1 = new THREE.Vector3();
        this._collisionTimer = 0;
        this._aiTimer = 0;
    }

    setupMesh() {
        const cowMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White base
        const spotMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Black spots
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee }); // Horns
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1 }); // Pink snout
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        // Body (Large and boxy)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), cowMat);
        body.position.y = 0.65 * SCALE_FACTOR;
        body.castShadow = true;
        this.group.add(body);

        // Spots on body
        const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), spotMat);
        spot1.position.set(0.3 * SCALE_FACTOR, 0.8 * SCALE_FACTOR, 0.3 * SCALE_FACTOR);
        this.group.add(spot1);

        const spot2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), spotMat);
        spot2.position.set(-0.2 * SCALE_FACTOR, 0.7 * SCALE_FACTOR, -0.4 * SCALE_FACTOR);
        this.group.add(spot2);

        // Head
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.9 * SCALE_FACTOR, 0.7 * SCALE_FACTOR);
        this.group.add(this.headGroup);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), cowMat);
        this.headGroup.add(head);

        // Snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.2).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), noseMat);
        snout.position.z = 0.35 * SCALE_FACTOR;
        snout.position.y = -0.05 * SCALE_FACTOR;
        this.headGroup.add(snout);

        // Horns
        const hornGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lHorn = new THREE.Mesh(hornGeo, hornMat);
        lHorn.position.set(0.2 * SCALE_FACTOR, 0.3 * SCALE_FACTOR, -0.1 * SCALE_FACTOR);
        lHorn.rotation.z = 0.4;
        this.headGroup.add(lHorn);

        const rHorn = new THREE.Mesh(hornGeo, hornMat);
        rHorn.position.set(-0.2 * SCALE_FACTOR, 0.3 * SCALE_FACTOR, -0.1 * SCALE_FACTOR);
        rHorn.rotation.z = -0.4;
        this.headGroup.add(rHorn);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(0.22 * SCALE_FACTOR, 0.1 * SCALE_FACTOR, 0.2 * SCALE_FACTOR);
        this.headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(-0.22 * SCALE_FACTOR, 0.1 * SCALE_FACTOR, 0.2 * SCALE_FACTOR);
        this.headGroup.add(rEye);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.legs = [];
        const legPositions = [
            { x: 0.25, z: 0.5 }, { x: -0.25, z: 0.5 },
            { x: 0.25, z: -0.5 }, { x: -0.25, z: -0.5 }
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, cowMat);
            leg.position.set(pos.x * SCALE_FACTOR, 0.25 * SCALE_FACTOR, pos.z * SCALE_FACTOR);
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
        ctx.fillText(`Lv. ${this.level} COW`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 1.8 * SCALE_FACTOR;
        this.label.scale.set(2.0, 0.5, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;
        if (this.health > 0) {
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('cow_moo', 0.45);
            });
        }
        if (this.health <= 0) {
            this.die(fromPos, player);
        } else {
            this.state = 'flee';
            this.timer = 5.0;
        }
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        
        const dir = this._tempVec1.subVectors(this.group.position, fromPos).normalize();
        this.velocity.set(dir.x * 8, 10, dir.z * 8);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('cow_moo', 0.6);
        });

        if (player && player.inventory) {
            const meatCount = Math.floor(Math.random() * 3) + 3;
            player.inventory.addItem({ 
                type: 'meat', 
                name: 'Raw Meat', 
                icon: 'assets/icons/meat_icon.png', 
                count: meatCount,
                stackLimit: 99
            });
            // Later add milk/hide as requested
        }
    }

    checkCollisions(player) {
        if (!this.shard || this.isDead) return;
        const myPos = this.group.position;

        if (player && player.mesh) {
            const distSqToPlayer = myPos.distanceToSquared(player.mesh.position);
            if (distSqToPlayer > 2500) return;
        }

        const myRadius = 0.7 * SCALE_FACTOR;

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
                this.group.rotation.z += 8 * delta;
                if (this.group.position.y < floorY) {
                    this.group.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.group.rotation.z = Math.PI / 2;
                }
            }
            return;
        }

        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;
        const detectRange = 6 * SCALE_FACTOR;

        if (distToPlayer < detectRange) {
            this.state = 'flee';
            this.timer = 3.0;
        }

        this.timer -= delta;
        const t = performance.now() * 0.01;

        if (this.state === 'flee') {
            const fleeDir = this._tempVec1.subVectors(this.group.position, player.mesh.position).normalize();
            const targetRot = Math.atan2(fleeDir.x, fleeDir.z);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 10 * delta);
            this.group.position.addScaledVector(fleeDir, this.fleeSpeed * delta);
            this.animateLegs(t * 1.5);
            if (this.timer <= 0) {
                this.state = 'idle';
                this.timer = 2.0;
            }
        } else {
            if (this.timer <= 0) {
                if (this.state === 'idle') {
                    this.state = 'wander';
                    this.timer = 4 + Math.random() * 6;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                } else {
                    this.state = 'idle';
                    this.timer = 3 + Math.random() * 5;
                }
            }

            if (this.state === 'wander') {
                const moveVec = this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
                this.group.position.addScaledVector(moveVec, this.moveSpeed * delta);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 3 * delta);
                this.animateLegs(t * 0.8);
            } else {
                this.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 5 * delta));
                this.headGroup.rotation.x = Math.sin(t * 0.1) * 0.1 + 0.2; // Grazing
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
            leg.rotation.x = Math.sin(time + phase + side) * 0.4;
        });
    }
}
