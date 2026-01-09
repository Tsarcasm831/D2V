import * as THREE from 'three';
import { buildAxe } from './equipment/held/axe.js';
import { buildSword } from './equipment/held/sword.js';
import { buildPickaxe } from './equipment/held/pickaxe.js';
import { buildKnife } from './equipment/held/knife.js';
import { createHelm } from './equipment/armor/helm.js';
import { createShoulders } from './equipment/armor/shoulders.js';
import { createShield } from './equipment/armor/shield.js';
import * as gear from '../../items/gear.js';

export class PlayerEquipment {
    static updateHeldItem(
        itemName,
        currentHeldItem,
        parts,
        equippedMeshes
    ) {
        if (currentHeldItem === itemName) return currentHeldItem;

        if (equippedMeshes.heldItem) {
            parts.rightHandMount.remove(equippedMeshes.heldItem);
            equippedMeshes.heldItem = undefined;
        }

        if (!itemName) return null;

        const itemGroup = new THREE.Group();
        // FLIP WEAPON 180 degrees around the handle axis (X) to correct orientation for palms-inward grip
        itemGroup.rotation.set(Math.PI, 0, 0);

        const handleLength = 0.65;
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.85, roughness: 0.2, flatShading: false });

        const materials = { woodMat, metalMat };
        const heldItemBuilders = {
            Axe: buildAxe,
            Sword: buildSword,
            Pickaxe: buildPickaxe,
            Knife: buildKnife
        };
        const buildHeldItem = heldItemBuilders[itemName];
        if (buildHeldItem) {
            buildHeldItem(itemGroup, materials, handleLength);
        }

        parts.rightHandMount.add(itemGroup);
        equippedMeshes.heldItem = itemGroup;
        return itemName;
    }

    static updateArmor(equipment, parts, equippedMeshes) {
        const { helm, shoulders, shield, vest, leatherArmor } = equipment;
        if (helm && !equippedMeshes.helm) {
            const h = createHelm();
            parts.headMount.add(h);
            equippedMeshes.helm = h;
        } else if (!helm && equippedMeshes.helm) {
            parts.headMount.remove(equippedMeshes.helm);
            delete equippedMeshes.helm;
        }

        if (shoulders && !equippedMeshes.leftPauldron) {
            const { left, right } = createShoulders();
            parts.leftShoulderMount.add(left);
            parts.rightShoulderMount.add(right);
            equippedMeshes.leftPauldron = left;
            equippedMeshes.rightPauldron = right;
        } else if (!shoulders && equippedMeshes.leftPauldron) {
            parts.leftShoulderMount.remove(equippedMeshes.leftPauldron);
            parts.rightShoulderMount.remove(equippedMeshes.rightPauldron);
            delete equippedMeshes.leftPauldron;
            delete equippedMeshes.rightPauldron;
        }

        if (shield && !equippedMeshes.shield) {
            const s = createShield();
            parts.leftShieldMount.add(s);
            equippedMeshes.shield = s;
        } else if (!shield && equippedMeshes.shield) {
            parts.leftShieldMount.remove(equippedMeshes.shield);
            delete equippedMeshes.shield;
        }

        if (vest && !equippedMeshes.vest) {
            equippedMeshes.vest = gear.attachVest(parts);
        } else if (!vest && equippedMeshes.vest) {
            if (equippedMeshes.vest.parent) equippedMeshes.vest.parent.remove(equippedMeshes.vest);
            delete equippedMeshes.vest;
        }

        if (leatherArmor && !equippedMeshes.leatherArmor) {
            const res = gear.attachLeatherArmor(parts);
            equippedMeshes.leatherArmor = res.armorGroup;
        } else if (!leatherArmor && equippedMeshes.leatherArmor) {
            if (equippedMeshes.leatherArmor.parent) equippedMeshes.leatherArmor.parent.remove(equippedMeshes.leatherArmor);
            delete equippedMeshes.leatherArmor;
        }
    }
}
