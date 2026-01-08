import * as THREE from 'three';
import { SCALE_FACTOR } from '../../../../world/world_bounds.js';
import { createAxe } from '../../../../items/axe.js';

// Wrap the shared item builder so held items use the same model.
export function buildAxe(group, _materials, handleLength = 0.65) {
    const axe = createAxe();

    // Match previous in-hand length (old builder used handleLength param)
    const baseHandle = 0.95 * SCALE_FACTOR; // weaponConfig.handleLength * SCALE_FACTOR
    const scale = handleLength / baseHandle;
    axe.scale.setScalar(scale);

    // Orient along +X like the old held model; give a slight forward offset for grip.
    axe.rotation.z = -Math.PI / 2;
    axe.position.x = 0.15 + (handleLength * 0.5 * scale);

    // Ensure shadows stay enabled
    axe.traverse((c) => {
        if (c.isMesh) c.castShadow = true;
    });

    group.add(axe);
}
