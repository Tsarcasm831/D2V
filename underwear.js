import * as THREE from 'three';
import { SCALE_FACTOR } from './world_bounds.js';

export function attachUnderwear(parts) {
    const underwearColor = '#ffffff';
    const underwearMat = new THREE.MeshToonMaterial({ color: underwearColor });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    // Underwear parameters (matching the bottom of the torso in player_mesh.js)
    const torsoRadiusBottom = 0.22, underwearLen = 0.12;
    
    // 1. Waistband/Crotch Section (Bottom slice of the torso cylinder)
    const underwearGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 1.01, torsoRadiusBottom, underwearLen, 16);
    const underwear = new THREE.Mesh(underwearGeo, underwearMat);
    
    // Position it at the very bottom of the torso cylinder
    // In player_mesh, torso is at y=0.325, cylinder bottom is at y=0.1
    underwear.position.y = (0.1 + underwearLen/2) * SCALE_FACTOR;
    parts.torsoContainer.add(underwear);

    // 2. Bottom Cap (Pelvic area)
    const botCapGeo = new THREE.SphereGeometry(torsoRadiusBottom, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const botUnderwear = new THREE.Mesh(botCapGeo, underwearMat);
    botUnderwear.position.y = -underwearLen / 2;
    underwear.add(botUnderwear);

    // Outlines for crisp look
    [underwearGeo, botCapGeo].forEach(g => {
        const o = new THREE.Mesh(g, outlineMat);
        o.scale.setScalar(1.05);
        if (g === botCapGeo) o.position.y = -underwearLen / 2;
        underwear.add(o);
    });

    return { underwear, botUnderwear };
}