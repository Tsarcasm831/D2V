import * as THREE from 'three';
import { PlayerUtils } from './PlayerUtils.js';
import { SCALE_FACTOR } from '../../world/world_bounds.js';

export class PlayerPhysics {
    
    static applyForwardImpulse(player, dt, strength, obstacles) {
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

    dodge() {
        if (this.isDead || this.isLedgeGrabbing || this.dodgeCooldown > 0) return;
        
        const STAMINA_COST = 15;
        if (this.player.stats && this.player.stats.stamina < STAMINA_COST) return;
        
        this.player.stats.stamina -= STAMINA_COST;
        this.isDodging = true;
        this.dodgeTimer = 0.3; // Invincibility frames duration
        this.dodgeCooldown = 0.5; // Cooldown duration
        
        // Apply directional impulse
        const worldDir = new THREE.Vector3();
        if (this.lastMoveDir && (this.lastMoveDir.x !== 0 || this.lastMoveDir.z !== 0)) {
            worldDir.copy(this.lastMoveDir);
        } else {
            this.player.mesh.getWorldDirection(worldDir);
        }
        
        this.dodgeDir = worldDir.normalize();
        
        // Trigger dodge animation
        if (this.player.animator) {
            this.player.isDodging = true;
        }
    }

    static update(player, dt, input, cameraAngle, obstacles) {
        if (!player.playerPhysics) return;
        const physics = player.playerPhysics;

        // Update dodge state
        if (physics.dodgeTimer > 0) {
            physics.dodgeTimer -= dt;
            if (physics.dodgeTimer <= 0) {
                physics.isDodging = false;
                player.isDodging = false;
            }
            
            // Apply dodge movement
            const dodgeSpeed = 30 * SCALE_FACTOR;
            const dist = dodgeSpeed * dt;
            const nextPos = player.mesh.position.clone();
            nextPos.addScaledVector(physics.dodgeDir, dist);
            
            if (!PlayerUtils.checkCollision(nextPos, player.config, obstacles)) {
                player.mesh.position.copy(nextPos);
            }
        }
        
        if (physics.dodgeCooldown > 0) {
            physics.dodgeCooldown -= dt;
        }

        // 1. Handle Ground & Gravity
        let groundHeight = 0;
        if (player.worldManager && typeof player.worldManager.getTerrainHeight === 'function') {
            groundHeight = player.worldManager.getTerrainHeight(player.mesh.position.x, player.mesh.position.z);
        }
        
        const obstacleHeight = PlayerUtils.getGroundHeight(player.mesh.position, player.config, obstacles);
        groundHeight = Math.max(groundHeight, obstacleHeight);

        // Apply Weather Movement Effects
        const weatherManager = player.worldManager?.game?.weatherManager;
        let weatherSpeedMult = 1.0;
        if (weatherManager) {
            const weatherType = weatherManager.currentState;
            const weatherIntensity = weatherManager.getWeatherIntensity();

            if (weatherType === 'snowstorm') {
                weatherSpeedMult = 1.0 - (0.3 * weatherIntensity); // Up to 30% reduction
            } else if (weatherType === 'storm' || weatherType === 'rain') {
                weatherSpeedMult = 1.0 - (0.2 * weatherIntensity); // Up to 20% reduction
            } else if (weatherType === 'fog') {
                weatherSpeedMult = 1.0 - (0.1 * weatherIntensity); // Up to 10% reduction
            }
        }
        
        // Apply Stealth Slowdown
        const crouchMult = player.isCrouching ? 0.5 : 1.0;
        player.weatherSpeedMult = weatherSpeedMult * crouchMult;
        
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
            } else if (input.jump && !player.isPickingUp && !player.isSkinning && !player.isDead) {
                // Initiate Jump
                player.isJumping = true;
                player.jumpVelocity = player.jumpPower;
                player.jumpTimer = 0;
            } else {
                player.mesh.position.y = groundHeight;
            }
        }

        // 2. Handle Movement (if not dead/climbing)
        if (player.isDead || player.isLedgeGrabbing) return;

        const isMoving = (input.x !== 0 || input.y !== 0);
        
        // Calculate Speed with Foliage Penalty
        const baseSpeed = input.isRunning ? player.moveSpeed * 1.8 : player.moveSpeed;
        let speedModifier = 1.0;
        
