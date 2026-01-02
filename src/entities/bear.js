import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class Bear {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = true;
        this.isDead = false;
        this.type = 'bear';

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const dist = pos.length();
        this.level = Math.floor(Math.min(100, 1 + (dist / 100)));

        this.setupMesh();

        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 2;
        this.state = 'idle'; // idle, wander, aggressive, chase, attack
        this.moveSpeed = 2.5 * SCALE_FACTOR;
        this.chaseSpeed = 7 * SCALE_FACTOR;
        
        this.maxHealth = 5 + Math.floor(this.level / 5);
        this.health = this.maxHealth;

        // AI Collision avoidance state
        this.isColliding = false;
        this.pauseTimer = 0;
        this.avoidanceAngle = 0;

        this._collisionTimer = 0;
        this._aiTimer = 0;
        this._tempVec1 = new THREE.Vector3();
    }

    setupMesh() {
        const furMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 }); // Dark brown
        const snoutMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 }); // Lighter brown
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        // Large bulky body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        body.position.y = 0.6 * SCALE_FACTOR;
        body.castShadow = true;
        this.group.add(body);

        // Shoulder hump
        const hump = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        hump.position.set(0, 1.0 * SCALE_FACTOR, 0.2 * SCALE_FACTOR);
        this.group.add(hump);

        // Thick Neck
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        neck.position.set(0, 0.8 * SCALE_FACTOR, 0.7 * SCALE_FACTOR);
        this.group.add(neck);

        // Head
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.9 * SCALE_FACTOR, 0.9 * SCALE_FACTOR);
        this.group.add(this.headGroup);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        this.headGroup.add(head);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), snoutMat);
        snout.position.z = 0.35 * SCALE_FACTOR;
        snout.position.y = -0.05 * SCALE_FACTOR;
        this.headGroup.add(snout);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), noseMat);
        nose.position.z = 0.5 * SCALE_FACTOR;
        nose.position.y = 0.02 * SCALE_FACTOR;
        this.headGroup.add(nose);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(0.18 * SCALE_FACTOR, 0.1 * SCALE_FACTOR, 0.22 * SCALE_FACTOR);
        this.headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(-0.18 * SCALE_FACTOR, 0.1 * SCALE_FACTOR, 0.22 * SCALE_FACTOR);
        this.headGroup.add(rEye);

        // Small rounded ears
        const earGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lEar = new THREE.Mesh(earGeo, furMat);
        lEar.position.set(0.22 * SCALE_FACTOR, 0.28 * SCALE_FACTOR, 0);
        this.headGroup.add(lEar);

        const rEar = new THREE.Mesh(earGeo, furMat);
        rEar.position.set(-0.22 * SCALE_FACTOR, 0.28 * SCALE_FACTOR, 0);
        this.headGroup.add(rEar);

        // Thick Stumpy Legs
        const legGeo = new THREE.BoxGeometry(0.25, 0.5, 0.25).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.legs = [];
        const legPositions = [
            { x: 0.25, z: 0.45 }, { x: -0.25, z: 0.45 },
            { x: 0.25, z: -0.45 }, { x: -0.25, z: -0.45 }
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, furMat);
            leg.position.set(pos.x * SCALE_FACTOR, 0.25 * SCALE_FACTOR, pos.z * SCALE_FACTOR);
            leg.castShadow = true;
            this.group.add(leg);
            this.legs.push(leg);
        });

        // Little nub tail
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        tail.position.set(0, 0.6 * SCALE_FACTOR, -0.7 * SCALE_FACTOR);
        this.group.add(tail);

        this.mesh = body;
        this.addLevelLabel();
    }

    addLevelLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv. ${this.level} BEAR`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 1.8 * SCALE_FACTOR;
        this.label.scale.set(2.2, 0.55, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;

        // Visual feedback
        const originalScale = this.group.scale.clone();
        this.group.scale.multiplyScalar(1.1);
        setTimeout(() => {
            if (this.group && !this.isDead) this.group.scale.copy(originalScale);
        }, 50);

        if (this.health <= 0) {
            this.die(fromPos, player);
        } else {
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('enemy_hit', 0.4);
            });
        }
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        
        const dir = new THREE.Vector3().subVectors(this.group.position, fromPos).normalize();
        this.velocity.set(dir.x * 6, 8, dir.z * 6);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.6);
        });

        // Loot drops using loot tables
        if (player && player.inventory) {
            const lootTable = player.worldManager?.lootTables?.loot_tables?.enemy_bear;
            if (lootTable) {
                for (let i = 0; i < (lootTable.rolls || 1); i++) {
                    lootTable.items.forEach(loot => {
                        if (Math.random() < loot.chance) {
                            const count = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
                            const itemData = player.worldManager.itemsData?.items?.[loot.id];
                            player.inventory.addItem({
                                type: loot.id,
                                name: itemData?.name || loot.id,
                                icon: itemData?.icon || `assets/icons/${loot.id}_icon.png`,
                                count: count,
                                stackLimit: itemData?.maxStack || 99
                            });
                        }
                    });
                }
            } else {
                // Fallback if loot table not loaded
                const peltCount = Math.floor(Math.random() * 3) + 1;
                const meatCount = Math.floor(Math.random() * 11) + 5;
                player.inventory.addItem({ 
                    type: 'pelt', 
                    name: 'Thick Pelt', 
                    icon: 'assets/icons/pelt_icon.png', 
                    count: peltCount,
                    stackLimit: 99
                });
                player.inventory.addItem({ 
                    type: 'meat', 
                    name: 'Raw Meat', 
                    icon: 'assets/icons/meat_icon.png', 
                    count: meatCount,
                    stackLimit: 99
                });
            }
            player.addXP(20 + this.level * 2);
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

        const myRadius = 1.0 * SCALE_FACTOR;
        let collisionDetected = false;

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
                collisionDetected = true;
            }
        }

        // Collision with other NPCs/Fauna
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
                collisionDetected = true;
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
                collisionDetected = true;
            }
        }

        // Collision with player
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
                    collisionDetected = true;
                }
            }
        }

        // Handle collision avoidance AI
        if (collisionDetected && !this.isColliding) {
            this.isColliding = true;
            this.pauseTimer = 0.8 + Math.random() * 0.8; // Pause for 0.8-1.6s
            // New random angle to turn towards
            this.avoidanceAngle = Math.random() * Math.PI * 2;
        } else if (!collisionDetected) {
            this.isColliding = false;
        }
    }

    update(delta, player) {
        if (this.isDead) {
            const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
            if (this.group.position.y > floorY || this.velocity.y > 0) {
                const d = delta || 0.016;
                this.group.position.addScaledVector(this.velocity, d);
                this.velocity.y -= 30 * d;
                
                // Tip over while falling
                this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, Math.PI / 2, 5 * d);
                this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0.4, 3 * d);
                
                if (this.group.position.y < floorY) {
                    this.group.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.group.rotation.x = Math.PI / 2;
                }
            }
            return;
        }

        if (this.pauseTimer > 0) {
            this.pauseTimer -= delta;
            // Still look towards where we want to go
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.avoidanceAngle, 4 * delta);
        }

        this._aiTimer -= delta;
        if (this._aiTimer <= 0) {
            this._aiTimer = 0.066; // 15Hz AI update (slower than wolf)
            this.updateAI(player);
        }

        this.updateMovement(delta, player);
        
        const t = performance.now() * 0.008;
        this.updateAnimations(t, delta);

        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = floorY;

        this._collisionTimer -= delta;
        if (this._collisionTimer <= 0) {
            this._collisionTimer = 0.05; // 20Hz collision update (heavy bear)
            this.checkCollisions(player);
        }
    }

    updateAI(player) {
        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;
        const warningRange = 12 * SCALE_FACTOR;
        const detectRange = 8 * SCALE_FACTOR;
        const attackRange = 3.5 * SCALE_FACTOR;
        const canAggro = player && !player.isInvulnerable;

        if (canAggro && distToPlayer < attackRange && this.state !== 'attack') {
            this.state = 'attack';
            this.timer = 1.2;
            this.hasDealtDamage = false;
        } else if (canAggro && distToPlayer < detectRange && this.state !== 'attack') {
            if (this.state !== 'chase') {
                import('../utils/audio_manager.js').then(({ audioManager }) => {
                    audioManager.play('bear_growl', 0.5);
                });
            }
            this.state = 'chase';
        } else if (canAggro && distToPlayer < warningRange && this.state === 'idle') {
            this.state = 'aggressive';
            this.timer = 2.0;
        } else if (!canAggro && (this.state === 'chase' || this.state === 'aggressive' || this.state === 'attack')) {
            if (this.state !== 'attack' || this.timer <= 0) {
                this.state = 'idle';
                this.timer = 1.0;
            }
        }
    }

    updateMovement(delta, player) {
        this.timer -= delta;
        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;

        if (this.state === 'attack') {
            const p = 1.0 - (this.timer / 1.2);
            if (p < 0.4) {
                this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -0.6, 5 * delta);
                this.headGroup.rotation.x = -0.4;
            } else if (p < 0.7) {
                this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0.2, 15 * delta);
                if (!this.hasDealtDamage && player && distToPlayer < 2.5 * SCALE_FACTOR) {
                    player.takeDamage(25 + Math.floor(this.level * 0.75));
                    this.hasDealtDamage = true;
                }
            } else if (p >= 1.0) {
                this.state = 'idle';
                this.timer = 1.5;
            }
        } else if (this.state === 'chase') {
            if (player) {
                const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 6 * delta);
                this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, 5 * delta);
                
                this._tempVec1.set(Math.sin(targetRot), 0, Math.cos(targetRot));
                this.group.position.addScaledVector(this._tempVec1, this.chaseSpeed * delta);
            }
        } else if (this.state === 'aggressive') {
            if (player) {
                const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 3 * delta);
            }
            if (this.timer <= 0) this.state = 'idle';
        } else {
            if (this.timer <= 0) {
                if (this.state === 'idle') {
                    this.state = 'wander';
                    this.timer = 4 + Math.random() * 4;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                } else {
                    this.state = 'idle';
                    this.timer = 2 + Math.random() * 3;
                }
            }

            if (this.state === 'wander' && this.pauseTimer <= 0) {
                if (this.isColliding) {
                    this.wanderAngle = this.avoidanceAngle;
                }
                this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
                this.group.position.addScaledVector(this._tempVec1, this.moveSpeed * delta);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 2 * delta);
            }
        }
    }

    updateAnimations(t, delta) {
        if (this.state === 'chase' || this.state === 'wander') {
            const animSpeed = this.state === 'chase' ? 1.5 : 1.0;
            this.animateLegs(t * animSpeed);
        } else {
            this.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 3 * delta));
            this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, 3 * delta);
        }
    }

    animateLegs(time) {
        this.legs.forEach((leg, i) => {
            const phase = (i < 2) ? 0 : Math.PI;
            const side = (i % 2 === 0) ? 0 : Math.PI * 0.4;
            leg.rotation.x = Math.sin(time + phase + side) * 0.45;
        });
    }
}