import * as THREE from 'three';
import { createPlayerMesh } from './player_mesh.js';
import { createAxe } from './axe.js';
import { createClub } from './club.js';
import { createPickaxe } from './pickaxe.js';
import { createSword } from './sword.js';
import { createDagger } from './dagger.js';
import { createKunai } from './kunai.js';
import { createBow } from './bow.js';
import { attachShirt } from './shirt.js';
import { attachUnderwear } from './underwear.js';
import { attachShorts } from './shorts.js';
import * as gear from './gear.js';
import { PlayerAnimator } from './player_animator.js';
import { PlayerPhysics } from './player_physics.js';
import { PlayerInventory, PlayerUI, CraftingMenu, ConversationUI } from './player_stubs.js';
import { FireballProjectile } from './fireball_projectile.js';
import { IceboltProjectile } from './icebolt_projectile.js';

import { SCALE_FACTOR } from './world_bounds.js';

export class Player {
    constructor(scene, shard, characterData = {}) {
        this.scene = scene;
        this.worldManager = shard; // Renamed internally for clarity, but keeping param name 'shard' compatible
        this.characterData = characterData;
        
        this.isCombat = false;

        this.bodyType = characterData.bodyType || 'male';
        
        const { mesh, parts } = createPlayerMesh(characterData);
        this.mesh = mesh;
        this.mesh.rotation.y = Math.PI; // Face away from start camera
        this.scene.add(this.mesh);
        
        this.parts = parts;
        this.underwear = attachUnderwear(this.parts);
        this.shorts = attachShorts(this.parts, characterData);
        this.shirt = attachShirt(this.parts, characterData);

        // Attach gear if present
        if (characterData.gear) {
            if (characterData.gear.vest) gear.attachVest(this.parts);
            if (characterData.gear.leatherArmor) gear.attachLeatherArmor(this.parts);
            if (characterData.gear.headband) gear.attachHeadband(this.parts);
            if (characterData.gear.leatherGloves) gear.attachLeatherGloves(this.parts);
            if (characterData.gear.leatherHuntersCap) gear.attachLeatherHuntersCap(this.parts);
            if (characterData.gear.assassinsCap) gear.attachAssassinsCap(this.parts);
            if (characterData.gear.leatherBoots) gear.attachLeatherBoots(this.parts);
            if (characterData.gear.hood) gear.attachHood(this.parts);
            if (characterData.gear.cloak) gear.attachCloak(this.parts);
            if (characterData.gear.pants) gear.attachPants(this.parts);
        }

        this.animator = new PlayerAnimator(parts);
        
        this.playerPhysics = new PlayerPhysics(this);
        this.inventory = new PlayerInventory(this);
        
        // Grant 500 wood if the player is LordTsarcasm
        if (characterData.name?.toLowerCase() === 'lordtsarcasm') {
            this.inventory.addItem({
                type: 'wood',
                name: 'Wood Log',
                icon: 'wood_log_icon.png',
                count: 500,
                stackLimit: 999 // Increased stack limit for the bonus
            });
        }
        
        this.isLedgeGrabbing = false;
        this.ledgeGrabTime = 0;
        this.ledgeTargetPos = new THREE.Vector3();
        this.isPickingUp = false;
        this.pickUpTime = 0;
        this.deathTime = 0;
        this.deathVariation = { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
        this.ui = new PlayerUI(this);
        this.crafting = new CraftingMenu(this);
        this.conversation = new ConversationUI(this);
        this.quickbar = null;

        this.maxHealth = 100;
        this.health = this.maxHealth;

        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.staminaDrainPerSec = 22;
        this.staminaRegenPerSec = 16;

        this.maxChakra = 100;
        this.chakra = this.maxChakra;
        this.chakraRegenPerSec = 5;

        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;

        this.selectedSkill = { id: 'fireball', name: 'Fireball', icon: 'fireball.png', cost: 20 };

        this.summoningCircle = null;
        this.summoningTime = 0;
        this.isSummoning = false;

        this.isInvulnerable = true;
        this.prevActionPressed = false;
        this.isDead = false;

        // Performance: reuse arrays/objects
        this._nearbyObstacles = [];
        this._tempVec = new THREE.Vector3();

        this.rightHand = new THREE.Group();
        // Position at the bottom of the forearm (forearm height is 0.35)
        this.rightHand.position.set(0, -0.35 * SCALE_FACTOR, 0);
        // Rotate so the held item points "forward" from the hand
        this.rightHand.rotation.x = Math.PI / 2;
        this.rightHand.rotation.z = 0;
        this.parts.rightForeArm.add(this.rightHand);

        this.heldItems = {
            axe: createAxe(),
            club: createClub(),
            pickaxe: createPickaxe(),
            sword: createSword(),
            dagger: createDagger(),
            kunai: createKunai(),
            bow: createBow()
        };

        Object.values(this.heldItems).forEach(mesh => {
            mesh.visible = false;
            this.rightHand.add(mesh);
        });
        
        // Ensure initial held item state is correct
        this.updateHeldItem();

        this.inventory.addItem({
            type: 'bow',
            name: 'Bow',
            icon: 'bow.png',
            count: 1,
            stackLimit: 1
        }, 3);

        // Add dagger to slot 5 (index 4)
        this.inventory.addItem({
            type: 'dagger',
            name: 'Dagger',
            icon: 'wood-dagger.png',
            count: 1,
            stackLimit: 1
        }, 4);

        this.inventory.addItem({
            type: 'kunai',
            name: 'Kunai',
            icon: 'kunai.png',
            count: 1,
            stackLimit: 1
        }, 5);

        // Add Name Tag
        if (characterData.name) {
            this.addNameTag(characterData.name);
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
        ctx.fillText(name, 128, 45);

        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 2.5 * SCALE_FACTOR;
        this.label.scale.set(1.5, 0.375, 1);
        this.mesh.add(this.label);
    }

    updateHeldItem() {
        if (!this.inventory || !this.heldItems) return;
        const slot = this.inventory.selectedSlot;
        const item = this.inventory.hotbar[slot];
        
        let anyVisible = false;
        for (const [type, mesh] of Object.entries(this.heldItems)) {
            const isMatch = !!(item && item.type === type);
            mesh.visible = isMatch;
            if (isMatch) anyVisible = true;
        }

        // If no weapon is held, stop any ongoing swing animations
        if (!anyVisible && this.animator) {
            this.animator.isAxeSwing = false;
            this.animator.axeSwingTimer = 0;
        }
    }

    setClothingVisible(part, isVisible) {
        const clothing = this.parts && this.parts.clothing;
        if (!clothing || !Array.isArray(clothing[part])) return;
        clothing[part].forEach((obj) => {
            if (obj) obj.visible = !!isVisible;
        });
    }

    interact() {
        this.animator.playInteract();
    }

    summon() {
        if (this.isDead || this.isSummoning) return;
        if (this.chakra < 40) {
            this.ui.showStatus("Not enough Chakra for Summoning!", true);
            return;
        }

        this.chakra -= 40;
        this.isSummoning = true;
        this.summoningTime = 3.0; // 3 seconds effect
        this.ui.showStatus("Summoning Jutsu!", false);
        this.ui.updateHud();

        if (!this.summoningCircle) {
            const geo = new THREE.PlaneGeometry(6, 6);
            const tex = new THREE.TextureLoader().load('summoning_circle.png');
            const mat = new THREE.MeshBasicMaterial({ 
                map: tex, 
                transparent: true, 
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                opacity: 0
            });
            this.summoningCircle = new THREE.Mesh(geo, mat);
            this.summoningCircle.rotation.x = -Math.PI / 2;
            this.summoningCircle.matrixAutoUpdate = true;
            // Add to scene directly to avoid inheriting scale from player mesh
            this.scene.add(this.summoningCircle);
        }

        // Use world position to avoid local coordinate issues
        const worldPos = new THREE.Vector3();
        this.mesh.getWorldPosition(worldPos);

        this.summoningCircle.position.x = worldPos.x;
        this.summoningCircle.position.z = worldPos.z;
        const groundHeight = this.worldManager.getTerrainHeight(worldPos.x, worldPos.z);
        this.summoningCircle.position.y = groundHeight + 0.1;
        this.summoningCircle.material.opacity = 1;
        this.summoningCircle.scale.set(1, 1, 1); // Start at full scale

        import('./audio_manager.js').then(({ audioManager }) => {
            audioManager.play('whoosh', 0.8, 0.5);
            audioManager.play('hit-metallic', 0.4, 0.2);
        });

        this.animator.playInteract();
    }

    toggleCombat() {
        this.isCombat = !this.isCombat;
        if (this.ui) this.ui.updateHotbar();
    }

    toggleInvulnerability() {
        this.isInvulnerable = !this.isInvulnerable;
        if (this.ui) {
            this.ui.showStatus(`God mode: ${this.isInvulnerable ? 'Enabled' : 'Disabled'}`, !this.isInvulnerable);
        }
        return this.isInvulnerable;
    }

    castSkill() {
        if (this.isDead || !this.selectedSkill) return;
        if (this.chakra < this.selectedSkill.cost) {
            if (this.ui) this.ui.showStatus("Not enough Chakra!", true);
            return;
        }

        this.chakra -= this.selectedSkill.cost;
        if (this.ui) {
            this.ui.updateHud();
            this.ui.showStatus(`Casting ${this.selectedSkill.name}!`, false);
        }

        // Projectile spawning
        if (this.game) {
            const startPos = this.mesh.position.clone();
            startPos.y += 1.2;
            const targetPos = this.game.inputManager.input.mouseWorldPos;

            if (targetPos) {
                let projectile = null;
                if (this.selectedSkill.id === 'fireball') {
                    projectile = new FireballProjectile(this.scene, startPos, targetPos, this);
                } else if (this.selectedSkill.id === 'icebolt') {
                    projectile = new IceboltProjectile(this.scene, startPos, targetPos, this);
                }

                if (projectile) {
                    this.game.projectiles.push(projectile);
                }
            }
        }

        // Animation and sound feedback
        this.animator.playInteract(); // Use interact as a placeholder casting animation
        import('./audio_manager.js').then(({ audioManager }) => {
            audioManager.play('whoosh', 0.8);
        });

        console.log(`Player: Cast ${this.selectedSkill.id}`);
        // Add actual projectile/effect logic here if requested later
    }

    tryAttack(force = false) {
        if (!force && !this.isCombat) return false;
        if (this.animator.isAxeSwing) return false;
        if (!this.worldManager) return false;

        // Only allow attacking if a weapon is currently equipped/visible
        const activeWeapon = Object.values(this.heldItems).find(m => m.visible);

        const range = 4.0 * SCALE_FACTOR;
        const rangeSq = range * range;
        
        // Target NPCs and Fauna first
        let closestTarget = null;
        let minTargetDistSq = rangeSq;

        // Use player's forward direction to restrict attack to an arc in front
        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);

        const possibleTargets = [
            ...this.worldManager.getNearbyNPCs(this.mesh.position, range * 1.5),
            ...this.worldManager.getNearbyFauna(this.mesh.position, range * 1.5)
        ];

        for (const target of possibleTargets) {
            if (target.isDead) continue;
            const targetPos = (target.group || target.mesh).position;
            const toTarget = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
            const distSq = toTarget.lengthSq();
            
            if (distSq < minTargetDistSq) {
                toTarget.normalize();
                if (playerForward.dot(toTarget) > 0.3) {
                    minTargetDistSq = distSq;
                    closestTarget = target;
                }
            }
        }

        // Always play animation and sound
        if (activeWeapon) {
            this.animator.playAxeSwing();
        } else {
            this.animator.playPunch();
        }
        if (this.game && this.game.multiplayer) {
            this.game.multiplayer.broadcastAttack();
        }
        import('./audio_manager.js').then(({ audioManager }) => {
            audioManager.play('whoosh', 0.6);
        });

        if (closestTarget) {
            if (closestTarget.takeDamage) {
                closestTarget.takeDamage(1, this.mesh.position, this);
            } else {
                if (closestTarget.die) closestTarget.die(this.mesh.position, this);
            }
            return true;
        }

        // Target Resources second
        let closestRes = null;
        let minResDistSq = rangeSq;
        for (const res of this.worldManager.getNearbyResources(this.mesh.position, range * 1.5)) {
            if (res.isDead) continue;
            const resPos = res.group.position;
            const toRes = new THREE.Vector3().subVectors(resPos, this.mesh.position);
            const distSq = toRes.lengthSq();
            
            if (distSq < minResDistSq) {
                toRes.normalize();
                // Arc check for resources too
                if (playerForward.dot(toRes) > 0.3) {
                    minResDistSq = distSq;
                    closestRes = res;
                }
            }
        }

        if (closestRes) {
            closestRes.takeDamage(1, this);
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        if (this.isInvulnerable || this.health <= 0 || this.isDead) return;
        this.health = Math.max(0, this.health - amount);
        if (this.ui) this.ui.updateHud();
        
        // Brief visual flash or feedback
        const originalScale = this.mesh.scale.clone();
        this.mesh.scale.set(0.9, 0.9, 0.9);
        setTimeout(() => {
            if (this.mesh) this.mesh.scale.copy(originalScale);
        }, 100);

        import('./audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.4);
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isCombat = false;
        this.deathTime = 0;
        this.deathVariation = {
            side: Math.random() > 0.5 ? 1 : -1,
            twist: (Math.random() - 0.5) * 0.4,
            fallDir: Math.random() > 0.2 ? 1 : -1,
            stumbleDir: (Math.random() - 0.5) * 0.5
        };
        
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) deathScreen.style.display = 'flex';
        
        if (this.ui) this.ui.showStatus("You have succumbed to the cold...");
    }

    respawn() {
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.chakra = this.maxChakra;
        this.isDead = false;
        this.deathTime = 0;
        
        // Reset position to origin (or a safe zone)
        this.playerPhysics.position.set(0, 5, 0); // Drop in from sky slightly
        this.playerPhysics.velocity.set(0, 0, 0);
        
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) deathScreen.style.display = 'none';
        
        if (this.ui) {
            this.ui.updateHud();
            this.ui.showStatus("A new day begins...", false);
        }
    }

    addXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
        if (this.ui) this.ui.updateHud();
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        
        // Increase stats on level up
        this.maxHealth += 10;
        this.maxStamina += 10;
        this.maxChakra += 10;
        
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.chakra = this.maxChakra;

        if (this.ui) {
            this.ui.showStatus(`Level Up! You are now Level ${this.level}`, false);
            this.ui.updateHud();
        }
    }

