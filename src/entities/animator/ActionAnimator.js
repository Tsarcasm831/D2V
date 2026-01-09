import * as THREE from 'three';
import { ClimbAction } from './actions/ClimbAction.js';
import { PickupAction } from './actions/PickupAction.js';
import { WeaponAction } from './actions/WeaponAction.js';
import { PunchAction } from './actions/PunchAction.js';
import { InteractAction } from './actions/InteractAction.js';
import { SkinningAction } from './actions/SkinningAction.js';
import { DodgeAction } from './actions/DodgeAction.js';

export class ActionAnimator {
    animateClimb(player, parts, dt, damp) {
        ClimbAction.animate(player, parts, dt, damp);
    }

    animatePickup(player, parts, dt, damp) {
        PickupAction.animate(player, parts, dt, damp);
    }

    animateSkinning(player, parts, dt, damp) {
        SkinningAction.animate(player, parts, dt, damp);
    }

    animateDodge(player, parts, dt, damp) {
        DodgeAction.animate(player, parts, dt, damp);
    }

    animateCrouch(player, parts, dt, damp) {
        const lerp = THREE.MathUtils.lerp;
        const crouchDamp = 10 * dt;
        
        // Lower the hips
        const legScale = (player.config && player.config.legScale) ? player.config.legScale : 1.0;
        const crouchHeight = 0.5 * legScale;
        parts.hips.position.y = lerp(parts.hips.position.y, crouchHeight, crouchDamp);
        
        // Bend knees
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -1.0, crouchDamp);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 1.2, crouchDamp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.0, crouchDamp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 1.2, crouchDamp);
        
        // Lean torso forward
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.4, crouchDamp);
        parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.2, crouchDamp);
    }

    animate(player, dt, parts, damp, input) {
        if (!player) {
            console.error("ActionAnimator: player is null");
            return;
        }
        
        const isMoving = input ? (input.x !== 0 || input.y !== 0) : false;
        
        if (player.isDodging) {
            this.animateDodge(player, parts, dt, damp);
        } else if (player.isHeavyAttackCharging) {
            this.animateHeavyAttackCharge(player, parts, dt, damp);
        } else if (player.isBlocking) {
            this.animateBlock(player, parts, dt, damp);
        } else if (player.isPunch) {
            PunchAction.animate(player, parts, dt, damp, isMoving);
        } else if (player.isAxeSwing) {
            WeaponAction.animate(player, parts, dt, damp, isMoving);
        }
    }

    animateBlock(player, parts, dt, damp) {
        const lerp = THREE.MathUtils.lerp;
        const blockDamp = 15 * dt;
        
        // Raise left arm for shield block
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.2, blockDamp);
        parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0.8, blockDamp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.4, blockDamp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.5, blockDamp);
        
        // Slight torso twist
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.3, blockDamp);
    }

    animateHeavyAttackCharge(player, parts, dt, damp) {
        const lerp = THREE.MathUtils.lerp;
        const chargeDamp = 10 * dt;
        const intensity = Math.min(1.0, player.heavyAttackTimer / 1.0);
        
        // Wind back right arm further
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.5, chargeDamp);
        parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 1.2, chargeDamp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -1.5, chargeDamp);
        parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.8, chargeDamp);
        
        // Twist torso
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.8 * intensity, chargeDamp);
        
        // Visual shake based on charge level
        if (intensity > 0.8) {
            const shake = (Math.random() - 0.5) * 0.02;
            parts.rightArm.position.x += shake;
            parts.rightArm.position.y += shake;
        }
    }

    animateInteract(player, parts, dt, damp) {
        InteractAction.animate(player, parts, dt, damp);
    }
}
