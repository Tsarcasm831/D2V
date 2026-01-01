import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createClub() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.5, roughness: 0.5 });

    // Handle (thinner part)
    const handleHeight = 0.4 * SCALE_FACTOR;
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04 * SCALE_FACTOR, 0.05 * SCALE_FACTOR, handleHeight),
        woodMat
    );
    handle.position.y = handleHeight / 2;
    group.add(handle);

    // Head (thicker, tapered part)
    const headHeight = 0.6 * SCALE_FACTOR;
    const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * SCALE_FACTOR, 0.05 * SCALE_FACTOR, headHeight),
        woodMat
    );
    head.position.y = handleHeight + headHeight / 2;
    group.add(head);

    // Iron bands
    const bandGeo = new THREE.TorusGeometry(0.08 * SCALE_FACTOR, 0.015 * SCALE_FACTOR, 8, 16);
    const band1 = new THREE.Mesh(bandGeo, ironMat);
    band1.rotation.x = Math.PI / 2;
    band1.position.y = handleHeight + 0.1 * SCALE_FACTOR;
    group.add(band1);

    const band2 = new THREE.Mesh(bandGeo, ironMat);
    band2.rotation.x = Math.PI / 2;
    band2.position.y = handleHeight + 0.4 * SCALE_FACTOR;
    band2.scale.set(1.3, 1.3, 1);
    group.add(band2);

    // Small spike at the very top
    const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.03 * SCALE_FACTOR, 0.1 * SCALE_FACTOR, 4),
        ironMat
    );
    spike.position.y = handleHeight + headHeight + 0.04 * SCALE_FACTOR;
    group.add(spike);

    return group;
}