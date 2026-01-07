import * as THREE from 'three';

export class HandBuilder {
    static create(materials, isLeft, arrays) {
        const hand = new THREE.Group();
        const handMat = materials.skin;
        const sideMult = isLeft ? -1 : 1;

        // Palm
        const palmW = 0.08;
        const palmH = 0.09;
        const palmD = 0.03;
        const palmGeo = new THREE.BoxGeometry(palmW, palmH, palmD);
        palmGeo.translate(0, -palmH / 2 + 0.01, 0);
        const palm = new THREE.Mesh(palmGeo, handMat);
        palm.castShadow = true;
        hand.add(palm);

        // Fingers
        const fLengths = [0.085, 0.095, 0.088, 0.07];
        const fWidth = 0.019;
        const fDepth = 0.021;
        const knuckleY = -0.075;
        const startX = 0.032 * sideMult;
        const spacing = 0.022 * sideMult;

        for (let i = 0; i < 4; i++) {
            const fGroup = new THREE.Group();
            const xPos = startX - (i * spacing);
            const yOffset = Math.abs(i - 1.5) * -0.002;
            fGroup.position.set(xPos, knuckleY + yOffset, 0);

            // Proximal
            const pLen = fLengths[i] * 0.55;
            const pGeo = new THREE.BoxGeometry(fWidth, pLen, fDepth);
            pGeo.translate(0, -pLen / 2, 0);
            const prox = new THREE.Mesh(pGeo, handMat);
            prox.castShadow = true;
            prox.name = 'proximal';
            prox.add(new THREE.Mesh(new THREE.SphereGeometry(fWidth * 0.55, 8, 8), handMat));

            // Distal
            const dLen = fLengths[i] * 0.45;
            const dGeo = new THREE.BoxGeometry(fWidth * 0.85, dLen, fDepth * 0.85);
            dGeo.translate(0, -dLen / 2, 0);
            const dist = new THREE.Mesh(dGeo, handMat);
            dist.position.y = -pLen;
            dist.castShadow = true;
            dist.name = 'distal';
            dist.add(new THREE.Mesh(new THREE.SphereGeometry(fWidth * 0.5, 8, 8), handMat));

            prox.add(dist);
            fGroup.add(prox);
            hand.add(fGroup);

            if (isLeft) {
                arrays.leftFingers.push(fGroup);
            } else {
                arrays.rightFingers.push(fGroup);
            }
        }

        // Thumb
        const thumbGroup = new THREE.Group();
        thumbGroup.position.set(0.045 * sideMult, -0.03, 0.015);
        const splayAngle = 0.6 * sideMult;
        const oppositionAngle = -0.5 * sideMult;
        thumbGroup.rotation.set(0.3, oppositionAngle, splayAngle);

        const tLen1 = 0.05;
        const tGeo1 = new THREE.BoxGeometry(0.024, tLen1, 0.024);
        tGeo1.translate(0, -tLen1 / 2, 0);
        const tProx = new THREE.Mesh(tGeo1, handMat);
        tProx.castShadow = true;
        tProx.name = 'proximal';
        tProx.add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), handMat));

        const tLen2 = 0.04;
        const tGeo2 = new THREE.BoxGeometry(0.02, tLen2, 0.02);
        tGeo2.translate(0, -tLen2 / 2, 0);
        const tDist = new THREE.Mesh(tGeo2, handMat);
        tDist.position.y = -tLen1;
        tDist.castShadow = true;
        tDist.name = 'distal';
        tDist.add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), handMat));

        tProx.add(tDist);
        thumbGroup.add(tProx);
        hand.add(thumbGroup);

        if (isLeft) {
            arrays.leftThumb = thumbGroup;
        } else {
            arrays.rightThumb = thumbGroup;
        }

        // Thumb Muscle
        const muscle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), handMat);
        muscle.position.set(0.035 * sideMult, -0.05, 0.025);
        muscle.scale.set(0.8, 1.3, 0.7);
        muscle.rotation.z = 0.4 * sideMult;
        hand.add(muscle);

        return hand;
    }
}
