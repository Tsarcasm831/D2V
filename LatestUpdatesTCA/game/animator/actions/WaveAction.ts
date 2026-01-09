
import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils';

export class WaveAction {
    static animate(player: any, parts: any, dt: number, damp: number) {
        const t = player.waveTimer;
        const lerp = THREE.MathUtils.lerp;
        const sin = Math.sin;
        
        // Duration: 2.0s
        // 0.0 - 0.3: Raise Arm
        // 0.3 - 1.7: Wave
        // 1.7 - 2.0: Lower Arm

        const waveSpeed = 12;
        
        if (t < 0.3) {
            // === PHASE 1: RAISE ===
            const p = t / 0.3;
            const raiseDamp = damp * 5;

            // Arm Up and Out (Abduction + Forward Flexion)
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.5, raiseDamp); 
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -2.4, raiseDamp); // High Up (Local Z negative is Up/Side)
            parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.5, raiseDamp); // Rotate forward slightly to face camera
            
            // Elbow Bend (Forearm flexion)
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.8, raiseDamp); 
            
            // Head Track
            parts.head.rotation.y = lerp(parts.head.rotation.y, -0.3, raiseDamp); 
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.2, raiseDamp);

        } else if (t < 1.7) {
            // === PHASE 2: WAVE ===
            const waveTime = t - 0.3;
            const wave = sin(waveTime * waveSpeed);
            
            // Keep arm raised
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.5, damp * 5);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -2.4, damp * 5);
            parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.5, damp * 5);
            
            // Forearm Wiggle (Pronation/Supination + slight flexion bob)
            parts.rightForeArm.rotation.z = lerp(parts.rightForeArm.rotation.z, wave * 0.5, damp * 10);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.8 + (Math.abs(wave) * 0.1), damp * 10);
            
            // Hand Wiggle
            parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, wave * 0.4, damp * 15);
            
            // Head Bob with wave
            parts.head.rotation.z = lerp(parts.head.rotation.z, wave * 0.05, damp);
            parts.head.rotation.y = lerp(parts.head.rotation.y, -0.3, damp);

        } else {
            // === PHASE 3: LOWER ===
            const lowerDamp = damp * 5;
            
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, lowerDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, lowerDamp);
            parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, lowerDamp);
            
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, lowerDamp);
            parts.rightForeArm.rotation.z = lerp(parts.rightForeArm.rotation.z, 0, lowerDamp);
            parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, lowerDamp);
            
            parts.head.rotation.y = lerp(parts.head.rotation.y, 0, lowerDamp);
            parts.head.rotation.z = lerp(parts.head.rotation.z, 0, lowerDamp);
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, lowerDamp);
        }
        
        // Reset feet to ensure grounded look during wave
        playerModelResetFeet(parts, damp);
    }
}
