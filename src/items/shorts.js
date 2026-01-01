import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function attachShorts(parts, config = {}) {
    if (config.gear && config.gear.pants) return; // Don't show shorts if wearing pants
    const shortsColor = '#5d4037'; // Sturdy brown fabric
    const shortsMat = new THREE.MeshToonMaterial({ color: shortsColor });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    const isFemale = config.bodyType === 'female';
    const torsoRadiusBottom = isFemale ? 0.27 : 0.22; // Match player_mesh.js values
    const waistLen = isFemale ? 0.18 : 0.24; // Shorter waistband for female to avoid overlapping too high
    
    // Adjusted radii for female waistband to be tighter
    const waistRadiusTop = isFemale ? torsoRadiusBottom * 1.04 : torsoRadiusBottom * 1.08;
    const waistRadiusBottom = isFemale ? torsoRadiusBottom * 1.02 : torsoRadiusBottom * 1.06;
    
    const waistGeo = new THREE.CylinderGeometry(waistRadiusTop, waistRadiusBottom, waistLen, 16);
    const waist = new THREE.Mesh(waistGeo, shortsMat);
    
    // Position it to start slightly lower to ensure full coverage of the lower torso
    // Adjusted y-position for the shorter waistband
    const yOffset = isFemale ? 0.04 : 0.06;
    waist.position.y = (yOffset + waistLen/2) * SCALE_FACTOR;
    waist.castShadow = true;
    parts.torsoContainer.add(waist);

    const waistOutline = new THREE.Mesh(waistGeo, outlineMat);
    waistOutline.scale.setScalar(1.05);
    waist.add(waistOutline);

    // Crotch/Bottom Section to ensure underwear is covered from below
    // Match the radius exactly to the bottom of the waistband to fix the seam
    const crotchGeo = new THREE.SphereGeometry(waistRadiusBottom, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const crotch = new THREE.Mesh(crotchGeo, shortsMat);
    crotch.position.y = -waistLen / 2;
    waist.add(crotch);

    const crotchOutline = new THREE.Mesh(crotchGeo, outlineMat);
    crotchOutline.scale.setScalar(1.05);
    crotchOutline.position.y = -waistLen / 2;
    waist.add(crotchOutline);

    // 2. Leg Sections (Attached to the thighs)
    // Increased length to reach knee level (thigh segment is 0.4 units long)
    const thighRadius = 0.1, legLen = 0.42;
    const legGeo = new THREE.CylinderGeometry(thighRadius * 1.35, thighRadius * 1.25, legLen, 12);
    
    const attachLeg = (thighPart) => {
        const leg = new THREE.Mesh(legGeo, shortsMat);
        // Positioned to cover the thigh segment down to the knee
        leg.position.y = -legLen / 2 + 0.02; 
        leg.castShadow = true;
        thighPart.add(leg);

        const legOutline = new THREE.Mesh(legGeo, outlineMat);
        legOutline.scale.setScalar(1.1);
        leg.add(legOutline);

        return leg;
    };

    parts.rightShortsLeg = attachLeg(parts.rightThigh);
    parts.leftShortsLeg = attachLeg(parts.leftThigh);

    return { waist, rightLeg: parts.rightShortsLeg, leftLeg: parts.leftShortsLeg };
}