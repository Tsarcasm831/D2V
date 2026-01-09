
import * as THREE from 'three';
import { PlayerInput } from '../../../types';
import { applyFootRot, animateBreathing } from '../AnimationUtils';

export class MovementAction {
    static animate(player: any, parts: any, dt: number, damp: number, input: PlayerInput, skipRightArm: boolean = false) {
        const isRunning = input.isRunning;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;
        const lerp = THREE.MathUtils.lerp;
        
        const speedMult = isRunning ? 15 : 9;
        player.walkTime += dt * speedMult;
        const t = player.walkTime;

        // Apply heavier breathing during movement
        animateBreathing(player, parts, Date.now() * 0.002, isRunning ? 2.5 : 1.5);

        const forward = -input.y;
        const isBackward = forward < -0.1;
        const baseHeight = 0.89 * player.config.legScale;

        const bounceAmp = isRunning ? 0.08 : 0.03;
        const bouncePhase = Math.cos(2 * t);
        const yOffset = bouncePhase * bounceAmp;
        const runSquat = isRunning ? 0.05 : 0.0;
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - runSquat + yOffset, damp * 2);

        const swayAmp = isRunning ? 0.04 : 0.06;
        const sway = -Math.sin(t) * swayAmp; 
        parts.hips.position.x = lerp(parts.hips.position.x, sway, damp);

        const twistAmp = isRunning ? 0.12 : 0.15;
        const twist = -Math.sin(t) * twistAmp * Math.sign(forward || 1);
        parts.hips.rotation.y = twist;

        const rollAmp = isRunning ? 0.05 : 0.03;
        parts.hips.rotation.z = Math.sin(t) * rollAmp;

        const leanBaseForward = isRunning ? 0.35 : 0.1;
        const leanBaseBackward = 0.1; 
        const leanBase = isBackward ? leanBaseBackward : leanBaseForward;

        const leanBob = Math.abs(Math.cos(t)) * 0.05;
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, leanBase + leanBob, damp);

        parts.torsoContainer.rotation.y = -twist * 0.8; 
        parts.torsoContainer.rotation.z = -parts.hips.rotation.z * 0.5;
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, isRunning ? 0.1 : 0.02, damp);
        
        parts.neck.rotation.y = -parts.torsoContainer.rotation.y * 0.5;
        parts.head.rotation.x = lerp(parts.head.rotation.x, 0.1 - leanBob, damp);

        const calcLeg = (offset: number) => {
            const phase = t + offset;
            const stride = Math.sin(phase);
            const cos = Math.cos(phase);
            
            let thighRot = 0;
            let shinRot = 0;
            let footRot = 0;

            if (isBackward) {
                const isSwing = cos > 0;
                const thighRange = isRunning ? 0.9 : 0.65;
                
                thighRot = stride * thighRange;

                if (isSwing) {
                    const lift = cos;
                    shinRot = lift * (isRunning ? 2.2 : 1.6);
                    thighRot -= lift * 0.2;
                    footRot = lift * 0.4; 
                } else {
                    shinRot = 0.1; 
                    footRot = -thighRot;
                    if (stride > 0.5) {
                        footRot += (stride - 0.5) * 0.5; 
                    }
                }

            } else {
                const isSwing = cos > 0;
                const thighRange = isRunning ? 1.1 : 0.55;
                thighRot = -stride * thighRange;

                if (isSwing) {
                    const swingBend = cos;
                    shinRot = swingBend * (isRunning ? 2.4 : 1.4);
                    thighRot -= swingBend * (isRunning ? 0.8 : 0.3);
                    footRot = -0.3 * swingBend;
                } else {
                    const loading = Math.max(0, Math.sin(phase - 0.5)); 
                    if (!isRunning) shinRot = loading * 0.1;
                    footRot = stride * (stride > 0 ? -0.4 : -0.8);
                }
            }
            return { thigh: thighRot, shin: shinRot, foot: footRot };
        };

        const left = calcLeg(0);
        const right = calcLeg(Math.PI);

        // Narrow stance (Adduction) to fix wide-leg look from Idle spread
        const stanceZ = isRunning ? 0.08 : 0.05; 

        parts.leftThigh.rotation.x = left.thigh;
        parts.leftThigh.rotation.z = -stanceZ;
        parts.leftThigh.rotation.y = 0;
        
        parts.leftShin.rotation.x = left.shin;
        applyFootRot(parts.leftShin, left.foot, stanceZ);

        parts.rightThigh.rotation.x = right.thigh;
        parts.rightThigh.rotation.z = stanceZ;
        parts.rightThigh.rotation.y = 0;
        
        parts.rightShin.rotation.x = right.shin;
        applyFootRot(parts.rightShin, right.foot, -stanceZ);

        const armAmp = isRunning ? 1.4 : 0.6;
        parts.leftArm.rotation.x = Math.sin(t) * armAmp;
        parts.leftArm.rotation.z = 0.15;
        parts.leftForeArm.rotation.x = isRunning ? -2.0 : -0.3;
        parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI / 2, damp);

        if (!skipRightArm) {
            if (isHolding) {
                if (stance === 'shoulder') {
                     parts.rightArm.rotation.x = -0.5 + Math.cos(t) * 0.1;
                     parts.rightForeArm.rotation.x = -2.0;
                     parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
                     parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
                } else {
                     parts.rightArm.rotation.x = Math.sin(t + Math.PI) * (armAmp * 0.5);
                     parts.rightForeArm.rotation.x = -0.5;
                     parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -1.2, damp);
                     parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, -0.4, damp);
                }
            } else {
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
                parts.rightArm.rotation.x = Math.sin(t + Math.PI) * armAmp;
                parts.rightArm.rotation.z = -0.15;
                parts.rightForeArm.rotation.x = isRunning ? -2.0 : -0.3;
            }
        }
    }
}
