import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createAxe() {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x4e342e });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae });

    // Align handle so (0,0,0) is the bottom grip
    const handleHeight = 0.9 * SCALE_FACTOR;
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * SCALE_FACTOR, 0.03 * SCALE_FACTOR, handleHeight), 
        handleMat
    );
    handle.position.y = handleHeight / 2;
    group.add(handle);

    // Add a head/blade at the top of the handle
    const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.35 * SCALE_FACTOR, 0.25 * SCALE_FACTOR, 0.06 * SCALE_FACTOR), 
        bladeMat
    );
    // Rotate the blade so its width is along the handle's Z-axis (which maps to down in the hand)
    blade.rotation.y = Math.PI / 2;
    blade.position.set(0, handleHeight - 0.1 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
    group.add(blade);

    return group;
}