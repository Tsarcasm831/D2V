import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils.js';

export class SkinningAction {
    static animate(player, parts, dt, damp) {
        const t = player.skinningTimer;
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.94 * (player.config.legScale || 1.0);
        const crouchHeight = baseHeight * 0.45;
        const crouchDamp = damp * 5;

        parts.hips.position.y = lerp(parts.hips.position.y, crouchHeight, crouchDamp);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.8, crouchDamp);

        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -2.0, crouchDamp);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 2.2, crouchDamp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -2.0, crouchDamp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.2, crouchDamp);

        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, crouchDamp);
        parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.6, crouchDamp);

        const speed = 15;
        const wave1 = Math.sin(t * speed);
        const wave2 = Math.cos(t * speed * 0.8);
        const armBaseX = -0.8;
        const armBaseZ = 0.3;

        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armBaseX + wave1 * 0.15, crouchDamp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armBaseZ - 0.2, crouchDamp);
        parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.2 + wave2 * 0.2, crouchDamp);
        parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, wave2 * 0.5, crouchDamp);

        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armBaseX - 0.1, crouchDamp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armBaseZ, crouchDamp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.0 + wave1 * 0.05, crouchDamp);

        playerModelResetFeet(parts, damp);
    }
}
