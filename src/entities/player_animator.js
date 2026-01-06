import * as THREE from 'three';
import { PlayerAnimator as ModularAnimator } from './model/PlayerAnimator.js';

export class PlayerAnimator {
    constructor(parts) {
        this.modularAnimator = new ModularAnimator();
        this.parts = parts;
        this.isPickingUp = false;
        this.pickUpTime = 0;
        this.isInteracting = false;
        this.interactTimer = 0;
        this.isAxeSwing = false;
        this.axeSwingTimer = 0;
        this.isPunch = false;
        this.punchTimer = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.walkTime = 0;
        this._isHolding = false;
    }

    setHolding(isHolding) {
        this._isHolding = isHolding;
    }

    playPickup() { 
        this.isPickingUp = true;
        this.pickUpTime = 0;
    }

    playInteract() { 
        this.isInteracting = true;
        this.interactTimer = 0;
    }

    playAxeSwing() {
        this.isAxeSwing = true;
        this.axeSwingTimer = 0;
    }

    playPunch() {
        this.isPunch = true;
        this.punchTimer = 0;
    }

    animate(delta, isMoving, isRunning, isPickingUp, isDead, isJumping, jumpPhase, jumpTimer, jumpVelocity, isLedgeGrabbing, ledgeGrabTime, recoverTimer, isDragged, draggedPartName, dragVelocity, deathTime, deathVariation, isMovingBackwards, strafe = 0, forward = 0) {
        // Map the existing animate call to the new modular animator
        const playerState = {
            model: { parts: this.parts, eyelids: this.parts.eyelids || [] },
            config: { 
                legScale: this.parts.hips?.scale.y || 1.0,
                selectedItem: this._isHolding,
                weaponStance: 'relaxed' // Default
            },
            isPickingUp: this.isPickingUp || isPickingUp,
            pickUpTime: this.pickUpTime || 0,
            isInteracting: this.isInteracting,
            interactTimer: this.interactTimer || 0,
            isAxeSwing: this.isAxeSwing,
            axeSwingTimer: this.axeSwingTimer || 0,
            isPunch: this.isPunch,
            punchTimer: this.punchTimer || 0,
            isDead: isDead,
            deathTime: deathTime,
            deathVariation: deathVariation,
            isJumping: isJumping,
            jumpVelocity: jumpVelocity,
            isLedgeGrabbing: isLedgeGrabbing,
            ledgeGrabTime: ledgeGrabTime,
            recoverTimer: recoverTimer,
            isDragged: isDragged,
            draggedPartName: draggedPartName,
            dragVelocity: dragVelocity,
            blinkTimer: this.blinkTimer || 0,
            isBlinking: this.isBlinking || false,
            walkTime: this.walkTime || 0
        };

        const input = {
            isRunning: isRunning,
            x: strafe,
            y: -forward // Animation system expects -y for forward
        };

        this.modularAnimator.animate(playerState, delta, isMoving, input);
        
        // Sync back persistent timers
        this.isPickingUp = playerState.isPickingUp;
        this.pickUpTime = playerState.pickUpTime;
        this.isInteracting = playerState.isInteracting;
        this.interactTimer = playerState.interactTimer;
        this.isAxeSwing = playerState.isAxeSwing;
        this.axeSwingTimer = playerState.axeSwingTimer;
        this.isPunch = playerState.isPunch;
        this.punchTimer = playerState.punchTimer;
        this.blinkTimer = playerState.blinkTimer;
        this.isBlinking = playerState.isBlinking;
        this.walkTime = playerState.walkTime;
    }
}