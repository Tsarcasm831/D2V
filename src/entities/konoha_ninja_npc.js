import * as THREE from 'three';
import { createPlayerMesh } from './player_mesh.js';
import { attachUnderwear } from '../items/underwear.js';
import * as gear from '../items/gear.js';
import { PlayerAnimator } from './player_animator.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';
import { createKunai } from '../items/kunai.js';

export class KonohaNinjaNPC {
    constructor(scene, shard, pos, name = "Konoha Ninja") {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = false;
        this.isDead = false;

        // Create the humanoid mesh using the same system as the player
        const characterData = {
            name: name,
            bodyType: 'male',
            skinColor: '#ffdbac',
            shirtColor: '#ffffff',
            outfit: 'noble', // White procedural shirt
            equipment: {
                shirt: true,
                pants: true,
                helm: false,
                shoulders: false,
                shield: false
            }
        };

        const { mesh, parts, model } = createPlayerMesh(characterData);
        this.mesh = mesh;
        this.parts = parts;
        this.model = model;
        this.mesh.position.copy(pos);
        this.scene.add(this.mesh);

        // Ninja gear (Specific attachments)
        this.vest = gear.attachVest(this.parts);
        this.headband = gear.attachHeadband(this.parts);
        
        // Equip Kunai
        this.kunai = createKunai();
        this.kunai.rotation.x = 0;
        this.kunai.rotation.y = 0;
        this.kunai.rotation.z = Math.PI / 2;
        this.kunai.position.set(0, -0.1 * SCALE_FACTOR, 0.1 * SCALE_FACTOR);
        this.parts.rightHand.add(this.kunai);
        
        // No boots as requested (so they are barefoot or just have the base foot mesh)

        this.animator = new PlayerAnimator(this.parts, this.model);
        
        const levelCenter = (shard && shard.worldManager && shard.worldManager.levelCenter) ? shard.worldManager.levelCenter : new THREE.Vector3(0, 0, 0);
        const dist = pos.distanceTo(levelCenter);
        this.level = Math.floor(Math.min(100, 5 + (dist / 80)));

        this.velocity = new THREE.Vector3();
        this.maxHealth = 100;
        this.health = this.maxHealth;

        // AI State
        this.state = 'idle';
        this.stateTimer = 0;
        this.targetNPC = null;
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        this._collisionTimer = 0;
        this._aiTimer = 0;
        this._attackTimer = 0;

        if (name) {
            this.addNameTag(name);
        }
    }

