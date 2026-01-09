
import * as THREE from 'three';
import { PlayerConfig, PlayerInput, OutfitType, DEFAULT_CONFIG } from '../types';
import { PlayerModel } from './PlayerModel';
import { PlayerAnimator } from './PlayerAnimator';
import { PlayerPhysics } from './player/PlayerPhysics';
import { PlayerCombat } from './player/PlayerCombat';
import { PlayerInteraction } from './player/PlayerInteraction';
import { PlayerDebug } from './player/PlayerDebug';
import { ParticleManager } from './ParticleManager';
import { Environment } from './Environment';
import { ChakraNetwork } from './vfx/ChakraNetwork';

// Sub-Handlers
import { PlayerInventory } from './player/PlayerInventory';
import { PlayerStatusHandler } from './player/PlayerStatusHandler';
import { PlayerCameraHandler } from './player/PlayerCameraHandler';

export class Player {
    scene: THREE.Scene;
    model: PlayerModel;
    animator: PlayerAnimator;
    config: PlayerConfig;

    // Sub-Systems
    inventory: PlayerInventory;
    status: PlayerStatusHandler;
    cameraHandler: PlayerCameraHandler;
    chakra: ChakraNetwork;

    // --- Core Locomotion State ---
    moveSpeed: number = 5;
    turnSpeed: number = 10;
    walkTime: number = 0;
    isJumping: boolean = false;
    jumpVelocity: number = 0;
    jumpTimer: number = 0;
    gravity: number = -30;
    jumpPower: number = 11;
    
    previousPosition = new THREE.Vector3();
    velocity = new THREE.Vector3();
    
    lastStepCount: number = 0;
    didStep: boolean = false;

    // --- Action State ---
    // Combat
    isCombatStance: boolean = false;
    wasCombatKeyPressed: boolean = false;
    wasAttack1Pressed: boolean = false;
    wasAttack2Pressed: boolean = false;
    
    // Attacks
    isAxeSwing: boolean = false;
    axeSwingTimer: number = 0;
    hasHit: boolean = false;
    isPunch: boolean = false;
    punchTimer: number = 0;
    comboChain: number = 0; 

    // Climbing
    isLedgeGrabbing: boolean = false;
    ledgeGrabTime: number = 0;
    ledgeStartPos: THREE.Vector3 = new THREE.Vector3();
    ledgeTargetPos: THREE.Vector3 = new THREE.Vector3();
    
    // Interactions
    isPickingUp: boolean = false;
    pickUpTime: number = 0;
    isInteracting: boolean = false;
    interactTimer: number = 0;
    
    // Emotes
    isWaving: boolean = false;
    waveTimer: number = 0;
    
    // Skinning
    isSkinning: boolean = false;
    canSkin: boolean = false;
    skinningTimer: number = 0;
    maxSkinningTime: number = 3.0;
    skinningProgress: number = 0;
    
    // Fishing
    isFishing: boolean = false;
    isReeling: boolean = false;
    fishingTimer: number = 0;
    isChargingFishing: boolean = false;
    fishingCharge: number = 0;
    fishingChargeTime: number = 0;
    needsReclick: boolean = false;

    // Ragdoll
    isDragged: boolean = false;
    draggedPartName: string = 'hips';
    dragVelocity: THREE.Vector3 = new THREE.Vector3();
    
    // Debug
    isDebugHitbox: boolean = false;
    isDebugHands: boolean = false;
    isSkeletonMode: boolean = false;

