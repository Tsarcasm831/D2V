
import * as THREE from 'three';
import { playerModelResetFeet, animateBreathing, applyFootRot } from '../AnimationUtils';

export class IdleAction {
    static animate(player: any, parts: any, damp: number, skipRightArm: boolean = false) {
        const t = Date.now() * 0.002;
        const isMale = player.config.bodyType === 'male';
        
        // Breathing Effect
        animateBreathing(player, parts, t, 1.0);

        if (player.isCombatStance) {
            this.animateCombatStance(player, parts, damp, t, skipRightArm);
            return;
        }

        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;
        
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.set(0, 0, 0);
        
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight, damp);
        
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, damp);
        parts.torsoContainer.rotation.z = lerp(parts.torsoContainer.rotation.z, 0, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, Math.sin(t) * 0.02, damp);

        parts.neck.rotation.x = -Math.sin(t) * 0.02;
        parts.head.rotation.x = 0.1 + Math.sin(t - 1) * 0.02;
        
        // Leg Splay
        // Male: Slightly wider idle stance (0.15)
        // Female: Standard (0.12)
        const spread = isMale ? 0.15 : 0.12;
        parts.leftThigh.rotation.set(0, 0, spread);
        parts.rightThigh.rotation.set(0, 0, -spread);
        
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, damp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, damp);
        
        // Feet Compensation: Rotate Z opposite to thigh spread to stay flat
        applyFootRot(parts.leftShin, 0, -spread);
        applyFootRot(parts.rightShin, 0, spread);
        
        this.animateArmsIdle(player, parts, damp, t, skipRightArm);
    }

    private static animateCombatStance(player: any, parts: any, damp: number, t: number, skipRightArm: boolean) {
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;
        
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.12, damp);
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, -0.05, damp);
        
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, -0.7, damp);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.1, damp); 
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);
        
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.7, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.05, damp);
        parts.torsoContainer.rotation.z = lerp(parts.torsoContainer.rotation.z, 0, damp);

        parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0.2, damp);
        parts.head.rotation.y = lerp(parts.head.rotation.y, 0, damp);

        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.7, damp);
        const lThighZ = 0.2;
        parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, lThighZ, damp); 
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.8, damp);
        
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.35, damp);
        const rThighZ = -0.2;
        parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, rThighZ, damp); 
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.15, damp); 

        // Compensate feet tilt for combat stance spread
        applyFootRot(parts.leftShin, -0.6, -lThighZ); 
        applyFootRot(parts.rightShin, -0.15, -rThighZ); 

        const breathing = Math.sin(t * 3) * 0.05; 
        
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.9 + breathing, damp);
        parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, -0.4, damp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, damp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.8, damp); 
        parts.leftHand.rotation.z = lerp(parts.leftHand.rotation.z, -0.2, damp);

        if (!skipRightArm) {
             parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.2 + breathing, damp);
             parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.4, damp);
             parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, damp);
             parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.1, damp); 
        }
    }

    private static animateArmsIdle(player: any, parts: any, damp: number, t: number, skipRightArm: boolean) {
        const lerp = THREE.MathUtils.lerp;
        const isHolding = !!player.config.selectedItem;
        const stance = player.config.weaponStance;

        parts.leftArm.rotation.set(Math.sin(t)*0.03, 0, 0.15);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.15, damp);
        parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI / 2, damp);
        parts.leftHand.rotation.z = lerp(parts.leftHand.rotation.z, 0, damp);

        if (skipRightArm) return;

        if (isHolding) {
             if (stance === 'shoulder') {
                parts.rightArm.rotation.set(-0.5 + Math.sin(t)*0.03, 0, -0.1);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.2, damp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
            } else {
                parts.rightArm.rotation.set(0.2, 0, -0.2);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.3, damp);
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -1.2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, -0.3, damp);
            }
        } else {
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
            parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
            parts.rightArm.rotation.set(Math.sin(t + 1)*0.03, 0, -0.15);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.15, damp);
        }
    }
}