    addNameTag(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv. ${this.level} ${name}`, 128, 45);

        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 2.5 * SCALE_FACTOR;
        this.label.scale.set(1.5, 0.375, 1);
        this.mesh.add(this.label);
    }

    takeDamage(amount, fromPos, attacker) {
        if (this.isDead) return;
        this.health -= amount;
        
        // Flash red
        this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                const oldColor = child.material.color.clone();
                child.material.color.set(0xff0000);
                setTimeout(() => {
                    if (child.material) child.material.color.copy(oldColor);
                }, 100);
            }
        });

        if (this.health <= 0) {
            this.die(fromPos);
        }
    }

    die(fromPos) {
        if (this.isDead) return;
        this.isDead = true;
        this.state = 'dead';
        
        if (fromPos) {
            const dir = this._tempVec1.subVectors(this.mesh.position, fromPos).normalize();
            this.velocity.set(dir.x * 5, 5, dir.z * 5);
        }
    }

    checkCollisions(player) {
        if (!this.shard || this.isDead) return;
        const myPos = this.mesh.position;
        
        // Skip collisions if player is too far (performance optimization)
        if (player && player.mesh) {
            const distSqToPlayer = myPos.distanceToSquared(player.mesh.position);
            if (distSqToPlayer > 2500) return; // Skip if > 50m from player
        }

        const myRadius = 0.5 * SCALE_FACTOR;

        if (player && player.mesh) {
            const pPos = player.mesh.position;
            const dx = myPos.x - pPos.x;
            const dz = myPos.z - pPos.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < (myRadius + 0.5 * SCALE_FACTOR) ** 2) {
                const dist = Math.sqrt(distSq) || 0.01;
                const overlap = (myRadius + 0.5 * SCALE_FACTOR - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }
    }

    update(delta, player) {
        if (this.isDead) {
            // Basic death physics
            const floorY = this.shard ? this.shard.getTerrainHeight(this.mesh.position.x, this.mesh.position.z) : 0;
            if (this.mesh.position.y > floorY || this.velocity.y > 0) {
                this.mesh.position.addScaledVector(this.velocity, delta);
                this.velocity.y -= 20 * delta;
                this.mesh.rotation.x += 2 * delta;
                
                if (this.mesh.position.y < floorY) {
                    this.mesh.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.mesh.rotation.x = Math.PI / 2;
                }
            }
            return;
        }

        // AI Throttling
        this._aiTimer = (this._aiTimer || 0) - delta;
        if (this._aiTimer <= 0) {
            this._aiTimer = 0.2; // 5Hz AI update for Ninja
            this.updateAI(player);
        }

        this.updateMovement(delta, player);

        this._collisionTimer -= delta;
        if (this._collisionTimer <= 0) {
            this._collisionTimer = 0.1; // 10Hz collision update for Ninja
            this.checkCollisions(player);
        }

        // Animation throttling
        const isMoving = this.state === 'wander';
        this.animator.animate(
            delta,
            isMoving,
            false, // isRunning
            false, // isPickingUp
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
            null, // deathVariation
            false, // isMovingBackwards
            0, // strafe
            0 // forward
        );
        
        // Keep on ground
        if (this.shard) {
            const floorY = this.shard.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
            this.mesh.position.y = floorY;
        }
    }

    updateAI(player) {
        if (this.isDead) return;

        // Group behavior: Stay near other Konoha Ninjas
        let centerOfMass = new THREE.Vector3();
        let neighborCount = 0;
        if (this.shard && this.shard.npcs) {
            for (const npc of this.shard.npcs) {
                if (npc instanceof KonohaNinjaNPC && npc !== this && !npc.isDead) {
                    const dSq = this.mesh.position.distanceToSquared(npc.mesh.position);
                    if (dSq < (10 * SCALE_FACTOR) ** 2) {
                        centerOfMass.add(npc.mesh.position);
                        neighborCount++;
                    }
                }
            }
        }

        // Normal Idle/Wander logic
        this.stateTimer -= 0.2;
        if (this.stateTimer <= 0) {
            this.state = Math.random() > 0.7 ? 'wander' : 'idle';
            this.stateTimer = 2 + Math.random() * 3;
            
            if (this.state === 'wander') {
                if (neighborCount > 0) {
                    centerOfMass.divideScalar(neighborCount);
                    const dirToCenter = this._tempVec1.subVectors(centerOfMass, this.mesh.position).normalize();
                    const angleToCenter = Math.atan2(dirToCenter.x, dirToCenter.z);
                    this.wanderDir = angleToCenter + (Math.random() - 0.5) * 1.0;
                } else {
                    this.wanderDir = Math.random() * Math.PI * 2;
                }
            }
        }
    }

    tryAttack(target) {
        this._attackTimer -= 0.2;
        if (this._attackTimer <= 0) {
            this._attackTimer = 1.2;
            this.animator.playAxeSwing(); // Reusing swing animation for kunai
            if (target.takeDamage) {
                target.takeDamage(5, this.mesh.position, this);
            }
        }
    }

    updateMovement(delta, player) {
        if (this.state === 'wander' || this.state === 'chase') {
            const speed = this.state === 'chase' ? 5 * SCALE_FACTOR : 2 * SCALE_FACTOR;
            this.mesh.position.x += Math.sin(this.wanderDir) * speed * delta;
            this.mesh.position.z += Math.cos(this.wanderDir) * speed * delta;
            this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.wanderDir, 6 * delta);
        }
    }
}