        const playerBox = PlayerUtils.getHitboxBounds(player.mesh.position, player.config);
        for (const obs of obstacles) {
            if (obs.userData?.type === 'soft') {
                const obsBox = new THREE.Box3().setFromObject(obs);
                if (obsBox.intersectsBox(playerBox)) {
                    speedModifier = 0.4;
                    break;
                }
            }
        }
        
        const finalSpeed = baseSpeed * speedModifier * (player.weatherSpeedMult || 1.0);

        // Face the hit_indicator if it exists and is visible
        if (player.actions && player.actions.hitIndicator && player.actions.hitIndicator.mesh.visible) {
            const hitIndicatorPos = player.actions.hitIndicator.mesh.position;
            const direction = new THREE.Vector3();
            direction.subVectors(hitIndicatorPos, player.mesh.position);
            direction.y = 0; // Keep rotation on Y axis only
            direction.normalize();
            
            const targetRotation = Math.atan2(direction.x, direction.z);
            let rotDiff = targetRotation - player.mesh.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            player.mesh.rotation.y += rotDiff * (player.turnSpeed || 10) * dt;

            // Handle movement when facing hit indicator
            if (isMoving && !player.isPickingUp && !player.isSkinning) {
                const inputLen = Math.sqrt(input.x * input.x + input.y * input.y);
                const normX = input.x / inputLen;
                const normY = -input.y / inputLen;

                // Movement is always relative to camera, not player rotation
                const cameraRotation = cameraAngle + Math.PI;
                const fX = Math.sin(cameraRotation); const fZ = Math.cos(cameraRotation);
                const rX = Math.sin(cameraRotation - Math.PI / 2); const rZ = Math.cos(cameraRotation - Math.PI / 2);

                const dx = (fX * normY + rX * normX) * finalSpeed * dt;
                const dz = (fZ * normY + rZ * normX) * finalSpeed * dt;

                const nextPos = player.mesh.position.clone();
                nextPos.x += dx;
                nextPos.z += dz;

                if (!PlayerUtils.checkCollision(nextPos, player.config, obstacles)) {
                    player.mesh.position.copy(nextPos);
                }
            }
        } else if (isMoving && !player.isPickingUp && !player.isSkinning) {
            // Original movement-based rotation when no hit indicator
            const targetRotation = cameraAngle + Math.PI;
            let rotDiff = targetRotation - player.mesh.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            player.mesh.rotation.y += rotDiff * (player.turnSpeed || 10) * dt;

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

    static checkLedgeGrab(player, obstacles) {
        const worldDir = new THREE.Vector3();
        player.mesh.getWorldDirection(worldDir); 
        const forward = worldDir.normalize(); 
        
        const bounds = PlayerUtils.getHitboxBounds(player.mesh.position, player.config);
        const boundsHeight = bounds.max.y - bounds.min.y;
        // Cast ray from near top
        const rayY = bounds.min.y + boundsHeight * 0.85; 

        const rayOrigin = player.mesh.position.clone();
        rayOrigin.y = rayY;

        const raycaster = new THREE.Raycaster(rayOrigin, forward, 0, 0.8);
        const intersects = raycaster.intersectObjects(obstacles);
        
        const hit = intersects.find(i => i.object.userData?.type !== 'soft');
        
        if (hit) {
            const block = hit.object;
            const blockBox = new THREE.Box3().setFromObject(block);
            const ledgeTopY = blockBox.max.y;

            if (Math.abs(rayOrigin.y - ledgeTopY) < 0.5) {
                player.isLedgeGrabbing = true;
                player.isJumping = false;
                player.ledgeGrabTime = 0;
                player.ledgeStartPos = player.ledgeStartPos || new THREE.Vector3();
                player.ledgeStartPos.copy(player.mesh.position);
                player.ledgeTargetPos = player.ledgeTargetPos || new THREE.Vector3();
                player.ledgeTargetPos.set(
                    player.mesh.position.x + forward.x * 0.7, 
                    ledgeTopY, 
                    player.mesh.position.z + forward.z * 0.7
                );
                // Adjust hang position
                const hangOffset = boundsHeight + 0.05;
                player.mesh.position.y = ledgeTopY - hangOffset;
                player.ledgeStartPos.y = player.mesh.position.y;
            }
        }
    }
}
