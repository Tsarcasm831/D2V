import * as THREE from 'three';
import { SCALE_FACTOR } from './world_bounds.js';

export function createSword() {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 }); // Dark wood
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8, roughness: 0.2 }); // Shiny metal
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.9, roughness: 0.1 }); // Gold/Brass

    // Handle (Grip)
    const handleHeight = 0.25 * SCALE_FACTOR;
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025 * SCALE_FACTOR, 0.025 * SCALE_FACTOR, handleHeight),
        handleMat
    );
    handle.position.y = handleHeight / 2;
    group.add(handle);

    // Crossguard
    const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.25 * SCALE_FACTOR, 0.04 * SCALE_FACTOR, 0.06 * SCALE_FACTOR),
        guardMat
    );
    guard.position.y = handleHeight;
    group.add(guard);

    // Blade
    const bladeHeight = 0.8 * SCALE_FACTOR;
    const bladeGeo = new THREE.BoxGeometry(0.08 * SCALE_FACTOR, bladeHeight, 0.02 * SCALE_FACTOR);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.position.y = handleHeight + bladeHeight / 2;
    group.add(blade);

    // Tip (Pointy end)
    const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.04 * SCALE_FACTOR, 0.15 * SCALE_FACTOR, 4),
        metalMat
    );
    tip.position.y = handleHeight + bladeHeight + 0.05 * SCALE_FACTOR;
    tip.rotation.y = Math.PI / 4; // Align square cone with blade
    group.add(tip);

    // Pommel
    const pommel = new THREE.Mesh(
        new THREE.SphereGeometry(0.035 * SCALE_FACTOR, 8, 8),
        guardMat
    );
    pommel.position.y = -0.02 * SCALE_FACTOR;
    group.add(pommel);

    return group;
}
