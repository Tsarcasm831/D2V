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
            vest: { type: 'vest', name: 'Tactical Vest', icon: 'assets/icons/vest_icon.png', slot: 'chest' },
            leatherArmor: { type: 'leather-armor', name: 'Leather Armor', icon: 'assets/icons/leather_armor_icon.png', slot: 'chest' },
            headband: { type: 'headband', name: 'Headband', icon: 'assets/icons/headband_icon.png', slot: 'helmet' },
            leatherGloves: { type: 'leather-gloves', name: 'Leather Gloves', icon: 'assets/icons/gloves_icon.png', slot: 'hands' },
            leatherHuntersCap: { type: 'leather-hunters-cap', name: 'Hunters Cap', icon: 'assets/icons/cap_icon.png', slot: 'helmet' },
            assassinsCap: { type: 'assassins-cap', name: 'Assassins Cap', icon: 'assets/icons/cap_icon.png', slot: 'helmet' },
            leatherBoots: { type: 'leather-boots', name: 'Leather Boots', icon: 'assets/icons/boots_icon.png', slot: 'shoes' },
            cloak: { type: 'cloak', name: 'Wanderer Cloak', icon: 'assets/icons/cloak_icon.png', slot: 'back' },
            pants: { type: 'pants', name: 'Leather Pants', icon: 'assets/icons/pants_icon.png', slot: 'pants' }
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
            const isMatch = !!(item && item.type === type);
            mesh.visible = isMatch;
            if (isMatch) anyVisible = true;
        }

        // If no weapon is held, stop any ongoing swing animations
        if (!anyVisible && this.player.animator) {
            this.player.animator.isAxeSwing = false;
            this.player.animator.axeSwingTimer = 0;
        }
    }

    setClothingVisible(part, isVisible) {
        const clothing = this.player.parts && this.player.parts.clothing;
        if (!clothing || !Array.isArray(clothing[part])) return;
        clothing[part].forEach((obj) => {
            if (obj) obj.visible = !!isVisible;
        });
    }
}
