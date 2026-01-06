import * as THREE from 'three';
import type { Player } from '../Player';
import { PlayerInput } from '../../types';

export class PlayerInteraction {

    static update(player: Player, dt: number, input: PlayerInput, obstacles: THREE.Object3D[]) {
        // Ledge Climbing
        if (player.isLedgeGrabbing) {
            this.updateClimb(player, dt);
            // Return early if climbing to prevent other actions
            return; 
        }

        // Picking Up
        if (player.isPickingUp) {
            player.pickUpTime += dt;
            if (player.pickUpTime > 1.2) { 
                player.isPickingUp = false; 
                player.pickUpTime = 0; 
            }
        }

        // Interaction
        if (input.interact && !player.isInteracting) {
            player.isInteracting = true;
            player.interactTimer = 0;
        }

        if (player.isInteracting) {
            player.interactTimer += dt;
            if (player.interactTimer > 0.4) {
                player.isInteracting = false;
                player.interactTimer = 0;
            }
        }

        // Skinning Check & Logic
        const hasKnife = player.config.selectedItem === 'Knife';
        const nearSkinnable = this.checkSkinnablesNearby(player, obstacles);
        player.canSkin = nearSkinnable && hasKnife;

        if (input.isPickingUp) {
            if (player.canSkin && !player.isSkinning && !player.isPickingUp) {
                player.isSkinning = true;
                player.skinningTimer = 0;
            } else if (!player.isSkinning && !player.isPickingUp) {
                player.isPickingUp = true;
            }
        }

        if (player.isSkinning) {
            // Cancel if moving
            if (input.x !== 0 || input.y !== 0 || input.jump) {
                player.isSkinning = false;
                player.skinningTimer = 0;
                player.skinningProgress = 0;
            } else {
                player.skinningTimer += dt;
                player.skinningProgress = Math.min(player.skinningTimer / player.maxSkinningTime, 1.0);
                
                if (player.skinningTimer >= player.maxSkinningTime) {
                    player.isSkinning = false;
                    player.skinningTimer = 0;
                    // Trigger completion event (e.g. add item) here if needed
                    player.addItem('Fur'); 
                }
            }
        } else {
            player.skinningProgress = 0;
        }
    }

    private static updateClimb(player: Player, dt: number) {
        player.ledgeGrabTime += dt;
        const climbDuration = 0.8;
        const progress = Math.min(player.ledgeGrabTime / climbDuration, 1.0);
        
        if (progress > 0.3) {
            const climbFactor = (progress - 0.3) / 0.7;
            player.mesh.position.lerpVectors(player.ledgeStartPos, player.ledgeTargetPos, climbFactor);
        }

        if (progress >= 1.0) {
            player.mesh.position.copy(player.ledgeTargetPos);
            player.isLedgeGrabbing = false;
            player.ledgeGrabTime = 0;
            player.isJumping = false;
            player.jumpVelocity = 0;
        }
    }

    private static checkSkinnablesNearby(player: Player, obstacles: THREE.Object3D[]): boolean {
        const skinnables = obstacles.filter(o => o.userData.isSkinnable);
        for (const sk of skinnables) {
            const skPos = new THREE.Vector3();
            sk.getWorldPosition(skPos);
            const dist = player.mesh.position.distanceTo(skPos);
            if (dist < 1.5) { 
                return true;
            }
        }
        return false;
    }
}