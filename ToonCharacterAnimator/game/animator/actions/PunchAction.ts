
import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils';

export class PunchAction {
    static animate(player: any, parts: any, dt: number, damp: number, isMoving: boolean) {
        const t = player.punchTimer;
        const lerp = THREE.MathUtils.lerp;
        const punchDamp = 25 * dt;
        const baseHeight = 0.89 * player.config.legScale;
        
        // Offset to align torso forward if hips are twisted in combat stance idle
        const torsoOffset = (player.isCombatStance && !isMoving && !player.isJumping) ? 0.7 : 0;

        // Helper to curl fingers
        // curlAmount: 0 = Open, 1.8 = Tight Fist
        const applyFist = (isRight: boolean, curlAmount: number) => {
            const fingers = isRight ? player.model.rightFingers : player.model.leftFingers;
            const thumb = isRight ? player.model.rightThumb : player.model.leftThumb;

            if (fingers) {
                fingers.forEach((fGroup: THREE.Group, i: number) => {
                    const prox = fGroup.children.find(c => c.name === 'proximal');
                    if (prox) {
                        prox.rotation.x = lerp(prox.rotation.x, curlAmount + (i*0.1), damp * 2);
                        const dist = prox.children.find(c => c.name === 'distal');
                        if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 1.2, damp * 2);
                    }
                });
            }

            if (thumb) {
                 const prox = thumb.children.find((c: any) => c.name === 'proximal');
                 if(prox) {
                     prox.rotation.x = lerp(prox.rotation.x, curlAmount * 0.6, damp * 2); // Flex into palm
                     // Opposition logic
                     const sideMult = isRight ? 1 : -1;
                     // Right hand opposition is -Z, Left is +Z (relative to local axes set up in builder)
                     // Actually, HandBuilder sets oppositionAngle = -0.5 * sideMult.
                     // Here we want to increase opposition.
                     
                     // Simply curl inwards on Z
                     const oppDir = isRight ? -1 : 1; 
                     prox.rotation.z = lerp(prox.rotation.z, 0.3 * oppDir * (curlAmount/1.8) - (0.2 * oppDir), damp * 2);

                     const dist = prox.children.find((c: any) => c.name === 'distal');
                     if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 0.8, damp * 2);
                 }
            }
        };

        const stepLength1 = 0.4;
        const stepLength2 = 0.45;
        const stepLength3 = 0.5;

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
                
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.8 + torsoOffset, punchDamp);

                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.05, punchDamp);
                // Start stepping forward slightly in windup
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength1 * 0.3, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.3, punchDamp); // Lift Left
                
                applyFist(true, 1.2); // Closing

            } else if (p < 0.8 || player.comboChain > 1) {
                // STRIKE & HOLD
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.5, punchDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.1, punchDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, punchDamp);
                
                // WRIST ROTATION (Pronation - Palm Down)
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -1.4, punchDamp);

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8 + torsoOffset, punchDamp);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, punchDamp);

                // Legs - Left Step Forward (Full Length)
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength1, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.12, punchDamp);

                // Deep lunge pose
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.6, punchDamp); 
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.4, punchDamp);

                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.6, punchDamp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, punchDamp);

                applyFist(true, 1.8); // Tight Fist

            } else {
                // RECOVERY
                this.recoverToIdle(parts, punchDamp, baseHeight, lerp, torsoOffset);
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

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8 + torsoOffset, punchDamp); 
                
                applyFist(true, 0.5); // Relax right
                applyFist(false, 1.2); // Curl Left

                // Maintain forward stance during transition!
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength1, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.08, punchDamp);

                // Prepare Right Leg Step (Lift)
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.3, punchDamp); 
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 1.0, punchDamp); 
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.2, punchDamp); 

            } else if (p < 0.8 || player.comboChain > 2) {
                // STRIKE LEFT
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.6, punchDamp); 
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.1, punchDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, 0.0, punchDamp); 
                parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 1.4, punchDamp);
                
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.2, punchDamp); 

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.9 + torsoOffset, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, punchDamp);
                
                applyFist(false, 1.8); // Tight Fist Left

                // Legs - Right Step Forward (Full Length)
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength2, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.12, punchDamp);
                
                // Switch Legs: Right forward, Left back
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.6, punchDamp); 
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.4, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.6, punchDamp); 
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, punchDamp);

            } else {
                this.recoverToIdle(parts, punchDamp, baseHeight, lerp, torsoOffset);
                applyFist(false, 0.1); // Open Left
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

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.5 + torsoOffset, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.3, punchDamp); // Lean fwd
                
                applyFist(true, 1.5);
                applyFist(false, 1.0); // Keep left guard semi-closed

                // Maintain stance
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength2, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.18, punchDamp); // Crouch Deeper

                // Lift Left Knee for step
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, punchDamp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 1.2, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.5, punchDamp); // Plant Right

            } else {
                // STRIKE UPPERCUT
                // Body Thrust Up & Left
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8 + torsoOffset, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.2, punchDamp); 

                // Right Arm Skyward
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.9, punchDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.6, punchDamp); 
                
                // Supinate (Palm Up/In)
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 1.5, punchDamp); 
                
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.4, punchDamp); 
                
                applyFist(true, 1.8);

                // Legs - Left Step & Extend Up (Big Step)
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength3, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight + 0.05, punchDamp); // Jump/Rise

                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.8, punchDamp); // Land Left fwd
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.4, punchDamp);

                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.6, punchDamp); // Trail Right
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, punchDamp);
            }
        }
        
        playerModelResetFeet(parts, damp);
    }

    private static recoverToIdle(parts: any, damp: number, baseHeight: number, lerp: any, torsoOffset: number) {
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, damp);
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, damp);
        // Reset Wrist rotations
        parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, damp);
        parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0, damp);
        
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0 + torsoOffset, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight, damp);
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, damp);
    }
}
