import * as THREE from 'three';
import { createPlayerMesh } from './player_mesh.js';
import { PlayerAnimator } from './player_animator.js';
import { attachUnderwear } from '../items/underwear.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';

/**
 * A humanoid survivor NPC that wanders the steppes.
 * Based on the player character model with grey clothing.
 */
export class HumanoidNPC {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = false;
        this.isDead = false;
        this.type = 'humanoid';

        const { mesh, parts, model } = createPlayerMesh();
        this.group = mesh; // We use group to match the animal NPC structure
        this.parts = parts;
        this.model = model;
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const levelCenter = (shard && shard.worldManager && shard.worldManager.levelCenter) ? shard.worldManager.levelCenter : new THREE.Vector3(0, 0, 0);
        const dist = pos.distanceTo(levelCenter);
        this.level = Math.floor(Math.min(100, 1 + (dist / 100)));

        this.setupClothing();
        this.addLevelLabel();
        this.animator = new PlayerAnimator(this.parts, this.model);

        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 3;
        this.state = 'idle'; // idle, wander
        this.moveSpeed = 4 * SCALE_FACTOR;
        
        this.maxHealth = 4 + Math.floor(this.level / 10);
        this.health = this.maxHealth;
        this.anchorPos = null;
        this.maxAnchorDist = 20;

