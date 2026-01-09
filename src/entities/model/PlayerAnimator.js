import * as THREE from 'three';
import { LocomotionAnimator } from '../animator/LocomotionAnimator.js';
import { ActionAnimator } from '../animator/ActionAnimator.js';
import { StatusAnimator } from '../animator/StatusAnimator.js';

export class PlayerAnimator {
    constructor() {
        this.locomotion = new LocomotionAnimator();
        this.action = new ActionAnimator();
        this.status = new StatusAnimator();
        this.isPunch = false;
        this.isAxeSwing = false;
        this.isBlocking = false;
        this.isDodging = false;
        this.isHeavyAttack = false;
        this.heavyAttackTimer = 0;
        this.isCrouching = false;
    }

    animate(player, dt, isMoving, input) {
        if (!player || !player.model || !player.model.parts) return;
        const parts = player.model.parts;
        const damp = 10 * dt;

        const state = player;

        // 0. Facial Animation
        this.animateFace(state, dt);

        // 1. Full Body Overrides
        if (state.isDragged || state.recoverTimer > 0) {
            this.status.animateRagdoll(state, parts, dt);
            return;
        } 
        if (state.isDead) {
            this.status.animateDeath(state, parts, dt, damp);
            return;
        } 
        if (state.isLedgeGrabbing) {
            this.action.animateClimb(state, parts, dt, damp);
            return;
        }
        if (state.isPickingUp) {
            this.action.animatePickup(state, parts, dt, damp);
            return;
        }
        if (state.isSkinning) {
            this.action.animateSkinning(state, parts, dt, damp);
            return;
        }

        // 2. Determine Action Layer State
        const isRightArmAction = !!(state.isPunch || state.isAxeSwing || state.isInteracting);
        
        // 3. Locomotion Layer
        if (state.isDodging) {
            this.action.animateDodge(state, parts, dt, damp);
        } else if (state.isJumping) {
            this.locomotion.animateJump(state, parts, dt, damp, input, isRightArmAction);
        } else if (isMoving) {
            this.locomotion.animateMovement(state, parts, dt, damp, input, isRightArmAction);
        } else {
            this.locomotion.animateIdle(state, parts, damp, isRightArmAction);
        }

        // 4. Action Layer
        if (state.isCrouching) {
            this.action.animateCrouch(state, parts, dt, damp);
        } else if (isRightArmAction) {
            this.action.animate(state, dt, parts, damp, input);
        } else if (state.isInteracting) {
            this.action.animateInteract(state, parts, dt, damp);
        }
    }

    resetActionFlags(player) {
        player.isAxeSwing = false;
        player.axeSwingTimer = 0;
        player.isPunch = false;
        player.punchTimer = 0;
        player.isInteracting = false;
        player.interactTimer = 0;
        player.isBlocking = false;
        player.isDodging = false;
        player.isHeavyAttack = false;
        player.heavyAttackTimer = 0;
    }

