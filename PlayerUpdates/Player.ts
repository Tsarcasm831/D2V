import * as THREE from 'three';
import { PlayerConfig, PlayerInput, OutfitType, DEFAULT_CONFIG } from '../types';
import { PlayerModel } from './PlayerModel';
import { PlayerAnimator } from './PlayerAnimator';

export class Player {
    scene: THREE.Scene;
    model: PlayerModel;
    animator: PlayerAnimator;
    config: PlayerConfig;

    // Movement state
    moveSpeed: number = 5;
    turnSpeed: number = 10;
    walkTime: number = 0;
    
    // Logic timers/flags
    isDead: boolean = false;
    godMode: boolean = false;
    deathTime: number = 0;
    deathVariation = { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
    isJumping: boolean = false;
    jumpVelocity: number = 0;
    jumpTimer: number = 0;
    gravity: number = -30;
    jumpPower: number = 11;
    recoverTimer: number = 0;

    // Ledge Climbing
    isLedgeGrabbing: boolean = false;
    ledgeGrabTime: number = 0;
    ledgeStartPos: THREE.Vector3 = new THREE.Vector3();
    ledgeTargetPos: THREE.Vector3 = new THREE.Vector3();
    
    isPickingUp: boolean = false;
    pickUpTime: number = 0;
    isInteracting: boolean = false;
    interactTimer: number = 0;
    isAxeSwing: boolean = false;
    axeSwingTimer: number = 0;
    isPunch: boolean = false;
    punchTimer: number = 0;
    
    isDragged: boolean = false;
    draggedPartName: string = 'hips';
    dragVelocity: THREE.Vector3 = new THREE.Vector3();
    
    inventory: string[] = [];
    inventoryCapacity: number = 5;
    inventoryDirty: boolean = false;

    private lastOutfit: OutfitType | null = null;
    private wasDeadKeyPressed: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG };
        this.model = new PlayerModel(this.config);
        this.animator = new PlayerAnimator();
        this.scene.add(this.model.group);
        this.model.group.rotation.y = Math.PI;
    }

    get mesh() { return this.model.group; }

    addItem(itemName: string): boolean {
        if (this.inventory.length >= this.inventoryCapacity) return false;
        this.inventory.push(itemName);
        this.inventoryDirty = true;
        return true;
    }

    playInteract() { if (!this.isInteracting) { this.isInteracting = true; this.interactTimer = 0; } }
    playAxeSwing() { if (!this.isAxeSwing) { this.isAxeSwing = true; this.axeSwingTimer = 0; } }
    playPunch() { if (!this.isPunch) { this.isPunch = true; this.punchTimer = 0; } }

    update(dt: number, input: PlayerInput, cameraAngle: number, obstacles: THREE.Object3D[]) {
        this.syncConfig();
        this.handleTimers(dt);
        this.handleInput(dt, input, cameraAngle, obstacles);
    }

    private syncConfig() {
        if (this.lastOutfit !== this.config.outfit) {
            this.model.applyOutfit(this.config.outfit, this.config.skinColor);
            this.lastOutfit = this.config.outfit;
        }
        this.model.sync(this.config);
    }

    private getGroundHeight(x: number, z: number, obstacles: THREE.Object3D[]): number {
        let highest = 0;
        const playerRadius = 0.25;
        const pBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(x, 5, z), // Start high
            new THREE.Vector3(playerRadius * 2, 10, playerRadius * 2)
        );

        for (const obs of obstacles) {
            const obsBox = new THREE.Box3().setFromObject(obs);
            // Check if player's horizontal footprint overlaps with the obstacle
            if (pBox.min.x < obsBox.max.x && pBox.max.x > obsBox.min.x &&
                pBox.min.z < obsBox.max.z && pBox.max.z > obsBox.min.z) {
                highest = Math.max(highest, obsBox.max.y);
            }
        }
        return highest;
    }

    private handleTimers(dt: number) {
        if (this.isPickingUp) {
            this.pickUpTime += dt;
            if (this.pickUpTime > 1.2) { this.isPickingUp = false; this.pickUpTime = 0; }
        }
        if (this.isInteracting) {
            this.interactTimer += dt;
            if (this.interactTimer > 0.4) { this.isInteracting = false; this.interactTimer = 0; }
        }
        if (this.isAxeSwing) {
            this.axeSwingTimer += dt;
            if (this.axeSwingTimer > 0.45) { this.isAxeSwing = false; this.axeSwingTimer = 0; }
        }
        if (this.isPunch) {
            this.punchTimer += dt;
            if (this.punchTimer > 0.3) { this.isPunch = false; this.punchTimer = 0; }
        }
        if (this.isLedgeGrabbing) {
            this.ledgeGrabTime += dt;
            const climbDuration = 0.8;
            const progress = Math.min(this.ledgeGrabTime / climbDuration, 1.0);
            
            if (progress > 0.3) {
                const climbFactor = (progress - 0.3) / 0.7;
                this.mesh.position.lerpVectors(this.ledgeStartPos, this.ledgeTargetPos, climbFactor);
            }

            if (progress >= 1.0) {
                this.mesh.position.copy(this.ledgeTargetPos);
                this.isLedgeGrabbing = false;
                this.ledgeGrabTime = 0;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }
        if (this.recoverTimer > 0) this.recoverTimer -= dt;
    }

    private handleInput(dt: number, input: PlayerInput, cameraAngle: number, obstacles: THREE.Object3D[]) {
        if (input.isDead && !this.wasDeadKeyPressed) {
            this.isDead = !this.isDead;
            this.deathTime = 0;
            if (this.isDead) {
                this.deathVariation = {
                    side: Math.random() > 0.5 ? 1 : -1,
                    twist: (Math.random() - 0.5) * 0.5,
                    fallDir: Math.random() > 0.5 ? 1 : -1,
                    stumbleDir: (Math.random() - 0.5) * 0.5
                };
            } else {
                this.recoverTimer = 0.5;
                this.mesh.rotation.set(0, this.mesh.rotation.y, 0);
            }
        }
        this.wasDeadKeyPressed = !!input.isDead;
        
        if (this.isDead || this.isLedgeGrabbing) {
            if (this.isDead) this.deathTime += dt;
            return;
        }

        const groundHeight = this.getGroundHeight(this.mesh.position.x, this.mesh.position.z, obstacles);

        if (input.isPickingUp && !this.isPickingUp) this.isPickingUp = true;
        if (input.interact) this.playInteract();
        
        // Weapon Attack / Punch
        if (input.attack1) {
            if (this.config.selectedItem) {
                this.playAxeSwing();
            } else {
                this.playPunch();
            }
        }
        if (input.attack2) this.playAxeSwing();

        const isMoving = input.x !== 0 || input.y !== 0;
        const speed = input.isRunning ? this.moveSpeed * 1.8 : this.moveSpeed;

        if (isMoving && !this.isPickingUp) {
            const targetRotation = cameraAngle + Math.PI;
            let rotDiff = targetRotation - this.mesh.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.mesh.rotation.y += rotDiff * this.turnSpeed * dt;

            // Calculate movement direction in world space
            const inputLen = Math.sqrt(input.x * input.x + input.y * input.y);
            const normX = input.x / inputLen;
            const normY = -input.y / inputLen;

            const fX = Math.sin(targetRotation); const fZ = Math.cos(targetRotation);
            const rX = Math.sin(targetRotation - Math.PI / 2); const rZ = Math.cos(targetRotation - Math.PI / 2);

            const dx = (fX * normY + rX * normX) * speed * dt;
            const dz = (fZ * normY + rZ * normX) * speed * dt;

            if (!this.checkCollision(this.mesh.position.x + dx, this.mesh.position.y, this.mesh.position.z + dz, obstacles)) {
                this.mesh.position.x += dx;
                this.mesh.position.z += dz;
            }

            // Calculate relative movement for the animator
            // We want to know if we are moving forward/backward or strafing relative to current mesh rotation
            const moveDirWorld = new THREE.Vector3(dx, 0, dz).normalize();
            const forwardWorld = new THREE.Vector3();
            this.mesh.getWorldDirection(forwardWorld);
            
            const dotForward = moveDirWorld.dot(forwardWorld);
            const rightWorld = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardWorld);
            const dotRight = moveDirWorld.dot(rightWorld);

            // Update input for animator to be relative
            // animator.animate uses input.x for strafe and input.y for forward/back
            const relativeInput = { ...input, x: dotRight, y: -dotForward };
            this.animator.animate(this, dt, true, relativeInput);
        } else {
            this.animator.animate(this, dt, false, input);
        }

        if (this.isJumping) {
            this.jumpVelocity += this.gravity * dt;
            this.mesh.position.y += this.jumpVelocity * dt;
            
            // Ledge detection
            if (this.jumpVelocity > -8) { 
                const worldDir = new THREE.Vector3();
                this.mesh.getWorldDirection(worldDir); 
                const forward = worldDir.normalize(); 
                
                const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
                const raycaster = new THREE.Raycaster(rayOrigin, forward, 0, 0.8);
                const intersects = raycaster.intersectObjects(obstacles);
                
                if (intersects.length > 0) {
                    const block = intersects[0].object;
                    const blockBox = new THREE.Box3().setFromObject(block);
                    const ledgeTopY = blockBox.max.y;

                    if (Math.abs(rayOrigin.y - ledgeTopY) < 0.5) {
                        this.isLedgeGrabbing = true;
                        this.isJumping = false;
                        this.ledgeGrabTime = 0;
                        this.ledgeStartPos.copy(this.mesh.position);
                        this.ledgeTargetPos.set(
                            this.mesh.position.x + forward.x * 0.7, 
                            ledgeTopY, 
                            this.mesh.position.z + forward.z * 0.7
                        );
                        this.mesh.position.y = ledgeTopY - 1.85;
                        this.ledgeStartPos.y = this.mesh.position.y;
                    }
                }
            }

            if (this.mesh.position.y <= groundHeight) {
                this.mesh.position.y = groundHeight;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
            this.jumpTimer += dt;
        } else {
            // Apply Gravity if not grounded
            if (this.mesh.position.y > groundHeight) {
                this.jumpVelocity += this.gravity * dt;
                this.mesh.position.y += this.jumpVelocity * dt;
                if (this.mesh.position.y < groundHeight) {
                    this.mesh.position.y = groundHeight;
                    this.jumpVelocity = 0;
                }
            } else if (input.jump && !this.isPickingUp) {
                this.isJumping = true;
                this.jumpVelocity = this.jumpPower;
                this.jumpTimer = 0;
            } else {
                this.mesh.position.y = groundHeight;
            }
        }
    }

    private checkCollision(nx: number, ny: number, nz: number, obstacles: THREE.Object3D[]) {
        const playerBox = new THREE.Box3();
        const r = 0.25;
        // Check collision box at actual player height
        // We lift the bottom slightly (0.1) so we don't collide with the ground we're standing on
        playerBox.min.set(nx - r, ny + 0.1, nz - r);
        playerBox.max.set(nx + r, ny + 1.9, nz + r);
        for (const obs of obstacles) {
            const obsBox = new THREE.Box3().setFromObject(obs);
            if (obsBox.intersectsBox(playerBox)) return true;
        }
        return false;
    }
}