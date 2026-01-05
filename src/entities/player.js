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
        this.actions.update = (delta) => {
            // Handle combat/gathering logic first (mining, chopping, attacking)
            if (this.actions.updateCombat) {
                this.actions.updateCombat(delta);
            }
            
            if (this.actions.updateParticles) {
                this.actions.updateParticles(delta);
            }
            if (this.actions.isSummoning) {
                this.actions.summoningTime -= delta;
                
                if (this.actions.summoningCircle) {
                    // Animation: Rotate and Scale Pulse
                    this.actions.summoningCircle.rotation.z += delta * 2; // Spin the circle
                    
                    const totalTime = 3.0;
                    const elapsed = totalTime - this.actions.summoningTime;
                    
                    // Scale up from 0 to 6 over first 0.5s, then pulse slightly
                    let targetScale = 6;
                    if (elapsed < 0.5) {
                        targetScale = (elapsed / 0.5) * 6;
                    } else {
                        targetScale = 6 + Math.sin(elapsed * 5) * 0.2;
                    }
                    // Apply uniform scale to avoid stretching
                    this.actions.summoningCircle.scale.set(targetScale, targetScale, targetScale);

                    // Fade out logic
                    const fadeTime = 0.5;
                    if (this.actions.summoningTime < fadeTime) {
                        this.actions.summoningCircle.material.opacity = this.actions.summoningTime / fadeTime;
                    } else {
                        this.actions.summoningCircle.material.opacity = 1;
                    }
                }

                if (this.actions.summoningTime <= 0) {
                    this.actions.isSummoning = false;
                    this.actions.summoningTime = 0;
                    if (this.actions.summoningCircle) {
                        this.actions.summoningCircle.visible = false;
                    }
                }
            }
        };

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
        this.isDead = false;
        this.godMode = false;
        this.deathTime = 0;
        this.deathVariation = { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
        this.wasDeadKeyPressed = false;
        this.recoverTimer = 0;

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
        this.isDead = false;

        // Performance: reuse arrays/objects
        this._nearbyObstacles = [];
        this._tempVec = new THREE.Vector3();
        
        // Restore Personal Light Radius (Large, warm amber illumination)
        // Using a PointLight with a large distance and soft falloff
        this.playerLight = new THREE.PointLight(0xffcc88, 15, 12, 1.5); 
        
        // Strictly isolate light to Layer 1 (World Objects)
        // Player mesh and its sub-parts remain on Layer 0
        this.playerLight.layers.disableAll();
        this.playerLight.layers.enable(1);
        this.playerLight.castShadow = false; 
        
        // Add directly to scene to avoid mesh-relative issues
        this.scene.add(this.playerLight);

        // Ensure initial held item state is correct
        this.gear.updateHeldItem();

        // Add Name Tag
        if (characterData.name) {
            this.addNameTag(characterData.name);
        }
    }

    takeDamage(amount) {
        if (this.isDead || (this.actions && this.actions.isInvulnerable) || this.godMode) return;

        this.stats.health -= amount;
        if (this.stats.health <= 0) {
            this.stats.health = 0;
            this.isDead = true;
            this.deathTime = 0;
            this.deathVariation = {
                side: Math.random() > 0.5 ? 1 : -1,
                twist: (Math.random() - 0.5) * 0.5,
                fallDir: Math.random() > 0.5 ? 1 : -1,
                stumbleDir: (Math.random() - 0.5) * 0.5
            };
        }

        if (this.ui) this.ui.updateHud();
        
        // Visual feedback
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

    recalculateStats() {
        if (this.stats) this.stats.recalculate();
        if (this.ui) this.ui.updateHud();
    }

    respawn() {
        const PLATEAU_X = 7509.5;
        const PLATEAU_Z = -6949.1;
        this.playerPhysics.position.set(PLATEAU_X, 5, PLATEAU_Z);
        this.playerPhysics.velocity.set(0, 0, 0);
        this.stats.health = this.stats.maxHealth;
        this.isDead = false;
        if (this.ui) this.ui.updateHud();
    }

    teleport(x, z) {
        this.playerPhysics.position.set(x, 20, z); // Start slightly in air to avoid ground issues
        this.playerPhysics.velocity.set(0, 0, 0);
        if (this.mesh) this.mesh.position.copy(this.playerPhysics.position);
        
        // Force world update around new position
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
        if (this.actions) {
            this.actions.summon();
        }
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

    updateConfig() {
        if (!this.parts || !this.parts.materials) return;

        const mats = this.parts.materials;

        // Outfit changes
        if (this.lastOutfit !== this.config.outfit) {
            this.applyOutfit(this.config.outfit);
            this.lastOutfit = this.config.outfit;
        }

        // Equipment changes
        const eqKey = JSON.stringify(this.config.equipment);
        if (this.lastEquipmentState !== eqKey) {
            this.updateEquipment();
            this.lastEquipmentState = eqKey;
        }

        // Mesh Transforms
        if (this.parts.head) this.parts.head.scale.setScalar(this.config.headScale);
        if (this.parts.jaw) {
            this.parts.jaw.scale.setScalar(this.config.chinSize);
            this.parts.jaw.position.y = -0.05 + this.config.chinHeight;
        }
        if (this.parts.jawMesh) {
            this.parts.jawMesh.scale.y = 0.45 * this.config.chinLength;
            this.parts.jawMesh.position.z = 0.09 + this.config.chinForward;
        }
        if (this.parts.jawOutline) {
            this.parts.jawOutline.scale.y = this.parts.jawMesh.scale.y * 1.05;
            this.parts.jawOutline.position.z = this.parts.jawMesh.position.z;
        }

        if (this.parts.torsoContainer) {
            this.parts.torsoContainer.scale.set(this.config.torsoWidth, this.config.torsoHeight, this.config.torsoWidth);
        }

        if (this.parts.rightArm) this.parts.rightArm.scale.setScalar(this.config.armScale);
        if (this.parts.leftArm) this.parts.leftArm.scale.setScalar(this.config.armScale);
        if (this.parts.rightThigh) this.parts.rightThigh.scale.setScalar(this.config.legScale);
        if (this.parts.leftThigh) this.parts.leftThigh.scale.setScalar(this.config.legScale);

        if (this.parts.heelGroups) {
            this.parts.heelGroups.forEach(grp => {
                grp.scale.setScalar(this.config.heelScale);
                grp.scale.y *= this.config.heelHeight;
            });
        }
        if (this.parts.forefootGroups) {
            this.parts.forefootGroups.forEach(grp => {
                grp.scale.set(this.config.footWidth, 1, this.config.footLength);
            });
        }
        if (this.parts.toeUnits && this.parts.toeUnits.length === 10) {
            this.parts.toeUnits.forEach((unit, idx) => {
                const i = idx % 5;
                const xBase = (i - 2) * 0.035;
                unit.position.x = xBase * this.config.toeSpread;
            });
        }

        // Material Updates
        if (mats.skin) mats.skin.color.set(this.config.skinColor);
        if (mats.sclera) mats.sclera.color.set(this.config.scleraColor);
        if (mats.iris) mats.iris.color.set(this.config.eyeColor);
        if (mats.pupil) mats.pupil.color.set(this.config.pupilColor);
        if (mats.lip) mats.lip.color.set(this.config.lipColor);

        if (this.parts.irises) {
            this.parts.irises.forEach(iris => iris.scale.setScalar(this.config.irisScale));
        }
        if (this.parts.pupils) {
            this.parts.pupils.forEach(pupil => pupil.scale.setScalar(this.config.pupilScale));
        }

        if (this.config.outfit === 'naked') {
            if (mats.shirt) mats.shirt.color.set(this.config.skinColor);
            if (mats.pants) mats.pants.color.set(this.config.skinColor);
            if (mats.boots) mats.boots.color.set(this.config.skinColor);
        }

        if (this.lastBodyType !== this.config.bodyType) {
            if (this.parts.chest) this.parts.chest.visible = (this.config.bodyType === 'female');
            this.lastBodyType = this.config.bodyType;
        }
    }

    applyOutfit(outfit) {
        if (!this.parts || !this.parts.materials) return;
        const mats = this.parts.materials;
        let shirtColor = 0x888888;
        let pantsColor = 0x444444;
        let bootsColor = 0x222222;

        switch (outfit) {
            case 'naked':
                mats.shirt.color.set(this.config.skinColor);
                mats.pants.color.set(this.config.skinColor);
                mats.boots.color.set(this.config.skinColor);
                return;
            case 'peasant':
                shirtColor = 0x8d6e63;
                pantsColor = 0x5d4037;
                bootsColor = 0x3e2723;
                break;
            case 'warrior':
                shirtColor = 0x607d8b;
                pantsColor = 0x37474f;
                bootsColor = 0x263238;
                break;
            case 'noble':
                shirtColor = 0x3f51b5;
                pantsColor = 0x1a237e;
                bootsColor = 0x111111;
                break;
        }

        if (mats.shirt) mats.shirt.color.setHex(shirtColor);
        if (mats.pants) mats.pants.color.setHex(pantsColor);
        if (mats.boots) mats.boots.color.setHex(bootsColor);
    }

    updateEquipment() {
        if (!this.parts) return;
        const { helm, shoulders, shield } = this.config.equipment;
        this.equippedMeshes = this.equippedMeshes || {};

        // Helm
        if (helm) {
            if (!this.equippedMeshes.helm && this.parts.headMount) {
                const helmGroup = new THREE.Group();
                const helmGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.15, 16);
                const helmMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6, roughness: 0.4 });
                const mesh = new THREE.Mesh(helmGeo, helmMat);
                mesh.position.y = 0.1;
                mesh.castShadow = true;
                helmGroup.add(mesh);
                
                const topGeo = new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI/2);
                const top = new THREE.Mesh(topGeo, helmMat);
                top.position.y = 0.15/2;
                helmGroup.add(top);

                this.parts.headMount.add(helmGroup);
                this.equippedMeshes.helm = helmGroup;
            }
            if (this.equippedMeshes.helm) this.equippedMeshes.helm.visible = true;
        } else {
            if (this.equippedMeshes.helm) this.equippedMeshes.helm.visible = false;
        }

        // Shoulders
        if (shoulders) {
            if (!this.equippedMeshes.leftPauldron && this.parts.leftShoulderMount && this.parts.rightShoulderMount) {
                const createPauldron = () => {
                    const group = new THREE.Group();
                    const geo = new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI * 2, 0, Math.PI/2);
                    const mat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6, roughness: 0.4 });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.scale.set(1, 0.8, 1);
                    mesh.castShadow = true;
                    group.add(mesh);
                    return group;
                };

                const leftP = createPauldron();
                this.parts.leftShoulderMount.add(leftP);
                this.equippedMeshes.leftPauldron = leftP;

                const rightP = createPauldron();
                this.parts.rightShoulderMount.add(rightP);
                this.equippedMeshes.rightPauldron = rightP;
            }
            if (this.equippedMeshes.leftPauldron) this.equippedMeshes.leftPauldron.visible = true;
            if (this.equippedMeshes.rightPauldron) this.equippedMeshes.rightPauldron.visible = true;
        } else {
            if (this.equippedMeshes.leftPauldron) this.equippedMeshes.leftPauldron.visible = false;
            if (this.equippedMeshes.rightPauldron) this.equippedMeshes.rightPauldron.visible = false;
        }

        // Shield
        if (shield) {
            if (!this.equippedMeshes.shield && this.parts.leftShieldMount) {
                const shieldGroup = new THREE.Group();
                const shape = new THREE.Shape();
                shape.moveTo(0, 0.2);
                shape.lineTo(0.15, 0.15);
                shape.lineTo(0.12, -0.1);
                shape.quadraticCurveTo(0, -0.3, -0.12, -0.1);
                shape.lineTo(-0.15, 0.15);
                shape.lineTo(0, 0.2);
                
                const extrudeSettings = { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 };
                const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const mat = new THREE.MeshStandardMaterial({ color: 0x5d4037, metalness: 0.1, roughness: 0.8 });
                const rimMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6, roughness: 0.4 });
                
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                shieldGroup.add(mesh);
                
                const rim = new THREE.Mesh(geo, rimMat);
                rim.scale.set(1.05, 1.05, 1.1);
                rim.position.z = -0.005;
                shieldGroup.add(rim);

                shieldGroup.rotation.x = -Math.PI / 2;
                shieldGroup.rotation.z = Math.PI / 2;

                this.parts.leftShieldMount.add(shieldGroup);
                this.equippedMeshes.shield = shieldGroup;
            }
            if (this.equippedMeshes.shield) this.equippedMeshes.shield.visible = true;
        } else {
            if (this.equippedMeshes.shield) this.equippedMeshes.shield.visible = false;
        }
    }

    update(delta, input, camera) {
        if (this.actions && this.actions.update) {
            this.actions.update(delta);
        }
        
        this.updateConfig();

        // Animation triggers handled via this.actions.updateCombat
        if (input.interact) this.animator.playInteract();
        // Removed redundant input.action punch trigger to avoid double-firing or conflicts with tools

        // Handle Death Toggle
        if (input.isDead && !this.wasDeadKeyPressed) {
            this.isDead = !this.isDead;
            if (this.isDead) {
                this.deathTime = 0;
                this.deathVariation = {
                    side: Math.random() > 0.5 ? 1 : -1,
                    twist: (Math.random() - 0.5) * 0.5,
                    fallDir: Math.random() > 0.5 ? 1 : -1,
                    stumbleDir: (Math.random() - 0.5) * 0.5
                };
            } else {
                this.recoverTimer = 0.5;
            }
        }
        this.wasDeadKeyPressed = !!input.isDead;

        if (this.isDead) {
            this.deathTime += delta;
        }

        if (this.recoverTimer > 0) this.recoverTimer -= delta;

        if (this.isDead && this.deathTime > 0) {
            if (this.animator) {
                 this.animator.animate(delta, false, false, false, true, false, 'none', 0, 0, false, 0, this.recoverTimer, false, '', new THREE.Vector3(), this.deathTime, this.deathVariation, false);
            }
            return;
        }

        // Update physics
        if (this.playerPhysics) {
            const nearbyObstacles = this.worldManager ? this.worldManager.getNearbyResources(this.mesh.position, 10 * SCALE_FACTOR) : [];
            const obstacleMeshes = nearbyObstacles.map(res => res.group).filter(g => g);
            this.playerPhysics.update(delta, input, camera, obstacleMeshes);
            
            // Face the cursor/camera logic
            if (this.worldManager && this.worldManager.game && this.worldManager.game.cameraMode === 'fpv') {
                const cameraDir = new THREE.Vector3();
                camera.getWorldDirection(cameraDir);
                cameraDir.y = 0;
                cameraDir.normalize();
                if (cameraDir.lengthSq() > 0.001) {
                    this.mesh.rotation.y = Math.atan2(cameraDir.x, cameraDir.z);
                }
            } else if (input.mouseWorldPos) {
                const dx = input.mouseWorldPos.x - this.mesh.position.x;
                const dz = input.mouseWorldPos.z - this.mesh.position.z;
                if (dx * dx + dz * dz > 0.1) {
                    this.mesh.rotation.y = Math.atan2(dx, dz);
                }
            }
        }

        // Update animator
        if (this.animator && this.playerPhysics) {
            const isMoving = Math.abs(this.playerPhysics.velocity.x) > 0.1 || Math.abs(this.playerPhysics.velocity.z) > 0.1;
            const isRunning = input.run;
            const isJumping = !this.playerPhysics.isGrounded;
            
            // Sync holding state to animator
            const isHolding = this.gear && this.gear.heldItem;
            this.animator.setHolding(!!isHolding);

            let jumpPhase = 'none';
            if (isJumping) {
                jumpPhase = this.playerPhysics.velocity.y > 0 ? 'anticipation' : 'airborne';
            }

            // Calculate relative movement for the animator
            let strafe = 0;
            let forward = 0;
            
            if (isMoving) {
                const moveDirWorld = new THREE.Vector3(this.playerPhysics.velocity.x, 0, this.playerPhysics.velocity.z).normalize();
                const forwardWorld = new THREE.Vector3();
                this.mesh.getWorldDirection(forwardWorld);
                
                const dotForward = moveDirWorld.dot(forwardWorld);
                const rightWorld = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardWorld);
                const dotRight = moveDirWorld.dot(rightWorld);

                strafe = dotRight;
                forward = dotForward;
            }
            
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
                this.recoverTimer,
                false, // isDragged
                '', // draggedPartName
                new THREE.Vector3(), // dragVelocity
                this.deathTime,
                this.deathVariation,
                forward < -0.1, // isMovingBackwards
                strafe,
                forward
            );
        }

        if (this.ui) this.ui.updateHud();

        // Update personal light position to follow player (staying in scene root)
        if (this.playerLight && this.mesh) {
            // Position the light slightly behind and above the player's center
            // but keep it independent of the player's rotation (no applyQuaternion)
            const offset = new THREE.Vector3(0, 2.5, -1.0);
            this.playerLight.position.copy(this.mesh.position).add(offset);
        }

        // Ensure player mesh and all children are strictly on Layer 0
        // and NOT on Layer 1 (where the light illuminates)
        if (this.mesh) {
            this.mesh.traverse(child => {
                child.layers.set(0);
                
                // CRITICAL: Ensure no player parts receive light from Layer 1
                // and ensure materials don't ignore layers.
                if (child.isMesh) {
                    child.receiveShadow = false;
                    
                    // Force material to not be affected by the personal light
                    // MeshToonMaterial uses custom light calculations
                    if (child.material) {
                        // If it's an array of materials, handle each
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            // This is a hint to the renderer to keep the material isolated
                            mat.lightMapIntensity = 0;
                            
                            // SHADER HACK: Force the material to ignore the personal point light
                            // We do this by intercepting the light calculation and zeroing out 
                            // any light that isn't a DirectionalLight or AmbientLight for this mesh.
                            if (!mat._lightbulbFixed) {
                                mat.onBeforeCompile = (shader) => {
                                    shader.fragmentShader = shader.fragmentShader.replace(
                                        '#include <lights_pars_begin>',
                                        `#include <lights_pars_begin>
                                        // Custom block to ignore non-directional lights
                                        #undef USE_PUNCTUAL_LIGHTS
                                        `
                                    );
                                };
                                mat.customProgramCacheKey = () => 'no_point_lights';
                                mat._lightbulbFixed = true;
                            }

                            // Ensure the material doesn't use the light's layer
                            if (mat.defines) {
                                delete mat.defines.USE_LIGHTMAP;
                            }
                        });
                    }
                }
            });
        }
    }
}

export default Player;