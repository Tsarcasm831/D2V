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

        // Weapon Orientation in Item Group:
        // Z Axis: Length of weapon (Handle)
        // X Axis: Width/Edge of weapon
        // Y Axis: Thickness
        
        if (itemName === 'Axe') {
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, handleLength, 8), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            handle.position.y = 0; 
            handle.rotation.x = Math.PI / 2; // Z-aligned
            handle.castShadow = true; 
            itemGroup.add(handle);

            const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.04), new THREE.MeshStandardMaterial({ color: 0x90a4ae }));
            head.position.set(0, 0, handleLength * 0.4); 
            head.rotation.x = Math.PI / 2;
            head.castShadow = true; 
            itemGroup.add(head);
            
            // Grip Offset: Move handle UP so hand grips near bottom/middle
            itemGroup.position.z = 0.1;

        } else if (itemName === 'Sword') {
            const hiltLen = 0.22;
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, hiltLen, 8), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            hilt.rotation.x = Math.PI / 2;
            hilt.castShadow = true; 
            itemGroup.add(hilt);
            
            // Crossguard
            const guardGeo = new THREE.BoxGeometry(0.18, 0.02, 0.03);
            const guard = new THREE.Mesh(guardGeo, new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5, roughness: 0.4 }));
            guard.position.z = hiltLen / 2; 
            guard.rotation.x = Math.PI / 2;
            guard.castShadow = true; 
            itemGroup.add(guard);
            
            // Blade
            const bladeLen = 0.8;
            const bladeWidth = 0.07;
            
            // 4 segments = Diamond cross section.
            // RadiusTop = 0 for sharp point.
            const bladeGeo = new THREE.CylinderGeometry(0, bladeWidth/2, bladeLen, 4);
            
            const bladeMat = new THREE.MeshStandardMaterial({ 
                color: 0xffffff, // Brighter
                metalness: 0.4, 
                roughness: 0.4, 
                flatShading: true 
            });
            
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            
            // Flatten Z (thickness). X stays full width.
            blade.scale.set(1, 1, 0.15); 
            blade.rotation.x = -Math.PI / 2; // Point +Z (Along item length)
            
            // Shift so base is at guard
            blade.position.z = hiltLen/2 + bladeLen/2;
            
            blade.castShadow = true; 
            itemGroup.add(blade);
            
            // Grip Offset
            itemGroup.position.z = 0.0;

        } else if (itemName === 'Pickaxe') {
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, handleLength, 8), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            handle.rotation.x = Math.PI / 2;
            handle.castShadow = true; 
            itemGroup.add(handle);

            const pickHead = new THREE.Group();
            pickHead.position.z = handleLength * 0.4; 
            
            const block = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x455a64 }));
            pickHead.add(block);
            
            const armGeo = new THREE.CylinderGeometry(0.012, 0.025, 0.28, 8);
            const armMat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
            
            const topArm = new THREE.Mesh(armGeo, armMat);
            topArm.position.y = 0.14;
            topArm.castShadow = true;
            pickHead.add(topArm);

            const botArm = new THREE.Mesh(armGeo, armMat);
            botArm.position.y = -0.14;
            botArm.rotation.x = Math.PI;
            botArm.castShadow = true;
            pickHead.add(botArm);

            const tipGeo = new THREE.ConeGeometry(0.012, 0.06, 8);
            const tip1 = new THREE.Mesh(tipGeo, armMat);
            tip1.position.set(0, 0.28, 0);
            tip1.castShadow = true;
            pickHead.add(tip1);
            
            const tip2 = new THREE.Mesh(tipGeo, armMat);
            tip2.position.set(0, -0.28, 0);
            tip2.rotation.x = Math.PI;
            tip2.castShadow = true;
            pickHead.add(tip2);

            itemGroup.add(pickHead);
            
            itemGroup.position.z = 0.1;

        } else if (itemName === 'Knife') {
             const handleLen = 0.12;
             const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, handleLen, 8), new THREE.MeshStandardMaterial({ color: 0x212121 }));
             handle.rotation.x = Math.PI / 2;
             handle.castShadow = true; 
             itemGroup.add(handle);
             
             const guard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.025), new THREE.MeshStandardMaterial({ color: 0x424242 }));
             guard.position.z = handleLen/2;
             guard.rotation.x = Math.PI / 2;
             guard.castShadow = true;
             itemGroup.add(guard);

             // Blade
             const bladeLen = 0.22;
             const bladeWidth = 0.035;
             
             // Single Edge: 3 segments (Triangle).
             // Tip Radius = 0 for sharp point.
             const bladeGeo = new THREE.CylinderGeometry(0, bladeWidth, bladeLen, 3);
             
             const bladeMat = new THREE.MeshStandardMaterial({ 
                 color: 0xffffff, 
                 metalness: 0.4, 
                 roughness: 0.4, 
                 flatShading: true 
             });
             
             const blade = new THREE.Mesh(bladeGeo, bladeMat);
             
             // Scale to flatten thickness (Spine width)
             // X = Width (Edge to Spine), Z = Thickness
             blade.scale.set(1, 1, 0.15);
             
             // Orientation:
             // 1. Rotate X -90 to align length with Item Z.
             // 2. Rotate Z 180 (Math.PI) to flip Edge from +X to -X (Forward/Knuckles direction).
             blade.rotation.set(-Math.PI / 2, 0, Math.PI);
             
             blade.position.z = handleLen/2 + bladeLen/2;
             blade.castShadow = true;
             itemGroup.add(blade);
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