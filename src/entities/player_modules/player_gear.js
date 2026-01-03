import * as THREE from 'three';
import { createAxe } from '../../items/axe.js';
import { createClub } from '../../items/club.js';
import { createPickaxe } from '../../items/pickaxe.js';
import { createSword } from '../../items/sword.js';
import { createDagger } from '../../items/dagger.js';
import { createKunai } from '../../items/kunai.js';
import { createBow } from '../../items/bow.js';
import { attachShirt } from '../../items/shirt.js';
import { attachUnderwear } from '../../items/underwear.js';
import { attachShorts } from '../../items/shorts.js';
import * as gear from '../../items/gear.js';
import { SCALE_FACTOR } from '../../world/world_bounds.js';

export class PlayerGear {
    constructor(player) {
        this.player = player;
        this.heldItems = {};
        this.rightHand = null;
    }

    init(parts, characterData) {
        this.parts = parts;
        // Clothing
        this.player.underwear = attachUnderwear(parts);
        this.player.shorts = attachShorts(parts, characterData);
        this.player.shirt = attachShirt(parts, characterData);

        // Gear
        if (characterData.gear) {
            this.setupInitialGear(characterData.gear, parts);
        }

        // Held items / Hands
        this.rightHand = new THREE.Group();
        this.rightHand.position.set(0, -0.35 * SCALE_FACTOR, 0);
        this.rightHand.rotation.x = Math.PI / 2;
        this.rightHand.rotation.z = 0;
        parts.rightForeArm.add(this.rightHand);

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
    }

    setupInitialGear(gearData, parts) {
        const gearMapping = {
            vest: { id: 'init-vest', type: 'vest', name: 'Tactical Vest', icon: 'assets/icons/vest_icon.png', slot: 'vest', meshName: 'Vest' },
            leatherArmor: { id: 'init-leather', type: 'leather-armor', name: 'Leather Armor', icon: 'assets/icons/leather_armor_icon.png', slot: 'chest', meshName: 'LeatherArmor' },
            headband: { id: 'init-headband', type: 'headband', name: 'Headband', icon: 'assets/icons/headband_icon.png', slot: 'helmet', meshName: 'Headband' },
            leatherGloves: { id: 'init-gloves', type: 'leather-gloves', name: 'Leather Gloves', icon: 'assets/icons/gloves_icon.png', slot: 'hands', meshName: 'LeatherGloves' },
            leatherHuntersCap: { id: 'init-hunters-cap', type: 'leather-hunters-cap', name: 'Hunters Cap', icon: 'assets/icons/cap_icon.png', slot: 'helmet', meshName: 'LeatherHuntersCap' },
            assassinsCap: { id: 'init-assassins-cap', type: 'assassins-cap', name: 'Assassins Cap', icon: 'assets/icons/cap_icon.png', slot: 'helmet', meshName: 'AssassinsCap' },
            leatherBoots: { id: 'init-boots', type: 'leather-boots', name: 'Leather Boots', icon: 'assets/icons/boots_icon.png', slot: 'shoes', meshName: 'LeatherBoots' },
            cloak: { id: 'init-cloak', type: 'cloak', name: 'Wanderer Cloak', icon: 'assets/icons/cloak_icon.png', slot: 'back', meshName: 'Cloak' },
            pants: { id: 'init-pants', type: 'pants', name: 'Leather Pants', icon: 'assets/icons/pants_icon.png', slot: 'pants', meshName: 'Pants' }
        };

        Object.entries(gearData).forEach(([key, isEnabled]) => {
            if (isEnabled && gearMapping[key]) {
                const gearInfo = gearMapping[key];
                // Add to equipment if slot is empty, otherwise to storage
                if (!this.player.inventory.equipment[gearInfo.slot]) {
                    this.player.inventory.equipment[gearInfo.slot] = { ...gearInfo };
                } else {
                    this.player.inventory.addItem({ ...gearInfo });
                }

                // Visual attachment
                const camelName = key.charAt(0).toUpperCase() + key.slice(1);
                const fnName = `attach${camelName}`;
                if (gear[fnName]) gear[fnName](parts);
            }
        });
    }

