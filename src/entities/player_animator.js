import * as THREE from 'three';
import { PlayerAnimator as ModularAnimator } from './model/PlayerAnimator.js';

export class PlayerAnimator {
    constructor(parts, model = null) {
        this.modularAnimator = new ModularAnimator();
        this.parts = parts;
        this.model = model;
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
        this.isCombatStance = false;
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
        this.isPunch = false; 
        this.punchTimer = 0;
    }

    playPunch() {
        this.isPunch = true;
        this.punchTimer = 0;
        this.comboChain = 1; // Start combo
        this.isAxeSwing = false; 
        this.axeSwingTimer = 0;
    }

    animate(delta, isMoving, isRunning, isPickingUp, isDead, isJumping, jumpPhase, jumpTimer, jumpVelocity, isLedgeGrabbing, ledgeGrabTime, recoverTimer, isDragged, draggedPartName, dragVelocity, deathTime, deathVariation, isMovingBackwards, strafe = 0, forward = 0) {
        const input = {
            isRunning: isRunning,
            x: strafe,
            y: forward
        };

        const state = this.player || this;
        
        // Ensure ALL properties are synced to the state object for the modular animator
        state.isPunch = this.isPunch;
        state.punchTimer = this.punchTimer;
        state.comboChain = this.comboChain;
        state.isAxeSwing = this.isAxeSwing;
        state.axeSwingTimer = this.axeSwingTimer;
        state.isInteracting = this.isInteracting;
        state.interactTimer = this.interactTimer;
        state.isPickingUp = this.isPickingUp || isPickingUp;
        state.isDead = isDead;
        state.isJumping = isJumping;
        state.jumpVelocity = jumpVelocity;
        state.isLedgeGrabbing = isLedgeGrabbing;
        state.recoverTimer = recoverTimer;
        state.isDragged = isDragged;

        this.modularAnimator.animate(state, delta, isMoving, input);
    }
}
