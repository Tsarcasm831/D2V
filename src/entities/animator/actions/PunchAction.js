import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils.js';

export class PunchAction {
    static animate(player, parts, dt, damp) {
        const t = player.punchTimer;
        const lerp = THREE.MathUtils.lerp;
        const punchDamp = 25 * dt;
        const baseHeight = 0.94 * (player.config.legScale || 1.0);

        const applyFist = (isRight, curlAmount) => {
            const model = player.model;
            if (!model) return;

            if (isRight) {
                if (model.rightFingers) {
                    model.rightFingers.forEach((fGroup, i) => {
                        const prox = fGroup.children.find(c => c.name === 'proximal');
                        if (prox) {
                            prox.rotation.x = lerp(prox.rotation.x, curlAmount + (i*0.1), damp * 2);
                            const dist = prox.children.find(c => c.name === 'distal');
                            if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 1.2, damp * 2);
                        }
                    });
                }
                if (model.rightThumb) {
                     const prox = model.rightThumb.children.find((c) => c.name === 'proximal');
                     if(prox) {
                         prox.rotation.x = lerp(prox.rotation.x, curlAmount * 0.6, damp * 2);
                         prox.rotation.z = lerp(prox.rotation.z, -0.3 * (curlAmount/1.8), damp * 2);
                         const dist = prox.children.find((c) => c.name === 'distal');
                         if(dist) dist.rotation.x = lerp(dist.rotation.x, curlAmount * 0.8, damp * 2);
                     }
                }
            }
        };

        if (t < 0.45) {
            const p = t / 0.45;
            
            if (p < 0.3) {
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.6, punchDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.4, punchDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.3, punchDamp);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.5, punchDamp); 
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.8, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.02, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.2, punchDamp);
                applyFist(true, 1.2);
            } else if (p < 0.8 || player.comboChain > 1) {
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.5, punchDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.1, punchDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, punchDamp);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -1.4, punchDamp);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8, punchDamp);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, punchDamp);
                const stepDist = 0.15; 
                parts.hips.position.z = lerp(parts.hips.position.z, stepDist, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.08, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.4, punchDamp); 
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.35, punchDamp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.2, punchDamp);
                applyFist(true, 1.8);
            } else {
                this.recoverToIdle(parts, punchDamp, baseHeight, lerp);
                applyFist(true, 0.1);
            }
        } else if (t < 0.90) {
            const p = (t - 0.45) / 0.45;
            if (p < 0.3) {
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.6, punchDamp);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.4, punchDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.3, punchDamp);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.3, punchDamp); 
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 1.0, punchDamp); 
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.2, punchDamp); 
            } else if (p < 0.8 || player.comboChain > 2) {
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.5, punchDamp);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.1, punchDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, punchDamp);
                parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 1.4, punchDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.2, punchDamp); 
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.8, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, punchDamp);
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
            const p = (t - 0.90) / 0.45;
            if (p < 0.3) {
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.5, punchDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.2, punchDamp);
                parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0, punchDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.8, punchDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, punchDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.5, punchDamp);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.5, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.3, punchDamp);
                applyFist(true, 1.5);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, punchDamp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 1.2, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.4, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.15, punchDamp);
            } else {
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.8, punchDamp); 
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.2, punchDamp); 
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.9, punchDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.6, punchDamp); 
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 1.5, punchDamp); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.4, punchDamp); 
                applyFist(true, 1.8);
                const stepDist = 0.25; 
                parts.hips.position.z = lerp(parts.hips.position.z, stepDist, punchDamp);
                parts.hips.position.y = lerp(parts.hips.position.y, baseHeight + 0.05, punchDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.6, punchDamp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.2, punchDamp);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.4, punchDamp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, punchDamp);
            }
        }
        playerModelResetFeet(parts, damp);
    }

    static recoverToIdle(parts, damp, baseHeight, lerp) {
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, damp);
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, damp);
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
