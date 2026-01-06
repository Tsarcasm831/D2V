import * as THREE from 'three';

export class HandBuilder {
    static create(materials, isLeft, arrays) {
        const hand = new THREE.Group();
        const handMat = materials.skin;
        
        const sideMult = isLeft ? -1 : 1; 

        // Palm Dimensions
        const palmW = 0.085;
        const palmH = 0.09;
        const palmD = 0.035;
        
        const palmGeo = new THREE.BoxGeometry(palmW, palmH, palmD);
        const palm = new THREE.Mesh(palmGeo, handMat);
        palm.position.y = -0.045; 
        palm.castShadow = true;
        hand.add(palm);

        // FINGERS
        const fLengths = [0.08, 0.09, 0.085, 0.065]; 
        const fWidth = 0.018;
        const fDepth = 0.02;
        
        const startX = 0.03 * sideMult; 
        const spacing = 0.022 * sideMult; 

        for(let i=0; i<4; i++) {
            const fGroup = new THREE.Group();
            const xPos = startX - (i * spacing);
            
            fGroup.position.set(xPos, -0.09, 0); 
            fGroup.position.y += Math.abs(i-1.5) * -0.005;

            // Proximal Phalanx
            const pLen = fLengths[i] * 0.55;
            const pGeo = new THREE.BoxGeometry(fWidth, pLen, fDepth);
            pGeo.translate(0, -pLen/2, 0); 
            const prox = new THREE.Mesh(pGeo, handMat);
            prox.castShadow = true;
            prox.name = 'proximal';
            
            const k1 = new THREE.Mesh(new THREE.SphereGeometry(fWidth*0.6, 8, 8), handMat);
            prox.add(k1);

            // Distal Phalanx
            const dLen = fLengths[i] * 0.45;
            const dGeo = new THREE.BoxGeometry(fWidth*0.85, dLen, fDepth*0.85);
            dGeo.translate(0, -dLen/2, 0);
            const dist = new THREE.Mesh(dGeo, handMat);
            dist.position.y = -pLen;
            dist.castShadow = true;
            dist.name = 'distal';
            
            const k2 = new THREE.Mesh(new THREE.SphereGeometry(fWidth*0.5, 8, 8), handMat);
            dist.add(k2);

            prox.add(dist);
            fGroup.add(prox);
            hand.add(fGroup);

            if (!isLeft) arrays.rightFingers.push(fGroup);
        }

        // THUMB
        const thumbGroup = new THREE.Group();
        thumbGroup.position.set(0.05 * sideMult, -0.03, 0.01);
        
        thumbGroup.rotation.z = 0.5 * sideMult; 
        thumbGroup.rotation.y = -0.5 * sideMult; 

        const tLen1 = 0.045;
        const tGeo1 = new THREE.BoxGeometry(0.024, tLen1, 0.024);
        tGeo1.translate(0, -tLen1/2, 0);
        const tProx = new THREE.Mesh(tGeo1, handMat);
        tProx.castShadow = true;
        tProx.name = 'proximal';
        
        const tk1 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), handMat);
        tProx.add(tk1);

        const tLen2 = 0.035;
        const tGeo2 = new THREE.BoxGeometry(0.02, tLen2, 0.02);
        tGeo2.translate(0, -tLen2/2, 0);
        const tDist = new THREE.Mesh(tGeo2, handMat);
        tDist.position.y = -tLen1;
        tDist.castShadow = true;
        tDist.name = 'distal';
        
        const tk2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), handMat);
        tDist.add(tk2);

        tProx.add(tDist);
        thumbGroup.add(tProx);
        hand.add(thumbGroup);

        if (!isLeft) arrays.rightThumb = thumbGroup;

        const muscle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), handMat);
        muscle.position.set(0.035 * sideMult, -0.05, 0.02);
        muscle.scale.set(0.8, 1.4, 0.8);
        hand.add(muscle);

        return hand;
    }
}
