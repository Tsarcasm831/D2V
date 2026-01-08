import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createKunai() {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 }); // Black handle wrap
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.8, roughness: 0.3 }); // Darker metal

    // Blade (Leaf shape)
    const bladeHeight = 0.3 * SCALE_FACTOR;
    const bladeGeo = new THREE.ConeGeometry(0.06 * SCALE_FACTOR, bladeHeight, 4);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.position.y = bladeHeight / 2 + 0.1 * SCALE_FACTOR;
    blade.rotation.y = Math.PI / 4;
    group.add(blade);

    // Handle (Rod)
    const handleHeight = 0.15 * SCALE_FACTOR;
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015 * SCALE_FACTOR, 0.015 * SCALE_FACTOR, handleHeight),
        handleMat
    );
    handle.position.y = 0.05 * SCALE_FACTOR;
    group.add(handle);

    // Ring at the end
    const ringGeo = new THREE.TorusGeometry(0.03 * SCALE_FACTOR, 0.01 * SCALE_FACTOR, 8, 16);
    const ring = new THREE.Mesh(ringGeo, handleMat);
    ring.position.y = -0.05 * SCALE_FACTOR;
    group.add(ring);

    return group;
}
