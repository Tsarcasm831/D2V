import * as THREE from 'three';
import { createPlayerMesh } from './player_mesh.js';
import { PlayerAnimator } from './player_animator.js';
import { attachUnderwear } from '../items/underwear.js';
import { attachPants, attachCloak, attachLeatherBoots, attachAssassinsCap } from '../items/gear.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';

/**
 * An enemy assassin NPC that hunts the player.
 * Equipped with a cloak, assassin's cap, black shirt, pants, and black boots.
 */
export class AssassinNPC {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = true;
        this.isDead = false;
        this.type = 'assassin';

        const { mesh, parts } = createPlayerMesh();
        this.group = mesh;
        this.parts = parts;
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const dist = pos.length();
        this.level = Math.floor(Math.min(100, 5 + (dist / 80)));

        this.setupEquipment();
        this.addLevelLabel();
        this.animator = new PlayerAnimator(this.parts);

        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 3;
        this.state = 'idle'; // idle, wander, chase, attack
        this.moveSpeed = 6 * SCALE_FACTOR; // Faster than normal NPCs
        this.chaseSpeed = 9 * SCALE_FACTOR;
        
        this.maxHealth = 15 + Math.floor(this.level / 5);
        this.health = this.maxHealth;
        this.anchorPos = pos.clone();
        this.maxAnchorDist = 40;

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._collisionTimer = 0;
        this._aiTimer = 0;
        this._attackTimer = 0;
    }

    setupEquipment() {
        attachUnderwear(this.parts);
        
        // Black Shirt (Procedural black material)
        const blackMat = new THREE.MeshToonMaterial({ color: 0x111111 });
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
        
        const torsoRadiusTop = 0.3, torsoRadiusBottom = 0.26, shirtLen = 0.32;
        const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, shirtLen, 16);
        const shirtTorso = new THREE.Mesh(shirtTorsoGeo, blackMat);
        shirtTorso.position.y = 0.41 * SCALE_FACTOR;
        this.parts.torsoContainer.add(shirtTorso);

        const topCapGeo = new THREE.SphereGeometry(torsoRadiusTop, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const topCap = new THREE.Mesh(topCapGeo, blackMat);
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
            const sleeve = new THREE.Mesh(sleeveGeo, blackMat);
            sleeve.position.y = -sleeveLen / 2;
            armPart.add(sleeve);
            const so = new THREE.Mesh(sleeveGeo, outlineMat);
            so.scale.setScalar(1.08);
            sleeve.add(so);
        };
        attachSleeve(this.parts.rightArm);
        attachSleeve(this.parts.leftArm);

        // Gear
        attachPants(this.parts, { color: 0x222222 }); // Dark pants
        attachCloak(this.parts);
        
        // Black Boots override
        const boots = attachLeatherBoots(this.parts);
        const blackBootMat = new THREE.MeshToonMaterial({ color: 0x050505 });
        boots.rightBoot.traverse(child => {
            if (child.isMesh && child.material && child.material.type !== 'MeshBasicMaterial') {
                child.material = blackBootMat;
            }
        });
        boots.leftBoot.traverse(child => {
            if (child.isMesh && child.material && child.material.type !== 'MeshBasicMaterial') {
                child.material = blackBootMat;
            }
        });

        attachAssassinsCap(this.parts);
    }

    addLevelLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#ff1744'; // Aggressive red
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv. ${this.level} ASSASSIN`, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 2.6 * SCALE_FACTOR;
        this.label.scale.set(2.4, 0.6, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;
        this.animator.playInteract();

        if (this.health <= 0) {
            this.die(fromPos, player);
        } else {
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('enemy_hit', 0.4);
            });
            this.state = 'chase'; // Aggro on hit
        }
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        
        const dir = new THREE.Vector3().subVectors(this.group.position, fromPos).normalize();
        this.velocity.set(dir.x * 10, 12, dir.z * 10);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.6);
        });

        if (player && player.inventory) {
            player.inventory.addItem({ 
                type: 'shard', 
                name: 'Dark Essence', 
                icon: 'assets/icons/combat_icon.png', 
                count: 1 
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
            const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
            if (this.group.position.y > floorY || this.velocity.y > 0) {
                this.group.position.addScaledVector(this.velocity, delta);
                this.velocity.y -= 40 * delta;
                this.group.rotation.x += 6 * delta;
                if (this.group.position.y < floorY) {
                    this.group.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.group.rotation.x = Math.PI / 2;
                }
            }
            return;
        }

        this._aiTimer -= delta;
        if (this._aiTimer <= 0) {
            this._aiTimer = 0.1;
            this.updateAI(player);
        }

        this.updateMovement(delta, player);

        this._collisionTimer -= delta;
        if (this._collisionTimer <= 0) {
            this._collisionTimer = 0.05;
            this.checkCollisions(player);
        }

        this.animator.animate(delta, this.state === 'wander' || this.state === 'chase', this.state === 'chase', false, this.isDead);
        
        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = floorY;

        // Cloth Update - Only if visible/very close (reduced from 50m to 15m for performance)
        if (player && player.mesh && this.group.position.distanceToSquared(player.mesh.position) < 225) {
            const collisionSpheres = [];
            const addSphere = (obj, radius, yOffset = 0) => {
                 if(!obj) return;
                 const center = new THREE.Vector3();
                 obj.getWorldPosition(center);
                 center.y += yOffset;
                 collisionSpheres.push({ center, radius });
            };
            addSphere(this.parts.torso, 0.32 * SCALE_FACTOR);
            addSphere(this.parts.hips, 0.3 * SCALE_FACTOR);

            this.group.traverse(child => {
                if (child.userData && child.userData.clothSimulator) {
                    child.userData.clothSimulator.update(delta, child.matrixWorld, collisionSpheres);
                    child.userData.clothSimulator.updateMesh();
                }
            });
        }
    }

    updateAI(player) {
        if (!player || !player.mesh) return;
        const distSq = this.group.position.distanceToSquared(player.mesh.position);
        const aggroDistSq = (15 * SCALE_FACTOR) ** 2;
        const attackDistSq = (2 * SCALE_FACTOR) ** 2;

        if (distSq < attackDistSq) {
            this.state = 'attack';
            this.tryAttack(player);
        } else if (distSq < aggroDistSq) {
            this.state = 'chase';
            this.wanderAngle = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
        } else {
            this.timer -= 0.1;
            if (this.timer <= 0) {
                if (this.state === 'idle') {
                    this.state = 'wander';
                    this.timer = 3 + Math.random() * 4;
                    this.wanderAngle = Math.random() * Math.PI * 2;
                } else {
                    this.state = 'idle';
                    this.timer = 5 + Math.random() * 8;
                }
            }
            // Constrain to anchor
            if (this.anchorPos && this.state === 'wander') {
                const aDistSq = this.group.position.distanceToSquared(this.anchorPos);
                if (aDistSq > this.maxAnchorDist * this.maxAnchorDist) {
                    const dirToHome = this._tempVec1.subVectors(this.anchorPos, this.group.position).normalize();
                    this.wanderAngle = Math.atan2(dirToHome.x, dirToHome.z);
                }
            }
        }
    }

    updateMovement(delta, player) {
        if (this.state === 'wander' || this.state === 'chase') {
            const speed = this.state === 'chase' ? this.chaseSpeed : this.moveSpeed;
            this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
            this.group.position.addScaledVector(this._tempVec1, speed * delta);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 6 * delta);
        } else if (this.state === 'attack' && player && player.mesh) {
            const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 10 * delta);
        }
    }

    tryAttack(player) {
        this._attackTimer -= 0.1;
        if (this._attackTimer <= 0) {
            this._attackTimer = 1.5;
            this.animator.playAxeSwing(); // Reusing animation for now
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('whoosh', 0.5);
            });
            if (player.takeDamage) {
                player.takeDamage(10);
            }
        }
    }
}
