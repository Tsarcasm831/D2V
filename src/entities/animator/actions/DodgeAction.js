import * as THREE from 'three';

export class DodgeAction {
    static animate(player, parts, dt, damp) {
        const physics = player.playerPhysics;
        if (!physics || !physics.isDodging) return;

        const p = 1.0 - (physics.dodgeTimer / 0.3); // 0.3s is the dodge duration
        const lerp = THREE.MathUtils.lerp;
        const actionDamp = 25 * dt;

        // 1. Torso/Hips Rotation (The Roll)
        // Rotate forward based on movement or default
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, Math.PI * 2 * p, actionDamp);
        parts.hips.position.y = lerp(parts.hips.position.y, 0.4, actionDamp); // Lower during roll

        // 2. Arm Tucking
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.5, actionDamp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.5, actionDamp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.5, actionDamp);

        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.5, actionDamp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, actionDamp);
        parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.5, actionDamp);

        // 3. Leg Tucking
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -1.2, actionDamp);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 1.5, actionDamp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.2, actionDamp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 1.5, actionDamp);
    }
}
