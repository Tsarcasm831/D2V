
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
import { CreepySmileAction } from './animator/actions/CreepySmileAction';

export class Player {
    scene: THREE.Scene;
    model: PlayerModel;
    animator: PlayerAnimator;
    config: PlayerConfig;

    // --- State Properties ---
    
    // Movement
    moveSpeed: number = 5;
    turnSpeed: number = 10;
    walkTime: number = 0;
    isJumping: boolean = false;
    jumpVelocity: number = 0;
    jumpTimer: number = 0;
    gravity: number = -30;
    jumpPower: number = 11;

    // Velocity Tracking for Physics
    previousPosition = new THREE.Vector3();
    velocity = new THREE.Vector3();

    // Status
    isDead: boolean = false;
    deathTime: number = 0;
    deathVariation = { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
    recoverTimer: number = 0;
    
    // Combat / Stance
    isCombatStance: boolean = false;
    private wasCombatKeyPressed: boolean = false;
    
    // Input History for Edge Detection
    wasAttack1Pressed: boolean = false;
    wasAttack2Pressed: boolean = false;
    
    // Climbing
    isLedgeGrabbing: boolean = false;
    ledgeGrabTime: number = 0;
    ledgeStartPos: THREE.Vector3 = new THREE.Vector3();
    ledgeTargetPos: THREE.Vector3 = new THREE.Vector3();
    
    // Actions
    isPickingUp: boolean = false;
    pickUpTime: number = 0;
    isInteracting: boolean = false;
    interactTimer: number = 0;
    
    // Skinning
    isSkinning: boolean = false;
    canSkin: boolean = false;
    skinningTimer: number = 0;
    maxSkinningTime: number = 3.0;
    skinningProgress: number = 0;
    
    // Combat Actions
    isAxeSwing: boolean = false;
    axeSwingTimer: number = 0;
    hasHit: boolean = false; // Tracks if the current swing has processed an impact
    isPunch: boolean = false;
    punchTimer: number = 0;
    comboChain: number = 0; 

    // Fishing
    isFishing: boolean = false;
    fishingTimer: number = 0;

    // Facial
    blinkTimer: number = 0;
    isBlinking: boolean = false;
    // Eye Movement (Gaze)
    eyeLookTarget: THREE.Vector2 = new THREE.Vector2(); // x=yaw, y=pitch
    eyeLookCurrent: THREE.Vector2 = new THREE.Vector2();
    eyeMoveTimer: number = 0;
    
    // Camera Awareness / Creepy Smile
    lookAtCameraTimer: number = 0;
    cameraGazeTimer: number = 0; // Tracks cumulative time camera has stared at player
    isLookingAtCamera: boolean = false;
    headLookWeight: number = 0; // 0 = Animation Control, 1 = Camera Control
    cameraWorldPosition: THREE.Vector3 = new THREE.Vector3();
    
    // Ragdoll Dragging
    isDragged: boolean = false;
    draggedPartName: string = 'hips';
    dragVelocity: THREE.Vector3 = new THREE.Vector3();
    
    // Inventory
    inventory: string[] = Array(8).fill('');
    inventoryCapacity: number = 8;
    inventoryDirty: boolean = false;

    // Debug
    isDebugHitbox: boolean = false;
    isDebugHands: boolean = false;
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
        const emptySlot = this.inventory.findIndex(s => s === '');
        if (emptySlot === -1) return false;
        
        // Create a new array reference to ensure React detects change if passed directly (though we use dirty flag)
        const newInv = [...this.inventory];
        newInv[emptySlot] = itemName;
        this.inventory = newInv;
        
        this.inventoryDirty = true;
        return true;
    }

    toggleHitbox() {
        this.isDebugHitbox = !this.isDebugHitbox;
        PlayerDebug.updateHitboxVisuals(this);
    }

    toggleHandsDebug() {
        this.isDebugHands = !this.isDebugHands;
        PlayerDebug.toggleHandDebugMode(this);
    }

    update(dt: number, input: PlayerInput, cameraPosition: THREE.Vector3, cameraAngle: number, environment: Environment, particleManager: ParticleManager) {
        this.syncConfig();
        
        // Calculate Velocity for effects (Hair Physics)
        if (dt > 0) {
            this.velocity.subVectors(this.mesh.position, this.previousPosition).divideScalar(dt);
        }
        this.previousPosition.copy(this.mesh.position);

        // Update Model Physics (e.g. Hair)
        this.model.update(dt, this.velocity);
        
        // Handle Death Toggle
        if (input.isDead && !this.wasDeadKeyPressed) {
            this.toggleDeath();
        }
        this.wasDeadKeyPressed = !!input.isDead;
        
        // Handle Combat Stance Toggle
        if (input.combat && !this.wasCombatKeyPressed) {
            this.isCombatStance = !this.isCombatStance;
        }
        this.wasCombatKeyPressed = !!input.combat;

        // Reset View Action (V)
        if (input.resetView) {
            this.resetGaze();
        }

        // Camera Look / Creepy Smile Logic
        this.cameraWorldPosition.copy(cameraPosition);
        CreepySmileAction.update(this, dt, cameraPosition);
        
        // Update Dead State Timer
        if (this.isDead) {
            this.deathTime += dt;
        } else {
            if (this.recoverTimer > 0) this.recoverTimer -= dt;
            
            // Sub-System Updates
            PlayerInteraction.update(this, dt, input, environment.obstacles);
            PlayerCombat.update(this, dt, input, environment, particleManager);
            PlayerPhysics.update(this, dt, input, cameraAngle, environment.obstacles);
        }

        // Run Animation System
        this.animator.animate(this, dt, (input.x !== 0 || input.y !== 0), input);

        if (this.isDebugHitbox) {
            PlayerDebug.updateHitboxVisuals(this);
        }
    }

    private resetGaze() {
        this.eyeLookTarget.set(0, 0);
        // Do not force eyeLookCurrent to 0 instantly, let it animate back via Animator
        this.eyeMoveTimer = 2.0; // Pause random eye movement for 2 seconds
        
        // Cancel Creepy Smile / Camera Look
        this.isLookingAtCamera = false;
        this.lookAtCameraTimer = 0;
        this.cameraGazeTimer = 0; // Reset accumulation
        this.headLookWeight = 0; // Snap head back to animation control
    }

    private toggleDeath() {
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

    private syncConfig() {
        if (this.lastOutfit !== this.config.outfit) {
            this.model.applyOutfit(this.config.outfit, this.config.skinColor);
            this.lastOutfit = this.config.outfit;
        }
        
        // Force Shoulder Stance if holding Fishing Pole
        if (this.config.selectedItem === 'Fishing Pole' && this.config.weaponStance !== 'shoulder') {
            this.config.weaponStance = 'shoulder';
        }

        this.model.sync(this.config, this.isCombatStance);
    }
}
