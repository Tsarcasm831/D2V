
import * as THREE from 'three';
import { playerModelResetFeet } from './AnimationUtils';

export class StatusAnimator {
    private _tempVec1 = new THREE.Vector3();
    private _tempVec2 = new THREE.Vector3();
    private _tempQuat = new THREE.Quaternion();
    private _localDown = new THREE.Vector3(0, -1, 0);

    animateDeath(player: any, parts: any, dt: number, damp: number) {
        const dv = player.deathVariation;
        const lerp = THREE.MathUtils.lerp;
        const t = player.deathTime;
        
        // Physics constants
        const impactTime = 0.4;
        const isImpacted = t > impactTime;
        
        // Settle factor: 0 -> 1 after impact. Used to relax limbs due to gravity.
        const settleTime = Math.max(0, t - impactTime);
        const settleAlpha = Math.min(settleTime / 0.8, 1.0); 
        const easeSettle = settleAlpha * (2 - settleAlpha); // Ease out
        
        // 1. GRAVITY & DROP (Accelerate into the ground)
        const dropProgress = Math.min(t / impactTime, 1.0);
        const gravityCurve = dropProgress * dropProgress; // Ease In Quad
        
        const baseHeight = 0.89 * player.config.legScale;
        const groundHeight = 0.22 * player.config.legScale; // Hips radius distance from ground
        
        // Calculate target Y. If impacted, add a tiny bounce/settle
        let targetY = lerp(baseHeight, groundHeight, gravityCurve);
        if (isImpacted) {
            // Subtle bounce on impact
            const bounce = Math.max(0, Math.sin((t - impactTime) * 15) * 0.05 * Math.exp(-(t - impactTime) * 5));
            targetY += bounce;
        }

        parts.hips.position.y = lerp(parts.hips.position.y, targetY, damp * 3.0);
        
        // 2. ROTATION (Buckle -> Twist -> Slam)
        const fallDirection = dv.fallDir; // 1 = Forward, -1 = Backward
        const targetRotX = (Math.PI / 2.1) * fallDirection; 
        
        const rotSpeed = isImpacted ? damp * 2.0 : damp * 0.8 + (gravityCurve * 0.5); 
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, targetRotX, rotSpeed);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, dv.stumbleDir * 0.5, rotSpeed);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, dv.twist, rotSpeed);

        parts.torsoContainer.rotation.set(0, 0, 0);

        // --- GRAVITY CALCULATION ---
        // Calculate local gravity vector to bias limbs
        this._tempQuat.setFromEuler(parts.hips.rotation);
        const invHipQ = this._tempQuat.invert();
        const localG = this._localDown.clone().applyQuaternion(invHipQ);

        // Collision Avoidance:
        // If hips are near ground, reduce the "Swing" gravity bias. 
        // This prevents limbs from rotating purely downwards into the floor.
        const distToGround = Math.max(0, parts.hips.position.y - groundHeight);
        const groundBlend = Math.min(distToGround / 0.3, 1.0); // 0 = On Ground, 1 = In Air
        const floorDamp = 0.1 + (0.9 * groundBlend); // Dampen to 10% when on ground

        // Bias factors
        // As time progresses, limbs succumb more to gravity
        const looseness = lerp(0.3, 1.0, easeSettle);
        
        // Gravity components mapped to rotations
        // localG.z is Forward/Back pull -> Affects X rotation (Swing)
        const gravBiasSwing = -localG.z * looseness * 1.5 * floorDamp; 
        const gravBiasSpread = localG.x * looseness * 1.5;

        // 3. LIMBS & WHIPLASH
        if (fallDirection > 0) { 
            // === FORWARD FALL ===
            
            // Legs
            const legBend = lerp(0.2, 0.0, easeSettle); 
            
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legBend + gravBiasSwing, damp * 2);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -legBend + gravBiasSwing, damp * 2);
            
            // Gravity Sideways
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -gravBiasSpread + 0.1, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -gravBiasSpread - 0.1, damp);

            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp * 2);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp * 2);
            
            // Arms
            const armLag = Math.max(0, 1.0 - dropProgress); 
            const armTargetX = lerp(-2.8, -3.0, easeSettle);
            const armTargetZ = lerp(0.8, 1.2, easeSettle); 

            // Bias Arms
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armTargetX + (armLag * 1.5) + gravBiasSwing, damp * 2);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armTargetX + (armLag * 1.5) + gravBiasSwing, damp * 2);
            
            // Arm Spread: Opposite signs for Left/Right due to mirroring
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armTargetZ - gravBiasSpread, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armTargetZ - gravBiasSpread, damp);

            // Head Whiplash + Gravity Tilt
            const headTarget = isImpacted ? -0.4 : 0.5; 
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, headTarget, damp * (isImpacted ? 4 : 1));
            parts.head.rotation.y = lerp(parts.head.rotation.y, dv.stumbleDir, damp);
            parts.head.rotation.z = lerp(parts.head.rotation.z, -localG.x * 0.5, damp);

        } else {
            // === BACKWARD FALL ===
            const legKick = Math.max(0, Math.sin(dropProgress * Math.PI)) * 0.5;
            const legBase = lerp(-0.5, 0.1, easeSettle); 
            
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legBase - legKick + gravBiasSwing, damp * 2);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, legBase - legKick - 0.1 + gravBiasSwing, damp * 2);
            
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -gravBiasSpread + 0.1, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -gravBiasSpread - 0.1, damp);

            const shinTarget = lerp(1.5, 0.2, easeSettle);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, shinTarget, damp); 
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, shinTarget * 0.3, damp); 

            // Arms
            const armTargetX = lerp(-0.5, -0.05, easeSettle);
            const armTargetZ = lerp(1.2, 1.5, easeSettle); 

            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armTargetX + gravBiasSwing, damp);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armTargetX + gravBiasSwing, damp);
            
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armTargetZ - gravBiasSpread, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armTargetZ - gravBiasSpread, damp);
            
            const headTarget = isImpacted ? 0.6 : -0.4; 
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, headTarget, damp * (isImpacted ? 3 : 1));
            parts.head.rotation.z = lerp(parts.head.rotation.z, -localG.x * 0.5, damp);
        }

        // Close Eyes
        const eyelids = player.model.eyelids;
        if (eyelids && eyelids.length === 4) {
            // Quickly close eyes during fall
            const closeAlpha = Math.min(t / 0.3, 1.0); 
            const closedTop = -0.1;
            const closedBot = 0.1;
            const openTop = -0.7;
            const openBot = 0.61;

            eyelids[0].rotation.x = lerp(openTop, closedTop, closeAlpha);
            eyelids[1].rotation.x = lerp(openBot, closedBot, closeAlpha);
            eyelids[2].rotation.x = lerp(openTop, closedTop, closeAlpha);
            eyelids[3].rotation.x = lerp(openBot, closedBot, closeAlpha);
        }

        playerModelResetFeet(parts, damp);
    }

    animateRagdoll(player: any, parts: any, dt: number) {
        const recoveryAlpha = player.isDragged ? 1.0 : (player.recoverTimer / 2.0);
        const dragVel = this._tempVec1.copy(player.dragVelocity);
        if (!player.isDragged) dragVel.multiplyScalar(recoveryAlpha);
        
        const invQuat = this._tempQuat.copy(player.mesh.quaternion).invert();
        const localDrag = dragVel.applyQuaternion(invQuat);
        const localDown = this._tempVec2.copy(this._localDown).applyQuaternion(invQuat);
        
        const gravStr = 1.2 * recoveryAlpha;
        const damp = 5 * dt;
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;

        // Hips orient to drag/gravity
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, -localDrag.z * 1.5 + (localDown.z * gravStr * 0.5), damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, localDrag.x * 1.5 - (localDown.x * gravStr * 0.5), damp);
        
        const targetHipY = player.isDragged ? (player.draggedPartName === 'head' ? 0.5 : 0.9) : baseHeight;
        parts.hips.position.y = lerp(parts.hips.position.y, targetHipY, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -parts.hips.rotation.x * 0.5, damp);
        parts.neck.rotation.set(0,0,0);

        // Legs - Loose Trail
        // Clamp to avoid floor clipping if hips are low
        const groundHeight = 0.22 * player.config.legScale;
        const dist = Math.max(0, parts.hips.position.y - groundHeight);
        const airAlpha = Math.min(dist / 0.5, 1.0); // 0 on ground, 1 in air

        // If dragging forward (+Z), trail back (-X rot).
        const legDragX = -localDrag.z * 2.0;
        const legSpreadZ = localDrag.x * 0.5;

        // When on ground (airAlpha=0), force legs flatter (near 0) instead of dragging down/up
        const legTargetX = legDragX * airAlpha; 

        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legTargetX, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, legTargetX, damp);
        
        parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -legSpreadZ, damp);
        parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, legSpreadZ, damp);

        // Loose Arms
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, legDragX, damp);
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, legDragX, damp);

        playerModelResetFeet(parts, damp);
    }
}
