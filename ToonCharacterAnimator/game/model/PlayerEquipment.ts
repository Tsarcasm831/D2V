
import * as THREE from 'three';
import { AxeBuilder } from './equipment/AxeBuilder';
import { SwordBuilder } from './equipment/SwordBuilder';
import { PickaxeBuilder } from './equipment/PickaxeBuilder';
import { KnifeBuilder } from './equipment/KnifeBuilder';
import { FishingPoleBuilder } from './equipment/FishingPoleBuilder';

export class PlayerEquipment {
    static updateHeldItem(
        itemName: string | null,
        currentHeldItem: string | null,
        parts: any,
        equippedMeshes: any
    ): string | null {
        if (currentHeldItem === itemName) return currentHeldItem;

        if (equippedMeshes.heldItem) {
            parts.rightHandMount.remove(equippedMeshes.heldItem);
            equippedMeshes.heldItem = undefined;
        }

        if (!itemName) return null;

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.85, roughness: 0.2, flatShading: false });

        let itemGroup: THREE.Group | null = null;

        if (itemName === 'Axe') {
            itemGroup = AxeBuilder.build(woodMat, metalMat);
        } else if (itemName === 'Sword') {
            itemGroup = SwordBuilder.build(woodMat, metalMat);
        } else if (itemName === 'Pickaxe') {
            itemGroup = PickaxeBuilder.build(woodMat, metalMat);
        } else if (itemName === 'Knife') {
             itemGroup = KnifeBuilder.build(metalMat);
        } else if (itemName === 'Fishing Pole') {
             itemGroup = FishingPoleBuilder.build(woodMat, metalMat);
        }

        if (itemGroup) {
            parts.rightHandMount.add(itemGroup);
            equippedMeshes.heldItem = itemGroup;
        }

        return itemName;
    }

    static updateArmor(equipment: any, parts: any, equippedMeshes: any) {
        const { helm, shoulders, shield } = equipment;
        if (helm && !equippedMeshes.helm) {
            const h = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 }));
            h.position.y = 0.1; h.castShadow = true; parts.headMount.add(h); equippedMeshes.helm = h;
        } else if (!helm && equippedMeshes.helm) { parts.headMount.remove(equippedMeshes.helm); delete equippedMeshes.helm; }
        if (shoulders && !equippedMeshes.leftPauldron) {
            const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 }));
            const lp = p.clone(); parts.leftShoulderMount.add(lp); equippedMeshes.leftPauldron = lp;
            const rp = p.clone(); parts.rightShoulderMount.add(rp); equippedMeshes.rightPauldron = rp;
        } else if (!shoulders && equippedMeshes.leftPauldron) {
            parts.leftShoulderMount.remove(equippedMeshes.leftPauldron!);
            parts.rightShoulderMount.remove(equippedMeshes.rightPauldron!);
            delete equippedMeshes.leftPauldron; delete equippedMeshes.rightPauldron;
        }
        if (shield && !equippedMeshes.shield) {
            const shape = new THREE.Shape();
            shape.moveTo(0, 0.2); shape.lineTo(0.15, 0.15); shape.lineTo(0.12, -0.1); shape.quadraticCurveTo(0, -0.3, -0.12, -0.1); shape.lineTo(-0.15, 0.15); shape.lineTo(0, 0.2);
            const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
            const s = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            s.rotation.x = -Math.PI / 2; s.rotation.z = Math.PI / 2; s.castShadow = true;
            parts.leftShieldMount.add(s); equippedMeshes.shield = s;
        } else if (!shield && equippedMeshes.shield) { parts.leftShieldMount.remove(equippedMeshes.shield); delete equippedMeshes.shield; }
    }
}
