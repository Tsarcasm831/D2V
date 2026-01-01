import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createPickaxe() {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, metalness: 0.6, roughness: 0.4 });

    // Handle
    const handleHeight = 0.9 * SCALE_FACTOR;
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025 * SCALE_FACTOR, 0.035 * SCALE_FACTOR, handleHeight),
        handleMat
    );
    handle.position.y = handleHeight / 2;
    group.add(handle);

    // Pickaxe Head - Solid Extruded Shape
    const headShape = new THREE.Shape();
    // Define a curved, tapered pickaxe head shape
    headShape.moveTo(-0.45 * SCALE_FACTOR, 0);
    headShape.quadraticCurveTo(0, 0.18 * SCALE_FACTOR, 0.45 * SCALE_FACTOR, 0);
    headShape.lineTo(0.42 * SCALE_FACTOR, -0.04 * SCALE_FACTOR);
    headShape.quadraticCurveTo(0, 0.1 * SCALE_FACTOR, -0.42 * SCALE_FACTOR, -0.04 * SCALE_FACTOR);
    headShape.closePath();

    const extrudeSettings = {
        steps: 1,
        depth: 0.04 * SCALE_FACTOR,
        bevelEnabled: true,
        bevelThickness: 0.02 * SCALE_FACTOR,
        bevelSize: 0.02 * SCALE_FACTOR,
        bevelSegments: 2
    };

    const headGeo = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    const head = new THREE.Mesh(headGeo, ironMat);
    
    // Center the extruded head on the handle's Z-axis
    // Total thickness = depth + 2 * bevelSize = 0.04 + 0.04 = 0.08
    head.position.set(0, handleHeight - 0.05 * SCALE_FACTOR, -0.04 * SCALE_FACTOR);
    head.castShadow = true;
    group.add(head);

    // Central binding
    const binding = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 * SCALE_FACTOR, 0.12 * SCALE_FACTOR, 0.12 * SCALE_FACTOR),
        ironMat
    );
    binding.position.y = handleHeight - 0.05 * SCALE_FACTOR;
    group.add(binding);

    // Rotate the whole group so it aligns with the hand's forward vector
    group.rotation.y = Math.PI / 2;

    return group;
}