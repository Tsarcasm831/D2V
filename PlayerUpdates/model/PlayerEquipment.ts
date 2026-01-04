import * as THREE from 'three';

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

        const itemGroup = new THREE.Group();
        const handleLength = 0.6;

        if (itemName === 'Axe') {
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, handleLength, 8), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            handle.position.y = handleLength / 2; // Grip at bottom
            handle.castShadow = true; 
            itemGroup.add(handle);

            const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.04), new THREE.MeshStandardMaterial({ color: 0x90a4ae }));
            head.position.set(0.08, handleLength - 0.08, 0); 
            head.castShadow = true; 
            itemGroup.add(head);

            itemGroup.rotation.z = -Math.PI / 2; // Point forward
        } else if (itemName === 'Sword') {
            const hiltLen = 0.2;
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, hiltLen, 8), new THREE.MeshStandardMaterial({ color: 0x795548 }));
            hilt.position.y = 0; // Hand at hilt
            hilt.castShadow = true; itemGroup.add(hilt);
            
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: 0xffd54f }));
            guard.position.y = hiltLen / 2; 
            guard.castShadow = true; itemGroup.add(guard);
            
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.02), new THREE.MeshStandardMaterial({ color: 0xe0e0e0 }));
            blade.position.y = hiltLen / 2 + 0.4; 
            blade.castShadow = true; itemGroup.add(blade);
            
            itemGroup.rotation.z = -Math.PI / 2; // Point forward
        } else if (itemName === 'Pickaxe') {
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, handleLength, 8), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            handle.position.y = handleLength / 2; 
            handle.castShadow = true; 
            itemGroup.add(handle);

            const pickHead = new THREE.Group();
            pickHead.position.y = handleLength;
            // Rotate the head so the arms are perpendicular to the ground (vertical)
            pickHead.rotation.y = Math.PI / 2;

            // Central block
            const block = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x455a64 }));
            pickHead.add(block);
            
            // Lateral arms (Hand Lateral is Z in this itemGroup's coordinates)
            const armGeo = new THREE.CylinderGeometry(0.012, 0.025, 0.28, 8);
            const armMat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
            
            const leftArm = new THREE.Mesh(armGeo, armMat);
            leftArm.position.z = -0.14;
            leftArm.rotation.x = Math.PI / 2;
            leftArm.rotation.y = 0.2; // Slight forward curve
            leftArm.castShadow = true;
            pickHead.add(leftArm);

            const rightArm = new THREE.Mesh(armGeo, armMat);
            rightArm.position.z = 0.14;
            rightArm.rotation.x = -Math.PI / 2;
            rightArm.rotation.y = 0.2; // Slight forward curve
            rightArm.castShadow = true;
            pickHead.add(rightArm);

            // Sharpen tips
            const tipGeo = new THREE.ConeGeometry(0.012, 0.06, 8);
            const tipL = new THREE.Mesh(tipGeo, armMat);
            tipL.position.set(0.012, 0, -0.28);
            tipL.rotation.x = Math.PI / 2;
            tipL.castShadow = true;
            pickHead.add(tipL);

            const tipR = new THREE.Mesh(tipGeo, armMat);
            tipR.position.set(0.012, 0, 0.28);
            tipR.rotation.x = -Math.PI / 2;
            tipR.castShadow = true;
            pickHead.add(tipR);

            itemGroup.add(pickHead);
            itemGroup.rotation.z = -Math.PI / 2; // Point forward
        }

        parts.rightHandMount.add(itemGroup);
        equippedMeshes.heldItem = itemGroup;
        return itemName;
    }

    static updateArmor(equipment: any, parts: any, equippedMeshes: any) {
        const { helm, shoulders, shield } = equipment;
        
        if (helm && !equippedMeshes.helm) {
            const h = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 }));
            h.position.y = 0.1; h.castShadow = true; parts.headMount.add(h); equippedMeshes.helm = h;
        } else if (!helm && equippedMeshes.helm) { 
            parts.headMount.remove(equippedMeshes.helm); delete equippedMeshes.helm; 
        }
        
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
        } else if (!shield && equippedMeshes.shield) { 
            parts.leftShieldMount.remove(equippedMeshes.shield); delete equippedMeshes.shield; 
        }
    }
}