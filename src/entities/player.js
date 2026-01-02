import * as THREE from 'three';
import { createPlayerMesh } from './player_mesh.js';
import { createAxe } from '../items/axe.js';
import { createClub } from '../items/club.js';
import { createPickaxe } from '../items/pickaxe.js';
import { createSword } from '../items/sword.js';
import { createDagger } from '../items/dagger.js';
import { createKunai } from '../items/kunai.js';
import { attachBow } from '../items/bow.js';
import { attachShirt } from '../items/shirt.js';
import { attachUnderwear } from '../items/underwear.js';
import { attachShorts } from '../items/shorts.js';
import * as gear from '../items/gear.js';
import { PlayerStats } from './player_modules/player_stats.js';
import { PlayerGear } from './player_modules/player_gear.js';
import { PlayerUI, CraftingMenu, ConversationUI, PlayerInventory } from './player_stubs.js';
import { InventoryUI } from '../ui/inventory_ui.js';
import { PlayerActions } from './player_modules/player_actions.js';
import { PlayerAnimator } from './player_animator.js';
import { PlayerPhysics } from './player_physics.js';
import { FireballProjectile } from '../systems/fireball_projectile.js';
import { IceboltProjectile } from '../systems/icebolt_projectile.js';
import { Owl } from './owl.js';
import { getShardSeed, getSeededRandom } from '../utils/seeded_random.js';

import { SCALE_FACTOR, SHARD_SIZE } from '../world/world_bounds.js';

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
        // this.shorts = attachShorts(this.parts, characterData);
        // this.shirt = attachShirt(this.parts, characterData);

        // Attach gear if present
        if (characterData.gear) {
            Object.entries(characterData.gear).forEach(([key, isEnabled]) => {
                if (isEnabled) {
                    // Visual attachment
                    const camelName = key.charAt(0).toUpperCase() + key.slice(1);
                    const fnName = `attach${camelName}`;
                    if (gear[fnName]) gear[fnName](this.parts);
                }
            });
        }

        this.animator = new PlayerAnimator(parts);
        
        this.playerPhysics = new PlayerPhysics(this);
        this.inventory = new PlayerInventory(this);
        this.inventoryUI = new InventoryUI(this);

        this.stats = new PlayerStats(this);
        this.gear = new PlayerGear(this);
        this.actions = new PlayerActions(this);

        this.gear.init(this.parts, characterData);
        
        // Finalize initial visuals based on inventory state
        if (this.gear.updateVisuals) this.gear.updateVisuals();
        
        // Grant 500 wood if the player is LordTsarcasm
        if (characterData.name?.toLowerCase() === 'lordtsarcasm') {
            // Inventory logic removed
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
        
        this.stats.recalculate();

        this.prevActionPressed = false;
        this.isDead = false;

        // Performance: reuse arrays/objects
        this._nearbyObstacles = [];
        this._tempVec = new THREE.Vector3();

        // Ensure initial held item state is correct
        this.gear.updateHeldItem();

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

    recalculateStats() {
        if (this.stats) this.stats.recalculate();
        if (this.ui) this.ui.updateHud();
    }

    updateHeldItem() {
        if (this.gear) this.gear.updateHeldItem();
    }

    setClothingVisible(part, isVisible) {
        if (this.gear) this.gear.setClothingVisible(part, isVisible);
    }

    interact() {
        if (this.actions) this.actions.interact();
    }

    summon() {
        if (this.actions) this.actions.summon();
    }

    toggleCombat() {
        if (this.actions) this.actions.toggleCombat();
    }

    toggleInvulnerability() {
        if (this.actions) return this.actions.toggleInvulnerability();
        return false;
    }

    castSkill() {
        if (this.actions) this.actions.castSkill();
    }

    tryInteractPlot(isRightClick = false) {
        if (this.actions) return this.actions.tryInteractPlot(isRightClick);
        return false;
    }

    tryHarvest() {
        if (this.actions) return this.actions.tryHarvest();
        return false;
    }

    update(delta, input, camera) {
        if (this.isDead) return;

        // Update physics
        if (this.playerPhysics) {
            const nearbyObstacles = this.worldManager ? this.worldManager.getNearbyResources(this.mesh.position, 10 * SCALE_FACTOR) : [];
            const obstacleMeshes = nearbyObstacles.map(res => res.group).filter(g => g);
            this.playerPhysics.update(delta, input, camera, obstacleMeshes);
            
            // Face the cursor in topdown mode, or camera direction in FPV
            if (this.worldManager && this.worldManager.game && this.worldManager.game.cameraMode === 'fpv') {
                const cameraDir = new THREE.Vector3();
                camera.getWorldDirection(cameraDir);
                cameraDir.y = 0;
                cameraDir.normalize();
                
                if (cameraDir.lengthSq() > 0.001) {
                    const targetRotation = Math.atan2(cameraDir.x, cameraDir.z);
                    this.mesh.rotation.y = targetRotation;
                }
            } else if (input.mouseWorldPos) {
                // Topdown mode: Face the cursor
                const dx = input.mouseWorldPos.x - this.mesh.position.x;
                const dz = input.mouseWorldPos.z - this.mesh.position.z;
                
                // Only update rotation if mouse is far enough from player to avoid jitter
                if (dx * dx + dz * dz > 0.1) {
                    const targetRotation = Math.atan2(dx, dz);
                    this.mesh.rotation.y = targetRotation;
                }
            }
        }

        // Handle Ledge Grabbing logic
        if (this.isLedgeGrabbing) {
            this.ledgeGrabTime += delta;
            if (this.ledgeGrabTime > 0.9) {
                this.isLedgeGrabbing = false;
                this.ledgeGrabTime = 0;
            }
        }

        // Update animator
        if (this.animator && this.playerPhysics) {
            const isMoving = Math.abs(this.playerPhysics.velocity.x) > 0.1 || Math.abs(this.playerPhysics.velocity.z) > 0.1;
            const isRunning = input.run;
            const isJumping = !this.playerPhysics.isGrounded;
            
            // Basic jump phase detection
            let jumpPhase = 'air';
            if (this.playerPhysics.velocity.y > 0) jumpPhase = 'anticipation';
            
            this.animator.animate(
                delta,
                isMoving,
                isRunning,
                this.isPickingUp,
                this.isDead,
                isJumping,
                jumpPhase,
                0, // jumpTimer
                this.playerPhysics.velocity.y,
                this.isLedgeGrabbing,
                this.ledgeGrabTime,
                0, // recoverTimer
                false, // isDragged
                '', // draggedPartName
                new THREE.Vector3(), // dragVelocity
                this.deathTime,
                this.deathVariation,
                false // isMovingBackwards
            );
        }

        // Handle Attack/Action
        const isInventoryOpen = this.inventoryUI && this.inventoryUI.container && window.getComputedStyle(this.inventoryUI.container).display !== 'none';
        
        if (input.action && !this.prevActionPressed && !isInventoryOpen) {
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                this.animator.playPunch();
                audioManager.play('whoosh', 0.5, 1.4);
            });
        }
        this.prevActionPressed = input.action;

        if (this.ui) this.ui.updateHud();
    }
}

export default Player;