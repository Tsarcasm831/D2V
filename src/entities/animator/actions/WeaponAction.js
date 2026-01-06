import * as THREE from 'three';

export class WeaponAction {
    static animate(player, parts, dt, damp) {
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
            if (p < 0.35) {
                // Wind up
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -1.2, actionDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 1.5, actionDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -2.2, actionDamp); 
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 2.2, actionDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.0, actionDamp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, actionDamp);
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0.6, actionDamp);
            } else if (p < 0.8) {
                // Swing
                const swingDamp = actionDamp * 2.5; 
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 1.0, swingDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.5, swingDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, swingDamp); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, swingDamp * 1.5);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -1.0, swingDamp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, swingDamp);
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, -0.5, swingDamp);
            } else {
                // Follow through / Reset
                const recoveryDamp = actionDamp * 0.5;
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, recoveryDamp);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, recoveryDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.2, recoveryDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, recoveryDamp);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, recoveryDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.4, recoveryDamp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, recoveryDamp);
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0, recoveryDamp);

                if (p >= 1.0) {
                    player.isAxeSwing = false;
                    player.axeSwingTimer = 0;
                }
            }
        } else {
            if (p < 0.45) {
                // Wind up
                const wd = actionDamp * 0.8; 
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.5, wd); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, wd); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.1, wd); 
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, wd);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.2, wd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.2, wd); 
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.3, wd); 
            } else if (p < 0.7) {
                // Swing
                const sd = actionDamp * 1.5; 
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, sd); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, sd); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, sd); 
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, sd);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.4, sd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.5, sd); 
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.2, sd);
            } else {
                // Recovery
                const rd = actionDamp * 0.5;
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, rd);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, rd);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, rd);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, rd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, rd);
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, rd);

                if (p >= 1.0) {
                    player.isAxeSwing = false;
                    player.axeSwingTimer = 0;
                }
            }
        }
    }
}
