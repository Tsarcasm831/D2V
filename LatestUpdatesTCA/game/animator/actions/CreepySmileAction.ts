
import * as THREE from 'three';

export class CreepySmileAction {
    private static _tempVec = new THREE.Vector3();

    static update(player: any, dt: number, cameraPosition: THREE.Vector3) {
        const TRIGGER_TIME = 117.0;
        const LOOK_DURATION = 5.0;
        const LIMIT_YAW = 1.0; 
        const LIMIT_PITCH = 0.6; 

        const cam = player.cameraHandler;
        if (!cam) return;

        // 1. Check Camera Angle Validity
        const neck = player.model.parts.neck;
        let angleIsValid = false;
        
        if (neck) {
             this._tempVec.copy(cameraPosition);
             neck.worldToLocal(this._tempVec);
             
             const camYaw = Math.atan2(this._tempVec.x, this._tempVec.z);
             const camPitch = -Math.atan2(this._tempVec.y, Math.sqrt(this._tempVec.x*this._tempVec.x + this._tempVec.z*this._tempVec.z));
             
             if (Math.abs(camYaw) <= LIMIT_YAW && Math.abs(camPitch) <= LIMIT_PITCH) {
                 angleIsValid = true;
             }
        }

        // 2. State Machine
        if (cam.lookAtCameraTimer > 0) {
            cam.lookAtCameraTimer += dt;
            
            if (cam.lookAtCameraTimer > LOOK_DURATION || !angleIsValid) {
                cam.lookAtCameraTimer = 0;
                cam.isLookingAtCamera = false;
            } else {
                cam.isLookingAtCamera = true;
            }
        } else {
            // Check status via handler
            if (angleIsValid && !player.status.isDead && player.status.recoverTimer <= 0) {
                 cam.cameraGazeTimer += dt;
                 
                 if (cam.cameraGazeTimer > TRIGGER_TIME) {
                     cam.lookAtCameraTimer = 0.001; 
                     cam.cameraGazeTimer = 0; 
                     cam.isLookingAtCamera = true;
                 }
            } else {
                if (cam.cameraGazeTimer > 0) {
                    cam.cameraGazeTimer = Math.max(0, cam.cameraGazeTimer - dt);
                }
            }
            cam.isLookingAtCamera = false;
        }

        // 3. Weight Smoothing
        const transitionSpeed = 3.0;
        if (cam.isLookingAtCamera) {
            cam.headLookWeight += dt * transitionSpeed;
        } else {
            cam.headLookWeight -= dt * transitionSpeed;
        }
        cam.headLookWeight = THREE.MathUtils.clamp(cam.headLookWeight, 0, 1);
    }
}
