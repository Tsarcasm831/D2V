import * as THREE from 'three';
import { PlayerConfig, PlayerInput, OutfitType, DEFAULT_CONFIG } from '../types';
import { PlayerModel } from './PlayerModel';
import { PlayerAnimator } from './PlayerAnimator';
import { PlayerPhysics } from './player/PlayerPhysics';
import { PlayerCombat } from './player/PlayerCombat';
import { PlayerInteraction } from './player/PlayerInteraction';
import { PlayerDebug } from './player/PlayerDebug';
import { ParticleManager } from './ParticleManager';

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

    // Status
    isDead: boolean = false;
    deathTime: number = 0;
    deathVariation = { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
    recoverTimer: number = 0;
    
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
    
    // Combat
    isAxeSwing: boolean = false;
    axeSwingTimer: number = 0;
    hasHit: boolean = false; // Tracks if the current swing has processed an impact
    isPunch: boolean = false;
    punchTimer: number = 0;
    comboChain: number = 0; 

    // Facial
    blinkTimer: number = 0;
    isBlinking: boolean = false;
    
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

    update(dt: number, input: PlayerInput, cameraAngle: number, obstacles: THREE.Object3D[], particleManager: ParticleManager) {
        this.syncConfig();
        
        // Handle Death Toggle
        if (input.isDead && !this.wasDeadKeyPressed) {
            this.toggleDeath();
        }
        this.wasDeadKeyPressed = !!input.isDead;
        
        // Update Dead State Timer
        if (this.isDead) {
            this.deathTime += dt;
        } else {
            if (this.recoverTimer > 0) this.recoverTimer -= dt;
            
            // Sub-System Updates
            PlayerInteraction.update(this, dt, input, obstacles);
            PlayerCombat.update(this, dt, input, obstacles, particleManager);
            PlayerPhysics.update(this, dt, input, cameraAngle, obstacles);
        }

        // Run Animation System
        this.animator.animate(this, dt, (input.x !== 0 || input.y !== 0), input);

        if (this.isDebugHitbox) {
            PlayerDebug.updateHitboxVisuals(this);
        }
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
        this.model.sync(this.config);
    }
}