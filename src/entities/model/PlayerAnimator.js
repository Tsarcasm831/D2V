import * as THREE from 'three';
import { LocomotionAnimator } from '../animator/LocomotionAnimator.js';
import { ActionAnimator } from '../animator/ActionAnimator.js';
import { StatusAnimator } from '../animator/StatusAnimator.js';

export class PlayerAnimator {
    constructor() {
        this.locomotion = new LocomotionAnimator();
        this.action = new ActionAnimator();
        this.status = new StatusAnimator();
    }

    animate(player, dt, isMoving, input) {
        const parts = player.model.parts;
        const damp = 10 * dt;

        // 0. Facial Animation
        this.animateFace(player, dt);

        // 1. Full Body Overrides
        if (player.isDragged || player.recoverTimer > 0) {
            this.status.animateRagdoll(player, parts, dt);
            return;
        } 
        if (player.isDead) {
            this.status.animateDeath(player, parts, dt, damp);
            return;
        } 
        if (player.isLedgeGrabbing) {
            this.action.animateClimb(player, parts, dt, damp);
            return;
        }
        if (player.isPickingUp) {
            this.action.animatePickup(player, parts, dt, damp);
            return;
        }
        if (player.isSkinning) {
            this.action.animateSkinning(player, parts, dt, damp);
            return;
        }

        // 2. Determine Action Layer State
        const isRightArmAction = player.isPunch || player.isAxeSwing || player.isInteracting;

        // 3. Locomotion Layer
        if (player.isJumping) {
            this.locomotion.animateJump(player, parts, dt, damp, input, isRightArmAction);
        } else if (isMoving) {
            this.locomotion.animateMovement(player, parts, dt, damp, input, isRightArmAction);
        } else {
            this.locomotion.animateIdle(player, parts, damp, isRightArmAction);
        }

        // 4. Action Layer
        if (player.isAxeSwing) {
            this.action.animateAxeSwing(player, parts, dt, damp);
        } else if (player.isPunch) {
            this.action.animatePunch(player, parts, dt, damp);
        } else if (player.isInteracting) {
            this.action.animateInteract(player, parts, dt, damp);
        }
    }

    animateFace(player, dt) {
        player.blinkTimer = (player.blinkTimer || 0) + dt;
        const blinkInterval = 6.0;
        const blinkDur = 0.15;

        if (player.blinkTimer > blinkInterval) {
            player.isBlinking = true;
        }

        if (player.isBlinking) {
            const timeInBlink = player.blinkTimer - blinkInterval;
            if (timeInBlink > blinkDur) {
                player.isBlinking = false;
                player.blinkTimer = 0;
            }
        }

        const lerp = THREE.MathUtils.lerp;
        let blinkAlpha = 0;
        if (player.isBlinking) {
            const timeInBlink = player.blinkTimer - blinkInterval;
            const progress = timeInBlink / blinkDur;
            blinkAlpha = Math.sin(progress * Math.PI); 
        }

        const openTop = -0.8;
        const openBot = 0.8;
        const closedTop = -0.1;
        const closedBot = 0.1;

        const eyelids = player.model.eyelids; 

        if (eyelids && eyelids.length === 4) {
            eyelids[0].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[1].rotation.x = lerp(openBot, closedBot, blinkAlpha);
            eyelids[2].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[3].rotation.x = lerp(openBot, closedBot, blinkAlpha);
        }
    }
}
