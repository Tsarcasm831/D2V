import * as THREE from 'three';
import { createAxe } from '../../items/axe.js';
import { createClub } from '../../items/club.js';
import { createPickaxe } from '../../items/pickaxe.js';
import { createSword } from '../../items/sword.js';
import { createDagger } from '../../items/dagger.js';
import { createKunai } from '../../items/kunai.js';
import { attachUnderwear } from '../../items/underwear.js';
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

        // Underwear is currently the only non-procedural clothing part manually attached here.
        // Shirt and Pants are handled by PlayerModel's updateShirt/updatePants logic.
        this.player.underwear = attachUnderwear(parts);

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
        
        // Handle Shield Visuals
        const shieldItem = equipment.WEAPON_OFF && equipment.WEAPON_OFF.type === 'shield' ? equipment.WEAPON_OFF : null;
        if (shieldItem) {
            if (!this.shieldGroup) {
                this.shieldGroup = this.createShieldMesh(shieldItem.id);
                this.leftHand.add(this.shieldGroup);
            }
            this.shieldGroup.visible = true;
        } else if (this.shieldGroup) {
            this.shieldGroup.visible = false;
        }

        // Map legacy equipment slots to modular system
        const modularEquip = {
            helm: !!equipment.HELMET,
            shoulders: !!equipment.GLOVES,
            shield: !!equipment.WEAPON_OFF && equipment.WEAPON_OFF.type === 'shield',
            shirt: !!equipment.BODY,
            vest: !!equipment.VEST && (equipment.VEST.id.includes('vest') || equipment.VEST.name.includes('Vest')),
            leatherArmor: !!equipment.VEST && (equipment.VEST.id.includes('armor') || equipment.VEST.name.includes('Armor'))
        };

        if (this.player.model) {
            this.player.model.updateEquipment(modularEquip);
        }
    }

    createShieldMesh(id) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: id.includes('iron') ? 0x888888 : 0x664422 });
        
        if (id.includes('tower')) {
            const geo = new THREE.BoxGeometry(0.6, 1.2, 0.1).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(0, 0.3, 0.1);
            group.add(mesh);
        } else {
            const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
            geo.rotateX(Math.PI / 2);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(0, 0, 0.1);
            group.add(mesh);
        }
        
        group.traverse(c => c.layers.set(0));
        return group;
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
