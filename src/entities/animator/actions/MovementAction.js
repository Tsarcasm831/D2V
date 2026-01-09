import * as THREE from 'three';
import { applyFootRot, animateBreathing } from '../AnimationUtils.js';

export class MovementAction {
    static animate(player, parts, dt, damp, input, skipRightArm = false) {
        const isRunning = input.isRunning;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;
        const isMaleStyle = player.config.bodyType === 'female'; 
        
        const lerp = THREE.MathUtils.lerp;
        const sin = Math.sin;
        const cos = Math.cos;
        
        // Inputs
        const forwardInput = -input.y;
        const sideInput = input.x;
        const isPureStrafe = Math.abs(sideInput) > 0.6 && Math.abs(forwardInput) < 0.3;

        // Speed calculation
        // Strafing needs a slightly slower cycle to look heavy/tactical, but fast enough to match speed
        const speedMult = isPureStrafe ? 10 : (isRunning ? 15 : 9);
        player.walkTime += dt * speedMult;
        const t = player.walkTime;

        // Step Sound Detection
        const stepCycle = (t - Math.PI * 0.5) / Math.PI;
        const currentSteps = Math.floor(stepCycle);
        if (currentSteps > player.lastStepCount) {
            player.didStep = true;
            player.lastStepCount = currentSteps;
        }

        animateBreathing(player, parts, Date.now() * 0.002, isRunning ? 2.5 : 1.5);

        const isBackward = forwardInput < -0.1;
        const isStrafingLeft = sideInput < -0.1;
        const isStrafingRight = sideInput > 0.1;

        const baseHeight = 0.89 * player.config.legScale;

        // --- HIPS & TORSO ---
        
        // Bounce Logic
        let bounce = 0;
        if (isPureStrafe) {
            // Double bounce for strafe (one for each foot plant)
            // t goes 0->2PI for full cycle (Lead Step + Trail Step)
            // We want a bounce peak at middle of each step (PI/2 and 3PI/2) roughly
            bounce = Math.abs(sin(t)) * 0.04;
        } else {
            const bounceAmp = isRunning ? 0.08 : (isMaleStyle ? 0.02 : 0.03); 
            bounce = cos(2 * t) * bounceAmp;
        }
        
        const runSquat = isRunning ? 0.05 : 0.0;
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - runSquat + bounce, damp * 2);

        // Sway & Twist
        let sway = 0;
        let twist = 0;
        let roll = 0;

        if (isPureStrafe) {
            // Strafe specific body mechanics
            // Lean slightly into turn
            const leanDir = isStrafingLeft ? 1 : -1;
            twist = leanDir * 0.25; // Turn hips into movement
            roll = leanDir * 0.05;  // Bank hips
            sway = 0; // Keep hips centered, legs do the work
        } else {
            const swayAmp = isRunning ? 0.04 : (isMaleStyle ? 0.015 : 0.07);
            sway = -sin(t) * swayAmp; 
            if (isStrafingLeft) sway -= 0.03;
            if (isStrafingRight) sway += 0.03;

            const twistAmp = isRunning ? 0.12 : 0.15;
            twist = -sin(t) * twistAmp;
            if (!isPureStrafe) twist *= Math.sign(forwardInput || 1);

            const rollAmp = isRunning ? 0.05 : (isMaleStyle ? 0.01 : 0.04);
            roll = sin(t) * rollAmp;
            if (isStrafingLeft) roll -= 0.06;
            if (isStrafingRight) roll += 0.06;
        }

        parts.hips.position.x = lerp(parts.hips.position.x, sway, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, twist, damp);
        parts.hips.rotation.z = roll;

