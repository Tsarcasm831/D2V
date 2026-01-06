import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils.js';

export class PickupAction {
    static animate(player, parts, dt, damp) {
        const bend = Math.sin((player.pickUpTime / 1.2) * Math.PI);
        const lerp = THREE.MathUtils.lerp;
        const pickupDamp = damp * 2;
        const baseHeight = 0.94 * (player.config.legScale || 1.0);

        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - bend * 0.55, pickupDamp);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, bend * 0.4, pickupDamp);

        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -bend * 1.2, pickupDamp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -bend * 1.3, pickupDamp);

        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, bend * 2.2, pickupDamp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, bend * 2.3, pickupDamp);

        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, bend * 0.5, pickupDamp);
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -bend * 0.3, pickupDamp);

        parts.neck.rotation.x = lerp(parts.neck.rotation.x, -bend * 0.3, pickupDamp);

        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -bend * 0.8, pickupDamp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -bend * 0.3, pickupDamp);
        parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, pickupDamp);

        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -bend * 0.5, pickupDamp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, bend * 0.3, pickupDamp);

        playerModelResetFeet(parts, damp);
    }
}