        // AI Collision avoidance state
        this.isColliding = false;
        this.pauseTimer = 0;
        this.avoidanceAngle = 0;

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._collisionTimer = 0;
        this._aiTimer = 0;
    }

    setHome(pos, range = 20) {
        this.anchorPos = pos.clone();
        this.maxAnchorDist = range;
    }

    setupClothing() {
        // Base layer
        attachUnderwear(this.parts);
        
        const greyDark = 0x444444;
        const greyLight = 0x888888;
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

        // Grey Shorts (mimics shorts.js logic)
        const shortsMat = new THREE.MeshToonMaterial({ color: greyDark });
        const thighRadius = 0.1, legLen = 0.42;
        const legGeo = new THREE.CylinderGeometry(thighRadius * 1.35, thighRadius * 1.25, legLen, 12);
        
        const attachLeg = (thighPart) => {
            const leg = new THREE.Mesh(legGeo, shortsMat);
            leg.position.y = -legLen / 2 + 0.02; 
            thighPart.add(leg);
            const o = new THREE.Mesh(legGeo, outlineMat);
            o.scale.setScalar(1.1);
            leg.add(o);
        };
        attachLeg(this.parts.rightThigh);
        attachLeg(this.parts.leftThigh);

        const torsoRadiusBottom = 0.22, waistLen = 0.24;
        const waistGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 1.12, torsoRadiusBottom * 1.1, waistLen, 16);
        const waist = new THREE.Mesh(waistGeo, shortsMat);
        waist.position.y = (0.05 + waistLen/2) * SCALE_FACTOR;
        this.parts.torsoContainer.add(waist);
        
        // Add crotch section to hide underwear from below
        const crotchGeo = new THREE.SphereGeometry(torsoRadiusBottom * 1.1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const crotch = new THREE.Mesh(crotchGeo, shortsMat);
        crotch.position.y = -waistLen / 2;
        waist.add(crotch);

        const wo = new THREE.Mesh(waistGeo, outlineMat);
        wo.scale.setScalar(1.05);
        waist.add(wo);

        const co = new THREE.Mesh(crotchGeo, outlineMat);
        co.scale.setScalar(1.05);
        co.position.y = -waistLen / 2;
        waist.add(co);

        // Grey Shirt - FIXED COVERAGE (sync with shirt.js logic)
        const shirtMat = new THREE.MeshToonMaterial({ color: greyLight });
        const torsoRadiusTop = 0.3, torsoRadiusBottomShirt = 0.26, shirtLen = 0.32;
        const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottomShirt, shirtLen, 16);
        const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
        shirtTorso.position.y = 0.41 * SCALE_FACTOR;
        this.parts.torsoContainer.add(shirtTorso);

        const topCapGeo = new THREE.SphereGeometry(torsoRadiusTop, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const topCap = new THREE.Mesh(topCapGeo, shirtMat);
        topCap.position.y = shirtLen / 2;
        shirtTorso.add(topCap);

        [shirtTorsoGeo, topCapGeo].forEach(g => {
            const o = new THREE.Mesh(g, outlineMat);
            o.scale.setScalar(1.05);
            if (g === topCapGeo) o.position.y = shirtLen / 2;
            shirtTorso.add(o);
        });

        const sleeveRadius = 0.12, sleeveLen = 0.25;
        const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLen, 12);
        const attachSleeve = (armPart) => {
            const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
            sleeve.position.y = -sleeveLen / 2;
            armPart.add(sleeve);
            const so = new THREE.Mesh(sleeveGeo, outlineMat);
            so.scale.setScalar(1.08);
            sleeve.add(so);
        };
        attachSleeve(this.parts.rightArm);
        attachSleeve(this.parts.leftArm);
    }

    addLevelLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#9c27b0';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv. ${this.level} SURVIVOR`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 2.4 * SCALE_FACTOR;
        this.label.scale.set(2.4, 0.6, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;
        
        // Flinch animation
        this.animator.playInteract();

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
        
        // Knockback
        const dir = new THREE.Vector3().subVectors(this.group.position, fromPos).normalize();
        this.velocity.set(dir.x * 8, 10, dir.z * 8);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.5);
        });

        // Drop survival supplies
        if (player && player.inventory) {
            player.inventory.addItem({ 
                type: 'meat', 
                name: 'Frozen Ration', 
                icon: 'assets/icons/meat_icon.png', 
                count: 1 
            });
            player.inventory.addItem({ 
                type: 'berry', 
                name: 'Saved Berries', 
                icon: 'assets/icons/berry_icon.png', 
                count: 3 
            });
        }
    }

    checkCollisions(player) {
        if (!this.shard || this.isDead) return;
        
        const myPos = this.group.position;
        
        // Skip collisions if player is too far (performance optimization)
        if (player && player.mesh) {
            const distSqToPlayer = myPos.distanceToSquared(player.mesh.position);
            if (distSqToPlayer > 2500) return; // Skip if > 50m from player
        }

        const myRadius = 0.5 * SCALE_FACTOR;
        let collisionDetected = false;

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

        // Obstacle collision
        const resources = this.shard.resources;
        for (let i = 0; i < resources.length; i++) {
            const res = resources[i];
            if (res.isDead || !res.group) continue;
            
            // Specialized shape-based collision resolution (Buildings, Walls, Doorways)
            if (res.resolveCollision) {
                const collision = res.resolveCollision(myPos, myRadius);
                if (collision) {
                    collisionDetected = true;
                    continue;
                }
            }

            // Standard circular collision fallback
            const resPos = res.group.position;
            const dx = myPos.x - resPos.x;
            const dz = myPos.z - resPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq > 100) continue;
            
            let resRadius = (res.radius || (res.type === 'tree' ? 0.5 : 1.2)) * SCALE_FACTOR;
            if (res.getCollisionRadiusAtAngle) {
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

        // NPC/Fauna collision
        const npcs = this.shard.npcs;
        for (let i = 0; i < npcs.length; i++) {
            const other = npcs[i];
            if (other === this || other.isDead) continue;
            const otherPos = (other.group || other.mesh).position;
            const dx = myPos.x - otherPos.x;
            const dz = myPos.z - otherPos.z;
            const distSq = dx * dx + dz * dz;
            if (distSq > 25) continue;
            const otherRadius = 0.5 * SCALE_FACTOR;
            const minDist = myRadius + otherRadius;
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
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
                const overlap = (minDist - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
                collisionDetected = true;
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
                this.velocity.y -= 35 * delta;
                this.group.rotation.x += 6 * delta;
                
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
            this._aiTimer = 0.1; // 10Hz AI update
            this.updateAI(player);
        }

        this.updateMovement(delta, player);

        this._collisionTimer -= delta;
        if (this._collisionTimer <= 0) {
            this._collisionTimer = 0.05; // 20Hz collision update
            this.checkCollisions(player);
        }

        this.animator.animate(
            delta,
            this.state === 'wander',
            false, // isRunning
            this.animator.isPickingUp,
            this.isDead,
            false, // isJumping
            'none', // jumpPhase
            0, // jumpTimer
            0, // jumpVelocity
            false, // isLedgeGrabbing
            0, // ledgeGrabTime
            0, // recoverTimer
            false, // isDragged
            'hips', // draggedPartName
            new THREE.Vector3(), // dragVelocity
            0, // deathTime
            null // deathVariation
        );
        
        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = floorY;
    }

    updateAI(player) {
        if (!player || !player.mesh) return;
        this.timer -= 0.1; // AI runs at 10Hz
        if (this.timer <= 0) {
            if (this.state === 'idle') {
                this.state = 'wander';
                this.timer = 4 + Math.random() * 6;
                this.wanderAngle = Math.random() * Math.PI * 2;
            } else {
                this.state = 'idle';
                this.timer = 8 + Math.random() * 12;
            }
        }

        // Constrain to anchor
        if (this.anchorPos && this.state === 'wander') {
            const distSq = this.group.position.distanceToSquared(this.anchorPos);
            if (distSq > this.maxAnchorDist * this.maxAnchorDist) {
                const dirToHome = this._tempVec1.subVectors(this.anchorPos, this.group.position).normalize();
                this.wanderAngle = Math.atan2(dirToHome.x, dirToHome.z);
            }
        }
    }

    updateMovement(delta, player) {
        if (this.state === 'wander' && this.pauseTimer <= 0) {
            if (this.isColliding) {
                this.wanderAngle = this.avoidanceAngle;
            }
            this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
            this.group.position.addScaledVector(this._tempVec1, this.moveSpeed * delta);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 4 * delta);
        }

        // Check distance to player - look at player if close
        if (player && player.mesh && this.state === 'idle') {
            const distSq = this.group.position.distanceToSquared(player.mesh.position);
            if (distSq < (8 * SCALE_FACTOR) ** 2) {
                const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 3 * delta);
            }
        }
    }
}
