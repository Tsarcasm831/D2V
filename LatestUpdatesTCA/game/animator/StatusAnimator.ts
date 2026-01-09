
import * as THREE from 'three';
import { playerModelResetFeet } from './AnimationUtils';

export class StatusAnimator {
    private _tempVec1 = new THREE.Vector3();
    private _tempVec2 = new THREE.Vector3();
    private _tempQuat = new THREE.Quaternion();
    private _localDown = new THREE.Vector3(0, -1, 0);

    animateDeath(player: any, parts: any, dt: number, damp: number) {
        const dv = player.status.deathVariation;
        const lerp = THREE.MathUtils.lerp;
        const t = player.status.deathTime;
        
        // Physics Phases
        const buckleDuration = 0.15;
        const fallDuration = 0.45;
        const impactTime = buckleDuration + fallDuration; // ~0.6s
        
        const isBuckling = t < buckleDuration;
        const isFalling = t >= buckleDuration && t < impactTime;
        const isImpacted = t >= impactTime;
        const timeSinceImpact = Math.max(0, t - impactTime);

        // 1. HEIGHT & Y-POSITION
        const baseHeight = 0.89 * player.config.legScale;
        const groundHeight = 0.22 * player.config.legScale;
        
        let targetY = baseHeight;
        
        if (isBuckling) {
            // Knees give way - slight drop
            const p = t / buckleDuration;
            targetY = lerp(baseHeight, baseHeight - 0.2, p);
        } else if (isFalling) {
            // Gravity acceleration
            const p = (t - buckleDuration) / fallDuration;
            const easeIn = p * p * p; // Cubic for gravity
            targetY = lerp(baseHeight - 0.2, groundHeight, easeIn);
        } else {
            // Impact Bounce
            targetY = groundHeight;
            // Damped cosine bounce
            const bounce = Math.exp(-timeSinceImpact * 6.0) * Math.cos(timeSinceImpact * 15.0) * 0.08;
            targetY += Math.abs(bounce); // Bounce UP only
        }
        
        // Hips Position
        parts.hips.position.y = lerp(parts.hips.position.y, targetY, damp * 8); // Tight tracking for physics feel

        // 2. MAIN BODY ROTATION
        const fallDir = dv.fallDir; // 1 = Forward, -1 = Backward
        
        let targetRotX = 0;
        
        if (isBuckling) {
            // Hunch/Anticipate
            targetRotX = fallDir * 0.15;
        } else if (isFalling) {
            // Fall over
            const p = (t - buckleDuration) / fallDuration;
            // Rotate to 90 degrees (PI/2)
            targetRotX = lerp(fallDir * 0.15, fallDir * (Math.PI / 2), p);
        } else {
            // Flat on ground
            targetRotX = fallDir * (Math.PI / 2);
            // Slight recoil
            const recoil = Math.exp(-timeSinceImpact * 4.0) * Math.sin(timeSinceImpact * 10.0) * 0.05;
            targetRotX += recoil * fallDir;
        }
        
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, targetRotX, damp * 5);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, dv.twist, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, dv.stumbleDir * 0.3, damp);

        parts.torsoContainer.rotation.set(0, 0, 0); // Reset local torso, drive everything from hips/limbs

        // 3. LIMB ANIMATION
        if (fallDir > 0) {
            // === FORWARD FALL ===
            if (isBuckling) {
                // Arms: Reach out to catch
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.2, damp * 5);
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.2, damp * 5);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.3, damp * 5);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.3, damp * 5);
                
                // Legs: Buckle
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.5, damp * 5);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.8, damp * 5);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 1.2, damp * 5);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 1.5, damp * 5);
                
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.4, damp * 5); // Head up looking at ground

            } else {
                // Impact / Settle
                const settleDamp = isImpacted ? damp * 3 : damp;
                
                // Arms: Splay out above head or to sides on impact
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, settleDamp);
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.6, settleDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -1.2, settleDamp);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 1.2, settleDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, settleDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.2, settleDamp);

                // Legs: Straighten somewhat but loose
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.1, settleDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.1, settleDamp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, settleDamp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, settleDamp);
                
                // Splay legs
                parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.2, settleDamp);
                parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.3, settleDamp);

                // Head: Turn to side
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.2, settleDamp);
                parts.head.rotation.y = lerp(parts.head.rotation.y, 0.7 * dv.side, settleDamp);
            }
        } else {
            // === BACKWARD FALL ===
            if (isBuckling) {
                // Arms: Flail Up
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp * 8);
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.9, damp * 8);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.5, damp * 8);
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.5, damp * 8);

                // Torso: Arch back
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.3, damp * 5);
                
                // One leg kicks up
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.2, damp * 5);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.2, damp * 5);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.2, damp * 5);

                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.5, damp * 5); // Chin tucked in fear

            } else {
                // Impact / Settle
                const settleDamp = isImpacted ? damp * 3 : damp;

                // Arms: Drop to floor
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.3, settleDamp);
                parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.4, settleDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -1.3, settleDamp); // Wide
                parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 1.4, settleDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, settleDamp);
                parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, settleDamp);

                // Legs: Relax
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.2, settleDamp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.1, settleDamp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, settleDamp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, settleDamp);
                
                // Splay
                parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.4, settleDamp);
                parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.4, settleDamp);

                // Head
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.1, settleDamp);
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.3, settleDamp);
                parts.head.rotation.y = lerp(parts.head.rotation.y, 0.4 * dv.side, settleDamp);
            }
        }

        // Eyes Closed
        const eyelids = player.model.eyelids;
        if (eyelids && eyelids.length === 4) {
            const closeAlpha = Math.min(t / 0.2, 1.0); 
            const closedTop = -0.1;
            const closedBot = 0.1;
            const openTop = -0.7;
            const openBot = 0.61;

            eyelids[0].rotation.x = lerp(openTop, closedTop, closeAlpha);
            eyelids[1].rotation.x = lerp(openBot, closedBot, closeAlpha);
            eyelids[2].rotation.x = lerp(openTop, closedTop, closeAlpha);
            eyelids[3].rotation.x = lerp(openBot, closedBot, closeAlpha);
        }

        // Loose Feet
        playerModelResetFeet(parts, damp);
    }

    animateRagdoll(player: any, parts: any, dt: number) {
        const recoveryAlpha = player.isDragged ? 1.0 : (player.status.recoverTimer / 2.0);
        const dragVel = this._tempVec1.copy(player.dragVelocity);
        if (!player.isDragged) dragVel.multiplyScalar(recoveryAlpha);
        
        const invQuat = this._tempQuat.copy(player.mesh.quaternion).invert();
        const localDrag = dragVel.applyQuaternion(invQuat);
        const localDown = this._tempVec2.copy(this._localDown).applyQuaternion(invQuat);
        
        const gravStr = 1.2 * recoveryAlpha;
        const damp = 8 * dt; // Increased damp for more responsive dragging
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;

        // Add some noise/swing to limbs based on drag speed
        const speed = dragVel.length();
        const noise = Math.sin(Date.now() * 0.01) * speed * 0.1;

        parts.hips.rotation.x = lerp(parts.hips.rotation.x, -localDrag.z * 1.5 + (localDown.z * gravStr * 0.5), damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, localDrag.x * 1.5 - (localDown.x * gravStr * 0.5), damp);
        
        const targetHipY = player.isDragged ? (player.draggedPartName === 'head' ? 0.5 : 0.9) : baseHeight;
        parts.hips.position.y = lerp(parts.hips.position.y, targetHipY, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -parts.hips.rotation.x * 0.5, damp);
        parts.neck.rotation.set(0,0,0);

        const groundHeight = 0.22 * player.config.legScale;
        const dist = Math.max(0, parts.hips.position.y - groundHeight);
        const airAlpha = Math.min(dist / 0.5, 1.0);

        const legDragX = -localDrag.z * 2.0;
        const legSpreadZ = localDrag.x * 0.5;
        const legTargetX = legDragX * airAlpha + noise; 

        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legTargetX, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, legTargetX, damp);
        parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -legSpreadZ - 0.1, damp); // Loose spread
        parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, legSpreadZ + 0.1, damp);

        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, legDragX - 0.5, damp); // Drag behind
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, legDragX - 0.5, damp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.5, damp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, damp);

        playerModelResetFeet(parts, damp);
    }
}
