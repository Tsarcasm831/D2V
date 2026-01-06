import * as THREE from 'three';

export function attachShorts(parts, config = {}) {
    if (config.gear && config.gear.pants) return; // Don't show shorts if wearing pants
    const shortsColor = '#5d4037'; // Sturdy brown fabric
    const shortsMat = new THREE.MeshToonMaterial({ color: shortsColor });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    const isFemale = config.bodyType === 'female';
    const torsoRadiusBottom = isFemale ? 0.27 : 0.22; // Match player_mesh.js values
    const pelvisHeight = 0.14; // From TorsoBuilder
    
    // Adjusted radii for a closer fit that follows the pelvis contour
    const waistRadiusTop = isFemale ? torsoRadiusBottom * 1.02 : torsoRadiusBottom * 1.06;
    const waistRadiusBottom = isFemale ? torsoRadiusBottom * 1.0 : torsoRadiusBottom * 1.04;
    
    const waistGeo = new THREE.CylinderGeometry(waistRadiusTop, waistRadiusBottom, pelvisHeight, 16);
    const waist = new THREE.Mesh(waistGeo, shortsMat);
    
    // Position to match body pelvis (parented to parts.pelvis)
    waist.position.y = -pelvisHeight / 2;
    // Match pelvis oval profile (torso uses z-scale 0.7)
    waist.scale.set(1.03, 1.01, 0.74); 
    waist.castShadow = true;
    parts.pelvis.add(waist);

    const waistOutline = new THREE.Mesh(waistGeo, outlineMat);
    waistOutline.scale.setScalar(1.06);
    waist.add(waistOutline);

    // Crotch/Bottom Section
    const crotchGeo = new THREE.SphereGeometry(waistRadiusBottom * 0.98, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const crotch = new THREE.Mesh(crotchGeo, shortsMat);
    crotch.position.y = -pelvisHeight / 2;
    crotch.scale.set(1.02, 1.0, 0.72);
    waist.add(crotch);

    const crotchOutline = new THREE.Mesh(crotchGeo, outlineMat);
    crotchOutline.scale.setScalar(1.06);
    crotchOutline.position.y = -pelvisHeight / 2;
    waist.add(crotchOutline);

    // Leg Section - Wrap the thigh correctly
    const thighRadius = 0.11, thighLen = 0.4;
    const legLen = thighLen * 0.65;
    const legGeo = new THREE.CylinderGeometry(thighRadius * 1.14, thighRadius * 1.08, legLen, 12);
    const hemGeo = new THREE.CylinderGeometry(thighRadius * 1.15, thighRadius * 1.12, 0.045, 12);
    
    const attachLeg = (thighPart) => {
        const leg = new THREE.Mesh(legGeo, shortsMat);
        // Pivot is at the top of the thigh mesh due to createSegment translation
        // The thigh mesh extends from y=0 to y=-0.4
        leg.position.y = -legLen / 2; 
        leg.scale.set(1.02, 1.0, 0.9);
        leg.castShadow = true;
        thighPart.add(leg);

        const legOutline = new THREE.Mesh(legGeo, outlineMat);
        legOutline.scale.setScalar(1.05);
        leg.add(legOutline);

        const hem = new THREE.Mesh(hemGeo, shortsMat);
        hem.position.y = -legLen / 2;
        hem.scale.set(1.02, 1.0, 0.9);
        leg.add(hem);

        const hemOutline = new THREE.Mesh(hemGeo, outlineMat);
        hemOutline.scale.setScalar(1.05);
        hem.add(hemOutline);

        return leg;
    };

    parts.rightShortsLeg = attachLeg(parts.rightThigh);
    parts.leftShortsLeg = attachLeg(parts.leftThigh);

    return { waist, rightLeg: parts.rightShortsLeg, leftLeg: parts.leftShortsLeg };
}
