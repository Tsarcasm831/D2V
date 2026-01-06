import * as THREE from 'three';
import { PlayerInput } from '../types';
import { LocomotionAnimator } from './animator/LocomotionAnimator';
import { ActionAnimator } from './animator/ActionAnimator';
import { StatusAnimator } from './animator/StatusAnimator';

export class PlayerAnimator {
    private locomotion = new LocomotionAnimator();
    private action = new ActionAnimator();
    private status = new StatusAnimator();

    animate(player: any, dt: number, isMoving: boolean, input: PlayerInput) {
        const parts = player.model.parts;
        const damp = 10 * dt;

        // 0. Facial Animation (Always runs)
        this.animateFace(player, dt);

        // 1. Full Body Overrides (Ragdoll, Death, Climb, Pickup)
        // These states completely take over the character body
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
        // Check if we have an active action that should override the right arm / upper body
        const isRightArmAction = player.isPunch || player.isAxeSwing || player.isInteracting;

        // 3. Locomotion Layer (Base)
        // Runs for hips, legs, and left arm (unless two-handed). Skips right arm if action is active.
        if (player.isJumping) {
            this.locomotion.animateJump(player, parts, dt, damp, input, isRightArmAction);
        } else if (isMoving) {
            this.locomotion.animateMovement(player, parts, dt, damp, input, isRightArmAction);
        } else {
            this.locomotion.animateIdle(player, parts, damp, isRightArmAction);
        }

        // 4. Action Layer (Overlay)
        // Applies specific arm/torso animations on top of locomotion
        if (player.isAxeSwing) {
            this.action.animateAxeSwing(player, parts, dt, damp);
        } else if (player.isPunch) {
            this.action.animatePunch(player, parts, dt, damp);
        } else if (player.isInteracting) {
            this.action.animateInteract(player, parts, dt, damp);
        }
    }

    private animateFace(player: any, dt: number) {
        // Blinking Logic
        player.blinkTimer += dt;
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

        // Apply Eyelid Rotations
        // 0 = Fully Open (Rotated back)
        // 1 = Fully Closed (Rotated to center)
        const lerp = THREE.MathUtils.lerp;
        
        let blinkAlpha = 0;
        if (player.isBlinking) {
            // Sine wave for smooth close/open
            // timeInBlink goes 0 -> 0.15. Map to 0 -> PI
            const timeInBlink = player.blinkTimer - blinkInterval;
            const progress = timeInBlink / blinkDur;
            blinkAlpha = Math.sin(progress * Math.PI); 
        }

        // Default "Open" angles
        const openTop = -0.8;
        const openBot = 0.8;
        
        // "Closed" angles (Meeting in middle)
        const closedTop = -0.1;
        const closedBot = 0.1;

        // Note: eyelids array is [L_Top, L_Bot, R_Top, R_Bot]
        const lids = player.model.parts.eyelids || player.model['eyelids']; // fallback if accessing via model direct property

        // Direct access via the array we built in PlayerModel constructor is safer if parts isn't fully typed
        const eyelids = player.model['eyelids'] as THREE.Group[]; 

        if (eyelids && eyelids.length === 4) {
            // Left Eye
            eyelids[0].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[1].rotation.x = lerp(openBot, closedBot, blinkAlpha);
            
            // Right Eye
            eyelids[2].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[3].rotation.x = lerp(openBot, closedBot, blinkAlpha);
        }
    }
}