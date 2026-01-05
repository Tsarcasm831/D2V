import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class PlayerAnimator {
    constructor(parts) {
        this.parts = parts;
        this.walkTime = 0;
        this.isPickingUp = false;
        this.pickUpTime = 0;
        this.recoverTimer = 0;
        this.isDragged = false;
        this.draggedPartName = 'hips';
        this.dragVelocity = new THREE.Vector3();
        
        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        this._tempQuat = new THREE.Quaternion();
        this._localDown = new THREE.Vector3(0, -1, 0);
        this._isHolding = false;
    }

    setHolding(isHolding) {
        this._isHolding = isHolding;
    }

    playJumpWindup() { /* Handled in update via jumpPhase */ }
    playJumpAir() { /* Handled in update via jumpPhase */ }
    playLand() { /* Handled in update via jumpPhase */ }
    playPickup() { 
        if (!this.isPickingUp) { 
            this.isPickingUp = true; 
            this.pickUpTime = 0; 
        } 
    }
    playInteract() { 
        if (!this.isInteracting) {
            this.isInteracting = true;
            this.interactTimer = 0;
        }
    }
    playAxeSwing() {
        console.log("PlayerAnimator: playAxeSwing called");
        if (!this.isAxeSwing) {
            this.isAxeSwing = true;
            this.axeSwingTimer = 0;
        }
    }
    playPunch() {
        console.log("PlayerAnimator: playPunch called");
        if (!this.isPunch) {
            this.isPunch = true;
            this.punchTimer = 0;
        }
    }

    animate(delta, isMoving, isRunning, isPickingUp, isDead, isJumping, jumpPhase, jumpTimer, jumpVelocity, isLedgeGrabbing, ledgeGrabTime, recoverTimer, isDragged, draggedPartName, dragVelocity, deathTime, deathVariation, isMovingBackwards, strafe = 0, forward = 0) {
        if (this.isEnabled === false) return;
        
        const d = delta || 0.016;
        if (!this.parts.hips) return;
        
        const lerp = THREE.MathUtils.lerp;
        const damp = 10 * delta;
        const ragdollDamp = 5 * delta;
        const parts = this.parts;

        // Handle animation timers for one-off actions
        if (this.isPickingUp || isPickingUp) {
            if (!this.isPickingUp) {
                this.isPickingUp = true;
                this.pickUpTime = 0;
            }
            this.pickUpTime += delta;
            if (this.pickUpTime > 1.2) {
                this.isPickingUp = false;
                this.pickUpTime = 0;
            }
        }

        if (this.isInteracting) {
            this.interactTimer += delta;
            if (this.interactTimer > 0.4) {
                this.isInteracting = false;
                this.interactTimer = 0;
            }
        }

        if (this.isAxeSwing) {
            this.axeSwingTimer += delta;
            if (this.axeSwingTimer > 0.45) {
                this.isAxeSwing = false;
                this.axeSwingTimer = 0;
            }
        }

        if (this.isPunch) {
            this.punchTimer += delta;
            if (this.punchTimer > 0.3) {
                this.isPunch = false;
                this.punchTimer = 0;
            }
        }

        if (isDragged || recoverTimer > 0) {
            // --- ENHANCED RAGDOLL / DRAG ANIMATION WITH GRAVITY ---
            const recoveryAlpha = isDragged ? 1.0 : (recoverTimer / 2.0);
            const t = Date.now() * 0.01;
            
            const dragVel = this._tempVec1.copy(dragVelocity || this.dragVelocity);
            if (!isDragged) dragVel.multiplyScalar(recoveryAlpha);

            const dragSpeed = dragVel.length() * 60;
            const invQuat = this._tempQuat.copy(this.parts.mesh.quaternion).invert();
            const localDrag = dragVel.applyQuaternion(invQuat);
            const localDown = this._tempVec2.copy(this._localDown).applyQuaternion(invQuat);
            
            const noise = (freq) => Math.sin(t * freq);
            const limpness = 0.5 + Math.min(dragSpeed * 0.1, 1.5) * recoveryAlpha;
            const gravStr = 1.2 * recoveryAlpha; // Strength of gravity pull on limbs

            // Hips Position relative to "Anchor"
            let targetHipRotX = -localDrag.z * 1.5 + (localDown.z * gravStr * 0.5);
            let targetHipRotZ = localDrag.x * 1.5 - (localDown.x * gravStr * 0.5);
            let targetHipY = 0.9;

            if (isDragged) {
                if (draggedPartName === 'head') {
                    targetHipY = 0.5;
                    targetHipRotX += 0.8; 
                } else if (draggedPartName && draggedPartName.includes('Arm')) {
                    targetHipRotZ += (draggedPartName === 'rightArm' ? 1.2 : -1.2);
                    targetHipY = 0.7;
                } else if (draggedPartName && draggedPartName.includes('Leg')) {
                    targetHipRotX = Math.PI - 0.5;
                    targetHipY = 1.4;
                }
            } else {
                targetHipY = 1.0;
                targetHipRotX = 0;
                targetHipRotZ = 0;
            }

            parts.hips.rotation.x = lerp(parts.hips.rotation.x, targetHipRotX, ragdollDamp);
            parts.hips.rotation.z = lerp(parts.hips.rotation.z, targetHipRotZ, ragdollDamp);
            parts.hips.position.y = lerp(parts.hips.position.y, (targetHipY + noise(5) * 0.05 * limpness) * SCALE_FACTOR, ragdollDamp);

            // Gravity-aware Limb Dangling
            const armHangX = localDown.z * gravStr * 2.0;
            const armHangZ = -localDown.x * gravStr * 2.0;
            const legHangX = localDown.z * gravStr * 1.5;

            parts.head.rotation.x = lerp(parts.head.rotation.x, armHangX + 0.3 + noise(3) * 0.2, ragdollDamp);
            parts.head.rotation.z = lerp(parts.head.rotation.z, armHangZ + noise(4) * 0.3, ragdollDamp);

            const outwardForce = Math.min(dragSpeed * 0.8, 1.5);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.4 + outwardForce + armHangZ, ragdollDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -(0.4 + outwardForce - armHangZ), ragdollDamp);
            
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -localDrag.z * 4.0 + armHangX, ragdollDamp);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -localDrag.z * 4.0 + armHangX, ragdollDamp);
            
            const legTrail = localDrag.z * 2.0;
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.2 - legTrail + legHangX, ragdollDamp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.1 - legTrail + legHangX, ragdollDamp);
            
            const shinBend = 0.5 + dragSpeed * 0.4 + Math.max(0, -localDown.y * gravStr);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, shinBend, ragdollDamp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, shinBend * 0.8, ragdollDamp);

            parts.forefootGroups.forEach(fg => fg.rotation.x = lerp(fg.rotation.x, 0.8 * recoveryAlpha + localDown.z, ragdollDamp));
            parts.heelGroups.forEach(hg => hg.rotation.x = lerp(hg.rotation.x, 0.8 * recoveryAlpha + localDown.z, ragdollDamp));

        } else if (isDead) {
            // --- REALISTIC SEQUENTIAL DEATH ANIMATION ---
            const dv = deathVariation || { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
            const t = deathTime;
            
            const buckleEnd = 0.15;
            const fallEnd = 0.5;
            const impactStart = 0.45;
            const impactEnd = 0.8;
            const settleStart = 1.0;

            const buckleProgress = Math.min(t / buckleEnd, 1.0);
            const fallProgress = Math.min(Math.max(0, (t - buckleEnd) / (fallEnd - buckleEnd)), 1.0);
            const impactProgress = Math.min(Math.max(0, (t - impactStart) / (impactEnd - impactStart)), 1.0);
            
            const finalHipY = dv.fallDir === 1 ? 0.22 : 0.28;
            const collapseY = lerp(1.0, 0.7, buckleProgress);
            const fallingY = lerp(collapseY, finalHipY, fallProgress);
            
            const impactBounce = impactProgress < 1.0 ? Math.sin(impactProgress * Math.PI) * 0.12 * (1.0 - impactProgress) : 0;
            parts.hips.position.y = lerp(parts.hips.position.y, (fallingY + impactBounce) * SCALE_FACTOR, damp * 1.5);

            const targetRotX = (Math.PI / 2.05) * dv.fallDir * -1;
            const targetRotZ = dv.stumbleDir * 0.8;
            
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, targetRotX * (buckleProgress * 0.2 + fallProgress * 0.8), damp);
            parts.hips.rotation.z = lerp(parts.hips.rotation.z, targetRotZ * fallProgress, damp);
            parts.hips.rotation.y = lerp(parts.hips.rotation.y, dv.twist * fallProgress, damp);

            const leftKnee = lerp(0, 1.4, buckleProgress) + lerp(0, -0.8, fallProgress);
            const rightKnee = lerp(0, 1.4, buckleProgress) + lerp(0, -0.4, fallProgress);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, leftKnee, damp * 2);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, rightKnee, damp * 2);

            const splayAmount = 0.5 * fallProgress;
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, splayAmount, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -splayAmount, damp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.3 * fallProgress, damp);

            const armOut = 1.2 * fallProgress;
            const armFlailX = dv.fallDir === 1 ? -1.0 : 1.5;
            
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armOut, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armOut, damp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armFlailX * fallProgress, damp);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armFlailX * fallProgress, damp);

            const elbowFlop = 1.2 * impactProgress;
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -elbowFlop, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -elbowFlop, damp);

            const headSnap = buckleProgress * 0.4 * -dv.fallDir;
            const headFloorRot = (dv.fallDir === 1 ? 0.3 : -0.6) + (dv.side * 0.4);
            
            const currentHeadRotX = headSnap + (headFloorRot * impactProgress);
            parts.head.rotation.x = lerp(parts.head.rotation.x, currentHeadRotX, damp);
            parts.head.rotation.z = lerp(parts.head.rotation.z, dv.side * 0.5 * impactProgress, damp);

            parts.forefootGroups.forEach(fg => fg.rotation.x = lerp(fg.rotation.x, -0.4 * impactProgress, damp));
            parts.heelGroups.forEach(hg => hg.rotation.x = lerp(hg.rotation.x, -0.4 * impactProgress, damp));

        } else if (this.isAxeSwing) {
            // --- WEAPON SWING ANIMATION ---
            const duration = 0.45;
            const p = this.axeSwingTimer / duration;
            let tArmX = 0, tArmZ = 0, tForeArmZ = 0, tTorsoY = 0, tHipsY = 1.0;

            if (p < 0.25) { // Wind-up
                const t = p / 0.25;
                tArmX = lerp(0, 0.6, t);
                tArmZ = lerp(0, -1.2, t);
                tForeArmZ = lerp(0, 0.4, t);
                tTorsoY = lerp(0, -0.6, t);
                tHipsY = 0.95;
            } else if (p < 0.65) { // Strike
                const t = (p - 0.25) / 0.4;
                tArmX = lerp(0.6, -1.2, t);
                tArmZ = lerp(-1.2, 1.3, t);
                tForeArmZ = lerp(0.4, -0.8, t);
                tTorsoY = lerp(-0.6, 0.9, t);
                tHipsY = 0.92;
            } else { // Recovery
                const t = (p - 0.65) / 0.35;
                tArmX = lerp(-1.2, 0, t);
                tArmZ = lerp(1.3, 0, t);
                tForeArmZ = lerp(-0.8, 0, t);
                tTorsoY = lerp(0.9, 0, t);
                tHipsY = lerp(0.92, 1.0, t);
            }

            const swingDamp = 25 * delta;
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, tArmX, swingDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, tArmZ, swingDamp);
            parts.rightForeArm.rotation.z = lerp(parts.rightForeArm.rotation.z, tForeArmZ, swingDamp);
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, tTorsoY, swingDamp);
            parts.hips.position.y = lerp(parts.hips.position.y, tHipsY * SCALE_FACTOR, swingDamp);

        } else if (this.isPunch) {
            // --- PUNCH ANIMATION ---
            const duration = 0.3;
            const p = this.punchTimer / duration;
            let tArmX = 0, tTorsoY = 0;
            const punchDamp = 30 * delta;

            if (p < 0.2) { // Wind up
                tArmX = 0.5;
                tTorsoY = -0.2;
            } else if (p < 0.5) { // Thrust
                tArmX = -1.6;
                tTorsoY = 0.4;
            } else { // Return
                const t = (p - 0.5) / 0.5;
                tArmX = lerp(-1.6, 0, t);
                tTorsoY = lerp(0.4, 0, t);
            }

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, tArmX, punchDamp);
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, tTorsoY, punchDamp);

        } else if (this.isInteracting) {
            // --- INTERACT ANIMATION ---
            const p = Math.sin((this.interactTimer / 0.4) * Math.PI);
            parts.head.rotation.x = lerp(parts.head.rotation.x, p * 0.5, damp * 3);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -p * 1.2, damp * 2);

        } else if (this.isPickingUp) {
            // --- PICK UP ANIMATION ---
            const duration = 1.2;
            const progress = (this.pickUpTime || 0) / duration;
            const bendFactor = Math.sin(progress * Math.PI); 

            parts.hips.position.y = lerp(parts.hips.position.y, (1.0 - bendFactor * 0.4) * SCALE_FACTOR, damp * 2);
            parts.hips.position.z = lerp(parts.hips.position.z, -bendFactor * 0.3 * SCALE_FACTOR, damp * 2);
            
            const torsoLean = bendFactor * 1.5;
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, torsoLean, damp * 2);
            
            const thighRotation = -torsoLean - (bendFactor * 0.2);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, thighRotation, damp * 2);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, thighRotation, damp * 2);
            
            const shinRotation = bendFactor * 1.8;
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, shinRotation, damp * 2);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, shinRotation, damp * 2);

            const currentTotalRot = torsoLean + thighRotation + shinRotation;
            const footCorrection = -currentTotalRot + (bendFactor * 0.25); 
            
            parts.forefootGroups.forEach(fg => fg.rotation.x = lerp(fg.rotation.x, footCorrection, damp * 2));
            parts.heelGroups.forEach(hg => hg.rotation.x = lerp(hg.rotation.x, footCorrection, damp * 2));

            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.2, damp * 2);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.2, damp * 2);
            parts.leftShin.rotation.z = lerp(parts.leftShin.rotation.z, -0.2, damp * 2);
            parts.rightShin.rotation.z = lerp(parts.rightShin.rotation.z, 0.2, damp * 2);

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -bendFactor * 2.5, damp * 2);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -bendFactor * 0.2, damp * 2);
            
            parts.head.rotation.x = lerp(parts.head.rotation.x, 0.6, damp * 2);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, bendFactor * 0.7, damp * 2);

        } else if (isLedgeGrabbing) {
            // --- LEDGE CLIMB ANIMATION ---
            const duration = 0.9;
            const t = ledgeGrabTime / duration;
            
            const isHanging = t < 0.3;
            const isPulling = t >= 0.3 && t < 0.7;
            const isVaulting = t >= 0.7;

            if (isHanging) {
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp * 2);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp * 2);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.2, damp * 2);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, damp * 2);
                
                parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.1, damp * 2);
                parts.head.rotation.x = lerp(parts.head.rotation.x, -0.5, damp * 2); 
                
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.2, damp * 2);
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.1, damp * 2);
            } else if (isPulling) {
                const subT = (t - 0.3) / 0.4;
                parts.leftArm.rotation.x = lerp(-2.8, -1.5, subT);
                parts.rightArm.rotation.x = lerp(-2.8, -1.5, subT);
                parts.leftForeArm.rotation.x = lerp(-0.2, -2.2, subT);
                parts.rightForeArm.rotation.x = lerp(-0.2, -2.2, subT);
                
                parts.hips.rotation.x = lerp(0.1, 0.6, subT);
                parts.head.rotation.x = lerp(-0.5, 0.2, subT); 
                
                parts.leftThigh.rotation.x = lerp(0.2, -1.2, subT);
                parts.leftShin.rotation.x = lerp(0.2, 1.5, subT);
                parts.rightThigh.rotation.x = lerp(0.1, 0.4, subT);
            } else if (isVaulting) {
                const subT = (t - 0.7) / 0.3;
                parts.leftArm.rotation.x = lerp(-1.5, 0.5, subT);
                parts.rightArm.rotation.x = lerp(-1.5, 0.5, subT);
                parts.leftForeArm.rotation.x = lerp(-2.2, -0.2, subT);
                parts.rightForeArm.rotation.x = lerp(-2.2, -0.2, subT);

                parts.leftThigh.rotation.x = lerp(-1.2, 0.2, subT);
                parts.rightThigh.rotation.x = lerp(0.4, -0.8, subT);
                parts.rightShin.rotation.x = lerp(0.1, 1.2, subT);
                
                parts.hips.rotation.x = lerp(0.6, 0, subT);
            }
        } else if (isJumping) {
            // --- JUMP/FALL ANIMATION ---
            const airTime = jumpTimer || 0;
            const showJumpAnim = airTime > 0.15;

            if (showJumpAnim) {
                if (jumpPhase === 'anticipation') {
                    const jumpProgress = Math.min(airTime / 0.15, 1.0);
                    const crouch = Math.sin(jumpProgress * Math.PI * 0.5) * 0.4;
                    
                    parts.hips.position.y = lerp(parts.hips.position.y, (1.0 - crouch) * SCALE_FACTOR, damp * 2);
                    parts.hips.rotation.x = lerp(parts.hips.rotation.x, crouch * 0.5, damp * 2);
                    
                    parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -crouch * 2, damp * 2);
                    parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -crouch * 2, damp * 2);
                    parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, crouch * 3, damp * 2);
                    parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, crouch * 3, damp * 2);
                    
                    parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 1.2 * crouch, damp * 2);
                    parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 1.2 * crouch, damp * 2);
                } else {
                    const tuck = jumpVelocity > 0 ? 0.8 : 0.3;
                    parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -tuck, damp);
                    parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -tuck, damp);
                    
                    if (parts.torsoContainer) {
                        parts.torsoContainer.rotation.x = -parts.hips.rotation.x;
                    }
                    
                    const isHolding = !!this._isHolding; // This would need to be tracked or passed
                    if (isHolding) {
                         parts.rightArm.rotation.x = -1.2;
                         parts.rightForeArm.rotation.x = -1.5;
                    } else {
                         parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.5, damp);
                    }
                    parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.5, damp);
                    
                    parts.forefootGroups.forEach(fg => fg.rotation.x = lerp(fg.rotation.x, 0.5, damp));
                    parts.heelGroups.forEach(hg => hg.rotation.x = lerp(hg.rotation.x, 0.5, damp));
                }
            } else if (isMoving) {
                this._animateMovement(delta, isRunning, damp, parts, SCALE_FACTOR, isMovingBackwards, strafe, forward);
            }
        } else if (isMoving) {
            this._animateMovement(delta, isRunning, damp, parts, SCALE_FACTOR, isMovingBackwards, strafe, forward);
        } else {
            // Idle Pose
            parts.hips.position.y = lerp(parts.hips.position.y, 1.0 * SCALE_FACTOR, damp);
            parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0, damp);
            parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
            parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);
            
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, damp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, damp);
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.15, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.15, damp);
            parts.leftShin.rotation.z = lerp(parts.leftShin.rotation.z, -0.15, damp);
            parts.rightShin.rotation.z = lerp(parts.rightShin.rotation.z, 0.15, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, damp);

            parts.forefootGroups.forEach(fg => fg.rotation.x = lerp(fg.rotation.x, 0, damp));
            parts.heelGroups.forEach(hg => hg.rotation.x = lerp(hg.rotation.x, 0, damp));

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, damp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.2, damp);
            
            parts.head.rotation.x = lerp(parts.head.rotation.x, 0.12, damp);
            parts.head.rotation.y = lerp(parts.head.rotation.y, 0, damp);
            parts.head.rotation.z = lerp(parts.head.rotation.z, 0, damp);
        }
    }

    _animateMovement(delta, isRunning, damp, parts, SCALE_FACTOR, isMovingBackwards = false, strafe = 0, forward = 0) {
        const lerp = THREE.MathUtils.lerp;
        const animSpeed = isRunning ? 14.0 : 8.0;
        
        // Reverse the animation clock if moving backwards so legs/arms cycle correctly
        const clockDirection = isMovingBackwards ? -1 : 1;
        this.walkTime += delta * animSpeed * clockDirection;
        const t = this.walkTime;

        // --- HIPS ---
        const bounceBase = 0.98;
        const bounceAmp = lerp(0.04, 0.12, isRunning ? 1.0 : 0.0);
        const bounce = Math.abs(Math.sin(t)) * bounceAmp; 
        parts.hips.position.y = (bounceBase + bounce) * SCALE_FACTOR;

        // Dynamic Hip Sway/Lean
        const targetHipX = Math.sin(t) * 0.05 + strafe * 0.08;
        parts.hips.position.x = lerp(parts.hips.position.x || 0, targetHipX * SCALE_FACTOR, damp);
        
        const leanForward = lerp(0.1, 0.4, (isRunning && forward > 0) ? 1.0 : 0.0);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, leanForward, damp);
        
        const hipTwist = Math.cos(t) * 0.15 * (Math.abs(forward) > 0.1 ? Math.sign(forward) : 1);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, hipTwist, damp);
        
        const hipRoll = Math.cos(t) * 0.05 - strafe * 0.15;
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, hipRoll, damp);

        if (parts.torsoContainer) {
            parts.torsoContainer.rotation.y = -parts.hips.rotation.y * 1.2; 
            parts.torsoContainer.rotation.z = -parts.hips.rotation.z;
        }
        if (parts.neck) parts.neck.rotation.x = -leanForward * 0.8; 

        // --- LEGS ---
        const calculateLeg = (offset) => {
            const cycle = t + offset;
            const sin = Math.sin(cycle);
            const cos = Math.cos(cycle);

            let thighRotX = 0;
            let thighRotZ = 0;
            let shinRot = 0;
            let footRot = 0;

            const isStrafing = Math.abs(strafe) > 0.2;

            if (isRunning && forward >= 0.1) {
                // Running Forward
                thighRotX = sin * 0.9 + 0.2; 
                const kneeBend = Math.max(0, -sin * 1.6 - 0.2); 
                const impactStraighten = Math.max(0, sin * 0.2); 
                shinRot = kneeBend + impactStraighten;
                footRot = Math.max(0, -sin * 0.5);
            } else if (forward < -0.1) {
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
                const strafeDir = Math.sign(strafe);
                thighRotX = sin * 0.2;
                const outPhase = strafeDir > 0 ? (isRightLeg ? sin : -sin) : (isRightLeg ? -sin : sin);
                thighRotZ = outPhase * 0.3;
                shinRot = Math.max(0, -outPhase * 0.8);
                footRot = -thighRotZ;
            } else {
                // Walking Forward
                thighRotX = sin * 0.6; 
                const walkKnee = Math.max(0, -Math.sin(cycle + 0.5) * 1.2); 
                shinRot = walkKnee;
                const heelStrike = Math.max(0, sin * 0.4); 
                const pushOff = Math.max(0, -sin * 0.4);
                footRot = heelStrike - pushOff;
            }

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

        if (parts.forefootGroups && parts.forefootGroups.length >= 2) {
            parts.forefootGroups[0].rotation.x = leftLeg.foot;
            parts.forefootGroups[1].rotation.x = rightLeg.foot;
        }
        if (parts.heelGroups && parts.heelGroups.length >= 2) {
            parts.heelGroups[0].rotation.x = leftLeg.foot;
            parts.heelGroups[1].rotation.x = rightLeg.foot;
        }

        // --- ARMS ---
        const armPhase = Math.PI; 
        const leftArmSin = Math.sin(t + armPhase);
        const rightArmSin = Math.sin(t);
        const baseArmSwing = lerp(0.6, 1.2, isRunning ? 1.0 : 0.0);
        
        parts.leftArm.rotation.x = leftArmSin * baseArmSwing;
        parts.leftArm.rotation.z = 0.2;
        parts.leftForeArm.rotation.x = lerp(-0.4, -2.0, isRunning ? 1.0 : 0.0); 

        parts.rightArm.rotation.x = rightArmSin * baseArmSwing;
        parts.rightArm.rotation.z = -0.2;
        parts.rightForeArm.rotation.x = lerp(-0.4, -2.0, isRunning ? 1.0 : 0.0); 

        if (parts.head) parts.head.rotation.x = lerp(parts.head.rotation.x, 0.2, damp);
    }
}