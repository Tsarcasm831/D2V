import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function attachUnderwear(parts) {
    const underwearColor = '#ffffff';
    const underwearMat = new THREE.MeshToonMaterial({ color: underwearColor });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    // Match body pelvis dimensions from TorsoBuilder
    const torsoRadiusBottom = 0.22; // From TorsoBuilder
    const pelvisHeight = 0.14; // From TorsoBuilder
    
    // 1. Pelvis Section - Match body pelvis geometry exactly
    const pelvisGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 0.95, torsoRadiusBottom * 0.55, pelvisHeight, 16);
    pelvisGeo.scale(1, 1, 0.7); // Match body scaling
    const underwear = new THREE.Mesh(pelvisGeo, underwearMat);
    
    // Position relative to pelvis group (TorsoBuilder line 58)
    // In TorsoBuilder, pelvis group is at y = -torsoLen/2 relative to torso mesh.
    // The pelvis mesh inside that group is at y = -pelvisHeight/2.
    underwear.position.set(0, -pelvisHeight / 2, 0);
    underwear.scale.set(1.02, 1.02, 1.02); // Slightly larger to avoid Z-fighting
    parts.pelvis.add(underwear);

    // 2. Crotch Section - Match body crotch geometry
    const crotchGeo = new THREE.SphereGeometry(torsoRadiusBottom * 0.55, 16, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2);
    crotchGeo.scale(1, 0.7, 0.7); // Match body scaling
    const crotch = new THREE.Mesh(crotchGeo, underwearMat);
    crotch.position.set(0, -pelvisHeight, 0);
    crotch.scale.set(1.02, 1.02, 1.02);
    parts.pelvis.add(crotch);

    // Outlines
    [pelvisGeo, crotchGeo].forEach(g => {
        const o = new THREE.Mesh(g, outlineMat);
        o.scale.setScalar(1.04); 
        if (g === crotchGeo) o.position.set(0, -pelvisHeight, 0);
        else o.position.set(0, -pelvisHeight / 2, 0);
        parts.pelvis.add(o);
    });

    return { underwear, crotch };
}