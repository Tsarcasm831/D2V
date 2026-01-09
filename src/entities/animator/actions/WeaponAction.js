import * as THREE from 'three';

export class WeaponAction {
    static animate(player, parts, dt, damp, isMoving) {
        const item = player.config ? player.config.selectedItem : null;
        const isSword = item === 'Sword';
        const isKnife = item === 'Knife';
        const isAxe = item === 'Axe';
        const isPick = item === 'Pickaxe';
        const isPole = item === 'Fishing Pole';
        
        let duration = 0.9;
        if (isSword) duration = 0.6;
        if (isKnife) duration = 0.4;

        const p = player.axeSwingTimer / duration;
        const lerp = THREE.MathUtils.lerp;
        
        const actionDamp = 20 * dt; 

        // Offset to align torso forward if hips are twisted in combat stance idle
        const torsoOffset = (player.isCombatStance && !isMoving && !player.isJumping) ? 0.7 : 0;

        if (isSword || isKnife) {
            // SWORD SLASH: FOREHAND (Right -> Left)
            
            if (p < 0.35) {
                // PHASE 1: WINDUP (Rotate Right)
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -1.2 + torsoOffset, actionDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 1.5, actionDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -2.2, actionDamp); 
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 2.2, actionDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.0, actionDamp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, actionDamp);
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0.6, actionDamp);

            } else if (p < 0.8) {
                // PHASE 2: SLASH (Swing Across to Left)
                const swingDamp = actionDamp * 2.5; 
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 1.0 + torsoOffset, swingDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.5, swingDamp); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.5, swingDamp); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, swingDamp * 1.5);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, -1.0, swingDamp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, swingDamp);
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, -0.5, swingDamp);

            } else {
                // PHASE 3: RECOVERY
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0 + torsoOffset, actionDamp);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, actionDamp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.2, actionDamp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, actionDamp);
                parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0, actionDamp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.4, actionDamp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, actionDamp);
                parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0, actionDamp);
            }
        } else {
            // AXE/PICKAXE/POLE (Overhead Vertical)
            if (p < 0.45) {
                // PHASE 1: WINDUP
                const wd = actionDamp * 0.8; 
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.5, wd); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, wd); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.1, wd); 
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, wd);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.2 + torsoOffset, wd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.2, wd); 
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.3, wd); 

            } else if (p < 0.7) {
                // PHASE 2: STRIKE
                const sd = actionDamp * 1.5; 
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, sd); 
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, sd); 
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, sd); 
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, sd);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.4 + torsoOffset, sd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.5, sd); 
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.2, sd);

            } else {
                // PHASE 3: RECOVERY
                const rd = actionDamp * 0.5;
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, rd);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, rd);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, rd);
                parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0 + torsoOffset, rd);
                parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, rd);
                parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, rd);
            }
        }

        if (p >= 1.0) {
            player.isAxeSwing = false;
            player.axeSwingTimer = 0;
            player.isHeavyAttack = false;
        }
    }
}
