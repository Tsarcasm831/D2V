
import * as THREE from 'three';

export class CreepySmileAction {
    private static _tempVec = new THREE.Vector3();

    static update(player: any, dt: number, cameraPosition: THREE.Vector3) {
        const TRIGGER_TIME = 117.0;
        const LOOK_DURATION = 5.0;
        // Head turn limits matching PlayerAnimator
        const LIMIT_YAW = 1.0; 
        const LIMIT_PITCH = 0.6; 

        // 1. Check Camera Angle Validity
        // Must be within the head's clamp range to be considered "able to turn head"
        const neck = player.model.parts.neck;
        let angleIsValid = false;
        
        if (neck) {
             this._tempVec.copy(cameraPosition);
             // Transform camera position to neck's local space to check angles
             // This accounts for player rotation and scaling
             neck.worldToLocal(this._tempVec);
             
             // Calculate local yaw/pitch to camera
             const camYaw = Math.atan2(this._tempVec.x, this._tempVec.z);
             const camPitch = -Math.atan2(this._tempVec.y, Math.sqrt(this._tempVec.x*this._tempVec.x + this._tempVec.z*this._tempVec.z));
             
             // Check if within clamp limits
             if (Math.abs(camYaw) <= LIMIT_YAW && Math.abs(camPitch) <= LIMIT_PITCH) {
                 angleIsValid = true;
             }
        }

        // 2. State Machine

        if (player.lookAtCameraTimer > 0) {
            // --- ACTIVE STATE (Looking) ---
            player.lookAtCameraTimer += dt;
            
            // Exit Conditions: Time up OR Camera moved out of range
            if (player.lookAtCameraTimer > LOOK_DURATION || !angleIsValid) {
                // Return to normal
                player.lookAtCameraTimer = 0;
                player.isLookingAtCamera = false;
                // Note: cameraGazeTimer was reset upon entering active state, 
                // so it will need to accumulate 117s again to re-trigger.
            } else {
                player.isLookingAtCamera = true;
            }
        } else {
            // --- PASSIVE STATE (Accumulating) ---
            if (angleIsValid && !player.isDead && player.recoverTimer <= 0) {
                 player.cameraGazeTimer += dt;
                 
                 if (player.cameraGazeTimer > TRIGGER_TIME) {
                     // Trigger Active State
                     player.lookAtCameraTimer = 0.001; 
                     player.cameraGazeTimer = 0; 
                     player.isLookingAtCamera = true;
                 }
            } else {
                // If camera out of range or dead, decay the timer slowly
                // preventing indefinite storage of "creepy potential"
                if (player.cameraGazeTimer > 0) {
                    player.cameraGazeTimer = Math.max(0, player.cameraGazeTimer - dt);
                }
            }
            
            player.isLookingAtCamera = false;
        }

        // 3. Weight Smoothing (Animation)
        const transitionSpeed = 3.0;
        if (player.isLookingAtCamera) {
            player.headLookWeight += dt * transitionSpeed;
        } else {
            player.headLookWeight -= dt * transitionSpeed;
        }
        player.headLookWeight = THREE.MathUtils.clamp(player.headLookWeight, 0, 1);
    }
}