    updateHeldItem() {
        if (!this.player.inventory || !this.heldItems) return;
        const slot = this.player.inventory.selectedSlot;
        const item = this.player.inventory.hotbar[slot];
        
        let anyVisible = false;
        for (const [type, mesh] of Object.entries(this.heldItems)) {
            const isMatch = !!(item && (item.type === type || (item.id && item.id.includes(type))));
            mesh.visible = isMatch;
            if (isMatch) anyVisible = true;
        }

        // If no weapon is held, stop any ongoing swing animations
        if (!anyVisible && this.player.animator) {
            this.player.animator.isAxeSwing = false;
            this.player.animator.axeSwingTimer = 0;
        }
    }

    updateVisuals() {
        if (!this.player.inventory || !this.parts) return;

        const equipment = this.player.inventory.equipment;

        // Shirt / Body
        const isShirtEquipped = !!equipment.BODY;
        
        // 1. Handle overlay shirt (e.g. lordtsarcasm plaid)
        if (this.player.shirt) {
            const shirtParts = [this.player.shirt.shirtTorso, this.player.shirt.rightSleeve, this.player.shirt.leftSleeve];
            shirtParts.forEach(part => {
                if (part) {
                    part.visible = isShirtEquipped;
                    part.traverse(child => {
                        if (child.isMesh) child.visible = isShirtEquipped;
                    });
                }
            });
        }

        // Helper to toggle outlines for base mesh parts
        const setOutlinesVisible = (part, visible) => {
            if (!part) return;
            part.children.forEach(child => {
                if (child.isMesh && child.material && child.material.type === 'MeshBasicMaterial') {
                    // Only toggle if it's an outline (scaled up version of the geometry)
                    child.visible = visible;
                }
            });
        };

        // Hide torso/arm outlines if no shirt is equipped (prevents "glowing" effect from stacked white/black materials)
        setOutlinesVisible(this.parts.torso, isShirtEquipped);
        setOutlinesVisible(this.parts.rightArm, isShirtEquipped);
        setOutlinesVisible(this.parts.leftArm, isShirtEquipped);

        // Handle specific gear attachments
        const handleGearAttachment = (slot, meshProp) => {
            const item = equipment[slot];
            
            // Clean up existing if it's the wrong one or we unequipping
            if (this[meshProp]) {
                const currentItem = this[meshProp].userData?.item;
                if (!item || currentItem?.id !== item.id) {
                    // LeatherArmor returns an object with multiple groups, others return a single Group/Mesh
                    const gearObj = this[meshProp];
                    if (gearObj.isGroup || gearObj.isMesh) {
                        if (gearObj.parent) gearObj.parent.remove(gearObj);
                    } else if (typeof gearObj === 'object') {
                        // Multi-part gear (like LeatherArmor)
                        Object.values(gearObj).forEach(part => {
                            if (part && part.parent) part.parent.remove(part);
                        });
                    }
                    this[meshProp] = null;
                }
            }

            if (item && !this[meshProp]) {
                const meshName = item.meshName || this.getMeshNameFromId(item.id);
                if (meshName) {
                    const fnName = `attach${meshName}`;
                    if (gear[fnName]) {
                        this[meshProp] = gear[fnName](this.parts);
                        if (this[meshProp]) {
                            // If it's the multi-part object, we need to tag one of them or handle it differently
                            // For simplicity, if it's an object, we'll tag all parts
                            if (this[meshProp].isGroup || this[meshProp].isMesh) {
                                this[meshProp].userData = this[meshProp].userData || {};
                                this[meshProp].userData.item = item;
                            } else {
                                Object.values(this[meshProp]).forEach(part => {
                                    if (part && typeof part === 'object') {
                                        part.userData = part.userData || {};
                                        part.userData.item = item;
                                    }
                                });
                            }
                        }
                    }
                }
            }
        };

        handleGearAttachment('HELMET', 'helmetMesh');
        handleGearAttachment('GLOVES', 'glovesMesh');
        handleGearAttachment('BOOTS', 'bootsMesh');
        handleGearAttachment('VEST', 'vestMesh');
        handleGearAttachment('BACK', 'backMesh');
        handleGearAttachment('CHEST', 'bodyArmorMesh');

        // 2. Handle base mesh skin/shirt swap
        // If a shirt is NOT equipped, the base mesh should look like skin
        // If a shirt IS equipped, the base mesh acts as the shirt (for non-overlaid shirts)
        if (this.parts.torso && this.parts.torso.material) {
            const skinColor = this.player.config?.skinColor || '#ffdbac';
            const shirtColor = this.player.config?.shirtColor || '#ffffff';
            
            if (isShirtEquipped) {
                // If we have a shirt overlay (lordtsarcasm), the base should be skin
                // Otherwise the base is the shirt itself
                const isLord = this.player.config?.name?.toLowerCase() === 'lordtsarcasm';
                if (isLord) {
                    this.parts.torso.material.color.set(skinColor);
                    if (this.parts.torso.material.map) this.parts.torso.material.map = null;
                } else {
                    this.parts.torso.material.color.set(shirtColor);
                    // Note: If we had a pattern texture, we might need to restore it here
                }
                
                if (this.parts.rightArm && this.parts.rightArm.material) this.parts.rightArm.material.color.set(isLord ? skinColor : shirtColor);
                if (this.parts.leftArm && this.parts.leftArm.material) this.parts.leftArm.material.color.set(isLord ? skinColor : shirtColor);
            } else {
                // Not equipped -> Skin
                this.parts.torso.material.color.set(skinColor);
                if (this.parts.torso.material.map) this.parts.torso.material.map = null;
                
                if (this.parts.rightArm && this.parts.rightArm.material) this.parts.rightArm.material.color.set(skinColor);
                if (this.parts.leftArm && this.parts.leftArm.material) this.parts.leftArm.material.color.set(skinColor);
            }
            this.parts.torso.material.needsUpdate = true;
        }

        // Shorts
        const areShortsEquipped = !!equipment.SHORTS;

        // 1. Handle overlay shorts
        if (this.player.shorts) {
            const shortsParts = [this.player.shorts.waist, this.player.shorts.rightLeg, this.player.shorts.leftLeg];
            shortsParts.forEach(part => {
                if (part) {
                    part.visible = areShortsEquipped;
                    part.traverse(child => {
                        if (child.isMesh) child.visible = areShortsEquipped;
                    });
                }
            });
        }

        // Hide thigh outlines if no shorts are equipped
        setOutlinesVisible(this.parts.rightThigh, areShortsEquipped);
        setOutlinesVisible(this.parts.leftThigh, areShortsEquipped);

        // 2. Handle base mesh shorts visibility
        // In player_mesh.js, createShortsSegment creates segments with shortsMat
        // We need to find these meshes and toggle their visibility or swap material to skin
        const skinMatColor = this.player.config?.skinColor || '#ffdbac';
        const shortsColor = '#654321'; // From player_mesh.js

        const updateLegSegment = (thigh) => {
            if (!thigh) return;
            thigh.children.forEach(child => {
                // The main thigh mesh is a Cylinder
                if (child.isMesh && child.geometry.type === 'CylinderGeometry' && child.material) {
                    child.material.color.set(areShortsEquipped ? shortsColor : skinMatColor);
                    child.material.needsUpdate = true;
                }
            });
        };

        updateLegSegment(this.parts.rightThigh);
        updateLegSegment(this.parts.leftThigh);
    }

