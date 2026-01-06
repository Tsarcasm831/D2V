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
            // Coordination Check:
            // Right Foot (-X Global): Medial is +X. Lateral is -X.
            // Left Foot (+X Global): Medial is -X. Lateral is +X.
            
            // isLeft = true -> Medial is -X. vec.x < 0.
            // isLeft = false -> Medial is +X. vec.x > 0.
            
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
        // Center main mesh so the "Ankle" pivot (0,0,0) is at the top-back-ish
        mainMesh.position.set(0, -0.045, 0.03); 
        mainMesh.castShadow = true;
        heelGroup.add(mainMesh);
        arrays.heelGroups.push(heelGroup);

        // 2. TOES (Forefoot)
        const forefootGroup = new THREE.Group();
        forefootGroup.name = (isLeft ? 'left' : 'right') + '_forefoot';
        
        // Position at the front face of the main mesh
        // mainMesh Z ends at 0.03 + 0.15/2 = 0.105
        // Position slightly back (0.098) to overlap and prevent gaps "floating".
        // Position Y aligned to sit on ground. 
        forefootGroup.position.set(0, -0.058, 0.098); 
        footGroup.add(forefootGroup);

        const toeCount = 5;
        // Medial -> Lateral
        const tLengths = [0.06, 0.052, 0.048, 0.044, 0.04];
        const tWidths  = [0.034, 0.026, 0.024, 0.022, 0.021];
        const tHeights = [0.030, 0.026, 0.024, 0.022, 0.021];
        
        // --- Toe Placement Logic ---
        // We define startX as the MEDIAL center coordinate for the big toe, 
        // and then step LATERALLY for subsequent toes.
        
        // LEFT FOOT: 
        // Medial is -X (Right side of the foot mesh if looking from top).
        // Lateral is +X.
        // Big Toe should be at approx -0.035. Steps move positive.
        
        // RIGHT FOOT:
        // Medial is +X (Left side of the foot mesh if looking from top).
        // Lateral is -X.
        // Big Toe should be at approx +0.035. Steps move negative.

        let currentCenter = 0;
        let stepDir = 0;

        if (isLeft) {
            currentCenter = -0.030; // Start Medial (Negative)
            stepDir = 1; // Move Lateral (Positive)
        } else {
            currentCenter = 0.030; // Start Medial (Positive)
            stepDir = -1; // Move Lateral (Negative)
        }
        
        // Splay direction: 
        // Left Foot: Toes splay outwards (+X is Out). 
        // Right Foot: Toes splay outwards (-X is Out).
        // Rotation should flare out.
        // Left: Rotate Y positive (nose moves Left/+X). 
        // Right: Rotate Y negative (nose moves Right/-X).
        const splayDir = isLeft ? 1 : -1;

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
            
            const spacing = 0.002;
            
            if (i > 0) {
                 const prevW = tWidths[i-1];
                 // Move center point laterally
                 const shift = (prevW/2 + spacing + tW/2);
                 currentCenter += shift * stepDir;
            }

            // Curve toes back for pinky (Natural arch)
            const zOffset = -Math.pow(i, 1.5) * 0.004;

            toeUnit.position.set(currentCenter, 0.0, zOffset);
            
            const toeMesh = new THREE.Mesh(toeGeo, footMat);
            toeMesh.castShadow = true;
            
            // Splay rotation
            // i=0 is Big Toe (Straight). i=4 is Pinky (Splayed).
            toeMesh.rotation.y = i * 0.05 * splayDir;

            toeUnit.add(toeMesh);
            forefootGroup.add(toeUnit);
            arrays.toeUnits.push(toeUnit);
        }

        arrays.forefootGroups.push(forefootGroup);

        return { heelGroup: footGroup, forefootGroup: new THREE.Group() }; 
    }
}