
import * as THREE from 'three';
import { PlayerMaterials } from '../PlayerMaterials';

export class ShoeBuilder {
    static create(materials: PlayerMaterials, isLeft: boolean, arrays: any) {
        const shoeMat = materials.boots;
        
        // --- Structure Setup (Matching FootBuilder hierarchy for animation) ---
        const heelGroup = new THREE.Group();
        heelGroup.name = (isLeft ? 'left' : 'right') + '_heel';
        
        const footGroup = new THREE.Group();
        footGroup.name = (isLeft ? 'left' : 'right') + '_foot_anchor';
        footGroup.add(heelGroup);

        const forefootGroup = new THREE.Group();
        forefootGroup.name = (isLeft ? 'left' : 'right') + '_forefoot';
        
        // Position forefoot at the ball of the foot (pivot point)
        // FootBuilder uses (0, -0.042, 0.115). We align close to that.
        forefootGroup.position.set(0, -0.045, 0.11);
        footGroup.add(forefootGroup);

        // --- Dimensions ---
        const shoeWidth = 0.125;
        const shoeHeight = 0.09;
        const rearLen = 0.18; 
        const toeLen = 0.13;
        const soleThick = 0.02;

        // 1. REAR SHOE (Ankle & Heel)
        const rearGeo = new THREE.BoxGeometry(shoeWidth, shoeHeight, rearLen, 4, 4, 4);
        const rPos = rearGeo.attributes.position;
        const v = new THREE.Vector3();

        for(let i=0; i<rPos.count; i++) {
            v.fromBufferAttribute(rPos, i);
            
            const yNorm = (v.y + shoeHeight/2) / shoeHeight; // 0 to 1
            const zNorm = (v.z + rearLen/2) / rearLen; // 0 to 1

            // Taper top towards ankle (Opening)
            if (yNorm > 0.6) {
                v.x *= 0.85;
                v.z *= 0.92;
            }
            
            // Round the Heel (Back)
            if (zNorm < 0.2) {
                const round = (0.2 - zNorm) / 0.2;
                v.x *= (1.0 - round * 0.35); // Narrower back
                if (yNorm < 0.2) v.y += round * 0.01; // Bevel bottom back
            }

            // Ankle Cutout (Scoop the sides)
            if (zNorm > 0.5 && yNorm > 0.6) {
                v.y -= (zNorm - 0.5) * 0.04;
            }

            rPos.setXYZ(i, v.x, v.y, v.z);
        }
        rearGeo.computeVertexNormals();
        
        const rearMesh = new THREE.Mesh(rearGeo, shoeMat);
        // Position relative to ankle pivot. Ankle is ~0.07 above ground. 
        // Shoe bottom needs to be at ~ -0.07.
        rearMesh.position.set(0, -0.025, 0.045); 
        rearMesh.castShadow = true;
        heelGroup.add(rearMesh);
        arrays.heelGroups.push(heelGroup); 

        // 2. TOE BOX (Forefoot)
        const toeGeo = new THREE.BoxGeometry(shoeWidth * 0.96, shoeHeight * 0.65, toeLen, 4, 3, 4);
        const tPos = toeGeo.attributes.position;
        
        for(let i=0; i<tPos.count; i++) {
            v.fromBufferAttribute(tPos, i);
            const zNorm = (v.z + toeLen/2) / toeLen; // 0 (back) to 1 (tip)
            
            // Round Tip
            if (zNorm > 0.6) {
                const round = (zNorm - 0.6) / 0.4;
                v.x *= (1.0 - round * 0.45);
                v.y *= (1.0 - round * 0.6); // Flatten nose down
            }
            
            tPos.setXYZ(i, v.x, v.y, v.z);
        }
        toeGeo.computeVertexNormals();
        // Shift pivot to back face to hinge correctly
        toeGeo.translate(0, 0, toeLen/2);

        const toeMesh = new THREE.Mesh(toeGeo, shoeMat);
        toeMesh.position.set(0, 0.005, -0.005); 
        toeMesh.castShadow = true;
        forefootGroup.add(toeMesh);
        arrays.forefootGroups.push(forefootGroup);

        // 3. SOLES
        // Create a thicker sole plate
        const soleGeo = new THREE.BoxGeometry(shoeWidth * 1.05, soleThick, rearLen * 1.05);
        const sole = new THREE.Mesh(soleGeo, shoeMat); // Self-shadowing gives definition
        sole.position.set(0, -shoeHeight/2 - soleThick/2 + 0.002, 0);
        
        // Darken sole slightly by scaling normals or using vertex colors? 
        // For toon shader, geometry offset (inset) works best or a separate mesh.
        // We'll scale it slightly wider to create a rim.
        rearMesh.add(sole);

        const toeSoleGeo = new THREE.BoxGeometry(shoeWidth * 1.02, soleThick, toeLen * 1.02);
        // Taper toe sole
        const tsPos = toeSoleGeo.attributes.position;
        for(let i=0; i<tsPos.count; i++) {
             if (tsPos.getZ(i) > toeLen * 0.3) tsPos.setX(i, tsPos.getX(i) * 0.75);
        }
        toeSoleGeo.translate(0, 0, toeLen/2);
        
        const toeSole = new THREE.Mesh(toeSoleGeo, shoeMat);
        toeSole.position.set(0, -(shoeHeight*0.65)/2 - soleThick/2 + 0.002, -0.005);
        toeMesh.add(toeSole);

        // 4. LACES / TONGUE DETAIL
        const tongueGeo = new THREE.BoxGeometry(shoeWidth * 0.5, 0.015, 0.08);
        // Use underwear material (usually white/grey) to avoid skin-colored laces when naked
        const tongue = new THREE.Mesh(tongueGeo, materials.underwear); 
        tongue.position.set(0, shoeHeight/2, 0.05);
        tongue.rotation.x = -0.4;
        rearMesh.add(tongue);

        return { heelGroup: footGroup, forefootGroup: forefootGroup };
    }
}
