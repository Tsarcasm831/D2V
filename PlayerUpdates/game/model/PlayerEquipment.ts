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
        // FLIP WEAPON 180 degrees around the handle axis (X) to correct orientation for palms-inward grip
        itemGroup.rotation.set(Math.PI, 0, 0);

        const handleLength = 0.65;
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.85, roughness: 0.2, flatShading: false });

        if (itemName === 'Axe') {
            const handleOffset = 0.15;

            // Handle
            const handleGeo = new THREE.CylinderGeometry(0.016, 0.02, handleLength, 12);
            const handle = new THREE.Mesh(handleGeo, woodMat);
            handle.rotation.z = -Math.PI / 2; 
            handle.position.x = handleOffset;
            handle.castShadow = true; 
            itemGroup.add(handle);

            // Handle Bands
            for (let i = 0; i < 3; i++) {
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.003, 6, 12), new THREE.MeshStandardMaterial({ color: 0x212121 }));
                band.rotation.y = Math.PI / 2;
                band.position.x = handleOffset - (handleLength * 0.25) + (i * 0.08);
                itemGroup.add(band);
            }

            // Polished Blade Geometry
            const axeShape = new THREE.Shape();
            // Start at top of the socket
            axeShape.moveTo(0, 0.045);
            // Top edge flare
            axeShape.lineTo(0.12, 0.09);
            // Curved cutting edge
            axeShape.quadraticCurveTo(0.18, 0, 0.12, -0.16); 
            // Beard (the iconic hanging axe bit)
            axeShape.lineTo(0.03, -0.06);
            axeShape.lineTo(0, -0.045);
            axeShape.lineTo(0, 0.045);

            const extrudeSettings = { depth: 0.032, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 3 };
            const bladeGeo = new THREE.ExtrudeGeometry(axeShape, extrudeSettings);
            const blade = new THREE.Mesh(bladeGeo, metalMat);
            
            // Align with handle center
            blade.rotation.x = -Math.PI / 2; 
            blade.position.set(handleOffset + handleLength * 0.38, 0, -0.016);
            blade.castShadow = true;
            itemGroup.add(blade);

            // Detailed Eye/Poll
            const poll = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.055), metalMat);
            poll.position.set(blade.position.x - 0.02, 0, 0);
            itemGroup.add(poll);

        } else if (itemName === 'Sword') {
            const hiltLen = 0.22;
            const bladeLen = 0.85;
            const offset = 0.05; 
            
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, hiltLen, 12), woodMat);
            hilt.rotation.z = -Math.PI / 2; 
            hilt.position.x = offset; 
            hilt.castShadow = true; 
            itemGroup.add(hilt);
            
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.2, 0.038), new THREE.MeshStandardMaterial({ color: 0xbf9b30, metalness: 0.6, roughness: 0.3 }));
            guard.position.x = offset + hiltLen/2;
            itemGroup.add(guard);
            
            const bladeGeo = new THREE.CylinderGeometry(0.012, 0.045, bladeLen, 4);
            const blade = new THREE.Mesh(bladeGeo, metalMat);
            blade.rotation.z = -Math.PI / 2; 
            blade.rotation.x = 0; 
            // Correct blade flattening: Z is the narrow thickness
            blade.scale.set(1, 1, 0.12); 
            blade.position.x = offset + hiltLen/2 + bladeLen/2;
            blade.castShadow = true; 
            itemGroup.add(blade);

        } else if (itemName === 'Pickaxe') {
            const handleOffset = 0.2;
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, handleLength, 8), woodMat);
            handle.rotation.z = -Math.PI / 2; 
            handle.position.x = handleOffset;
            handle.castShadow = true; 
            itemGroup.add(handle);

            const pickHead = new THREE.Group();
            pickHead.position.x = handleOffset + (handleLength * 0.4);
            const block = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), metalMat);
            pickHead.add(block);
            const armGeo = new THREE.CylinderGeometry(0.014, 0.028, 0.3, 8);
            const botArm = new THREE.Mesh(armGeo, metalMat);
            botArm.position.y = -0.15; botArm.rotation.x = Math.PI; botArm.castShadow = true; pickHead.add(botArm);
            const topArm = new THREE.Mesh(armGeo, metalMat);
            topArm.position.y = 0.15; topArm.castShadow = true; pickHead.add(topArm);
            const tipGeo = new THREE.ConeGeometry(0.014, 0.08, 8);
            const tip1 = new THREE.Mesh(tipGeo, metalMat);
            tip1.position.y = -0.3; tip1.rotation.x = Math.PI; pickHead.add(tip1);
            const tip2 = new THREE.Mesh(tipGeo, metalMat);
            tip2.position.y = 0.3; pickHead.add(tip2);
            itemGroup.add(pickHead);

        } else if (itemName === 'Knife') {
             const handleLen = 0.14;
             const offset = 0.02;
             const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, handleLen, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
             handle.rotation.z = -Math.PI / 2; handle.position.x = offset; handle.castShadow = true; itemGroup.add(handle);
             const guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.03), metalMat);
             guard.position.x = offset + handleLen/2; itemGroup.add(guard);
             const bladeLen = 0.25;
             const bladeGeo = new THREE.CylinderGeometry(0.005, 0.04, bladeLen, 3);
             const blade = new THREE.Mesh(bladeGeo, metalMat);
             blade.rotation.z = -Math.PI / 2; blade.rotation.x = -Math.PI / 2; 
             blade.scale.set(1, 0.18, 1);
             blade.position.x = offset + handleLen/2 + bladeLen/2;
             blade.castShadow = true; itemGroup.add(blade);
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