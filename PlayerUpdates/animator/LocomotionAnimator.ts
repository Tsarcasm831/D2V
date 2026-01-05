import * as THREE from 'three';
import { PlayerInput } from '../../types';
import { playerModelResetFeet } from './AnimationUtils';

export class LocomotionAnimator {
    animateIdle(player: any, parts: any, damp: number) {
        const lerp = THREE.MathUtils.lerp;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;

        parts.hips.position.y = lerp(parts.hips.position.y, 1.0, damp);
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.set(0, 0, 0);
        parts.torsoContainer.rotation.set(0, 0, 0);
        parts.neck.rotation.set(0, 0, 0);
        parts.head.rotation.set(0.12, 0, 0);
        parts.leftThigh.rotation.set(0, 0, 0.15);
        parts.rightThigh.rotation.set(0, 0, -0.15);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, damp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, damp);
        
        // Arm Logic
        if (isHolding) {
            if (stance === 'shoulder') {
                // High carry, forearm bent up
                parts.rightArm.rotation.set(-0.4, 0, -0.1);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.8, damp);
            } else {
                // Side carry, forearm vertical (perpendicular to ground)
                parts.rightArm.rotation.set(0.1, 0, -0.1);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, damp);
            }
        } else {
            parts.rightArm.rotation.set(0, 0, -0.1);
            parts.rightForeArm.rotation.x = -0.2;
        }
        
        parts.leftArm.rotation.set(0, 0, 0.1);
        parts.leftForeArm.rotation.x = -0.2;

        playerModelResetFeet(parts, damp);
    }

    animateMovement(player: any, parts: any, dt: number, damp: number, input: PlayerInput) {
        const isRunning = input.isRunning;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;
        const lerp = THREE.MathUtils.lerp;
        
        // --- TIMING ---
        const animSpeed = isRunning ? 14.0 : 8.0;
        player.walkTime += dt * animSpeed;
        const t = player.walkTime;

        // --- INPUT ANALYSIS ---
        const strafe = input.x; 
        const forward = -input.y; // +1 forward, -1 backward
        const runFactor = isRunning ? 1.0 : 0.0; // 0 = walk, 1 = run
        
        // --- HIPS ---
        const bounceBase = 0.98;
        const bounceAmp = lerp(0.04, 0.12, runFactor);
        const bounce = Math.abs(Math.sin(t)) * bounceAmp; 
        parts.hips.position.y = bounceBase + bounce;

        // Dynamic Hip Sway/Lean
        const targetHipX = Math.sin(t) * 0.05 + strafe * 0.08;
        parts.hips.position.x = lerp(parts.hips.position.x, targetHipX, damp);
        
        const leanForward = lerp(0.1, 0.4, runFactor * (forward > 0 ? 1 : 0));
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, leanForward, damp);
        
        // Hip rotation: twist hips towards direction of travel slightly
        const hipTwist = Math.cos(t) * 0.15 * (Math.abs(forward) > 0.1 ? Math.sign(forward) : 1);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, hipTwist, damp);
        
        const hipRoll = Math.cos(t) * 0.05 - strafe * 0.15;
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, hipRoll, damp);

        parts.torsoContainer.rotation.y = -parts.hips.rotation.y * 1.2; 
        parts.torsoContainer.rotation.z = -parts.hips.rotation.z;
        parts.neck.rotation.x = -leanForward * 0.8; 

        // --- LEGS ---
        const calculateLeg = (offset: number) => {
            const cycle = t + offset;
            const sin = Math.sin(cycle);
            const cos = Math.cos(cycle);

            let thighRotX = 0;
            let thighRotZ = 0;
            let shinRot = 0;
            let footRot = 0;

            const isMovingBackward = forward < -0.1;
            const isStrafing = Math.abs(strafe) > 0.1;

            if (isRunning && forward >= 0) {
                // Running Forward
                thighRotX = sin * 0.9 + 0.2; 
                const kneeBend = Math.max(0, -sin * 1.6 - 0.2); 
                const impactStraighten = Math.max(0, sin * 0.2); 
                shinRot = kneeBend + impactStraighten;
                footRot = Math.max(0, -sin * 0.5);
            } else if (isMovingBackward) {
                // Walking Backward
                thighRotX = sin * 0.4;
                const isSwing = cos < 0; 
                
                if (isSwing) {
                    shinRot = -cos * 1.5; 
                    footRot = sin * 0.4;
                } else {
                    shinRot = 0.05; 
                    footRot = -thighRotX;
                }
            } else if (isStrafing && Math.abs(forward) < 0.2) {
                // Pure Strafing
                const isRightLeg = offset > Math.PI / 2;
                const strafeDir = Math.sign(strafe); // 1 = right, -1 = left
                
                // Thigh X: Small forward/back swing for balance
                thighRotX = sin * 0.2;
                
                // Thigh Z: The actual strafe "step"
                // Leg moves out then in
                const outPhase = strafeDir > 0 ? (isRightLeg ? sin : -sin) : (isRightLeg ? -sin : sin);
                thighRotZ = outPhase * 0.3;
                
                // Shin: Bend more when swinging leg "across" or "out"
                shinRot = Math.max(0, -outPhase * 0.8);
                footRot = -thighRotZ;
            } else {
                // Walking Forward (standard or diagonal)
                thighRotX = sin * 0.6; 
                const walkKnee = Math.max(0, -Math.sin(cycle + 0.5) * 1.2); 
                shinRot = walkKnee;
                const heelStrike = Math.max(0, sin * 0.4); 
                const pushOff = Math.max(0, -sin * 0.4);
                footRot = heelStrike - pushOff;
            }

            // Blend in strafe lean if moving diagonally
            if (isStrafing && Math.abs(forward) >= 0.2) {
                thighRotZ += strafe * 0.1;
            }

            return { thighX: thighRotX, thighZ: thighRotZ, shin: shinRot, foot: footRot };
        };

        const leftLeg = calculateLeg(0);
        const rightLeg = calculateLeg(Math.PI);

        parts.leftThigh.rotation.x = leftLeg.thighX;
        parts.leftThigh.rotation.z = 0.1 + leftLeg.thighZ;
        parts.leftShin.rotation.x = leftLeg.shin;
        
        parts.rightThigh.rotation.x = rightLeg.thighX;
        parts.rightThigh.rotation.z = -0.1 + rightLeg.thighZ;
        parts.rightShin.rotation.x = rightLeg.shin;

        const applyFoot = (shinGroup: THREE.Group, rot: number) => {
            shinGroup.children.forEach((c: any) => {
                if (c.name.includes('forefoot')) c.rotation.x = rot;
            });
        };
        applyFoot(parts.leftShin, leftLeg.foot);
        applyFoot(parts.rightShin, rightLeg.foot);

        parts.leftThigh.rotation.z = 0.1; 
        parts.rightThigh.rotation.z = -0.1;

        // --- ARMS ---
        const armPhase = Math.PI; 
        const leftArmSin = Math.sin(t + armPhase);
        const rightArmSin = Math.sin(t);

        const baseArmSwing = lerp(0.6, 1.2, runFactor);
        
        // Left Arm
        parts.leftArm.rotation.x = leftArmSin * baseArmSwing;
        parts.leftArm.rotation.z = 0.2;
        parts.leftForeArm.rotation.x = lerp(-0.4, -2.0, runFactor); 

        // Right Arm (Check Holding)
        if (isHolding) {
            if (stance === 'shoulder' || isRunning) {
                // Shoulder carry OR Running (High Carry)
                // When running, we default to high carry even in side stance for better dynamics
                const holdBob = Math.cos(t) * 0.1;
                parts.rightArm.rotation.x = rightArmSin * 0.3 - 0.5;
                parts.rightArm.rotation.z = -0.2;
                parts.rightForeArm.rotation.x = -1.8 + Math.cos(t*2)*0.1;
            } else {
                // Side carry (Walking only)
                // Arm swings naturally at side
                parts.rightArm.rotation.x = rightArmSin * baseArmSwing * 0.5; // Reduced swing for weight
                parts.rightArm.rotation.z = -0.2;
                parts.rightForeArm.rotation.x = -0.2; // Straightish
            }
        } else {
            // Free swing
            parts.rightArm.rotation.x = rightArmSin * baseArmSwing;
            parts.rightArm.rotation.z = -0.2;
            parts.rightForeArm.rotation.x = lerp(-0.4, -2.0, runFactor); 
        }
    }

    animateJump(player: any, parts: any, dt: number, damp: number, input: PlayerInput) {
        const lerp = THREE.MathUtils.lerp;
        const isHolding = !!player.config.selectedItem;

        if (player.jumpTimer > 0.15) {
            const tuck = player.jumpVelocity > 0 ? 0.8 : 0.3;
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -tuck, damp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -tuck, damp);
            parts.torsoContainer.rotation.x = -parts.hips.rotation.x;
            
            if (isHolding) {
                 parts.rightArm.rotation.x = -1.2;
                 parts.rightForeArm.rotation.x = -1.5;
            } else {
                 parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.5, damp);
            }
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.5, damp);
        }
    }
}
