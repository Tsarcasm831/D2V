import * as THREE from 'three';
import { playerModelResetFeet } from './AnimationUtils';

export class ActionAnimator {
    animateClimb(player: any, parts: any, dt: number, damp: number) {
        const lerp = THREE.MathUtils.lerp;
        const climbDuration = 0.8;
        const p = Math.min(player.ledgeGrabTime / climbDuration, 1.0);
        
        // Reset base offsets
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (p < 0.2) {
            // PHASE 1: HANG (Prepare)
            // Arms straight up reaching for ledge (-2.8 rad is roughly straight up)
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp * 5);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp * 5);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.2, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.2, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, damp);

            // Legs hanging with slight sway
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.1, damp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.1, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);

            // Look up at destination
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.6, damp);

        } else if (p < 0.55) {
            // PHASE 2: POWER PULL & KNEE DRIVE (The "Heave")
            const pullDamp = damp * 8; // Fast movement

            // Arms pull down to chest level (simulating body rising past hands)
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.0, pullDamp); 
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.0, pullDamp);
            
            // Elbows flare out slightly for leverage
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.8, pullDamp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.8, pullDamp);

            // Deep elbow bend
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.2, pullDamp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.2, pullDamp);

            // LEG DRIVE: Right knee high drive to "step" on ledge
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -2.2, pullDamp); 
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.0, pullDamp);
            
            // Left leg trails
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, pullDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.5, pullDamp);

            // Torso crunch forward to get center of mass over ledge
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.6, pullDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, pullDamp);
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, pullDamp);

        } else {
            // PHASE 3: MANTLE & STAND
            const standDamp = damp * 5;

            // Arms push down (tricep extension) to finish
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.1, standDamp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.1, standDamp);
            
            // Arms come back in
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, standDamp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.1, standDamp);
            
            // Straighten elbows
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, standDamp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, standDamp);

            // Plant feet
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, standDamp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, standDamp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, standDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, standDamp);

            // Straighten back
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0, standDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, standDamp);
        }
    }

    animatePickup(player: any, parts: any, dt: number, damp: number) {
        const bend = Math.sin((player.pickUpTime / 1.2) * Math.PI);
        const lerp = THREE.MathUtils.lerp;
        const pickupDamp = damp * 2;

        parts.hips.position.y = lerp(parts.hips.position.y, 1.0 - bend * 0.55, pickupDamp);
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

    animateAxeSwing(player: any, parts: any, dt: number, damp: number) {
        const p = player.axeSwingTimer / 0.45; // 0.45s total duration
        const lerp = THREE.MathUtils.lerp;
        
        let swingDamp = damp;

        if (p < 0.35) {
            // PHASE 1: WINDUP
            // Pull back slower and heavy
            swingDamp = damp * 1.5; 
            
            // Raise arm back and up
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 2.5, swingDamp); 
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.8, swingDamp); // Cock arm out
            // Bend elbow significantly
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.5, swingDamp); 
            
            // Twist torso away from target
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -1.2, swingDamp);
            // Slight back arch
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, swingDamp);
            
            // Look at target
            parts.neck.rotation.y = lerp(parts.neck.rotation.y, 1.0, swingDamp);

        } else if (p < 0.65) {
            // PHASE 2: STRIKE
            // Snap forward very fast
            swingDamp = damp * 8.0; 
            
            // Swing arm down and across
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.8, swingDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.6, swingDamp); 
            // Extend elbow for reach/impact
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, swingDamp);
            
            // Twist torso into the swing
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 1.5, swingDamp);
            // Lean forward into the blow
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.4, swingDamp);

            // Keep head focused
            parts.neck.rotation.y = lerp(parts.neck.rotation.y, -0.8, swingDamp);

        } else {
            // PHASE 3: FOLLOW THROUGH / RECOVERY
            // Settle back
            swingDamp = damp * 3.0;

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.2, swingDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, swingDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, swingDamp);
            
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.5, swingDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.1, swingDamp);
            parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0, swingDamp);
        }
    }

    animatePunch(player: any, parts: any, dt: number, damp: number) {
        const p = player.punchTimer / 0.3;
        const lerp = THREE.MathUtils.lerp;
        const punchDamp = 30 * dt;
        
        if (p < 0.2) {
            // Windup
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.5, punchDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.2, punchDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.8, punchDamp);
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.5, punchDamp);
        } else {
            // Punch
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.6, punchDamp); // Straight forward
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, punchDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, punchDamp); // Full extension
            
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8, punchDamp); // Torso push
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, punchDamp);
        }
    }

    animateInteract(player: any, parts: any, dt: number, damp: number) {
        const p = Math.sin((player.interactTimer / 0.4) * Math.PI);
        const lerp = THREE.MathUtils.lerp;
        parts.head.rotation.x = lerp(parts.head.rotation.x, p * 0.5, damp * 3);
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -p * 1.2, damp * 2);
    }
}
