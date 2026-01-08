import * as THREE from 'three';
import { createSword } from '../../../../items/sword.js';

// Use the shared sword builder so held and previewed swords match.
export function buildSword(group, _materials, handleLength = 0.65) {
    const sword = createSword();

    // Keep original in-hand orientation and a small forward offset.
    sword.rotation.z = -Math.PI / 2;
    sword.position.x = 0.05;

    // Preserve shadows
    sword.traverse((c) => {
        if (c.isMesh) c.castShadow = true;
    });

    group.add(sword);
}