        // Forward Lean
        const leanBaseForward = isRunning ? 0.35 : 0.1;
        const leanBase = isBackward ? 0.1 : leanBaseForward;
        const leanBob = Math.abs(cos(t)) * 0.05;
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, (isPureStrafe ? 0.05 : leanBase) + leanBob, damp);

        // Torso Compensation
        parts.torsoContainer.rotation.y = -twist * 0.7; 
        parts.torsoContainer.rotation.z = -parts.hips.rotation.z * 0.5; 
        
        if (isPureStrafe) {
            // Look forward
            parts.torsoContainer.rotation.y += (isStrafingLeft ? -0.2 : 0.2); 
        }

        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, (isRunning && !isPureStrafe) ? 0.1 : 0.02, damp);
        
        parts.neck.rotation.y = -parts.torsoContainer.rotation.y * 0.5;
        parts.head.rotation.x = lerp(parts.head.rotation.x, 0.1 - leanBob, damp);


        // --- LEGS ---

        if (isPureStrafe) {
            // === TWO-BEAT STRAFE LOGIC ===
            // Cycle 0..PI: Lead Leg Steps Out
            // Cycle PI..2PI: Trail Leg Steps In
            
            const isLeft = isStrafingLeft;
            const cyc = t % (Math.PI * 2);
            const phase1 = cyc < Math.PI; // Lead moving
            const p = (cyc % Math.PI) / Math.PI; // 0..1 progress within phase

            // Identify Limbs
            // const leadThigh = isLeft ? parts.leftThigh : parts.rightThigh;
            // const leadShin = isLeft ? parts.leftShin : parts.rightShin;
            // const trailThigh = isLeft ? parts.rightThigh : parts.leftThigh;
            // const trailShin = isLeft ? parts.rightShin : parts.leftShin;

            // Directions (Z-Rotation: Positive is Left-Out for Left Leg, Negative is Right-Out for Right Leg)
            // Normalized "Opening" value: 0 = Closed, 1 = Wide
            // We'll apply sign at the end.
            
            const baseStance = 0.12; 
            const stepWidth = 0.32; // Reduced from 0.45 to prevent unnatural over-extension

            let leadOpen = 0;
            let trailOpen = 0;
            let leadLift = 0;
            let trailLift = 0;
            let leadFoot = 0;
            let trailFoot = 0;

            if (phase1) {
                // --- PHASE 1: LEAD STEP ---
                // Lead leg lifts and reaches out.
                // Trail leg stays grounded. Since body moves away, Trail leg angle must increase (widen) to stay put.
                
                // LEAD: Active Step
                // Lift: Sine wave
                leadLift = sin(p * Math.PI) * 0.6; // Reduced lift slightly
                // Reach: Interpolate from Base to Wide
                leadOpen = baseStance + (stepWidth * sin(p * Math.PI/2)); // Ease out
                leadFoot = -leadLift * 0.3; // Toe dip

                // TRAIL: Grounded Slide
                // Linearly increase openness to counteract body movement
                trailOpen = lerp(baseStance, baseStance + stepWidth, p);
                trailLift = 0;
                trailFoot = 0;

            } else {
                // --- PHASE 2: TRAIL STEP ---
                // Lead leg is now planted Wide. Body moves over it towards Lead side.
                // So Lead leg angle decreases (narrows).
                // Trail leg lifts and catches up (narrows).

                // LEAD: Grounded Slide
                // Linearly decrease openness
                leadOpen = lerp(baseStance + stepWidth, baseStance, p);
                leadLift = 0;
                leadFoot = 0;

                // TRAIL: Active Catch-up
                // Lift: Lower shuffle
                trailLift = sin(p * Math.PI) * 0.4; 
                // Catch Up: Wide to Base
                trailOpen = lerp(baseStance + stepWidth, baseStance, p);
                trailFoot = -trailLift * 0.5; // Drag toe
            }

            // Apply Values
            // Note: Thigh Z direction -> Left: + is Out. Right: - is Out.
            
            // Correct logic for Right Strafe (!isLeft):
            // Left Leg (Trail) needs to point Left (+Z) to drag behind body moving Right.
            // Right Leg (Lead) needs to point Right (-Z) to step out.
            
            parts.leftThigh.rotation.z = isLeft ? leadOpen : trailOpen;
            parts.rightThigh.rotation.z = isLeft ? -trailOpen : -leadOpen; 

            parts.leftThigh.rotation.x = 0;
            parts.rightThigh.rotation.x = 0;

            parts.leftShin.rotation.x = isLeft ? leadLift : trailLift;
            parts.rightShin.rotation.x = isLeft ? trailLift : leadLift;

            // Feet Compensation: Rotate Z opposite to Thigh to stay flat
            applyFootRot(parts.leftShin, isLeft ? leadFoot : trailFoot, isLeft ? -leadOpen : -trailOpen);
            applyFootRot(parts.rightShin, isLeft ? trailFoot : leadFoot, isLeft ? trailOpen : leadOpen);

        } else {
            // === STANDARD WALK/RUN LOGIC ===
            const calcLeg = (offset) => {
                const phase = t + offset;
                const s = sin(phase);
                const c = cos(phase);
                
                let thighX = 0;
                let shinX = 0;
                let footX = 0;

                if (isBackward) {
                    // Backward
                    const isSwing = c > 0;
                    thighX = s * (isRunning ? 0.9 : 0.65);
                    if (isSwing) {
                        const lift = c;
                        shinX = lift * (isRunning ? 2.2 : 1.6);
                        thighX -= lift * 0.2;
                        footX = lift * 0.4;
                    } else {
                        shinX = 0.1;
                        footX = -thighX;
                    }
                } else {
                    // Forward
                    const isSwing = c > 0;
                    thighX = -s * (isRunning ? 1.1 : 0.55);
                    if (isSwing) {
                        shinX = c * (isRunning ? 2.4 : 1.4);
                        thighX -= c * (isRunning ? 0.8 : 0.3);
                        footX = -0.3 * c;
                    } else {
                        const loading = Math.max(0, sin(phase - 0.5));
                        if (!isRunning) shinX = loading * 0.1;
                        footX = s * (s > 0 ? -0.4 : -0.8);
                    }
                }
                return { thighX, shinX, footX };
            };

            const left = calcLeg(0);
            const right = calcLeg(Math.PI);

            const walkStance = isMaleStyle ? 0.13 : 0.04;
            const baseStanceZ = isRunning ? 0.08 : walkStance;

            parts.leftThigh.rotation.x = left.thighX;
            parts.leftThigh.rotation.z = -baseStanceZ;
            parts.leftShin.rotation.x = left.shinX;
            applyFootRot(parts.leftShin, left.footX, baseStanceZ);

            parts.rightThigh.rotation.x = right.thighX;
            parts.rightThigh.rotation.z = baseStanceZ;
            parts.rightShin.rotation.x = right.shinX;
            applyFootRot(parts.rightShin, right.footX, -baseStanceZ);
        }

        // --- ARMS ---
        let armAmp = isRunning ? 1.4 : 0.6;
        if (isPureStrafe) armAmp *= 0.4; 

        // Arm Spread
        const armSpread = isMaleStyle ? 0.2 : 0.15;

        parts.leftArm.rotation.x = sin(t) * armAmp;
        parts.leftArm.rotation.z = armSpread + (isStrafingLeft ? 0.2 : 0);
        
        parts.leftForeArm.rotation.x = isRunning ? -2.0 : -0.3;
        parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI / 2, damp);

        if (!skipRightArm) {
            if (isHolding) {
                if (stance === 'shoulder') {
                     parts.rightArm.rotation.x = -0.5 + cos(t) * 0.1;
                     parts.rightForeArm.rotation.x = -2.0;
                     parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
                } else {
                     parts.rightArm.rotation.x = sin(t + Math.PI) * (armAmp * 0.5);
                     parts.rightForeArm.rotation.x = -0.5;
                     parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -1.2, damp);
                     parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, -0.4, damp);
                }
            } else {
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
                parts.rightArm.rotation.x = sin(t + Math.PI) * armAmp;
                parts.rightArm.rotation.z = -armSpread - (isStrafingRight ? 0.2 : 0);
                
                parts.rightForeArm.rotation.x = isRunning ? -2.0 : -0.3;
            }
        }
    }
}
