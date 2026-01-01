import * as THREE from 'three';
import { SCALE_FACTOR } from './world_bounds.js';

export class Deer {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = false;
        this.isDead = false;
        this.type = 'deer';

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
        this.moveSpeed = 3 * SCALE_FACTOR;
        this.fleeSpeed = 10 * SCALE_FACTOR;
        
        this.maxHealth = 1;
        this.health = this.maxHealth;

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._collisionTimer = 0;
        this._aiTimer = 0;
    }

    setupMesh() {
        const hideMat = new THREE.MeshStandardMaterial({ color: 0x8d5524 }); // Deer brown
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xead9c8 }); // Pale underside
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const antlerMat = new THREE.MeshStandardMaterial({ color: 0xddd5c7 });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 1.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), hideMat);
        body.position.y = 0.6 * SCALE_FACTOR;
        body.castShadow = true;
        this.group.add(body);

        // Neck
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), hideMat);
        neck.position.set(0, 0.9 * SCALE_FACTOR, 0.45 * SCALE_FACTOR);
        neck.rotation.x = -0.4;
        this.group.add(neck);

        // Head
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 1.2 * SCALE_FACTOR, 0.6 * SCALE_FACTOR);
        this.group.add(this.headGroup);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.45).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), hideMat);
        this.headGroup.add(head);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), noseMat);
        snout.position.z = 0.25 * SCALE_FACTOR;
        snout.position.y = -0.02 * SCALE_FACTOR;
        this.headGroup.add(snout);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.04 * SCALE_FACTOR);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(0.14 * SCALE_FACTOR, 0.05 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
        this.headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(-0.14 * SCALE_FACTOR, 0.05 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
        this.headGroup.add(rEye);

        // Antlers (simplified)
        const antlerGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lAntler = new THREE.Mesh(antlerGeo, antlerMat);
        lAntler.position.set(0.12 * SCALE_FACTOR, 0.3 * SCALE_FACTOR, 0);
        lAntler.rotation.z = 0.3;
        lAntler.rotation.x = -0.2;
        this.headGroup.add(lAntler);

        const rAntler = new THREE.Mesh(antlerGeo, antlerMat);
        rAntler.position.set(-0.12 * SCALE_FACTOR, 0.3 * SCALE_FACTOR, 0);
        rAntler.rotation.z = -0.3;
        rAntler.rotation.x = -0.2;
        this.headGroup.add(rAntler);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.legs = [];
        const legPositions = [
            { x: 0.15, z: 0.35 }, { x: -0.15, z: 0.35 },
            { x: 0.15, z: -0.35 }, { x: -0.15, z: -0.35 }
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, hideMat);
            leg.position.set(pos.x * SCALE_FACTOR, 0.2 * SCALE_FACTOR, pos.z * SCALE_FACTOR);
            leg.castShadow = true;
            this.group.add(leg);
            this.legs.push(leg);
        });

        // Tail
        this.tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), bellyMat);
        this.tail.position.set(0, 0.7 * SCALE_FACTOR, -0.55 * SCALE_FACTOR);
        this.tail.rotation.x = 0.5;
        this.group.add(this.tail);

        this.mesh = body;
        this.addLevelLabel();
    }

    addLevelLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#44ff44';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv. ${this.level} DEER`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 1.6 * SCALE_FACTOR;
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

        // Loot drops
        if (player && player.inventory) {
            const meatCount = Math.floor(Math.random() * 3) + 1;
            player.inventory.addItem({ 
                type: 'meat', 
                name: 'Raw Meat', 
                icon: 'meat_icon.png', 
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

        const myRadius = 0.5 * SCALE_FACTOR;

        // Collision with obstacles (Resources/Buildings)
        const resources = this.shard.resources;
        for (let i = 0; i < resources.length; i++) {
            const res = resources[i];
            if (res.isDead || !res.group) continue;
            const resPos = res.group.position;
            const dx = myPos.x - resPos.x;
            const dz = myPos.z - resPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq > 100) continue;

            let resRadius = (res.radius || (res.type === 'tree' ? 0.5 : 1.2)) * SCALE_FACTOR;
            if (res.type === 'pond' && res.getCollisionRadiusAtAngle) {
                resRadius = res.getCollisionRadiusAtAngle(Math.atan2(dz, dx));
            }

            const minDist = myRadius + resRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist);
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        const npcs = this.shard.npcs;
        for (let i = 0; i < npcs.length; i++) {
            const other = npcs[i];
            if (other === this || other.isDead) continue;
            const otherPos = (other.group || other.mesh).position;
            const dx = myPos.x - otherPos.x;
            const dz = myPos.z - otherPos.z;
            const distSq = dx * dx + dz * dz;

            if (distSq > 25) continue;

            const otherRadius = (other.type === 'bear' ? 1.0 : other.type === 'wolf' ? 0.6 : 0.5) * SCALE_FACTOR;
            const minDist = myRadius + otherRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        const fauna = this.shard.fauna;
        for (let i = 0; i < fauna.length; i++) {
            const other = fauna[i];
            if (other === this || other.isDead) continue;
            const otherPos = (other.group || other.mesh).position;
            const dx = myPos.x - otherPos.x;
            const dz = myPos.z - otherPos.z;
            const distSq = dx * dx + dz * dz;

            if (distSq > 25) continue;

            const otherRadius = (other.type === 'bear' ? 1.0 : other.type === 'wolf' ? 0.6 : 0.5) * SCALE_FACTOR;
            const minDist = myRadius + otherRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        if (player && player.mesh) {
            const pPos = player.mesh.position;
            const dx = myPos.x - pPos.x;
            const dz = myPos.z - pPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq < 25) {
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
                    this.group.rotation.z = Math.PI / 2; // Lay flat
                }
            }
            return;
        }

        this._aiTimer -= delta;
        if (this._aiTimer <= 0) {
            this._aiTimer = 0.1; // 10Hz AI update (Deer are passive, can be slower)
            this.updateAI(player);
        }

        this.updateMovement(delta, player);
        
        const t = performance.now() * 0.01;
        this.updateAnimations(t, delta);

        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = floorY;

        this._collisionTimer -= delta;
        if (this._collisionTimer <= 0) {
            this._collisionTimer = 0.066; // 15Hz collision update
            this.checkCollisions(player);
        }
    }

    updateAI(player) {
        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;
        const detectRange = 12 * SCALE_FACTOR;

        if (distToPlayer < detectRange) {
            this.state = 'flee';
        } else if (this.state === 'flee') {
            this.state = 'idle';
            this.timer = 2.0;
        }
    }

    updateMovement(delta, player) {
        this.timer -= delta;

        if (this.state === 'flee' && player) {
            const fleeDir = this._tempVec1.subVectors(this.group.position, player.mesh.position).normalize();
            const targetRot = Math.atan2(fleeDir.x, fleeDir.z);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 10 * delta);
            
            this.group.position.addScaledVector(fleeDir, this.fleeSpeed * delta);
        } else {
            if (this.timer <= 0) {
                if (this.state === 'idle') {
                    this.state = 'wander';
                    this.timer = 3 + Math.random() * 4;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                } else {
                    this.state = 'idle';
                    this.timer = 2 + Math.random() * 3;
                }
            }

            if (this.state === 'wander') {
                const moveVec = this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
                this.group.position.addScaledVector(moveVec, this.moveSpeed * delta);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 4 * delta);
            }
        }
    }

    updateAnimations(t, delta) {
        if (this.state === 'flee') {
            this.animateLegs(t * 2.5);
            this.tail.rotation.x = -0.5 + Math.sin(t * 5) * 0.5;
        } else if (this.state === 'wander') {
            this.animateLegs(t);
            this.headGroup.rotation.x = Math.sin(t * 0.2) * 0.1;
        } else {
            this.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 5 * delta));
            this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, 0.2, 2 * delta); // Grazing pose
        }
    }

    animateLegs(time) {
        this.legs.forEach((leg, i) => {
            const phase = (i < 2) ? 0 : Math.PI;
            const side = (i % 2 === 0) ? 0 : Math.PI * 0.5;
            leg.rotation.x = Math.sin(time + phase + side) * 0.7;
        });
    }
}