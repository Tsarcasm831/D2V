
import * as THREE from 'three';
import { Player } from '../Player';
import { CreepySmileAction } from '../animator/actions/CreepySmileAction';

export class PlayerCameraHandler {
    // Blinking
    blinkTimer: number = 0;
    isBlinking: boolean = false;

    // Gaze
    eyeLookTarget: THREE.Vector2 = new THREE.Vector2(); // x=yaw, y=pitch
    eyeLookCurrent: THREE.Vector2 = new THREE.Vector2();
    eyeMoveTimer: number = 0;

    // Camera Awareness / Creepy Smile
    lookAtCameraTimer: number = 0;
    cameraGazeTimer: number = 0;
    isLookingAtCamera: boolean = false;
    headLookWeight: number = 0; // 0 = Animation, 1 = Camera
    cameraWorldPosition: THREE.Vector3 = new THREE.Vector3();

    update(player: Player, dt: number, cameraPosition: THREE.Vector3) {
        this.cameraWorldPosition.copy(cameraPosition);
        
        // Use the existing logic refactored into a static helper or keep it here.
        // For now, we delegate to the existing action logic but pass the handler's state context
        // We need to proxy the state to what CreepySmileAction expects, or update CreepySmileAction.
        // Since CreepySmileAction expects 'player', let's update it to read from 'player.cameraHandler'
        // OR simply call the logic here.
        
        CreepySmileAction.update(player, dt, cameraPosition);
    }

    resetGaze() {
        this.eyeLookTarget.set(0, 0);
        this.eyeMoveTimer = 2.0; // Pause random movement
        
        // Cancel Creepy Smile
        this.isLookingAtCamera = false;
        this.lookAtCameraTimer = 0;
        this.cameraGazeTimer = 0;
        this.headLookWeight = 0;
    }
}