    tryHarvest() {
        if (!this.worldManager) return;
        const range = 3.0 * SCALE_FACTOR;
        const rangeSq = range * range;
        
        // 1. Try to collect dropped items (like wood logs)
        const items = this.worldManager.getNearbyItems(this.mesh.position, range * 1.2);
        let closestItem = null;
        let minDistSq = rangeSq;

        for (const item of items) {
            if (item.isDead) continue;
            const distSq = this.mesh.position.distanceToSquared(item.group.position);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestItem = item;
            }
        }

        if (closestItem) {
            if (closestItem.collect(this)) {
                if (this.ui) {
                    this.ui.updateHotbar();
                    this.ui.renderInventory();
                }
                this.animator.playPickup();
                return true;
            }
        }

        // 2. Try to harvest berry bushes
        const resources = this.worldManager.getNearbyResources(this.mesh.position, range * 1.2);
        for (const res of resources) {
            if (res.type === 'berry_bush' && !res.isHarvested && !res.isDead) {
                const distSq = this.mesh.position.distanceToSquared(res.group.position);
                if (distSq < rangeSq) {
                    if (res.harvest()) {
                        const berryItem = { 
                            type: 'berry', 
                            name: 'Winter Berries', 
                            icon: 'berry_icon.png',
                            count: 1,
                            stackLimit: 99
                        };

                        // Berries are bound to slot 8 (index 7) on pickup
                        this.inventory.addItem(berryItem, 7);
                        
                        if (this.ui) this.ui.updateHotbar();
                        this.animator.playPickup();
                        return true;
                    }
                }
            }
        }
        return false;
    }

    eatBerries() {
        const berrySlot = 7; // Hotbar slot 8
        const item = this.inventory.hotbar[berrySlot];
        
        if (item && item.type === 'berry') {
            // Restore resources
            this.health = Math.min(this.maxHealth, this.health + 15);
            this.stamina = Math.min(this.maxStamina, this.stamina + 25);
            
            // Consume the berry
            item.count--;
            if (item.count <= 0) {
                this.inventory.hotbar[berrySlot] = null;
            }
            
            if (this.ui) {
                this.ui.updateHotbar();
                this.ui.updateHud();
            }

            import('./audio_manager.js').then(({ audioManager }) => {
                audioManager.play('harvest', 0.5);
            });
            
            // Interaction visual
            this.animator.playInteract();
        }
    }

    autoCollectItems() {
        if (!this.worldManager) return;
        const range = 5.0 * SCALE_FACTOR;
        const rangeSq = range * range;
        
        const items = this.worldManager.getNearbyItems(this.mesh.position, range * 1.2);
        for (const item of items) {
            if (item.isDead) continue;
            const distSq = this.mesh.position.distanceToSquared(item.group.position);
            if (distSq < rangeSq) {
                if (item.collect(this)) {
                    if (this.ui) {
                        this.ui.updateHotbar();
                        this.ui.renderInventory();
                    }
                }
            }
        }
    }

    update(delta, input, camera) {
        if (this.isDead) {
            this.deathTime += delta;
        } else {
            this.autoCollectItems();

            // Rotate to face cursor
            if (input.mouseWorldPos) {
                const dx = input.mouseWorldPos.x - this.mesh.position.x;
                const dz = input.mouseWorldPos.z - this.mesh.position.z;
                this.mesh.rotation.y = Math.atan2(dx, dz);
            }

            if (this.isPickingUp) {
                this.pickUpTime += delta;
                if (this.pickUpTime > 1.2) {
                    this.isPickingUp = false;
                    this.pickUpTime = 0;
                }
            }
        }

        const actionPressed = !!input.action;
        const actionJustPressed = actionPressed && !this.prevActionPressed;
        this.prevActionPressed = actionPressed;

        // Update Summoning Circle
        if (this.isSummoning) {
            this.summoningTime -= delta;
            if (this.summoningCircle) {
                this.summoningCircle.rotation.z += delta * 2;
                
                // Use world position to avoid local coordinate issues
                const worldPos = new THREE.Vector3();
                this.mesh.getWorldPosition(worldPos);

                this.summoningCircle.position.x = worldPos.x;
                this.summoningCircle.position.z = worldPos.z;
                const groundHeight = this.worldManager.getTerrainHeight(worldPos.x, worldPos.z);
                this.summoningCircle.position.y = groundHeight + 0.1;

                if (this.summoningTime > 2.5) {
                    const s = (3.0 - this.summoningTime) * 2;
                    this.summoningCircle.scale.set(s, s, s);
                } else if (this.summoningTime < 0.5) {
                    this.summoningCircle.material.opacity = this.summoningTime * 2;
                    const s = this.summoningTime * 2;
                    this.summoningCircle.scale.set(s, s, s);
                } else {
                    this.summoningCircle.scale.set(1, 1, 1);
                }
            }
            if (this.summoningTime <= 0) {
                this.isSummoning = false;
                if (this.summoningCircle) this.summoningCircle.material.opacity = 0;
            }
        }

        // Physics update with obstacles for ledge detection
        this._nearbyObstacles.length = 0;
        if (this.worldManager) {
            const nearby = this.worldManager.getNearbyResources(this.mesh.position, 15 * SCALE_FACTOR);
            for (let i = 0; i < nearby.length; i++) {
                if (nearby[i].group) this._nearbyObstacles.push(nearby[i].group);
            }
        }
        this.playerPhysics.update(delta, input, camera, this._nearbyObstacles);

        const isMoving = input.x !== 0 || input.y !== 0;
        const isRunning = input.run && isMoving;

        if (isRunning && !this.isDead) this.stamina = Math.max(0, this.stamina - this.staminaDrainPerSec * delta);
        else this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenPerSec * delta);

        this.chakra = Math.min(this.maxChakra, this.chakra + this.chakraRegenPerSec * delta);

        // Enhanced Animator call
        this.animator.animate(
            delta,
            isMoving && !this.isDead,
            isRunning && !this.isDead,
            this.isPickingUp,
            this.isDead,
            !this.playerPhysics.isGrounded,
            this.isJumping ? this.jumpPhase : 'none',
            this.jumpTimer || 0,
            this.playerPhysics.velocity.y,
            this.isLedgeGrabbing,
            this.ledgeGrabTime || 0,
            this.recoverTimer || 0,
            this.isDragged || false,
            this.draggedPartName || 'hips',
            this.playerPhysics.velocity, // Using physics velocity as drag velocity proxy
            this.deathTime || 0,
            this.deathVariation,
            input.y > 0 // isMovingBackwards
        );

        // Ensure matrices are up to date for physics calculations
        this.mesh.updateMatrixWorld(true);

        // Prepare collision spheres for cloth
        const collisionSpheres = [];
        const addSphere = (obj, radius, yOffset = 0, zOffset = 0) => {
             if(!obj) return;
             const center = new THREE.Vector3();
             obj.getWorldPosition(center);
             center.y += yOffset;
             center.z += zOffset;
             collisionSpheres.push({ center, radius });
        };

        // Add collision spheres (tuned for body proportions)
        if (this.parts.torso) addSphere(this.parts.torso, 0.32 * SCALE_FACTOR, 0, -0.05);
        if (this.parts.hips) addSphere(this.parts.hips, 0.35 * SCALE_FACTOR, 0, -0.05); // Increased radius
        if (this.parts.rightThigh) addSphere(this.parts.rightThigh, 0.18 * SCALE_FACTOR, -0.2 * SCALE_FACTOR, 0.05); // Increased radius and adjusted Z
        if (this.parts.leftThigh) addSphere(this.parts.leftThigh, 0.18 * SCALE_FACTOR, -0.2 * SCALE_FACTOR, 0.05);  // Increased radius and adjusted Z

        // Update cloth simulator if present
        this.mesh.traverse(child => {
            if (child.userData && child.userData.clothSimulator) {
                child.userData.clothSimulator.update(delta, child.matrixWorld, collisionSpheres, this.playerPhysics.velocity);
                child.userData.clothSimulator.updateMesh();
            }
        });

        if (actionJustPressed && !this.isPickingUp && !this.isDead) {
            this.tryAttack(true);
        }

        if (this.ui) this.ui.updateHud();
    }
}