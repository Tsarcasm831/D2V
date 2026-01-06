import * as THREE from 'three';
import { createPlayerMesh } from './player_mesh.js';
import { PlayerStats } from './player_modules/player_stats.js';
import { PlayerGear } from './player_modules/player_gear.js';
import { PlayerUI, CraftingMenu, ConversationUI, PlayerInventory } from './player_stubs.js';
import { InventoryUI } from '../ui/inventory_ui.js';
import { PlayerActions } from './player_modules/player_actions.js';
import { PlayerAnimator } from './player_animator.js';
import { PlayerPhysics } from './player_physics.js';
import { BODY_PRESETS } from '../data/constants.js';
import { SCALE_FACTOR, SHARD_SIZE } from '../world/world_bounds.js';

export class Player {
    constructor(scene, shard, characterData = {}) {
        this.scene = scene;
        this.worldManager = shard; 
        this.isCombat = false;

        this.bodyType = characterData.bodyType || 'male';
        
        const { mesh, parts, model } = createPlayerMesh(characterData);
        this.mesh = mesh;
        this.model = model;
        this.parts = parts;
        this.mesh.rotation.y = Math.PI; 
        this.scene.add(this.mesh);
        
        this.animator = new PlayerAnimator(parts);
        this.playerPhysics = new PlayerPhysics(this);
        
        // State Properties
        this.moveSpeed = 15 * SCALE_FACTOR;
        this.turnSpeed = 10;
        this.walkTime = 0;
        this.jumpVelocity = 0;
        this.jumpTimer = 0;
        this.gravity = -30 * SCALE_FACTOR;
        this.jumpPower = 11 * SCALE_FACTOR;

        this.isDead = false;
        this.deathTime = 0;
        this.deathVariation = { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
        this.recoverTimer = 0;
        this.wasDeadKeyPressed = false;
        
        this.isLedgeGrabbing = false;
        this.ledgeGrabTime = 0;
        this.ledgeStartPos = new THREE.Vector3();
        this.ledgeTargetPos = new THREE.Vector3();
        
        this.isPickingUp = false;
        this.pickUpTime = 0;
        this.isInteracting = false;
        this.interactTimer = 0;
        
        this.isSkinning = false;
        this.canSkin = false;
        this.skinningTimer = 0;
        this.maxSkinningTime = 3.0;
        this.skinningProgress = 0;
        
        this.isAxeSwing = false;
        this.axeSwingTimer = 0;
        this.hasHit = false; 
        this.isPunch = false;
        this.punchTimer = 0;
        this.comboChain = 0; 

        this.blinkTimer = 0;
        this.isBlinking = false;
        
        this.isDragged = false;
        this.draggedPartName = 'hips';
        this.dragVelocity = new THREE.Vector3();

        this.inventory = new PlayerInventory(this);
        this.inventoryUI = new InventoryUI(this);
        this.stats = new PlayerStats(this);
        this.gear = new PlayerGear(this);
        this.actions = new PlayerActions(this);

        this.config = {
            bodyType: this.bodyType,
            bodyVariant: characterData.bodyVariant || 'average',
            outfit: characterData.outfit || 'naked',
            equipment: characterData.equipment || { helm: false, shoulders: false, shield: false },
            skinColor: characterData.skinColor || '#ffdbac',
            eyeColor: characterData.eyeColor || '#333333',
            scleraColor: characterData.scleraColor || '#ffffff',
            pupilColor: characterData.pupilColor || '#000000',
            lipColor: characterData.lipColor || '#e0b094',
            headScale: characterData.headScale || 1.0,
            neckThickness: characterData.neckThickness || 1.0,
            neckHeight: characterData.neckHeight || 0.95,
            neckRotation: characterData.neckRotation || 0.0,
            neckTilt: characterData.neckTilt || 0.0,
            torsoWidth: characterData.torsoWidth || 1.0,
            torsoHeight: characterData.torsoHeight || 1.0,
            armScale: characterData.armScale || 1.0,
            legScale: characterData.legScale || 1.0,
            heelScale: characterData.heelScale || 1.218,
            heelHeight: characterData.heelHeight || 1.0,
            toeScale: characterData.toeScale || 1.0,
            footLength: characterData.footLength || 1.0,
            footWidth: characterData.footWidth || 1.0,
            toeSpread: characterData.toeSpread || 1.0,
            chinSize: characterData.chinSize || 0.7,
            chinLength: characterData.chinLength || 1.0,
            chinForward: characterData.chinForward || 0.03,
            chinHeight: characterData.chinHeight || -0.04,
            irisScale: characterData.irisScale || 1.0,
            pupilScale: characterData.pupilScale || 1.0,
            ...BODY_PRESETS[characterData.bodyVariant || 'average']
        };

        this.lastBodyType = this.config.bodyType;
        this.lastOutfit = this.config.outfit;
        this.lastEquipmentState = JSON.stringify(this.config.equipment);

        this.ui = new PlayerUI(this);
        this.crafting = new CraftingMenu(this);
        this.conversation = new ConversationUI(this);
        this.quickbar = null;
        
        this.stats.recalculate();

        this.prevActionPressed = false;

        // Performance: reuse arrays/objects
        this._nearbyObstacles = [];
        this._tempVec = new THREE.Vector3();
        
        // Personal Light
        this.playerLight = new THREE.PointLight(0xffcc88, 15, 12, 1.5); 
        this.playerLight.layers.disableAll();
        this.playerLight.layers.enable(1);
        this.playerLight.castShadow = false; 
        this.scene.add(this.playerLight);

        // Ensure initial visuals
        this.gear.init(this.parts, characterData);
        this.gear.updateHeldItem();
        if (characterData.name) {
            this.addNameTag(characterData.name);
        }
    }

    addXP(amount) {
        if (this.stats) this.stats.addXP(amount);
    }

    takeDamage(amount) {
        if (this.isDead || (this.actions && this.actions.isInvulnerable)) return;

        this.stats.health -= amount;
        if (this.stats.health <= 0) {
            this.stats.health = 0;
            this.toggleDeath();
        }

        if (this.ui) this.ui.updateHud();
        
        if (this.mesh) {
            const originalScale = this.mesh.scale.clone();
            this.mesh.scale.multiplyScalar(0.95);
            setTimeout(() => {
                if (this.mesh) this.mesh.scale.copy(originalScale);
            }, 100);
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

    addItem(itemName) {
        if (!this.inventory) return false;
        const itemObj = {
            id: `item-${Math.random().toString(36).substr(2, 9)}`,
            type: itemName.toLowerCase(),
            name: itemName,
            count: 1
        };
        return this.inventory.addItem(itemObj);
    }

    toggleHitbox() {
        this.isDebugHitbox = !this.isDebugHitbox;
        import('./player/PlayerDebug.js').then(({ PlayerDebug }) => {
            PlayerDebug.updateHitboxVisuals(this);
        });
    }

    respawn() {
        const PLATEAU_X = 7509.5;
        const PLATEAU_Z = -6949.1;
        this.playerPhysics.position.set(PLATEAU_X, 5, PLATEAU_Z);
        this.jumpVelocity = 0;
        this.stats.health = this.stats.maxHealth;
        this.isDead = false;
        if (this.ui) this.ui.updateHud();
    }

    teleport(x, z) {
        this.playerPhysics.position.set(x, 20, z);
        this.jumpVelocity = 0;
        if (this.mesh) this.mesh.position.copy(this.playerPhysics.position);
        
        if (this.worldManager) {
            this.worldManager.updateShards(Math.floor((x + SHARD_SIZE / 2) / SHARD_SIZE), Math.floor((z + SHARD_SIZE / 2) / SHARD_SIZE));
            const groundY = this.worldManager.getTerrainHeight(x, z);
            this.playerPhysics.position.y = groundY + 1;
        }
        
        if (this.ui) this.ui.showStatus(`Teleported to ${Math.round(x/SHARD_SIZE)}, ${Math.round(z/SHARD_SIZE)}`, false);
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

    syncConfig() {
        if (!this.model) return;

        if (this.lastOutfit !== this.config.outfit) {
            this.model.applyOutfit(this.config.outfit, this.config.skinColor);
            this.lastOutfit = this.config.outfit;
        }

        const eqKey = JSON.stringify(this.config.equipment);
        if (this.lastEquipmentState !== eqKey) {
            this.model.updateEquipment(this.config.equipment);
            this.lastEquipmentState = eqKey;
        }

        this.model.sync(this.config);
    }

    updateCloth(delta) {
        if (!this.mesh || !this.parts) return;

        const collisionSpheres = [];
        const addSphere = (obj, radius, yOffset = 0) => {
            if (!obj) return;
            const center = new THREE.Vector3();
            obj.getWorldPosition(center);
            center.y += yOffset;
            collisionSpheres.push({ center, radius });
        };
        const addSphereLocal = (obj, radius, offset) => {
            if (!obj) return;
            const center = offset.clone().applyMatrix4(obj.matrixWorld);
            collisionSpheres.push({ center, radius });
        };

        this.mesh.updateMatrixWorld(true);

        addSphere(this.parts.torso, 0.32 * SCALE_FACTOR);
        addSphere(this.parts.hips, 0.3 * SCALE_FACTOR);
        addSphere(this.parts.topCap, 0.26 * SCALE_FACTOR, 0.02 * SCALE_FACTOR);
        const upperArmOffset = new THREE.Vector3(0, -0.14 * SCALE_FACTOR, 0);
        const foreArmOffset = new THREE.Vector3(0, -0.12 * SCALE_FACTOR, 0);
        addSphereLocal(this.parts.rightArm, 0.13 * SCALE_FACTOR, upperArmOffset);
        addSphereLocal(this.parts.leftArm, 0.13 * SCALE_FACTOR, upperArmOffset);
        addSphereLocal(this.parts.rightForeArm, 0.11 * SCALE_FACTOR, foreArmOffset);
        addSphereLocal(this.parts.leftForeArm, 0.11 * SCALE_FACTOR, foreArmOffset);

        const anchorVelocity = this.playerPhysics ? this.playerPhysics.velocity : null;

        this.mesh.traverse(child => {
            if (child.userData && child.userData.clothSimulator) {
                child.userData.clothSimulator.update(delta, child.matrixWorld, collisionSpheres, anchorVelocity);
                child.userData.clothSimulator.updateMesh();
            }
        });
    }

    update(delta, input, camera) {
        this.syncConfig();

        if (this.actions && this.actions.update) {
            this.actions.update(delta);
        }
        
        if (input.isDead && !this.wasDeadKeyPressed) {
            this.toggleDeath();
        }
        this.wasDeadKeyPressed = !!input.isDead;

        if (this.isDead) {
            this.deathTime += delta;
        } else {
            if (this.recoverTimer > 0) this.recoverTimer -= delta;
            
            if (this.playerPhysics) {
                const nearbyObstacles = this.worldManager ? this.worldManager.getNearbyResources(this.mesh.position, 10 * SCALE_FACTOR) : [];
                const obstacleMeshes = nearbyObstacles.map(res => res.group).filter(g => g);
                this.playerPhysics.update(delta, input, camera, obstacleMeshes);
            }
        }

        if (this.animator) {
            const isMoving = input.x !== 0 || input.y !== 0;
            this.animator.animate(delta, isMoving, input.run, this.isPickingUp, this.isDead, this.isJumping, '', 0, this.jumpVelocity, this.isLedgeGrabbing, this.ledgeGrabTime, this.recoverTimer, this.isDragged, this.draggedPartName, this.dragVelocity, this.deathTime, this.deathVariation, false, input.x, input.y);
        }

        this.updateCloth(delta);

        if (this.ui) this.ui.updateHud();

        if (this.playerLight && this.mesh) {
            const offset = new THREE.Vector3(0, 2.5, -1.0);
            this.playerLight.position.copy(this.mesh.position).add(offset);
        }

        if (this.mesh) {
            this.mesh.traverse(child => {
                child.layers.set(0);
                if (child.isMesh) {
                    child.receiveShadow = false;
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            mat.lightMapIntensity = 0;
                            if (!mat._lightbulbFixed) {
                                mat.onBeforeCompile = (shader) => {
                                    shader.fragmentShader = shader.fragmentShader.replace(
                                        '#include <lights_pars_begin>',
                                        `#include <lights_pars_begin>
                                        #undef USE_PUNCTUAL_LIGHTS
                                        `
                                    );
                                };
                                mat.customProgramCacheKey = () => 'no_point_lights';
                                mat._lightbulbFixed = true;
                            }
                            if (mat.defines) delete mat.defines.USE_LIGHTMAP;
                        });
                    }
                }
            });
        }
    }

    toggleDeath() {
        this.isDead = !this.isDead;
        this.deathTime = 0;
        if (this.isDead) {
            this.deathVariation = {
                side: Math.random() > 0.5 ? 1 : -1,
                twist: (Math.random() - 0.5) * 0.5,
                fallDir: Math.random() > 0.5 ? 1 : -1,
                stumbleDir: (Math.random() - 0.5) * 0.5
            };
        } else {
            this.recoverTimer = 0.5;
            this.mesh.rotation.set(0, this.mesh.rotation.y, 0);
        }
    }
}

export default Player;
