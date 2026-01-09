import * as THREE from 'three';
import { playerModelResetFeet, applyFootRot } from '../AnimationUtils.js';

export class ClimbAction {
    static animate(player, parts, dt, damp) {
        const lerp = THREE.MathUtils.lerp;
        const climbDuration = 1.2;
        const p = Math.min(player.ledgeGrabTime / climbDuration, 1.0);
        
        // Reset base offsets for hips
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (p < 0.15) {
            // === PHASE 1: HANG (Initial Contact) ===
            // Body hangs straight down, arms fully extended up.
            parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
            parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0, damp);

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.9, damp * 5);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.9, damp * 5);
            
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.3, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.3, damp);
            
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, damp);

            // Legs dangling
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.2, damp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.1, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.8, damp); // Look Up

        } else if (p < 0.65) {
            // === PHASE 2: POWER PULL & KNEE DRIVE ===
            // Vertical movement phase.
            // Arms pull elbows down. One knee (Right) drives up to plant on ledge.
            
            const pullDamp = damp * 8; 

            // Pull arms down (Elbows back)
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 1.0, pullDamp); 
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 1.0, pullDamp);
            
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, pullDamp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.5, pullDamp);

            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.5, pullDamp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.5, pullDamp);

            // Torso leans in
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.5, pullDamp);
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.3, pullDamp);
            
            // Right Leg Step Up (High Knee)
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -2.2, pullDamp); 
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.3, pullDamp);
            
            // Left Leg Trail
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.2, pullDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.5, pullDamp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.3, pullDamp); // Look at landing

        } else {
            // === PHASE 3: MANTLE & STAND ===
            // Horizontal movement phase.
            // Push down with hands (Tricep dip), straighten legs to stand.
            
            const finish = (p - 0.65) / 0.35; // 0 to 1
            const standDamp = damp * 6;

            // Arms: Push then Recover
            if (finish < 0.4) {
                // Pushing down hard (Triceps)
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.6, standDamp);
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.6, standDamp);
                
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, standDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, standDamp);
                
                // Elbows out slightly for leverage
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.3, standDamp);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.3, standDamp);
            } else {
                // Recovering to sides (Idle)
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, standDamp);
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, standDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, standDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, standDamp);
                
                // Tuck in
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, standDamp);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.1, standDamp);
            }

            // Legs: Smooth plant into wide stance (avoiding feet together)
            // Right leg was driving up, now it plants.
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, standDamp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, standDamp);

            // Left leg catches up
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, standDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, standDamp);

            // Spread legs to match Idle spread (0.12)
            const spread = 0.12;
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, spread, standDamp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -spread, standDamp);

            // Hips & Spine
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0, standDamp);
            
            // Keep head slightly down looking at footing until very end
            const lookDown = finish < 0.8 ? 0.2 : 0;
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, lookDown, standDamp);
            
            // Slight forward lean on torso that resolves smoothly
            const lean = finish < 0.7 ? 0.2 : 0;
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, lean, standDamp);
        }
        
        playerModelResetFeet(parts, damp);
        
        // Post-correction for feet flatness during Phase 3 spread (matches IdleAction)
        if (p >= 0.65) {
             const spread = 0.12;
             applyFootRot(parts.leftShin, 0, -spread);
             applyFootRot(parts.rightShin, 0, spread);
        }
    }
}