    setClothingVisible(part, isVisible) {
        const clothing = this.player.parts && this.player.parts.clothing;
        if (!clothing || !Array.isArray(clothing[part])) return;
        clothing[part].forEach((obj) => {
            if (obj) obj.visible = !!isVisible;
        });
    }

    getMeshNameFromId(id) {
        if (!id) return null;
        const lowerId = id.toLowerCase();
        // Priority check for 'vest' to ensure it takes precedence over 'armor'
        // This ensures "Armor Vest" or "start-armor" (which is the green vest) 
        // uses the 'Vest' mesh, not 'LeatherArmor'.
        if (lowerId.includes('vest') || lowerId === 'start-armor' || lowerId === 'konoha-vest') return 'Vest';
        if (lowerId.includes('armor')) return 'LeatherArmor';
        if (lowerId.includes('cloak')) return 'Cloak';
        if (lowerId.includes('band')) return 'Headband';
        if (lowerId.includes('cap')) {
            if (lowerId.includes('hunters')) return 'LeatherHuntersCap';
            if (lowerId.includes('assassins')) return 'AssassinsCap';
            return 'LeatherHuntersCap';
        }
        if (lowerId.includes('gloves')) return 'LeatherGloves';
        if (lowerId.includes('boots')) return 'LeatherBoots';
        if (lowerId.includes('pants')) return 'Pants';
        return null;
    }
}
