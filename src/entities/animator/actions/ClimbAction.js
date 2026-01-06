import * as THREE from 'three';

export class ClimbAction {
    static animate(player, parts, dt, damp) {
        const lerp = THREE.MathUtils.lerp;
        const climbDuration = 0.8;
        const p = Math.min(player.ledgeGrabTime / climbDuration, 1.0);
        
        // Reset base offsets
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (p < 0.2) {
            // PHASE 1: HANG
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp * 5);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp * 5);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.2, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.2, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, damp);

            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.1, damp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.1, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.6, damp);

        } else if (p < 0.55) {
            // PHASE 2: POWER PULL
            const pullDamp = damp * 8; 

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.0, pullDamp); 
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.0, pullDamp);
            
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.8, pullDamp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.8, pullDamp);

            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.2, pullDamp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.2, pullDamp);

            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -2.2, pullDamp); 
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.0, pullDamp);
            
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, pullDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.5, pullDamp);

            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.6, pullDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, pullDamp);
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, pullDamp);

        } else {
            // PHASE 3: MANTLE
            const standDamp = damp * 5;

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.1, standDamp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.1, standDamp);
            
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, standDamp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.1, standDamp);
            
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, standDamp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, standDamp);

            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, standDamp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, standDamp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, standDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, standDamp);

            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0, standDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, standDamp);
        }
    }
}