    animateFace(player, dt) {
        const lerp = THREE.MathUtils.lerp;
        
        // === BLINKING ===
        player.blinkTimer = (player.blinkTimer || 0) + dt;
        const blinkInterval = 6.0;
        const blinkDur = 0.15;

        if (player.blinkTimer > blinkInterval) player.isBlinking = true;

        if (player.isBlinking) {
            if (player.blinkTimer - blinkInterval > blinkDur) {
                player.isBlinking = false;
                player.blinkTimer = 0;
            }
        }

        let blinkAlpha = 0;
        if (player.isBlinking) {
            const timeInBlink = player.blinkTimer - blinkInterval;
            blinkAlpha = Math.sin((timeInBlink / blinkDur) * Math.PI); 
        }

        // Force closed if dragged or unconscious
        if (player.isDragged || (player.recoverTimer && player.recoverTimer > 0.5)) {
            blinkAlpha = 1.0;
        }

        const openTop = -0.7;
        const openBot = 0.61; 
        const closedTop = -0.1;
        const closedBot = 0.1;

        const eyelids = player.model.eyelids; 
        if (eyelids && eyelids.length === 4) {
            eyelids[0].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[1].rotation.x = lerp(openBot, closedBot, blinkAlpha);
            eyelids[2].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[3].rotation.x = lerp(openBot, closedBot, blinkAlpha);
        }

        // === GAZE & HEAD TRACKING ===
        if (player.isDragged || (player.recoverTimer && player.recoverTimer > 0.5)) {
            const eyes = player.model.eyes;
            if (eyes && eyes.length === 2) {
                eyes[0].rotation.set(0,0,0);
                eyes[1].rotation.set(0,0,0);
            }
            return;
        }
        
        const gazeDamp = dt * 8;
        player.eyeMoveTimer = (player.eyeMoveTimer || 0) - dt;
        if (player.eyeMoveTimer <= 0) {
            player.eyeMoveTimer = 0.5 + Math.random() * 3.5; 
            player.eyeLookTarget = player.eyeLookTarget || new THREE.Vector2();
            if (Math.random() < 0.4) {
                player.eyeLookTarget.set(0, 0); 
            } else {
                const rYaw = (Math.random() - 0.5) * 1.2; 
                const rPitch = (Math.random() - 0.5) * 0.6;
                player.eyeLookTarget.set(rYaw, rPitch);
            }
        }
        player.eyeLookCurrent = player.eyeLookCurrent || new THREE.Vector2();
        player.eyeLookCurrent.x = lerp(player.eyeLookCurrent.x, (player.eyeLookTarget ? player.eyeLookTarget.x : 0), gazeDamp);
        player.eyeLookCurrent.y = lerp(player.eyeLookCurrent.y, (player.eyeLookTarget ? player.eyeLookTarget.y : 0), gazeDamp);
        
        let finalEyeYaw = player.eyeLookCurrent.x;
        let finalEyePitch = player.eyeLookCurrent.y;
        
        const head = player.model.parts.head;
        const neck = player.model.parts.neck;
        const mouth = player.model.parts.mouth;
        const weight = player.headLookWeight || 0;

        if (weight > 0 && head && neck) {
            if (!this._tempObj) this._tempObj = new THREE.Object3D();
            if (player.cameraWorldPosition) {
                this._tempObj.position.copy(player.cameraWorldPosition);
                neck.worldToLocal(this._tempObj.position);
                const localCam = this._tempObj.position;
                
                const camYaw = Math.atan2(localCam.x, localCam.z);
                const camPitch = -Math.atan2(localCam.y, Math.sqrt(localCam.x*localCam.x + localCam.z*localCam.z));
                
                const limitYaw = 1.0; 
                const limitPitch = 0.6;
                const clampedYaw = THREE.MathUtils.clamp(camYaw, -limitYaw, limitYaw);
                const clampedPitch = THREE.MathUtils.clamp(camPitch, -limitPitch, limitPitch);
                
                head.rotation.y = lerp(head.rotation.y, clampedYaw, weight);
                head.rotation.x = lerp(head.rotation.x, clampedPitch, weight);
                
                if (mouth) {
                    mouth.scale.x = lerp(mouth.scale.x, 1.2, weight);
                    mouth.scale.y = lerp(mouth.scale.y, 0.8, weight);
                    mouth.rotation.x = lerp(mouth.rotation.x, -0.2, weight);
                }
                
                finalEyeYaw = lerp(finalEyeYaw, 0, weight);
                finalEyePitch = lerp(finalEyePitch, 0, weight);
            }
        }

        const eyes = player.model.eyes;
        if (eyes && eyes.length === 2) {
             eyes[0].rotation.x = finalEyePitch;
             eyes[0].rotation.y = finalEyeYaw;
             eyes[1].rotation.x = finalEyePitch;
             eyes[1].rotation.y = finalEyeYaw;
        }
    }
}
