import * as THREE from 'three';
import { playerModelResetFeet, animateBreathing } from '../AnimationUtils.js';

export class JumpAction {
    static animate(player, parts, dt, damp, input, skipRightArm = false) {
        const lerp = THREE.MathUtils.lerp;
        const vel = player.jumpVelocity;
        const isMoving = Math.abs(input.x) > 0 || Math.abs(input.y) > 0;
        const isHolding = !!player.config.selectedItem;

        // Apply breathing (rapid when jumping)
        animateBreathing(player, parts, Date.now() * 0.002, 2.0);

        playerModelResetFeet(parts, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (vel > 0) {
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.4, damp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.5, damp);

            if (!skipRightArm) {
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, isHolding ? -1.2 : -Math.PI/2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, isHolding ? -0.3 : 0, damp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, damp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, damp);
            }

            if (isMoving) {
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.8, damp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.0, damp); 
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.5, damp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.2, damp);
            } else {
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.5, damp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.2, damp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -1.5, damp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 2.2, damp);
            }

        } else {
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.1, damp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.8, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.8, damp); 
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.2, damp);

            if (!skipRightArm) {
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, isHolding ? -1.2 : -Math.PI/2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, isHolding ? -0.3 : 0, damp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, damp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.8, damp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, damp);
            }

            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);
        }
    }
}
