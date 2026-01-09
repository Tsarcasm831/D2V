import * as THREE from 'three';

export class HandBuilder {
    static create(materials, isLeft, arrays) {
        const hand = new THREE.Group();
        
        const handMat = materials.skin;
        
        // --- COORDINATE SYSTEM ---
        // Local Y- is DOWN (Fingertips direction).
        // Local Z+ is PALM direction (Curl direction).
        // Local X is WIDTH.
        
        // RIGHT HAND (isLeft = false): Thumb at +X
        // LEFT HAND (isLeft = true): Thumb at -X
        
        const sideMult = isLeft ? -1 : 1; 

        // 1. PALM (Metacarpals)
        const palmW = 0.08;
        const palmH = 0.09;
        const palmD = 0.03;
        
        // Sculpted Rounded Box
        const palmGeo = new THREE.BoxGeometry(palmW, palmH, palmD, 4, 4, 2);
        const pPos = palmGeo.attributes.position;
        const v = new THREE.Vector3();
        
        // Helper to prevent NaN from floating point errors (e.g. 1.0000001 - 0.5 - 0.5 < 0)
        const safeSqrt = (val) => Math.sqrt(Math.max(0, val));

        for (let i = 0; i < pPos.count; i++) {
            v.fromBufferAttribute(pPos, i);
            
            // Normalized coordinates (-1 to 1) relative to box dimensions
            const nx = v.x / (palmW / 2);
            const ny = v.y / (palmH / 2);
            const nz = v.z / (palmD / 2);
            
            // 1. Spherize/Round the box
            // Blend between box and ellipsoid for rounded corners
            const sphereFactor = 0.5; // Amount of roundness
            
            // Target Ellipsoid coords (Mapping cube to sphere)
            // Use safeSqrt to avoid NaN at corners where coordinates might slightly exceed 1.0 due to float precision
            const ex = v.x * safeSqrt(1 - (ny*ny)/2 - (nz*nz)/2);
            const ey = v.y * safeSqrt(1 - (nz*nz)/2 - (nx*nx)/2);
            const ez = v.z * safeSqrt(1 - (nx*nx)/2 - (ny*ny)/2);
            
            // Blend
            v.x = v.x * (1 - sphereFactor) + ex * sphereFactor;
            v.y = v.y * (1 - sphereFactor) + ey * sphereFactor;
            v.z = v.z * (1 - sphereFactor) + ez * sphereFactor;

            // 2. Taper towards Wrist (Y+)
            if (ny > 0) {
                // Narrow the wrist end
                v.x *= 0.85 + (1 - ny) * 0.15; 
            } else {
                // Widen slightly at knuckles (Y-)
                v.x *= 1.05;
            }

            // 3. Palm Hollow (Z+) & Back of Hand Bulge (Z-)
            const distFromCenter = Math.sqrt(nx*nx + ny*ny);
            if (distFromCenter < 0.8) {
                if (nz > 0) {
                    // Hollow palm
                    v.z -= 0.006 * (1 - distFromCenter);
                } else {
                    // Bulge back
                    v.z += 0.003 * (1 - distFromCenter);
                }
            }

            pPos.setXYZ(i, v.x, v.y, v.z);
        }
        
        palmGeo.computeVertexNormals();
        // Shift pivot to Wrist (Top of palm)
        palmGeo.translate(0, -palmH/2 + 0.01, 0); 
        
        const palm = new THREE.Mesh(palmGeo, handMat);
        palm.castShadow = true;
        hand.add(palm);

        // 2. FINGERS
        // Offsets for natural arch
        const fLengths = [0.085, 0.095, 0.088, 0.07]; 
        const fWidth = 0.019;
        const fDepth = 0.021;
        const depthScale = fDepth / fWidth;
        
        // Knuckle Line Y-pos (Bottom of palm)
        const knuckleY = -0.075;
        
        // Spacing logic
        const startX = 0.032 * sideMult; 
        const spacing = 0.022 * sideMult; 

        for(let i=0; i<4; i++) {
            const fGroup = new THREE.Group();
            
            const xPos = startX - (i * spacing);
            // Arch the knuckles (Middle fingers lower/further out)
            const yOffset = Math.abs(i-1.5) * -0.002;
            
            fGroup.position.set(xPos, knuckleY + yOffset, 0); 

            // Proximal Phalanx
            const pLen = fLengths[i] * 0.55;
            // Use Cylinder for round fingers
            const pRadius = fWidth * 0.5;
            const pGeo = new THREE.CylinderGeometry(pRadius, pRadius * 0.9, pLen, 8);
            pGeo.scale(1, 1, depthScale); // Maintain oval cross-section
            pGeo.translate(0, -pLen/2, 0); // Pivot at knuckle
            const prox = new THREE.Mesh(pGeo, handMat);
            prox.castShadow = true;
            prox.name = 'proximal';
            
            // Knuckle Mesh
            const k1 = new THREE.Mesh(new THREE.SphereGeometry(fWidth*0.55, 8, 8), handMat);
            prox.add(k1);

            // Distal Phalanx
            const dLen = fLengths[i] * 0.45;
            // Start where proximal ended (approx 0.9 factor)
            const dRadiusTop = pRadius * 0.9;
            const dRadiusBot = dRadiusTop * 0.85;
            const dGeo = new THREE.CylinderGeometry(dRadiusTop, dRadiusBot, dLen, 8);
            dGeo.scale(1, 1, depthScale);
            dGeo.translate(0, -dLen/2, 0);
            const dist = new THREE.Mesh(dGeo, handMat);
            dist.position.y = -pLen;
            dist.castShadow = true;
            dist.name = 'distal';
            
            // Joint Mesh
            const k2 = new THREE.Mesh(new THREE.SphereGeometry(fWidth*0.5, 8, 8), handMat);
            dist.add(k2);

            // Fingertip Mesh
            const k3 = new THREE.Mesh(new THREE.SphereGeometry(fWidth*0.42, 8, 8), handMat);
            k3.position.y = -dLen;
            dist.add(k3);

            prox.add(dist);
            fGroup.add(prox);
            hand.add(fGroup);

            if (!isLeft) arrays.rightFingers.push(fGroup);
            else arrays.leftFingers.push(fGroup);
        }

        // 3. THUMB
        // Thumb Metacarpal (Hidden/Integrated) -> Proximal -> Distal
        // Position: Side of wrist, slightly down
        const thumbGroup = new THREE.Group();
        thumbGroup.position.set(0.045 * sideMult, -0.03, 0.015);
        
        // Orientation:
        // Splay out (Z rotation) around 45deg
        // Face palm (Y rotation)
        // Tilt down (X rotation)
        
        const splayAngle = 0.6 * sideMult; // Outward
        const oppositionAngle = -0.5 * sideMult; // Inward facing palm
        
        thumbGroup.rotation.set(0.3, oppositionAngle, splayAngle);

        // Thumb Proximal
        const tLen1 = 0.05;
        const tGeo1 = new THREE.CylinderGeometry(0.012, 0.011, tLen1, 8);
        tGeo1.translate(0, -tLen1/2, 0);
        const tProx = new THREE.Mesh(tGeo1, handMat);
        tProx.castShadow = true;
        tProx.name = 'proximal';
        
        const tk1 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), handMat);
        tProx.add(tk1);

        // Thumb Distal
        const tLen2 = 0.04;
        const tGeo2 = new THREE.CylinderGeometry(0.01, 0.008, tLen2, 8);
        tGeo2.translate(0, -tLen2/2, 0);
        const tDist = new THREE.Mesh(tGeo2, handMat);
        tDist.position.y = -tLen1;
        tDist.castShadow = true;
        tDist.name = 'distal';
        
        const tk2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), handMat);
        tDist.add(tk2);

        // Thumb Tip
        const tk3 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), handMat);
        tk3.position.y = -tLen2;
        tDist.add(tk3);

        tProx.add(tDist);
        thumbGroup.add(tProx);
        hand.add(thumbGroup);

        if (!isLeft) arrays.rightThumb = thumbGroup;
        else arrays.leftThumb = thumbGroup;

        // Thenar Eminence (Thumb Muscle pad)
        const muscle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), handMat);
        muscle.position.set(0.035 * sideMult, -0.05, 0.025);
        muscle.scale.set(0.8, 1.3, 0.7);
        // Rotate to blend with palm side
        muscle.rotation.z = 0.4 * sideMult;
        hand.add(muscle);
        
        if (arrays.thenars) arrays.thenars.push(muscle);

        return hand;
    }
}
