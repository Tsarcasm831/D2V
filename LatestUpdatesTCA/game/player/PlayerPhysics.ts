
import * as THREE from 'three';
import type { Player } from '../Player';
import { PlayerInput } from '../../types';
import { PlayerUtils } from './PlayerUtils';

export class PlayerPhysics {
    
    static applyForwardImpulse(player: Player, dt: number, strength: number, obstacles: THREE.Object3D[]) {
        const worldDir = new THREE.Vector3();
        player.mesh.getWorldDirection(worldDir);
        const dist = strength * dt;
        const nextPos = player.mesh.position.clone();
        nextPos.x += worldDir.x * dist;
        nextPos.z += worldDir.z * dist;
        
        if (!PlayerUtils.checkCollision(nextPos, player.config, obstacles)) {
            player.mesh.position.copy(nextPos);
        }
    }

    static update(player: Player, dt: number, input: PlayerInput, cameraAngle: number, obstacles: THREE.Object3D[]) {
        // 1. Handle Ground & Gravity
        let groundHeight = PlayerUtils.getGroundHeight(player.mesh.position, player.config, obstacles);
        
        // Lift character slightly if wearing shoes to accommodate sole thickness
        if (player.config.equipment.shoes) {
            groundHeight += 0.015;
        }

        if (player.isJumping) {
            player.jumpVelocity += player.gravity * dt;
            player.mesh.position.y += player.jumpVelocity * dt;
            
            // Ledge Detection
            if (player.jumpVelocity > -8) {
                this.checkLedgeGrab(player, obstacles);
            }

            if (player.mesh.position.y <= groundHeight) {
                player.mesh.position.y = groundHeight;
                player.isJumping = false;
                player.jumpVelocity = 0;
            }
            player.jumpTimer += dt;

        } else {
            // Gravity if falling
            if (player.mesh.position.y > groundHeight) {
                player.jumpVelocity += player.gravity * dt;
                player.mesh.position.y += player.jumpVelocity * dt;
                if (player.mesh.position.y < groundHeight) {
                    player.mesh.position.y = groundHeight;
                    player.jumpVelocity = 0;
                }
            } else if (input.jump && !player.isPickingUp && !player.isSkinning && !player.status.isDead) {
                // Initiate Jump
                player.isJumping = true;
                player.jumpVelocity = player.jumpPower;
                player.jumpTimer = 0;
            } else {
                player.mesh.position.y = groundHeight;
            }
        }

        // 2. Handle Movement (if not dead/climbing)
        if (player.status.isDead || player.isLedgeGrabbing) return;

        const isMoving = input.x !== 0 || input.y !== 0;
        
        const baseSpeed = input.isRunning ? player.moveSpeed * 1.8 : player.moveSpeed;
        let speedModifier = 1.0;
        
        const playerBox = PlayerUtils.getHitboxBounds(player.mesh.position, player.config);
        for (const obs of obstacles) {
            if (obs.userData.type === 'soft') {
                const obsBox = new THREE.Box3().setFromObject(obs);
                if (obsBox.intersectsBox(playerBox)) {
                    speedModifier = 0.4;
                    break;
                }
            }
        }
        
        const finalSpeed = baseSpeed * speedModifier;

        if (isMoving && !player.isPickingUp && !player.isSkinning) {
            const targetRotation = cameraAngle + Math.PI;
            let rotDiff = targetRotation - player.mesh.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            player.mesh.rotation.y += rotDiff * player.turnSpeed * dt;

            const inputLen = Math.sqrt(input.x * input.x + input.y * input.y);
            const normX = input.x / inputLen;
            const normY = -input.y / inputLen;

            const fX = Math.sin(targetRotation); const fZ = Math.cos(targetRotation);
            const rX = Math.sin(targetRotation - Math.PI / 2); const rZ = Math.cos(targetRotation - Math.PI / 2);

            const dx = (fX * normY + rX * normX) * finalSpeed * dt;
            const dz = (fZ * normY + rZ * normX) * finalSpeed * dt;

            const nextPos = player.mesh.position.clone();
            nextPos.x += dx;
            nextPos.z += dz;

            if (!PlayerUtils.checkCollision(nextPos, player.config, obstacles)) {
                player.mesh.position.copy(nextPos);
            }
        }
    }

    private static checkLedgeGrab(player: Player, obstacles: THREE.Object3D[]) {
        const worldDir = new THREE.Vector3();
        player.mesh.getWorldDirection(worldDir); 
        const forward = worldDir.normalize(); 
        
        const bounds = PlayerUtils.getHitboxBounds(player.mesh.position, player.config);
        const boundsHeight = bounds.max.y - bounds.min.y;
        const rayY = bounds.min.y + boundsHeight * 0.85; 

        const rayOrigin = player.mesh.position.clone();
        rayOrigin.y = rayY;

        const raycaster = new THREE.Raycaster(rayOrigin, forward, 0, 0.8);
        const intersects = raycaster.intersectObjects(obstacles);
        
        const hit = intersects.find(i => i.object.userData.type !== 'soft');
        
        if (hit) {
            const block = hit.object;
            const blockBox = new THREE.Box3().setFromObject(block);
            const ledgeTopY = blockBox.max.y;

            if (Math.abs(rayOrigin.y - ledgeTopY) < 0.5) {
                player.isLedgeGrabbing = true;
                player.isJumping = false;
                player.ledgeGrabTime = 0;
                player.ledgeStartPos.copy(player.mesh.position);
                player.ledgeTargetPos.set(
                    player.mesh.position.x + forward.x * 0.7, 
                    ledgeTopY, 
                    player.mesh.position.z + forward.z * 0.7
                );
                const hangOffset = boundsHeight + 0.05;
                player.mesh.position.y = ledgeTopY - hangOffset;
                player.ledgeStartPos.y = player.mesh.position.y;
            }
        }
    }
}
