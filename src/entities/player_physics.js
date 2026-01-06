import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';
import { PlayerPhysics as ModularPhysics } from './player/PlayerPhysics.js';

export class PlayerPhysics {
    constructor(player) {
        this.player = player;
        
        // Configuration for modular physics
        player.moveSpeed = 15 * SCALE_FACTOR;
        player.jumpPower = 11 * SCALE_FACTOR;
        player.gravity = -30 * SCALE_FACTOR;
        player.turnSpeed = 10;
        
        // Initial state
        player.jumpVelocity = 0;
        player.jumpTimer = 0;
        player.isJumping = false;
        player.isGrounded = true;
        player.ledgeStartPos = new THREE.Vector3();
        player.ledgeTargetPos = new THREE.Vector3();
        
        this.position = player.mesh.position;
        this.velocity = new THREE.Vector3();
    }

    update(delta, input, camera, obstacles = []) {
        if (!input || !camera || this.player.isDead) {
            this.velocity.set(0, 0, 0);
            return;
        }

        const oldPos = this.player.mesh.position.clone();

        // Extract camera angle for movement
        const cameraAngle = Math.atan2(camera.position.x - this.player.mesh.position.x, camera.position.z - this.player.mesh.position.z);

        ModularPhysics.update(this.player, delta, input, cameraAngle, obstacles);
        
        // Calculate velocity for systems that need it (multiplayer, vfx)
        this.velocity.subVectors(this.player.mesh.position, oldPos).divideScalar(delta);
        
        // Sync state
        this.position = this.player.mesh.position;
        this.isGrounded = !this.player.isJumping;
    }
}