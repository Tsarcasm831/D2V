import * as THREE from 'three';
import { createAxe } from '../../items/axe.js';
import { createClub } from '../../items/club.js';
import { createPickaxe } from '../../items/pickaxe.js';
import { createSword } from '../../items/sword.js';
import { createDagger } from '../../items/dagger.js';
import { createKunai } from '../../items/kunai.js';
import { attachShirt } from '../../items/shirt.js';
import { attachUnderwear } from '../../items/underwear.js';
import { attachShorts } from '../../items/shorts.js';
import * as gear from '../../items/gear.js';
import { SCALE_FACTOR } from '../../world/world_bounds.js';
import { PlayerEquipment } from '../model/PlayerEquipment.js';

export class PlayerGear {
    constructor(player) {
        this.player = player;
        this.heldItems = {};
        this.rightHand = null;
    }

    mapHeldItem(item) {
        if (!item) return null;
        const raw = (item.meshName || item.name || item.type || '').toLowerCase();
        if (raw.includes('pickaxe')) return 'Pickaxe';
        if (raw.includes('axe')) return 'Axe';
        if (raw.includes('sword')) return 'Sword';
        if (raw.includes('dagger') || raw.includes('knife') || raw.includes('kunai')) return 'Knife';
        return null;
    }

    init(parts, characterData) {
        this.parts = parts;
        
        // Initial equipment meshes from PlayerEquipment modular system
        this.equippedMeshes = this.player.model?.equippedMeshes || {};

        // Clothing
        this.player.underwear = attachUnderwear(parts);
        this.player.shorts = attachShorts(parts, characterData);
        this.player.shirt = attachShirt(parts, characterData);

        // Held items / Hands
        this.rightHand = new THREE.Group();
        this.rightHand.position.set(0, -0.07, -0.04);
        this.rightHand.rotation.set(-Math.PI / 2, 0, 0);
        
        if (parts.rightHandMount) {
            // New system uses rightHandMount from PlayerMeshBuilder
            this.rightHand = parts.rightHandMount;
        } else {
            parts.rightForeArm.add(this.rightHand);
        }

        this.heldItems = {
            axe: null,
            club: null,
            pickaxe: null,
            sword: null,
            dagger: null,
            kunai: null,
            bow: null
        };

        Object.values(this.heldItems).forEach(mesh => {
            if (mesh) {
                mesh.visible = false;
                // Ensure held items and all their children are on Layer 0
                mesh.traverse(child => {
                    child.layers.set(0);
                });
                this.rightHand.add(mesh);
            }
        });
    }

    updateHeldItem() {
        if (!this.player.inventory) return;
        const slot = this.player.inventory.selectedSlot;
        const item = this.player.inventory.hotbar[slot];
        
        const itemName = this.mapHeldItem(item);
        
        // Delegate to modular PlayerEquipment
        if (this.player.model) {
            this.player.model.updateHeldItem(itemName);
            this.heldItem = this.player.model.currentHeldItem;
        }

        // Keep config in sync so later sync() calls don't clear the hand
        if (this.player.config) {
            this.player.config.selectedItem = itemName;
        }

        // If no weapon is held, stop any ongoing swing animations
        if (!this.heldItem && this.player.animator) {
            this.player.animator.isAxeSwing = false;
            this.player.animator.axeSwingTimer = 0;
        }
    }

    updateVisuals() {
        if (!this.player.inventory || !this.parts) return;

        const equipment = this.player.inventory.equipment;
        
        // Map legacy equipment slots to modular system
        const modularEquip = {
            helm: !!equipment.HELMET,
            shoulders: !!equipment.GLOVES || !!equipment.VEST, // Approximate
            shield: !!equipment.WEAPON_OFF && equipment.WEAPON_OFF.type === 'shield',
            shirt: !!equipment.BODY
        };

        if (this.player.model) {
            this.player.model.updateEquipment(modularEquip);
        }
    }

    setClothingVisible(part, isVisible) {
        // Modular system handles visibility via config and sync
        if (this.player.config) {
            if (part === 'shirt') this.player.config.equipment.shirt = isVisible;
            this.player.syncConfig();
        }
    }

    getMeshNameFromId(id) {
        if (!id) return null;
        const lowerId = id.toLowerCase();
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
