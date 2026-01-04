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
        
        const groundY = 0.24;
        parts.hips.position.y = lerp(parts.hips.position.y, groundY, damp * 2);

        const targetRotX = (Math.PI / 2.1) * dv.fallDir; 
        
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, targetRotX, damp * 2);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, dv.stumbleDir * 0.5, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, dv.twist, damp);

        parts.torsoContainer.rotation.set(0, 0, 0);

        if (dv.fallDir > 0) { 
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.5, damp);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.5, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.5, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, damp);
            
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.2, damp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -0.2, damp); 
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.2, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.2, damp);

            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.5, damp);
            parts.head.rotation.y = lerp(parts.head.rotation.y, dv.stumbleDir, damp);
        } else {
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, damp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.0, damp); 
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.5, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.5, damp);

            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 1.5, damp); 
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.2, damp); 

            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.2, damp);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.2, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 1.5, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -1.5, damp);
            
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.5, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, damp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.5, damp);
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

        parts.hips.rotation.x = lerp(parts.hips.rotation.x, -localDrag.z * 1.5 + (localDown.z * gravStr * 0.5), damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, localDrag.x * 1.5 - (localDown.x * gravStr * 0.5), damp);
        
        const targetHipY = player.isDragged ? (player.draggedPartName === 'head' ? 0.5 : 0.9) : 1.0;
        parts.hips.position.y = lerp(parts.hips.position.y, targetHipY, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -parts.hips.rotation.x * 0.5, damp);
        parts.neck.rotation.set(0,0,0);
    }
}
