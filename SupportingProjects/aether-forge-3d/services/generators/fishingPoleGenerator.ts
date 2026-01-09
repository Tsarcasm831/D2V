import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateFishingPole = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;

    // Config mapping
    const handleH = config.handleLength * s; // Cork grip length
    const handleR = config.handleRadius * s; // Grip thickness
    const reelSize = config.guardWidth * s; // Reel scale
    const rodL = config.bladeLength * s; // Rod shaft length
    const lineL = config.bladeWidth * s; // Line length hanging down
    const lineThick = Math.max(0.005, config.bladeThickness * s); // Line thickness
    const bobberSize = config.pommelSize * s; // Bobber size

    // 1. Handle (Cork/Foam Grip)
    const handleGeo = new THREE.CylinderGeometry(handleR, handleR, handleH, 16);
    const handle = new THREE.Mesh(handleGeo, mats.handleMat);
    handle.position.y = handleH / 2;
    handle.castShadow = true;
    group.add(handle);

    // 2. Reel Seat & Mechanism
    const reelGroup = new THREE.Group();
    reelGroup.position.set(0, handleH * 0.8, handleR * 1.2);
    
    // Reel Stem
    const stem = new THREE.Mesh(new THREE.BoxGeometry(handleR, handleR, handleR*2), mats.metalMat);
    reelGroup.add(stem);
    
    // Reel Spool (Cylinder)
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(reelSize, reelSize, reelSize * 0.8, 16), mats.metalMat);
    spool.rotation.z = Math.PI / 2;
    spool.position.z = handleR + reelSize * 0.4;
    reelGroup.add(spool);

    // Handle Crank
    const crank = new THREE.Mesh(new THREE.BoxGeometry(reelSize * 0.2, reelSize * 0.8, reelSize * 0.1), mats.guardMat);
    crank.position.set(reelSize * 0.5, 0, handleR + reelSize * 0.8);
    reelGroup.add(crank);
    
    group.add(reelGroup);

    // 3. Rod Shaft (Tapered)
    // Start from top of handle
    const rodGeo = new THREE.CylinderGeometry(handleR * 0.2, handleR * 0.8, rodL, 8);
    const rod = new THREE.Mesh(rodGeo, mats.metalMat);
    rod.position.y = handleH + rodL / 2;
    rod.castShadow = true;
    group.add(rod);

    // 4. Eyelets (Rings along the rod)
    const numEyes = 4;
    for(let i = 0; i < numEyes; i++) {
        const t = (i + 1) / (numEyes + 1);
        const yPos = handleH + rodL * t;
        const r = (handleR * 0.5) * (1 - t) + 0.02; // Tapering eyelet size
        
        const eye = new THREE.Mesh(new THREE.TorusGeometry(r, r*0.2, 4, 12), mats.metalMat);
        eye.position.set(0, yPos, (handleR * 0.8 * (1-t) + handleR * 0.2 * t)); // Offset from rod surface
        eye.rotation.x = Math.PI / 2;
        group.add(eye);
    }

    // 5. Fishing Line
    // Goes from last eyelet tip down
    const tipY = handleH + rodL;
    const tipOffsetZ = handleR * 0.2; // Approximate tip radius offset
    
    const lineGeo = new THREE.CylinderGeometry(lineThick, lineThick, lineL, 4);
    const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    line.position.set(0, tipY - lineL/2, tipOffsetZ);
    group.add(line);

    // 6. Bobber
    const bobberGeo = new THREE.SphereGeometry(bobberSize, 16, 16);
    const bobber = new THREE.Mesh(bobberGeo, new THREE.MeshStandardMaterial({ color: config.guardColor, roughness: 0.2 }));
    bobber.position.set(0, tipY - lineL, tipOffsetZ);
    bobber.name = 'damagePart'; // Effect target
    group.add(bobber);
    
    // Rotate entire pole to be held diagonally? 
    // Usually builder returns upright. We can leave it upright.
    
    // Center the group based on handle
    group.position.y = -handleH / 2;
};