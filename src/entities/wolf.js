import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class Wolf {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = true;
        this.isDead = false;
        this.type = 'wolf';

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const dist = pos.length();
        this.level = Math.floor(Math.min(100, 1 + (dist / 100)));

        this.setupMesh();

        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 2;
        this.state = 'idle'; // idle, wander
        this.moveSpeed = 4 * SCALE_FACTOR;

        // AI Collision avoidance state
        this.isColliding = false;
        this.pauseTimer = 0;
        this.avoidanceAngle = 0;

        this.maxHealth = 3 + Math.floor(this.level / 10);
        this.health = this.maxHealth;

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        this._collisionTimer = 0;
        this._aiTimer = 0;
    }

    setupMesh() {
        const wolfMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Darker grey
        const furMat = new THREE.MeshStandardMaterial({ color: 0x555555 }); // Lighter grey
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.2).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), wolfMat);
        body.position.y = 0.4 * SCALE_FACTOR;
        body.castShadow = true;
        this.group.add(body);

        // Neck/Mane tuft
        const mane = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        mane.position.set(0, 0.5 * SCALE_FACTOR, 0.4 * SCALE_FACTOR);
        this.group.add(mane);

        // Head
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.7 * SCALE_FACTOR, 0.6 * SCALE_FACTOR);
        this.group.add(headGroup);
        this.headGroup = headGroup;

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.5).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        headGroup.add(head);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.35).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), noseMat);
        snout.position.z = 0.35 * SCALE_FACTOR;
        snout.position.y = -0.05 * SCALE_FACTOR;
        headGroup.add(snout);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(0.12 * SCALE_FACTOR, 0.08 * SCALE_FACTOR, 0.22 * SCALE_FACTOR);
        headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(-0.12 * SCALE_FACTOR, 0.08 * SCALE_FACTOR, 0.22 * SCALE_FACTOR);
        headGroup.add(rEye);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.08, 0.25, 0.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lEar = new THREE.Mesh(earGeo, wolfMat);
        lEar.position.set(0.15 * SCALE_FACTOR, 0.28 * SCALE_FACTOR, -0.05 * SCALE_FACTOR);
        lEar.rotation.z = -0.2;
        headGroup.add(lEar);

        const rEar = new THREE.Mesh(earGeo, wolfMat);
        rEar.position.set(-0.15 * SCALE_FACTOR, 0.28 * SCALE_FACTOR, -0.05 * SCALE_FACTOR);
        rEar.rotation.z = 0.2;
        headGroup.add(rEar);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.legs = [];
        const legPositions = [
            { x: 0.18, z: 0.4 }, { x: -0.18, z: 0.4 },
            { x: 0.18, z: -0.4 }, { x: -0.18, z: -0.4 }
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, wolfMat);
            leg.position.set(pos.x * SCALE_FACTOR, 0.1 * SCALE_FACTOR, pos.z * SCALE_FACTOR);
            leg.castShadow = true;
            this.group.add(leg);
            this.legs.push(leg);
        });

        // Segmented Tail
        this.tailRoot = new THREE.Group();
        this.tailRoot.position.set(0, 0.6 * SCALE_FACTOR, -0.6 * SCALE_FACTOR);
        this.group.add(this.tailRoot);

        this.tailPart1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        this.tailPart1.position.z = -0.2 * SCALE_FACTOR;
        this.tailRoot.add(this.tailPart1);

        this.tailMid = new THREE.Group();
        this.tailMid.position.z = -0.4 * SCALE_FACTOR;
        this.tailRoot.add(this.tailMid);

        this.tailPart2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR), furMat);
        this.tailPart2.position.z = -0.2 * SCALE_FACTOR;
        this.tailMid.add(this.tailPart2);

        this.tailRoot.rotation.x = -0.6;

        // For compatibility with targeting
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
        ctx.fillText(`Lv. ${this.level} WOLF`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 1.2 * SCALE_FACTOR;
        this.label.scale.set(2.0, 0.5, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;

        // Visual feedback jolt
        const originalScale = this.group.scale.clone();
        this.group.scale.multiplyScalar(1.15);
        setTimeout(() => {
            if (this.group && !this.isDead) this.group.scale.copy(originalScale);
        }, 50);

        if (this.health <= 0) {
            this.die(fromPos, player);
        } else {
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('enemy_hit', 0.3);
            });
        }
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        
        const dir = this._tempVec1.subVectors(this.group.position, fromPos).normalize();
        this.velocity.set(dir.x * 12, 8, dir.z * 12);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.5);
            
            // Simple death sound chance
            if (Math.random() > 0.5) {
                audioManager.play('wolf_howl', 0.3);
            }
        });

        // Loot drops using loot tables
        if (player && player.inventory) {
            const lootTable = player.worldManager?.lootTables?.loot_tables?.enemy_wolf;
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
                // Fallback
                const peltCount = Math.floor(Math.random() * 5) + 1;
                const meatCount = Math.floor(Math.random() * 9) + 2;
                player.inventory.addItem({ 
                    type: 'pelt', 
                    name: 'Wolf Pelt', 
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
            player.addXP(10 + this.level);
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

        // Block enemies from entering the plateau (80, -108)
        const PLATEAU_X = 4800; // 80 * 60
        const PLATEAU_Z = -6480; // -108 * 60
        const pdx = myPos.x - PLATEAU_X;
        const pdz = myPos.z - PLATEAU_Z;
        const pDistSq = pdx * pdx + pdz * pdz;
        const plateauRadiusSq = 6561.0; // (60 * 1.35)^2
        
        if (pDistSq < plateauRadiusSq) {
            const pDist = Math.sqrt(pDistSq);
            const pushDist = (81.0 - pDist) + 1.0;
            myPos.x += (pdx / pDist) * pushDist;
            myPos.z += (pdz / pDist) * pushDist;
            if (this.state === 'chase' || this.state === 'lunge') this.state = 'idle';
            return;
        }

        const myRadius = 0.6 * SCALE_FACTOR;
        let collisionDetected = false;

        // Collision with obstacles (Resources/Buildings) - only check if close
        const resources = this.shard.resources;
        for (let i = 0; i < resources.length; i++) {
            const res = resources[i];
            if (res.isDead || !res.group) continue;
            
            const resPos = res.group.position;
            const dx = myPos.x - resPos.x;
            const dz = myPos.z - resPos.z;
            const distSq = dx * dx + dz * dz;
            
            // Skip far objects immediately
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

        // Collision with other NPCs - only check if close
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

        // Fauna collision
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
            this.pauseTimer = 0.5 + Math.random() * 0.5; // Pause for 0.5-1s
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
                this.group.position.addScaledVector(this.velocity, delta);
                this.velocity.y -= 30 * delta;
                this.group.rotation.x += 8 * delta;
                
                if (this.group.position.y < floorY) {
                    this.group.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.group.rotation.x = Math.PI / 2; // Lay flat on the ground
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
            this._aiTimer = 0.05; // 20Hz AI update
            this.updateAI(player);
        }

        // Movement and Animation run every frame for smoothness
        this.updateMovement(delta, player);
        
        const t = performance.now() * 0.01;
        this.updateAnimations(t, delta);

        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = floorY;

        this._collisionTimer -= delta;
        if (this._collisionTimer <= 0) {
            this._collisionTimer = 0.033; // 30Hz collision update
            this.checkCollisions(player);
        }
    }

    updateAI(player) {
        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;
        const detectRange = 15 * SCALE_FACTOR;
        const attackRange = 3 * SCALE_FACTOR;
        const canAggro = player && !player.isInvulnerable;

        if (canAggro && distToPlayer < attackRange && this.state !== 'lunge') {
            this.state = 'lunge';
            this.timer = 0.8;
            this.hasDealtDamage = false;
        } else if (canAggro && distToPlayer < detectRange && this.state !== 'lunge') {
            this.state = 'chase';
        } else if (this.state === 'chase' || (!canAggro && this.state === 'lunge')) {
            if (!canAggro || distToPlayer >= detectRange) {
                this.state = 'idle';
                this.timer = 1.0;
            }
        }
    }

    updateMovement(delta, player) {
        if (this.state === 'lunge') {
            const p = 1.0 - (this.timer / 0.8);
            if (p < 0.2) {
                if (player) {
                    const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 10 * delta);
                }
                this.headGroup.rotation.x = 0.3;
            } else if (p < 0.5) {
                if (player) {
                    const moveVec = this._tempVec1.subVectors(player.mesh.position, this.group.position).normalize();
                    this.group.position.addScaledVector(moveVec, 15 * SCALE_FACTOR * delta);
                    this.headGroup.rotation.x = -0.5;
                    
                    if (!this.hasDealtDamage && this.group.position.distanceTo(player.mesh.position) < 1.5 * SCALE_FACTOR) {
                        player.takeDamage(10 + Math.floor(this.level * 0.4));
                        this.hasDealtDamage = true;
                    }
                }
            } else if (p >= 1.0) {
                this.state = 'idle';
                this.timer = 1.0;
            }
        } else if (this.state === 'chase') {
            if (player) {
                const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 10 * delta);
                
                const moveVec = this._tempVec1.set(Math.sin(targetRot), 0, Math.cos(targetRot));
                this.group.position.addScaledVector(moveVec, this.moveSpeed * 2.5 * delta);
            }
        } else if (this.state === 'wander' && this.pauseTimer <= 0) {
            if (this.isColliding) {
                this.wanderAngle = this.avoidanceAngle;
            }
            const moveVec = this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
            this.group.position.addScaledVector(moveVec, this.moveSpeed * 0.5 * delta);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 3 * delta);
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
        }
    }

    updateAnimations(t, delta) {
        if (this.state === 'chase' || this.state === 'wander') {
            const animSpeed = this.state === 'chase' ? 1.5 : 1.0;
            this.animateLegs(t * animSpeed);
            this.tailRoot.rotation.z = Math.sin(t * animSpeed) * 0.5;
            this.tailMid.rotation.z = Math.sin(t * animSpeed - 0.5) * 0.5;
        } else {
            this.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 5 * delta));
            this.tailRoot.rotation.z = Math.sin(t * 0.1) * 0.1;
            this.tailMid.rotation.z = Math.sin(t * 0.1 - 0.1) * 0.1;
        }
    }

    animateLegs(time) {
        this.legs.forEach((leg, i) => {
            const phase = (i < 2) ? 0 : Math.PI; // Front vs back
            const side = (i % 2 === 0) ? 0 : Math.PI * 0.5; // Left vs right
            leg.rotation.x = Math.sin(time + phase + side) * 0.6;
        });
    }
}