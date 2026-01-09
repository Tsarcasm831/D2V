import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils.js';

export class PunchAction {
    static animate(player, parts, dt, damp, isMoving) {
        const t = player.punchTimer;
        const lerp = THREE.MathUtils.lerp;
        const punchDamp = 18 * dt; // Snappier punches
        const baseHeight = 0.89 * player.config.legScale;
        
        // Offset to align torso forward if hips are twisted in combat stance idle
        const torsoOffset = (player.isCombatStance && !isMoving && !player.isJumping) ? 0.7 : 0;

        // Helper to curl fingers
        // curlAmount: 0 = Open, 1.8 = Tight Fist
        const applyFist = (isRight, curlAmount) => {
            const fingers = isRight ? player.model.rightFingers : player.model.leftFingers;
            const thumb = isRight ? player.model.rightThumb : player.model.leftThumb;

            if (fingers) {
                fingers.forEach((fGroup, i) => {
                    const prox = fGroup.children.find(c => c.name === 'proximal');
                    if (prox) {
                        prox.rotation.x = lerp(prox.rotation.x, curlAmount + (i*0.1), damp * 2);
                        const dist = prox.children.find(c => c.name === 'distal');
                        if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 1.2, damp * 2);
                    }
                });
            }

            if (thumb) {
                 const prox = thumb.children.find(c => c.name === 'proximal');
                 if(prox) {
                     prox.rotation.x = lerp(prox.rotation.x, curlAmount * 0.6, damp * 2); // Flex into palm
                     const sideMult = isRight ? 1 : -1;
                     const oppDir = isRight ? -1 : 1; 
                     prox.rotation.z = lerp(prox.rotation.z, 0.3 * oppDir * (curlAmount/1.8) - (0.2 * oppDir), damp * 2);

                     const dist = prox.children.find(c => c.name === 'distal');
                     if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 0.8, damp * 2);
                 }
            }
        };

        const stepLength1 = 0.4;
        const stepLength2 = 0.45;
        const stepLength3 = 0.5;

        // Durations
        const dur1 = 0.6;
        const dur2 = 1.2;
        const dur3 = 1.8;

        if (t < dur1) {
            // === PUNCH 1: RIGHT CROSS (Direct Center) ===
            const p = t / dur1;
            
            if (p < 0.25) {
                // WINDUP (Compact)
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.8, punchDamp); 
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.8, punchDamp); // Elbow back
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.4, punchDamp); 
                
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.3, punchDamp); // Cocked
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, punchDamp); 
                
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.8 + torsoOffset, punchDamp);

                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.05, punchDamp);
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength1 * 0.3, punchDamp);
                
                applyFist(true, 1.4); 

            } else if (p < 0.8 || player.comboChain > 1) {
                // STRIKE (Straight & Center)
                // -1.55 is roughly horizontal.
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.55, punchDamp);
                
                // Angle slightly inward (-0.1) to converge on center from right shoulder
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -0.15, punchDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.0, punchDamp);
                
                // Fully Extend
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, punchDamp);
                
                // Pronate Wrist (Thumb Down) for impact
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI, punchDamp);

                // Drive Torso Left
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.6 + torsoOffset, punchDamp);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.15, punchDamp);

                // Legs
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength1, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, punchDamp); 
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.4, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.5, punchDamp);
                
                applyFist(true, 1.8);

            } else {
                // RECOVERY
                this.recoverToIdle(parts, punchDamp, baseHeight, lerp, torsoOffset);
                applyFist(true, 0.1); 
            }

        } else if (t < dur2) {
            // === PUNCH 2: LEFT CROSS (Direct Center) ===
            const p = (t - dur1) / (dur2 - dur1);

            if (p < 0.25) {
                // WINDUP LEFT / RETRACT RIGHT
                // Retract Right
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.2, punchDamp); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.0, punchDamp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, punchDamp);
                
                // Cock Left
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.8, punchDamp); 
                parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, -0.8, punchDamp); // Elbow back
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.3, punchDamp);

                // Twist Right
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8 + torsoOffset, punchDamp); 
                
                applyFist(true, 0.5); 
                applyFist(false, 1.4); 

                parts.hips.position.z = lerp(parts.hips.position.z, stepLength1, punchDamp);

            } else if (p < 0.8 || player.comboChain > 2) {
                // STRIKE LEFT
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.55, punchDamp); 
                
                // Angle Inward (+0.15)
                parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0.15, punchDamp);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.0, punchDamp);
                
                // Extend
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, punchDamp); 
                
                // Pronate Left Wrist
                parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI, punchDamp);

                // Drive Torso Right
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.6 + torsoOffset, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.15, punchDamp);
                
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.5, punchDamp); // Guarding

                applyFist(false, 1.8); 

                parts.hips.position.z = lerp(parts.hips.position.z, stepLength2, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.6, punchDamp); 
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.6, punchDamp); 

            } else {
                // RECOVERY
                this.recoverToIdle(parts, punchDamp, baseHeight, lerp, torsoOffset);
                applyFist(false, 0.1); 
            }
        
        } else {
            // === PUNCH 3: RIGHT UPPERCUT (Vertical Center) ===
            const p = (t - dur2) / (dur3 - dur2);

            if (p < 0.25) {
                // WINDUP (Drop & Load)
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.5, punchDamp); // Guard
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.2, punchDamp);
                
                // Scoop Right Arm Low
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.5, punchDamp); 
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.5, punchDamp); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.8, punchDamp);

                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.4 + torsoOffset, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.4, punchDamp); // Lean fwd
                
                applyFist(true, 1.5);
                
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.20, punchDamp); // Deep dip

            } else {
                // STRIKE UPPERCUT
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.5 + torsoOffset, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.3, punchDamp); // Arch back

                // Drive Up Vertical & Center
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.3, punchDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, punchDamp); 
                
                // Center alignment
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -0.2, punchDamp); 
                
                // Keep elbow bent for power
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.2, punchDamp); 
                
                // Palm Up (Supinated)
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2 + 1.2, punchDamp); 
                
                applyFist(true, 1.8);

                // Jump/Drive
                parts.hips.position.z = lerp(parts.hips.position.z, stepLength3, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight + 0.08, punchDamp); 

                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.8, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.6, punchDamp);
            }
        }
        
        playerModelResetFeet(parts, damp);
    }

    static recoverToIdle(parts, damp, baseHeight, lerp, torsoOffset) {
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, damp);
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, damp);
        
        parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, damp);
        parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0, damp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, damp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, damp);

        parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, damp);
        parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI/2, damp);
        
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0 + torsoOffset, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight, damp);
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, damp);
    }
}
