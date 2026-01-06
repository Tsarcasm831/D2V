import * as THREE from 'three';

export class WeaponAction {
    static animate(player: any, parts: any, dt: number, damp: number) {
        const item = player.config.selectedItem;
        const isSword = item === 'Sword';
        const isKnife = item === 'Knife';
        
        let duration = 0.9;
        if (isSword) duration = 0.6;
        if (isKnife) duration = 0.4;

        const p = player.axeSwingTimer / duration;
        const lerp = THREE.MathUtils.lerp;
        
        const actionDamp = 20 * dt; 

        if (isSword || isKnife) {
            // SWORD SLASH: FOREHAND (Right -> Left)
            // The goal is to swing "in front" of the player.
            // We ensure maximum arm extension (Z and X) during the swing phase.

            if (p < 0.35) {
                // PHASE 1: WINDUP (Rotate Right)
                
                // Torso Twist Right
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -1.2, actionDamp);
                
                // Arm Back & Out to Side
                // x=0.3 (Back/Downish)
                // z=-1.5 (Out Right)
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.3, actionDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -1.5, actionDamp); 
                
                // Wrist Open (Supinate)
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 1.5, actionDamp);

                // Elbow Bent for power
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.1, actionDamp);
                
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0.6, actionDamp);

            } else if (p < 0.8) {
                // PHASE 2: SLASH (Swing Across to Left)
                const swingDamp = actionDamp * 2.5; // Fast Snap
                
                // Torso Twist Left
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 1.2, swingDamp);
                
                // Arm Swing:
                // x goes to -1.6 (Deep Forward Horizontal) to clear the chest.
                // z goes to 0.8 (Across to the Left)
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.6, swingDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.8, swingDamp); 

                // Forearm: Extend Fully
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, swingDamp);
                
                // Wrist Turnover (Pronate)
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -1.0, swingDamp);

                parts.neck.rotation.y = lerp(parts.neck.rotation.y, -0.6, swingDamp);

            } else {
                // PHASE 3: RECOVERY
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, actionDamp);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, actionDamp);
                
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.2, actionDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, actionDamp);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, actionDamp);
                
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.4, actionDamp);
                
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0, actionDamp);
            }
        } else {
            // AXE/PICKAXE (Overhead Vertical)
            if (p < 0.45) {
                // PHASE 1: WINDUP
                const wd = actionDamp * 0.8; 
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.5, wd); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, wd); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.1, wd); 
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.2, wd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.2, wd); 
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.3, wd); 

            } else if (p < 0.7) {
                // PHASE 2: STRIKE
                const sd = actionDamp * 1.5; 
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, sd); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, sd); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, sd); 
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.4, sd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.5, sd); 
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.2, sd);

            } else {
                // PHASE 3: RECOVERY
                const rd = actionDamp * 0.5;
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, rd);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, rd);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, rd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, rd);
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, rd);
            }
        }
    }
}