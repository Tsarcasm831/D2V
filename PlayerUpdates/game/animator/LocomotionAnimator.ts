import * as THREE from 'three';
import { PlayerInput } from '../../types';
import { playerModelResetFeet } from './AnimationUtils';

export class LocomotionAnimator {
    animateIdle(player: any, parts: any, damp: number, skipRightArm: boolean = false) {
        const lerp = THREE.MathUtils.lerp;
        // Independent time for breathing to keep it alive even when paused
        const t = Date.now() * 0.002; 
        const baseHeight = 0.94 * player.config.legScale;
        
        // Posture reset
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.set(0, 0, 0);
        
        // Breathing (Hip Bob + Chest expansion effect via spine)
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight + Math.sin(t)*0.005, damp);
        
        // Reset Torso Rotations
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, damp);
        parts.torsoContainer.rotation.z = lerp(parts.torsoContainer.rotation.z, 0, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, Math.sin(t) * 0.02, damp);

        parts.neck.rotation.x = -Math.sin(t) * 0.02;
        parts.head.rotation.x = 0.1 + Math.sin(t - 1) * 0.02;
        
        // Legs (Natural wide stance)
        parts.leftThigh.rotation.set(0, 0, 0.12);
        parts.rightThigh.rotation.set(0, 0, -0.12);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, damp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, damp);
        
        // Arms Idle
        this.animateArmsIdle(player, parts, damp, t, skipRightArm);

        playerModelResetFeet(parts, damp);
    }

    private animateArmsIdle(player: any, parts: any, damp: number, t: number, skipRightArm: boolean) {
        const lerp = THREE.MathUtils.lerp;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;

        // Left Arm (Relaxed)
        parts.leftArm.rotation.set(Math.sin(t)*0.03, 0, 0.15);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.15, damp);

        if (skipRightArm) return;

        // Right Arm
        if (isHolding) {
             if (stance === 'shoulder') {
                // High Carry
                parts.rightArm.rotation.set(-0.5 + Math.sin(t)*0.03, 0, -0.1);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.0, damp);
            } else {
                // Side Carry
                parts.rightArm.rotation.set(0.2, 0, -0.2);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.3, damp);
            }
        } else {
            // Relaxed
            parts.rightArm.rotation.set(Math.sin(t + 1)*0.03, 0, -0.15);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.15, damp);
        }
    }

    animateMovement(player: any, parts: any, dt: number, damp: number, input: PlayerInput, skipRightArm: boolean = false) {
        const isRunning = input.isRunning;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;
        const lerp = THREE.MathUtils.lerp;
        
        const speedMult = isRunning ? 15 : 9;
        player.walkTime += dt * speedMult;
        const t = player.walkTime;

        // Inputs
        const strafe = input.x; 
        const forward = -input.y; // +1 Forward, -1 Backward
        const moveDir = forward || (strafe ? 1 : 0);

        const baseHeight = 0.94 * player.config.legScale;

        // === HIPS / SPINE DYNAMICS ===
        
        // 1. Vertical Bounce (Energy)
        // Walk: Lowest at heel-strike (double support), Highest at passing (single support).
        // Run: Higher bounce frequency and amplitude (air time).
        // Using cos(2t): Peaks at 0, PI (Passing?). Troughs at PI/2 (Contact).
        const bounceAmp = isRunning ? 0.08 : 0.03;
        const bouncePhase = Math.cos(2 * t);
        const yOffset = bouncePhase * bounceAmp;
        
        // Lower hips slightly when running to allow leg compression
        const runSquat = isRunning ? 0.05 : 0.0;
        
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - runSquat + yOffset, damp * 2);

        // 2. Lateral Sway (Weight Shift)
        // Hips shift over the stance leg to balance.
        // If sin(t) > 0 (Left Leg Swing, Right Stance), Hips move Right (-X).
        // If sin(t) < 0 (Left Leg Stance, Right Swing), Hips move Left (+X).
        const swayAmp = isRunning ? 0.04 : 0.06;
        const sway = -Math.sin(t) * swayAmp; 
        parts.hips.position.x = lerp(parts.hips.position.x, sway, damp);

        // 3. Hip Yaw (Rotation Y) - Pelvic Rotation
        // Pelvis rotates towards the trailing leg to lengthen stride.
        // Left Leg Forward (sin > 0) -> Pelvis turns Right (Y < 0).
        const twistAmp = isRunning ? 0.3 : 0.15;
        const twist = -Math.sin(t) * twistAmp * Math.sign(forward || 1);
        parts.hips.rotation.y = twist;

        // 4. Hip Roll (Rotation Z) - Hip Drop
        // Swing side drops slightly.
        // Left Swing (sin > 0) -> Left Hip Drop (Z < 0 ?? No, Z rotates around forward axis).
        // Let's visualize: +Z rotates left hip up.
        // Left Swing -> Left Hip Up (Hiking) or Down (Trendelenburg)? 
        // Stylized: Stance hip pushes UP (+Z if Right Stance).
        // Right Stance (sin > 0) -> +Z.
        const rollAmp = isRunning ? 0.05 : 0.03;
        parts.hips.rotation.z = Math.sin(t) * rollAmp;

        // 5. Hip Pitch (Rotation X) - Forward Lean
        // Lean into movement.
        const leanBase = isRunning ? 0.35 : 0.1;
        // Add slight undulation
        const leanBob = Math.abs(Math.cos(t)) * 0.05;
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, leanBase + leanBob, damp);

        // 6. Spine Counter-Rotation (Fluidity)
        // Shoulders rotate opposite to Hips to keep head forward.
        parts.torsoContainer.rotation.y = -twist * 0.8; 
        parts.torsoContainer.rotation.z = -parts.hips.rotation.z * 0.5; // Keep head level
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, isRunning ? 0.1 : 0.02, damp);
        
        // Head stabilization
        parts.neck.rotation.y = -parts.torsoContainer.rotation.y * 0.5;
        parts.head.rotation.x = lerp(parts.head.rotation.x, 0.1 - leanBob, damp);


        // === LEGS LOGIC ===
        // We calculate leg properties based on phase offset.
        // Phase 0: Left Leg. Phase PI: Right Leg.
        
        const calcLeg = (offset: number) => {
            const phase = t + offset;
            
            // "Stride" drives the forward/backward reach.
            // sin(phase): +1 (Forward), -1 (Back)
            const stride = Math.sin(phase);
            const cos = Math.cos(phase); // Rate of change (Velocity)

            // forward check for strafing/backward logic (simplified here to focus on forward quality)
            const dirMult = forward >= -0.1 ? 1 : -1;
            
            // THIGH
            // Reach forward/back.
            // Run has wider arc.
            const thighRange = isRunning ? 1.1 : 0.55;
            // 3JS: -X is Forward, +X is Back.
            // So if stride=1 (Forward), RotX = -Amp.
            let thighRot = -stride * thighRange * dirMult;

            // KNEE (Shin)
            // Complex curve: High bend during Swing, slight bend during Stance loading, Straight at push off.
            
            // Swing Logic: Leg moving Front (cos > 0).
            const isSwing = cos * dirMult > 0;
            
            let shinRot = 0;
            let footRot = 0;

            if (isSwing) {
                // --- SWING PHASE ---
                // Max bend at mid-swing (stride ~ 0).
                const swingBend = Math.max(0, cos * dirMult);
                shinRot = swingBend * (isRunning ? 2.4 : 1.4);
                
                // Add "Knee Lift" to thigh in swing
                thighRot -= swingBend * (isRunning ? 0.8 : 0.3);

                // Foot: Dorsiflex (Toes Up) to clear ground
                footRot = -0.3 * swingBend;
            
            } else {
                // --- STANCE PHASE ---
                // Impact (Heel Strike) -> Mid Stance -> Push Off
                
                // Impact: Just after swing ends (cos becomes negative). Stride is max positive.
                // Knee bends slightly to absorb shock.
                // phase ~ PI/2.
                
                // Push Off: Just before swing starts. Stride is max negative. 
                // Leg straightens.
                
                // Simple stance bend based on weight bearing (mid-stance)
                // Mid-stance is stride ~ 0 (Vertical).
                const stanceProgress = -cos * dirMult; // 0 -> 1 -> 0
                
                // Slight knee flexion during loading response
                const loading = Math.max(0, Math.sin(phase - 0.5)); // shifted
                if (!isRunning) shinRot = loading * 0.1;

                // FOOT ROLL
                // 1. Heel Strike: Stride is Positive (Front). Foot flexed UP (-).
                // 2. Mid Stance: Flat.
                // 3. Push Off: Stride is Negative (Back). Foot flexed DOWN (+).
                
                if (stride * dirMult > 0) {
                     // Early Stance / Heel Strike
                     footRot = -stride * 0.4; 
                } else {
                     // Late Stance / Push Off
                     footRot = -stride * 0.8; // Strong push
                }
            }

            return { thigh: thighRot, shin: shinRot, foot: footRot };
        };

        const left = calcLeg(0);
        const right = calcLeg(Math.PI);

        // Apply Rotations
        parts.leftThigh.rotation.x = left.thigh;
        parts.leftShin.rotation.x = left.shin;
        this.applyFootRot(parts.leftShin, left.foot);

        parts.rightThigh.rotation.x = right.thigh;
        parts.rightShin.rotation.x = right.shin;
        this.applyFootRot(parts.rightShin, right.foot);

        // Wide Stance Maintenance
        parts.leftThigh.rotation.z = 0.08;
        parts.rightThigh.rotation.z = -0.08;


        // === ARMS ===
        const armAmp = isRunning ? 1.4 : 0.6;
        
        // Counter-swing to legs. Left Leg (phase 0) matches Left Arm forward? NO.
        // Left Leg Forward -> Right Arm Forward. Left Arm Back.
        // Left Leg Forward implies sin(t) > 0.
        // So Left Arm should be Back (RotX +).
        // So Left Arm RotX = sin(t) * amp.
        
        parts.leftArm.rotation.x = Math.sin(t) * armAmp;
        parts.leftArm.rotation.z = 0.15;
        // Elbow bend changes with swing
        const armPhaseL = Math.sin(t);
        parts.leftForeArm.rotation.x = isRunning ? -2.0 : -0.3 - (armPhaseL > 0 ? 0.2 : 0);

        if (!skipRightArm) {
            if (isHolding) {
                // Carrying item
                if (stance === 'shoulder') {
                     parts.rightArm.rotation.x = -0.5 + Math.cos(t) * 0.1;
                     parts.rightForeArm.rotation.x = -2.0;
                } else {
                     parts.rightArm.rotation.x = Math.sin(t + Math.PI) * (armAmp * 0.5);
                     parts.rightForeArm.rotation.x = -0.5;
                }
            } else {
                parts.rightArm.rotation.x = Math.sin(t + Math.PI) * armAmp;
                parts.rightArm.rotation.z = -0.15;
                const armPhaseR = Math.sin(t + Math.PI);
                parts.rightForeArm.rotation.x = isRunning ? -2.0 : -0.3 - (armPhaseR > 0 ? 0.2 : 0);
            }
        }
    }

    animateJump(player: any, parts: any, dt: number, damp: number, input: PlayerInput, skipRightArm: boolean = false) {
        const lerp = THREE.MathUtils.lerp;
        const vel = player.jumpVelocity;
        const isMoving = Math.abs(input.x) > 0 || Math.abs(input.y) > 0;
        const isHolding = !!player.config.selectedItem;

        // Reset lower body rotations
        playerModelResetFeet(parts, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (vel > 0) {
            // === RISING PHASE === (Launch)
            
            // Lean forward into the jump
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.4, damp);
            
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.5, damp);

            // Arms: Swing Up to gain momentum
            if (!skipRightArm) {
                if (!isHolding) {
                    parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp);
                    parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, damp);
                    parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, damp);
                } else {
                    // If holding, raise weapon but keep control
                    parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.0, damp);
                    parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.5, damp);
                }
            }

            if (isMoving) {
                // "Mario Jump" / Stride
                // Leading leg up (Right leg arbitrarily)
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.8, damp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.0, damp); // Deep bend
                
                // Trailing leg straightish
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.5, damp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.2, damp);
            } else {
                // Standing Tuck Jump
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.5, damp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.2, damp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -1.5, damp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 2.2, damp);
            }

        } else {
            // === FALLING PHASE === (Gravity takes over)
            
            // Straighten up slightly
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.1, damp);

            // Arms: Float out for balance
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.8, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.8, damp); // T-Pose-ish
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.2, damp);

            if (!skipRightArm) {
                if (!isHolding) {
                    parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, damp);
                    parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.8, damp);
                    parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, damp);
                } else {
                    parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.0, damp);
                    parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, damp);
                }
            }

            // Legs: Extend to reach for the ground (Anticipate landing)
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);
            
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);
        }
    }

    private applyFootRot(shin: THREE.Group, rot: number) {
        shin.children.forEach((c: any) => {
            if (c.name.includes('forefoot') || c.name.includes('heel')) {
                // We rotate the heel group which contains the foot mesh
                // Wait, in Builder: heelGroup is added to Shin. forefootGroup is added to footGroup (which is heelGroup).
                // Actually FootBuilder: heelGroup contains mainMesh. forefootGroup is inside footGroup?
                // Let's look at FootBuilder:
                // heelGroup is the container added to Shin.
                // So rotating heelGroup rotates the whole foot.
                if (c.name.includes('foot_anchor') || c.name.includes('heel')) {
                    c.rotation.x = rot;
                }
            }
        });
    }
}