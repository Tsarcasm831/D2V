
import * as THREE from 'three';
import { PlayerInput } from '../types';
import { LocomotionAnimator } from './animator/LocomotionAnimator';
import { ActionAnimator } from './animator/ActionAnimator';
import { StatusAnimator } from './animator/StatusAnimator';
import { FishingAction } from './animator/actions/FishingAction';

export class PlayerAnimator {
    private locomotion = new LocomotionAnimator();
    private action = new ActionAnimator();
    private status = new StatusAnimator();
    private _tempObj = new THREE.Object3D();

    animate(player: any, dt: number, isMoving: boolean, input: PlayerInput, obstacles?: THREE.Object3D[]) {
        const parts = player.model.parts;
        const damp = 10 * dt;

        // 1. Full Body Overrides
        if (player.isDragged || player.status.recoverTimer > 0) {
            this.status.animateRagdoll(player, parts, dt);
            this.animateFace(player, dt); // Face still runs in ragdoll
            return;
        } 
        if (player.status.isDead) {
            this.status.animateDeath(player, parts, dt, damp);
            return;
        } 
        if (player.isLedgeGrabbing) {
            this.action.animateClimb(player, parts, dt, damp);
            this.animateFace(player, dt);
            return;
        }
        
        // Actions that override movement
        if (player.isPickingUp) {
            this.action.animatePickup(player, parts, dt, damp);
        } else if (player.isSkinning) {
            this.action.animateSkinning(player, parts, dt, damp);
        } else if (player.isFishing) {
            this.action.animateFishing(player, parts, dt, damp, obstacles);
        } else if (player.isWaving) {
            this.action.animateWave(player, parts, dt, damp);
        } else {
            // Check if we need to reset fishing bobber (if holding pole but not fishing)
            if (player.config.selectedItem === 'Fishing Pole') {
                FishingAction.reset(player, dt);
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
                this.action.animateAxeSwing(player, parts, dt, damp, isMoving);
            } else if (player.isPunch) {
                this.action.animatePunch(player, parts, dt, damp, isMoving);
            } else if (player.isInteracting) {
                this.action.animateInteract(player, parts, dt, damp);
            }
        }
        
        // 0. Facial Animation & Look At Camera
        this.animateFace(player, dt);
    }

    private animateFace(player: any, dt: number) {
        const cam = player.cameraHandler;
        const lerp = THREE.MathUtils.lerp;
        
        // === BLINKING ===
        cam.blinkTimer += dt;
        const blinkInterval = 6.0;
        const blinkDur = 0.15;

        if (cam.blinkTimer > blinkInterval) cam.isBlinking = true;

        if (cam.isBlinking) {
            if (cam.blinkTimer - blinkInterval > blinkDur) {
                cam.isBlinking = false;
                cam.blinkTimer = 0;
            }
        }

        let blinkAlpha = 0;
        if (cam.isBlinking) {
            const timeInBlink = cam.blinkTimer - blinkInterval;
            blinkAlpha = Math.sin((timeInBlink / blinkDur) * Math.PI); 
        }

        // Force closed if dragged or unconscious
        if (player.isDragged || player.status.recoverTimer > 0.5) {
            blinkAlpha = 1.0;
        }

        const openTop = -0.7;
        const openBot = 0.61; 
        const closedTop = -0.1;
        const closedBot = 0.1;

        const eyelids = player.model.eyelids as THREE.Group[]; 
        if (eyelids && eyelids.length === 4) {
            eyelids[0].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[1].rotation.x = lerp(openBot, closedBot, blinkAlpha);
            eyelids[2].rotation.x = lerp(openTop, closedTop, blinkAlpha);
            eyelids[3].rotation.x = lerp(openBot, closedBot, blinkAlpha);
        }

        // === GAZE & HEAD TRACKING ===
        // Skip gaze logic if unconscious
        if (player.isDragged || player.status.recoverTimer > 0.5) {
            const eyes = player.model.eyes as THREE.Mesh[];
            if (eyes && eyes.length === 2) {
                eyes[0].rotation.set(0,0,0);
                eyes[1].rotation.set(0,0,0);
            }
            return;
        }
        
        // 1. Update Standard Random Gaze
        const gazeDamp = dt * 8;
        cam.eyeMoveTimer -= dt;
        if (cam.eyeMoveTimer <= 0) {
            cam.eyeMoveTimer = 0.5 + Math.random() * 3.5; 
            if (Math.random() < 0.4) {
                cam.eyeLookTarget.set(0, 0); 
            } else {
                const rYaw = (Math.random() - 0.5) * 1.2; 
                const rPitch = (Math.random() - 0.5) * 0.6;
                cam.eyeLookTarget.set(rYaw, rPitch);
            }
        }
        cam.eyeLookCurrent.x = lerp(cam.eyeLookCurrent.x, cam.eyeLookTarget.x, gazeDamp);
        cam.eyeLookCurrent.y = lerp(cam.eyeLookCurrent.y, cam.eyeLookTarget.y, gazeDamp);
        
        // 2. Blending Logic
        const weight = cam.headLookWeight;
        
        let finalEyeYaw = cam.eyeLookCurrent.x;
        let finalEyePitch = cam.eyeLookCurrent.y;
        
        const head = player.model.parts.head;
        const neck = player.model.parts.neck;
        const mouth = player.model.parts.mouth;

        // Apply Blending if active
        if (weight > 0 && head && neck) {
            this._tempObj.position.copy(cam.cameraWorldPosition);
            neck.worldToLocal(this._tempObj.position);
            const localCam = this._tempObj.position;
            
            const camYaw = Math.atan2(localCam.x, localCam.z);
            const camPitch = -Math.atan2(localCam.y, Math.sqrt(localCam.x*localCam.x + localCam.z*localCam.z));
            
            const limitYaw = 1.0; 
            const limitPitch = 0.6;
            const clampedYaw = THREE.MathUtils.clamp(camYaw, -limitYaw, limitYaw);
            const clampedPitch = THREE.MathUtils.clamp(camPitch, -limitPitch, limitPitch);
            
            // Blend Head Rotation
            head.rotation.y = lerp(head.rotation.y, clampedYaw, weight);
            head.rotation.x = lerp(head.rotation.x, clampedPitch, weight);
            
            // Blend Mouth (Smile)
            if (mouth) {
                const currentScaleX = mouth.scale.x;
                const currentScaleY = mouth.scale.y;
                const currentRotX = mouth.rotation.x;

                mouth.scale.x = lerp(currentScaleX, 1.2, weight);
                mouth.scale.y = lerp(currentScaleY, 0.8, weight);
                mouth.rotation.x = lerp(currentRotX, -0.2, weight);
            }
            
            // Blend Eyes (Random Gaze -> Centered on Camera)
            finalEyeYaw = lerp(finalEyeYaw, 0, weight);
            finalEyePitch = lerp(finalEyePitch, 0, weight);
        }

        const eyes = player.model.eyes as THREE.Mesh[];
        if (eyes && eyes.length === 2) {
             eyes[0].rotation.x = finalEyePitch;
             eyes[0].rotation.y = finalEyeYaw;
             eyes[1].rotation.x = finalEyePitch;
             eyes[1].rotation.y = finalEyeYaw;
        }
    }
}
