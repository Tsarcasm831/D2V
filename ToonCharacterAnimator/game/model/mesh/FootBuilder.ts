
import * as THREE from 'three';
import { PlayerMaterials } from '../PlayerMaterials';

export class FootBuilder {
    static create(materials: PlayerMaterials, isLeft: boolean, arrays: any) {
        // Ensure material is correct
        const footMat = materials.boots;

        // --- Dimensions ---
        const footWidth = 0.095;
        const footHeight = 0.055;
        const totalLength = 0.24; 
        const rearLen = 0.15; // Main foot block length
        
        const footGroup = new THREE.Group();
        footGroup.name = (isLeft ? 'left' : 'right') + '_foot_anchor';

        const heelGroup = new THREE.Group();
        heelGroup.name = (isLeft ? 'left' : 'right') + '_heel';
        footGroup.add(heelGroup);
        
        // 1. MAIN FOOT BODY (Heel to Ball)
        const mainGeo = new THREE.BoxGeometry(footWidth, footHeight, rearLen, 4, 4, 5);
        const pos = mainGeo.attributes.position;
        const vec = new THREE.Vector3();

        for(let i=0; i<pos.count; i++) {
            vec.fromBufferAttribute(pos, i);
            
            // Normalize Z: 0 (Back/Heel) to 1 (Front/Ball)
            const zNorm = (vec.z + rearLen/2) / rearLen;

            // --- SHAPING ---

            // 1. Heel Rounding (Back 20%)
            if (zNorm < 0.2) {
                const roundFactor = 1 - (zNorm / 0.2);
                if (vec.y < 0) vec.x *= (1 - roundFactor * 0.3); // Taper width
                if (vec.y < 0) vec.y += roundFactor * 0.02; // Lift bottom back
            }

            // 2. Arch (Medial Side)
            const isMedial = (isLeft && vec.x < 0) || (!isLeft && vec.x > 0);
            
            if (isMedial && vec.y < 0 && zNorm > 0.3 && zNorm < 0.8) {
                const archAlpha = (zNorm - 0.3) / 0.5; 
                const archHeight = Math.sin(archAlpha * Math.PI) * 0.025;
                vec.y += archHeight;
                vec.x *= 0.9; // Narrow waist
            }

            // 3. Slope down to toes (Instep)
            if (vec.y > 0) {
                vec.y -= zNorm * 0.03; // Gentle slope
            }

            // 4. Ball of foot width
            if (zNorm > 0.7) {
                const widen = (zNorm - 0.7) / 0.3;
                vec.x *= (1 + widen * 0.15);
            }

            pos.setXYZ(i, vec.x, vec.y, vec.z);
        }
        mainGeo.computeVertexNormals();
        
        const mainMesh = new THREE.Mesh(mainGeo, footMat);
        // Raised to align bottom with ground relative to ankle (ankle is ~0.07m up)
        mainMesh.position.set(0, -0.03, 0.03); 
        mainMesh.castShadow = true;
        heelGroup.add(mainMesh);
        arrays.heelGroups.push(heelGroup);

        // 2. TOES (Forefoot)
        const forefootGroup = new THREE.Group();
        forefootGroup.name = (isLeft ? 'left' : 'right') + '_forefoot';
        
        // Raised position to align with main foot body
        forefootGroup.position.set(0, -0.042, 0.098); 
        footGroup.add(forefootGroup);

        const toeCount = 5;
        // Medial -> Lateral
        const tLengths = [0.06, 0.052, 0.048, 0.044, 0.04];
        // Reduced widths slightly to fit better
        const tWidths  = [0.032, 0.024, 0.022, 0.020, 0.018];
        const tHeights = [0.030, 0.026, 0.024, 0.022, 0.021];
        
        let currentCenter = 0;
        let stepDir = 0;
        
        // Start further Medial (Inward) to prevent pinky overhang
        // Left Foot: Medial is -X. Lateral is +X.
        // Right Foot: Medial is +X. Lateral is -X.
        const medialStart = 0.042; 

        if (isLeft) {
            currentCenter = -medialStart; // Start Medial (Negative)
            stepDir = 1; // Move Lateral (Positive)
        } else {
            currentCenter = medialStart; // Start Medial (Positive)
            stepDir = -1; // Move Lateral (Negative)
        }
        
        const splayDir = isLeft ? 1 : -1;
        const spacing = 0.001; // Tighter spacing

        for(let i=0; i<toeCount; i++) {
            const tLen = tLengths[i];
            const tW = tWidths[i];
            const tH = tHeights[i];
            
            const toeGeo = new THREE.BoxGeometry(tW, tH, tLen, 2, 2, 2);
            // Sculpt toe tip
            const tPos = toeGeo.attributes.position;
            for(let k=0; k<tPos.count; k++) {
                const tz = tPos.getZ(k);
                if (tz > 0) { // Tip
                    tPos.setY(k, tPos.getY(k) * 0.6); // Flatten tip
                    tPos.setX(k, tPos.getX(k) * 0.8); // Narrow tip
                }
            }
            toeGeo.computeVertexNormals();
            toeGeo.translate(0, 0, tLen/2); // Pivot at base

            const toeUnit = new THREE.Group();
            
            if (i > 0) {
                 const prevW = tWidths[i-1];
                 const shift = (prevW/2 + spacing + tW/2);
                 currentCenter += shift * stepDir;
            }

            const zOffset = -Math.pow(i, 1.5) * 0.004;

            toeUnit.position.set(currentCenter, 0.0, zOffset);
            toeUnit.userData = { initialX: currentCenter }; // Store for scaling in PlayerModel
            
            const toeMesh = new THREE.Mesh(toeGeo, footMat);
            toeMesh.castShadow = true;
            
            toeMesh.rotation.y = i * 0.05 * splayDir;

            toeUnit.add(toeMesh);
            forefootGroup.add(toeUnit);
            arrays.toeUnits.push(toeUnit);
        }

        arrays.forefootGroups.push(forefootGroup);

        return { heelGroup: footGroup, forefootGroup: new THREE.Group() }; 
    }
}
