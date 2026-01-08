import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createDagger() {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 }); // Dark handle
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 }); // Brown wood-like color for the blade
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, metalness: 0.2, roughness: 0.8 }); // Darker brown for guard

    // Handle
    const handleHeight = 0.15 * SCALE_FACTOR;
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02 * SCALE_FACTOR, 0.02 * SCALE_FACTOR, handleHeight),
        handleMat
    );
    handle.position.y = handleHeight / 2;
    group.add(handle);

    // Guard
    const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 * SCALE_FACTOR, 0.03 * SCALE_FACTOR, 0.04 * SCALE_FACTOR),
        guardMat
    );
    guard.position.y = handleHeight;
    group.add(guard);

    // Blade
    const bladeHeight = 0.4 * SCALE_FACTOR;
    const bladeGeo = new THREE.BoxGeometry(0.05 * SCALE_FACTOR, bladeHeight, 0.015 * SCALE_FACTOR);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.position.y = handleHeight + bladeHeight / 2;
    group.add(blade);

    // Tip
    const tipHeight = 0.1 * SCALE_FACTOR;
    const tipGeo = new THREE.BoxGeometry(0.05 * SCALE_FACTOR, tipHeight, 0.015 * SCALE_FACTOR);
    const pos = tipGeo.attributes.position;
    const arr = pos.array;
    const halfH = tipHeight / 2;

    for (let i = 0; i < arr.length; i += 3) {
        const y = arr[i + 1];
        if (y > 0) {
            const t = THREE.MathUtils.clamp((y + halfH) / tipHeight, 0, 1);
            const scale = THREE.MathUtils.lerp(1, 0.04, t);
            arr[i] *= scale;
            arr[i + 2] *= scale;
        }
    }

    pos.needsUpdate = true;
    tipGeo.computeVertexNormals();

    const tip = new THREE.Mesh(tipGeo, metalMat);
    tip.position.y = handleHeight + bladeHeight + tipHeight / 2;
    group.add(tip);

    // Pommel
    const pommel = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 * SCALE_FACTOR, 8, 8),
        guardMat
    );
    pommel.position.y = -0.01 * SCALE_FACTOR;
    group.add(pommel);

    return group;
}