    private lastOutfit: OutfitType | null = null;
    private wasDeadKeyPressed: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG };
        this.model = new PlayerModel(this.config);
        this.animator = new PlayerAnimator();
        this.scene.add(this.model.group);
        this.model.group.rotation.y = Math.PI;

        // Initialize Handlers
        this.inventory = new PlayerInventory();
        this.status = new PlayerStatusHandler();
        this.cameraHandler = new PlayerCameraHandler();
        this.chakra = new ChakraNetwork(scene);
    }

    get mesh() { return this.model.group; }

    // Helpers exposed for Interaction/Game
    addItem(itemName: string) { return this.inventory.addItem(itemName); }
    
    toggleHitbox() {
        this.isDebugHitbox = !this.isDebugHitbox;
        PlayerDebug.updateHitboxVisuals(this);
    }

    toggleSkeletonMode() {
        this.isSkeletonMode = !this.isSkeletonMode;
        // Hide the model skin/mesh
        this.model.group.visible = !this.isSkeletonMode;
        
        // If entering skeleton mode, ensure the skeleton debug draw is active
        if (this.isSkeletonMode) {
            this.isDebugHitbox = true;
        }
        
        PlayerDebug.updateHitboxVisuals(this);
    }

    toggleHandsDebug() {
        this.isDebugHands = !this.isDebugHands;
        PlayerDebug.toggleHandDebugMode(this);
    }

    update(dt: number, input: PlayerInput, cameraPosition: THREE.Vector3, cameraAngle: number, environment: Environment, particleManager: ParticleManager) {
        this.syncConfig();
        
        // 1. Physics & Model Update
        if (dt > 0) {
            this.velocity.subVectors(this.mesh.position, this.previousPosition).divideScalar(dt);
        }
        this.previousPosition.copy(this.mesh.position);
        this.model.update(dt, this.velocity);
        
        // 2. State Logic
        this.status.update(dt);
        this.cameraHandler.update(this, dt, cameraPosition);

        // 3. Input Handlers
        if (input.isDead && !this.wasDeadKeyPressed) {
            this.status.toggleDeath(this.mesh);
        }
        this.wasDeadKeyPressed = !!input.isDead;
        
        if (input.combat && !this.wasCombatKeyPressed) {
            this.isCombatStance = !this.isCombatStance;
        }
        this.wasCombatKeyPressed = !!input.combat;

        if (input.resetView) {
            this.cameraHandler.resetGaze();
        }
        
        // Wave Handler
        if (input.wave && !this.isWaving && !this.isCombatStance && !this.isJumping) {
            this.isWaving = true;
            this.waveTimer = 0;
        }
        
        if (this.isWaving) {
            // Cancel if moving
            if (input.x !== 0 || input.y !== 0 || input.jump || input.isPickingUp || input.attack1) {
                this.isWaving = false;
                this.waveTimer = 0;
            } else {
                this.waveTimer += dt;
                if (this.waveTimer > 2.0) {
                    this.isWaving = false;
                    this.waveTimer = 0;
                }
            }
        }

        // 4. Sub-Systems
        if (this.status.isDead) {
            // No physics or actions when dead
        } else {
            // While recovering, we still disable most inputs but physics might settle
            if (this.status.recoverTimer <= 0) {
                PlayerInteraction.update(this, dt, input, environment.obstacles);
                PlayerCombat.update(this, dt, input, environment, particleManager);
                PlayerPhysics.update(this, dt, input, cameraAngle, environment.obstacles);
            }
        }

        // 5. Animation
        // Determine "isMoving" for animator
        const isMoving = (input.x !== 0 || input.y !== 0) && !this.status.isDead;
        this.animator.animate(this, dt, isMoving, input, environment.obstacles);

        // 6. Visual Effects
        // Update Chakra Network - Only visible in Skeleton Mode (J)
        this.chakra.setVisible(this.isSkeletonMode);
        if (this.isSkeletonMode) {
            this.chakra.update(dt, this.model);
        }

        // 7. Debug Visuals
        if (this.isDebugHitbox) {
            // Important: If mesh is hidden (Skeleton Mode), we must manually update matrices
            // so the skeleton bones are in the correct world position.
            if (this.isSkeletonMode) {
                this.model.group.updateMatrixWorld(true);
            }
            PlayerDebug.updateHitboxVisuals(this);
        }
    }

    private syncConfig() {
        if (this.lastOutfit !== this.config.outfit) {
            this.model.applyOutfit(this.config.outfit, this.config.skinColor);
            this.lastOutfit = this.config.outfit;
        }
        
        if (this.config.selectedItem === 'Fishing Pole' && this.config.weaponStance !== 'shoulder') {
            this.config.weaponStance = 'shoulder';
        }

        this.model.sync(this.config, this.isCombatStance);
    }
}
