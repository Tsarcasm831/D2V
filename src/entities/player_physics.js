import * as THREE from 'three';
import { SCALE_FACTOR, WORLD_SHARD_LIMIT, SHARD_SIZE } from '../world/world_bounds.js';

export class PlayerPhysics {
    constructor(player) {
        this.player = player;
        this.worldManager = player.worldManager;
        const terrainHeight = this.worldManager ? this.worldManager.getTerrainHeight(0, 0) : 0;
        this.position = new THREE.Vector3(0, terrainHeight, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        this.walkSpeed = 15 * SCALE_FACTOR;
        this.runSpeed = 28 * SCALE_FACTOR;
        this.mountSpeed = 45 * SCALE_FACTOR;
        this.jumpForce = 11 * SCALE_FACTOR; // Adjusted to match player.ts.bak jumpPower
        this.gravity = 30 * SCALE_FACTOR; // Adjusted to match player.ts.bak gravity (-30)
        
        this.isGrounded = true;
        this.wasGrounded = true;
        this.snapDistance = 0.5 * SCALE_FACTOR;

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        this._tempVec3 = new THREE.Vector3();
        this._raycaster = new THREE.Raycaster();
        this._box = new THREE.Box3();
    }

    update(delta, input, camera, obstacles = []) {
        if (!input || !camera || this.player.isDead) return;

        // Handle Ledge Grabbing State
        if (this.player.isLedgeGrabbing) {
            this.player.ledgeGrabTime += delta;
            const duration = 0.9;
            
            if (this.player.ledgeGrabTime >= duration) {
                this.player.isLedgeGrabbing = false;
                this.position.copy(this.player.ledgeTargetPos);
                this.player.isJumping = false;
                this.velocity.y = 0;
            } else {
                const t = this.player.ledgeGrabTime / duration;
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.mesh.quaternion);
                const hangingPos = this.player.ledgeTargetPos.clone().sub(forward.clone().multiplyScalar(0.7 * SCALE_FACTOR));
                hangingPos.y -= 1.8 * SCALE_FACTOR;

                if (t < 0.3) {
                    const snapT = t / 0.3;
                    this.position.lerp(hangingPos, snapT);
                } else if (t < 0.7) {
                    const pullT = (t - 0.3) / 0.4;
                    const midPos = hangingPos.clone();
                    midPos.y = this.player.ledgeTargetPos.y - 0.3 * SCALE_FACTOR;
                    this.position.lerpVectors(hangingPos, midPos, pullT);
                } else {
                    const vaultT = (t - 0.7) / 0.3;
                    const midPos = hangingPos.clone();
                    midPos.y = this.player.ledgeTargetPos.y - 0.3 * SCALE_FACTOR;
                    this.position.lerpVectors(midPos, this.player.ledgeTargetPos, vaultT);
                }
            }
            if (this.player.mesh) this.player.mesh.position.copy(this.position);
            return;
        }

        const isMounted = this.player.actions && this.player.actions.mountedHorse;
        const speed = isMounted ? this.mountSpeed : (input.run ? this.runSpeed : this.walkSpeed);
        const moveX = input.x || 0;
        const moveZ = input.y || 0;

        let targetVelX = 0;
        let targetVelZ = 0;

        if (moveX !== 0 || moveZ !== 0) {
            const forward = this._tempVec1;
            camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = this._tempVec2.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            const moveDir = this._tempVec3.set(0, 0, 0)
                .addScaledVector(forward, -moveZ)
                .addScaledVector(right, moveX);
            
            if (moveDir.lengthSq() > 0.001) {
                moveDir.normalize();
                const strength = Math.min(1, Math.sqrt(moveX * moveX + moveZ * moveZ));
                targetVelX = moveDir.x * speed * strength;
                targetVelZ = moveDir.z * speed * strength;
            }
        }

        // Horizontal damping
        const lerpFactor = 1 - Math.exp(-15 * delta);
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVelX, lerpFactor);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVelZ, lerpFactor);

        // Vertical physics
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * delta;
        }
        
        // Position update
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // Ledge Detection (only when falling or at peak)
        if (this.velocity.y < 6 * SCALE_FACTOR && !this.isGrounded) {
            const forward = this._tempVec1.set(0, 0, 1).applyQuaternion(this.player.mesh.quaternion);
            const rayOrigin = this._tempVec2.copy(this.position).add(this._tempVec3.set(0, 1.4 * SCALE_FACTOR, 0));
            
            this._raycaster.set(rayOrigin, forward);
            this._raycaster.far = 0.5 * SCALE_FACTOR;
            
            const validObstacles = obstacles.filter(obj => obj && obj.geometry);
            const intersects = this._raycaster.intersectObjects(validObstacles);

            if (intersects.length > 0) {
                const obstacle = intersects[0].object;
                if (!obstacle.geometry.boundingBox) obstacle.geometry.computeBoundingBox();
                const box = this._box.copy(obstacle.geometry.boundingBox).applyMatrix4(obstacle.matrixWorld);
                
                const ledgeY = box.max.y;
                const distToLedge = ledgeY - this.position.y;
                
                if (distToLedge > 1.2 * SCALE_FACTOR && distToLedge < 2.2 * SCALE_FACTOR) {
                    this.player.isLedgeGrabbing = true;
                    this.player.ledgeGrabTime = 0;
                    this.velocity.set(0, 0, 0);
                    this.player.ledgeTargetPos.set(
                        this.position.x + forward.x * 0.9 * SCALE_FACTOR,
                        ledgeY,
                        this.position.z + forward.z * 0.9 * SCALE_FACTOR
                    );
                    return;
                }
            }
        }

        // Clamp to world boundaries
        const boundary = WORLD_SHARD_LIMIT * SHARD_SIZE;
        this.position.x = THREE.MathUtils.clamp(this.position.x, -boundary, boundary);
        this.position.z = THREE.MathUtils.clamp(this.position.z, -boundary, boundary);

        // World Mask Boundary Enforcement
        const wm = this.worldManager || (this.player ? this.player.worldManager : null);
        if (wm && wm.worldMask && !wm.worldMask.containsXZ(this.position.x, this.position.z)) {
            // Simple approach: reject movement if it puts us outside the mask
            // Find a valid point near the boundary or just revert
            this.position.x -= this.velocity.x * delta;
            this.position.z -= this.velocity.z * delta;
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Ground/Plateau collisions
        let floorY = wm ? wm.getTerrainHeight(this.position.x, this.position.z) : 0;

        if (isMounted) {
            floorY += 0.8 * SCALE_FACTOR; // Ride height
        }

        // Safety check for first frame or if terrain wasn't loaded yet
        if (this.position.y < floorY) {
            this.position.y = floorY;
        }
        
        // Check for buildings/floors at this position
        if (wm) {
            const nearbyResources = wm.getNearbyResources(this.position, 4.0 * SCALE_FACTOR);
            for (const res of nearbyResources) {
                if (res.type === 'floor' && !res.isDead) {
                    const floorTop = res.group.position.y + (res.floorHeight || 0);
                    // If player is above or close to the floor top, treat it as the floor
                    if (this.position.y >= floorTop - 0.2 * SCALE_FACTOR) {
                        floorY = Math.max(floorY, floorTop);
                    }
                }
            }
        }

        const wasGrounded = this.isGrounded;
        if (this.position.y <= floorY) {
            this.position.y = floorY;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else if (wasGrounded && this.velocity.y <= 0) {
            // Ground snapping: if we were grounded and moving downhill, snap to ground
            const distToFloor = this.position.y - floorY;
            if (distToFloor < this.snapDistance) {
                this.position.y = floorY;
                this.velocity.y = 0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }
        } else {
            this.isGrounded = false;
        }

        // Jump
        if (input.jump && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        // Obstacle collisions
        this.checkObstacleCollisions();
        this.checkEntityCollisions();

        // Sync visual mesh
        if (this.player && this.player.mesh) {
            this.player.mesh.position.copy(this.position);
        }
    }

    checkObstacleCollisions() {
        const wm = this.worldManager || (this.player ? this.player.worldManager : null);
        if (!wm) return;
        
        const resources = wm.getNearbyResources(this.position, 10 * SCALE_FACTOR);
        const playerRadius = 0.4 * SCALE_FACTOR;

        for (let i = 0; i < resources.length; i++) {
            const res = resources[i];
            if (res.isDead || !res.group) continue;

            // Specialized shape-based collision resolution (Buildings, Walls, Doorways)
            if (res.resolveCollision) {
                const collision = res.resolveCollision(this.position, playerRadius);
                if (collision) {
                    const dot = this.velocity.x * collision.nx + this.velocity.z * collision.nz;
                    if (dot < 0) {
                        this.velocity.x -= collision.nx * dot;
                        this.velocity.z -= collision.nz * dot;
                    }
                    continue;
                }
            }

            // Standard circular collision fallback
            const dx = this.position.x - res.group.position.x;
            const dz = this.position.z - res.group.position.z;
            const distSq = dx * dx + dz * dz;
            
            let resRadius = res.radius || (res.type === 'tree' ? 0.5 : 0.8) * SCALE_FACTOR;
            if (res.getCollisionRadiusAtAngle) {
                resRadius = res.getCollisionRadiusAtAngle(Math.atan2(dz, dx));
            }

            const minDist = playerRadius + resRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue; 

                const overlap = (minDist - dist);
                const nx = dx / dist;
                const nz = dz / dist;

                this.position.x += nx * overlap;
                this.position.z += nz * overlap;
                
                const dot = this.velocity.x * nx + this.velocity.z * nz;
                if (dot < 0) {
                    this.velocity.x -= nx * dot;
                    this.velocity.z -= nz * dot;
                }
            }
        }
    }

    checkEntityCollisions() {
        const wm = this.worldManager || (this.player ? this.player.worldManager : null);
        if (!wm) return;

        const isMounted = this.player.actions && this.player.actions.mountedHorse;
        const entities = [
            ...wm.getNearbyNPCs(this.position, 15 * SCALE_FACTOR),
            ...wm.getNearbyFauna(this.position, 15 * SCALE_FACTOR)
        ];
        
        const playerRadius = 0.5 * SCALE_FACTOR;

        for (const entity of entities) {
            if (entity.isDead || entity === this.player) continue;
            if (isMounted && entity === this.player.actions.mountedHorse) continue;

            const entityPos = (entity.group || entity.mesh).position;
            const dx = this.position.x - entityPos.x;
            const dz = this.position.z - entityPos.z;
            const distSq = dx * dx + dz * dz;

            const radius = (entity.type === 'bear' ? 1.0 : entity.type === 'wolf' ? 0.6 : 0.5) * SCALE_FACTOR;
            const minDist = playerRadius + radius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;

                const overlap = (minDist - dist);
                this.position.x += (dx / dist) * overlap;
                this.position.z += (dz / dist) * overlap;
            }
        }
    }
}