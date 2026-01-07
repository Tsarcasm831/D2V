import * as THREE from 'three';
import { playerModelResetFeet } from './AnimationUtils.js';

export class LocomotionAnimator {
    animateIdle(player, parts, damp, skipRightArm = false) {
        const lerp = THREE.MathUtils.lerp;
        const t = Date.now() * 0.002;
        const baseHeight = 0.89 * (player.config.legScale || 1.0);

        this.animateBreathing(player, parts, t, 1.0);

        if (player.isCombatStance) {
            this.animateCombatStance(player, parts, damp, t, skipRightArm);
            return;
        }
        
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.set(0, 0, 0);
        
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight + Math.sin(t)*0.005, damp);
        
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, damp);
        parts.torsoContainer.rotation.z = lerp(parts.torsoContainer.rotation.z, 0, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, Math.sin(t) * 0.02, damp);

        parts.neck.rotation.x = -Math.sin(t) * 0.02;
        parts.head.rotation.x = 0.1 + Math.sin(t - 1) * 0.02;
        
        parts.leftThigh.rotation.set(0, 0, 0.12);
        parts.rightThigh.rotation.set(0, 0, -0.12);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, damp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, damp);
        
        this.animateArmsIdle(player, parts, damp, t, skipRightArm);
        playerModelResetFeet(parts, damp);
    }

    animateCombatStance(player, parts, damp, t, skipRightArm) {
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * (player.config.legScale || 1.0);
        
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.12, damp);
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, -0.05, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, -0.7, damp);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.1, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.6, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.05, damp);
        parts.torsoContainer.rotation.z = lerp(parts.torsoContainer.rotation.z, 0, damp);
        parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0.2, damp);
        parts.head.rotation.y = lerp(parts.head.rotation.y, 0, damp);
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.7, damp);
        parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.2, damp);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.8, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.35, damp);
        parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.2, damp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.15, damp);

        this.applyFootRot(parts.leftShin, -0.1);
        this.applyFootRot(parts.rightShin, -0.5);

        const breathing = Math.sin(t * 3) * 0.05;
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.9 + breathing, damp);
        parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, -0.4, damp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, damp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.8, damp);
        parts.leftHand.rotation.z = lerp(parts.leftHand.rotation.z, -0.2, damp);

        if (!skipRightArm) {
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.2 + breathing, damp);
            parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.4, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.1, damp);
        }
    }

    animateArmsIdle(player, parts, damp, t, skipRightArm) {
        const lerp = THREE.MathUtils.lerp;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;

        // Left Arm (Relaxed)
        parts.leftArm.rotation.set(Math.sin(t)*0.03, 0, 0.15);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.15, damp);
        parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI / 2, damp);

        if (skipRightArm) return;

        // Right Arm
        if (isHolding) {
            if (stance === 'shoulder') {
                parts.rightArm.rotation.set(-0.5 + Math.sin(t)*0.03, 0, -0.1);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.2, damp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
            } else {
                parts.rightArm.rotation.set(0.2, 0, -0.2);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.3, damp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -1.2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
            }
        } else {
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
            parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
            parts.rightArm.rotation.set(Math.sin(t + 1)*0.03, 0, -0.15);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.15, damp);
        }
    }

    animateMovement(player, parts, dt, damp, input, skipRightArm = false) {
        const isRunning = input.isRunning;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;
        const lerp = THREE.MathUtils.lerp;
        
        const speedMult = isRunning ? 15 : 9;
        player.walkTime = (player.walkTime || 0) + dt * speedMult;
        const t = player.walkTime;
        this.animateBreathing(player, parts, Date.now() * 0.002, isRunning ? 2.5 : 1.5);

        const forward = -input.y;
        const baseHeight = 0.89 * (player.config.legScale || 1.0);

        const bounceAmp = isRunning ? 0.08 : 0.03;
        const bouncePhase = Math.cos(2 * t);
        const yOffset = bouncePhase * bounceAmp;
        const runSquat = isRunning ? 0.05 : 0.0;
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - runSquat + yOffset, damp * 2);

        const swayAmp = isRunning ? 0.04 : 0.06;
        const sway = -Math.sin(t) * swayAmp; 
        parts.hips.position.x = lerp(parts.hips.position.x, sway, damp);

        const twistAmp = isRunning ? 0.3 : 0.15;
        const twist = -Math.sin(t) * twistAmp * Math.sign(forward || 1);
        parts.hips.rotation.y = twist;

        const rollAmp = isRunning ? 0.05 : 0.03;
        parts.hips.rotation.z = Math.sin(t) * rollAmp;

        const leanBase = isRunning ? 0.35 : 0.1;
        const leanBob = Math.abs(Math.cos(t)) * 0.05;
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, leanBase + leanBob, damp);

        parts.torsoContainer.rotation.y = -twist * 0.8; 
        parts.torsoContainer.rotation.z = -parts.hips.rotation.z * 0.5;
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, isRunning ? 0.1 : 0.02, damp);
        
        parts.neck.rotation.y = -parts.torsoContainer.rotation.y * 0.5;
        parts.head.rotation.x = lerp(parts.head.rotation.x, 0.1 - leanBob, damp);

        const calcLeg = (offset) => {
            const phase = t + offset;
            const stride = Math.sin(phase);
            const cos = Math.cos(phase);
            const dirMult = forward >= -0.1 ? 1 : -1;
            const thighRange = isRunning ? 1.1 : 0.55;
            let thighRot = -stride * thighRange * dirMult;
            const isSwing = cos * dirMult > 0;
            let shinRot = 0;
            let footRot = 0;

            if (isSwing) {
                const swingBend = Math.max(0, cos * dirMult);
                shinRot = swingBend * (isRunning ? 2.4 : 1.4);
                thighRot -= swingBend * (isRunning ? 0.8 : 0.3);
                footRot = -0.3 * swingBend;
            } else {
                const loading = Math.max(0, Math.sin(phase - 0.5)); 
                if (!isRunning) shinRot = loading * 0.1;
                footRot = stride * (stride * dirMult > 0 ? -0.4 : -0.8);
            }
            return { thigh: thighRot, shin: shinRot, foot: footRot };
        };

        const left = calcLeg(0);
        const right = calcLeg(Math.PI);

        parts.leftThigh.rotation.x = left.thigh;
        parts.leftShin.rotation.x = left.shin;
        this.applyFootRot(parts.leftShin, left.foot);

        parts.rightThigh.rotation.x = right.thigh;
        parts.rightShin.rotation.x = right.shin;
        this.applyFootRot(parts.rightShin, right.foot);

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
                     parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
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

    animateJump(player, parts, dt, damp, input, skipRightArm = false) {
        const lerp = THREE.MathUtils.lerp;
        const vel = player.jumpVelocity || 0;
        const isMoving = Math.abs(input.x) > 0 || Math.abs(input.y) > 0;
        const isHolding = !!player.config.selectedItem;

        this.animateBreathing(player, parts, Date.now() * 0.002, 2.0);
        playerModelResetFeet(parts, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (vel > 0) {
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.4, damp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.5, damp);

            if (!skipRightArm) {
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, isHolding ? -1.2 : -Math.PI/2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
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
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
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

    applyFootRot(shin, rot) {
        if (!shin) return;
        shin.children.forEach((c) => {
            if (c.name.includes('forefoot') || c.name.includes('heel') || c.name.includes('foot_anchor')) {
                c.rotation.x = rot;
            }
        });
    }

    animateBreathing(player, parts, t, intensity) {
        const breathPhase = Math.sin(t * 1.5);
        const chestExpansion = 1.0 + (breathPhase * 0.04 * intensity);
        if (parts.chest) parts.chest.scale.setScalar(chestExpansion);
        if (parts.maleChest) {
            parts.maleChest.scale.set(
                chestExpansion,
                chestExpansion,
                1.0 + (breathPhase * 0.06 * intensity)
            );
        }
        if (parts.topCap) {
            const shoulderBreath = 1.0 + (breathPhase * 0.015 * intensity);
            if (!parts.topCap.userData.baseScale) {
                parts.topCap.userData.baseScale = parts.topCap.scale.clone();
            }
            if (parts.topCap.userData.baseY === undefined) {
                parts.topCap.userData.baseY = parts.topCap.position.y;
            }
            parts.topCap.scale.copy(parts.topCap.userData.baseScale).multiplyScalar(shoulderBreath);
            parts.topCap.position.y = parts.topCap.userData.baseY + (breathPhase * 0.005 * intensity);
        }
    }
}
