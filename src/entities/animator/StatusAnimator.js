import * as THREE from 'three';
import { playerModelResetFeet } from './AnimationUtils.js';

export class StatusAnimator {
    constructor() {
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        this._tempQuat = new THREE.Quaternion();
        this._localDown = new THREE.Vector3(0, -1, 0);
    }

    animateDeath(player, parts, dt, damp) {
        const dv = player.status?.deathVariation ?? player.deathVariation ?? { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
        const t = player.status?.deathTime ?? player.deathTime ?? 0;
        const lerp = THREE.MathUtils.lerp;
        
        // Physics constants
        const impactTime = 0.4;
        const isImpacted = t > impactTime;
        
        const settleTime = Math.max(0, t - impactTime);
        const settleAlpha = Math.min(settleTime / 0.8, 1.0); 
        const easeSettle = settleAlpha * (2 - settleAlpha); // Ease out
        
        // 1. GRAVITY & DROP
        const dropProgress = Math.min(t / impactTime, 1.0);
        const gravityCurve = dropProgress * dropProgress;
        
        const baseHeight = 0.89 * player.config.legScale;
        const groundHeight = 0.22 * player.config.legScale;
        
        let targetY = lerp(baseHeight, groundHeight, gravityCurve);
        if (isImpacted) {
            const bounce = Math.max(0, Math.sin((t - impactTime) * 15) * 0.05 * Math.exp(-(t - impactTime) * 5));
            targetY += bounce;
        }

        parts.hips.position.y = lerp(parts.hips.position.y, targetY, damp * 3.0);
        
        // 2. ROTATION
        const fallDirection = dv.fallDir; 
        const targetRotX = (Math.PI / 2.1) * fallDirection; 
        
        const rotSpeed = isImpacted ? damp * 2.0 : damp * 0.8 + (gravityCurve * 0.5); 
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, targetRotX, rotSpeed);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, dv.stumbleDir * 0.5, rotSpeed);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, dv.twist, rotSpeed);

        parts.torsoContainer.rotation.set(0, 0, 0);

        // --- GRAVITY CALCULATION ---
        this._tempQuat.setFromEuler(parts.hips.rotation);
        const invHipQ = this._tempQuat.invert();
        const localG = this._localDown.clone().applyQuaternion(invHipQ);

        const distToGround = Math.max(0, parts.hips.position.y - groundHeight);
        const groundBlend = Math.min(distToGround / 0.3, 1.0);
        const floorDamp = 0.1 + (0.9 * groundBlend);

        const looseness = lerp(0.3, 1.0, easeSettle);
        
        const gravBiasSwing = -localG.z * looseness * 1.5 * floorDamp; 
        const gravBiasSpread = localG.x * looseness * 1.5;

        // 3. LIMBS & WHIPLASH
        if (fallDirection > 0) { 
            // === FORWARD FALL ===
            const legBend = lerp(0.2, 0.0, easeSettle); 
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legBend + gravBiasSwing, damp * 2);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -legBend + gravBiasSwing, damp * 2);
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -gravBiasSpread + 0.1, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -gravBiasSpread - 0.1, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp * 2);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp * 2);
            
            const armLag = Math.max(0, 1.0 - dropProgress); 
            const armTargetX = lerp(-2.8, -3.0, easeSettle);
            const armTargetZ = lerp(0.8, 1.2, easeSettle); 

            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armTargetX + (armLag * 1.5) + gravBiasSwing, damp * 2);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armTargetX + (armLag * 1.5) + gravBiasSwing, damp * 2);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armTargetZ - gravBiasSpread, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armTargetZ - gravBiasSpread, damp);

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

        const eyelids = player.model.eyelids;
        if (eyelids && eyelids.length === 4) {
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

    animateRagdoll(player, parts, dt) {
        const recoverTimer = player.status?.recoverTimer ?? player.recoverTimer ?? 0;
        const recoveryAlpha = player.isDragged ? 1.0 : (recoverTimer / 2.0);
        const dragVel = this._tempVec1.copy(player.dragVelocity);
        if (!player.isDragged) dragVel.multiplyScalar(recoveryAlpha);
        
        const invQuat = this._tempQuat.copy(player.mesh.quaternion).invert();
        const localDrag = dragVel.applyQuaternion(invQuat);
        const localDown = this._tempVec2.copy(this._localDown).applyQuaternion(invQuat);
        
        const gravStr = 1.2 * recoveryAlpha;
        const damp = 5 * dt;
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;

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
        const legTargetX = legDragX * airAlpha; 

        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legTargetX, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, legTargetX, damp);
        parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -legSpreadZ, damp);
        parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, legSpreadZ, damp);

        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, legDragX, damp);
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, legDragX, damp);

        playerModelResetFeet(parts, damp);
    }
}
