import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils';

export class PunchAction {
    static animate(player: any, parts: any, dt: number, damp: number) {
        const t = player.punchTimer;
        const lerp = THREE.MathUtils.lerp;
        const punchDamp = 25 * dt;
        const baseHeight = 0.94 * player.config.legScale;

        // Helper to curl fingers
        // curlAmount: 0 = Open, 1.8 = Tight Fist
        const applyFist = (isRight: boolean, curlAmount: number) => {
            const fingers = isRight ? player.rightFingers : player.leftFingers; // Note: player.leftFingers might need to be exposed if not present, but usually mapped from model
            // Actually, leftFingers isn't on player directly in previous code, let's look at parts or model
            // Accessing directly from parts array references stored in PlayerModel is safest if exposed
            const fingerGroups = isRight ? player.model['rightFingers'] : player.model['leftFingers']; // Assuming accessing internal array
            // If left fingers aren't tracked in array, we skip. But right fingers are tracked.
            
            // However, PlayerModel.ts exposes rightFingers. 
            // We will just animate the active hand for now.
            
            if (isRight) {
                if (player.model['rightFingers']) {
                    player.model['rightFingers'].forEach((fGroup: THREE.Group, i: number) => {
                        const prox = fGroup.children.find(c => c.name === 'proximal');
                        if (prox) {
                            prox.rotation.x = lerp(prox.rotation.x, curlAmount + (i*0.1), damp * 2);
                            const dist = prox.children.find(c => c.name === 'distal');
                            if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 1.2, damp * 2);
                        }
                    });
                }
                if (player.model['rightThumb']) {
                     const prox = player.model['rightThumb'].children.find((c: any) => c.name === 'proximal');
                     if(prox) {
                         prox.rotation.x = lerp(prox.rotation.x, curlAmount * 0.6, damp * 2); // Flex into palm
                         prox.rotation.z = lerp(prox.rotation.z, -0.3 * (curlAmount/1.8), damp * 2); // Oppose
                         const dist = prox.children.find((c: any) => c.name === 'distal');
                         if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 0.8, damp * 2);
                     }
                }
            }
            // Logic for left hand would be symmetric if arrays existed, 
            // but for this specific request regarding "punch animation" we focus on the visible right hand punches usually.
        };


        if (t < 0.45) {
            // === PUNCH 1: RIGHT HAND, LEFT STEP ===
            const p = t / 0.45;
            
            if (p < 0.3) {
                // WINDUP
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.6, punchDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.4, punchDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.3, punchDamp);
                // Wrist slightly open
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.5, punchDamp); 
                
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.8, punchDamp);

                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.02, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.2, punchDamp); // Lift Left
                
                applyFist(true, 1.2); // Closing

            } else if (p < 0.8 || player.comboChain > 1) {
                // STRIKE & HOLD
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.5, punchDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.1, punchDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, punchDamp);
                
                // WRIST ROTATION (Pronation - Palm Down)
                // Right Arm Y rotation controls wrist orientation relative to shoulder.
                // -1.5 on X puts arm forward.
                // Rotation Y needs to turn thumb inward/down. 
                // Neutral is Palm In (Thumb Up). Palm Down is Pronation (Internal Rotation).
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -1.4, punchDamp);

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8, punchDamp);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, punchDamp);

                // Legs - Left Step Forward
                const stepDist = 0.15; 
                parts.hips.position.z = lerp(parts.hips.position.z, stepDist, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.08, punchDamp);

                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.4, punchDamp); 
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, punchDamp);

                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.35, punchDamp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.2, punchDamp);

                applyFist(true, 1.8); // Tight Fist

            } else {
                // RECOVERY
                this.recoverToIdle(parts, punchDamp, baseHeight, lerp);
                applyFist(true, 0.1); // Open
            }

        } else if (t < 0.90) {
            // === PUNCH 2: LEFT HAND, RIGHT STEP ===
            const p = (t - 0.45) / 0.45;

            if (p < 0.3) {
                // WINDUP LEFT / RETRACT RIGHT
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.2, punchDamp); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.0, punchDamp);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, punchDamp); // Reset wrist
                
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.6, punchDamp); 
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.3, punchDamp);

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8, punchDamp); 
                
                applyFist(true, 0.5); // Relax right

                // Lift Right Knee
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.3, punchDamp); 
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 1.0, punchDamp); 
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.2, punchDamp); 

            } else if (p < 0.8 || player.comboChain > 2) {
                // STRIKE LEFT
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.5, punchDamp);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.1, punchDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, punchDamp);
                // Wrist Rotation Left (Mirror Right)
                parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 1.4, punchDamp);
                
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.2, punchDamp); 

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.8, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, punchDamp);

                // Legs - Right Step Forward (Further)
                const stepDist = 0.2; 
                parts.hips.position.z = lerp(parts.hips.position.z, stepDist, punchDamp);
                
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.4, punchDamp); 
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.35, punchDamp); 
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.2, punchDamp);

            } else {
                this.recoverToIdle(parts, punchDamp, baseHeight, lerp);
            }
        
        } else {
            // === PUNCH 3: RIGHT UPPERCUT, LEFT STEP ===
            const p = (t - 0.90) / 0.45;

            if (p < 0.3) {
                // WINDUP (Drop low, load right side)
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.5, punchDamp); // Guard
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.2, punchDamp);
                parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0, punchDamp);
                
                // Right Arm Scoop
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.8, punchDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, punchDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.5, punchDamp);

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.5, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.3, punchDamp); // Lean fwd
                
                applyFist(true, 1.5);

                // Lift Left Knee for step
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, punchDamp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 1.2, punchDamp);
                
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.4, punchDamp); // Plant Right
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.15, punchDamp); // Crouch

            } else {
                // STRIKE UPPERCUT
                // Body Thrust Up & Left
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.2, punchDamp); 

                // Right Arm Skyward
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.9, punchDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.6, punchDamp); 
                
                // Supinate (Palm Up/In)
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 1.5, punchDamp); 
                
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.4, punchDamp); 
                
                applyFist(true, 1.8);

                // Legs - Left Step & Extend Up
                const stepDist = 0.25; 
                parts.hips.position.z = lerp(parts.hips.position.z, stepDist, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight + 0.05, punchDamp); // Jump/Rise

                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.6, punchDamp); // Land Left fwd
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.2, punchDamp);

                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.4, punchDamp); // Trail Right
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, punchDamp);
            }
        }
        
        playerModelResetFeet(parts, damp);
    }

    private static recoverToIdle(parts: any, damp: number, baseHeight: number, lerp: any) {
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, damp);
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, damp);
        // Reset Wrist rotations
        parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, damp);
        parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0, damp);
        
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight, damp);
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, damp);
    }
}