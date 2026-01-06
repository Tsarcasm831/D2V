import * as THREE from 'three';

export class InteractAction {
    static animate(player, parts, dt, damp) {
        const p = Math.sin((player.interactTimer / 0.4) * Math.PI);
        const lerp = THREE.MathUtils.lerp;
        parts.head.rotation.x = lerp(parts.head.rotation.x, p * 0.5, damp * 3);
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -p * 1.2, damp * 2);
    }
}
