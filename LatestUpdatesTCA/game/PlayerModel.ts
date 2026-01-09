
import * as THREE from 'three';
import { PlayerConfig, OutfitType } from '../types';
import { PlayerMaterials } from './model/PlayerMaterials';
import { PlayerEquipment } from './model/PlayerEquipment';
import { PlayerMeshBuilder } from './model/PlayerMeshBuilder';
import { PlayerPartsRegistry } from './model/PlayerPartsRegistry';
import { PlayerClothingManager } from './model/PlayerClothingManager';
import { PlayerHairManager } from './model/PlayerHairManager';
import { PlayerBodyScaler } from './model/PlayerBodyScaler';
import { PlayerDebugManager } from './model/PlayerDebugManager';

export class PlayerModel {
    group: THREE.Group;
    parts: any = {}; // Proxy to registry.parts for compatibility with PlayerAnimator
    
    // Public for Player to access (e.g. eyes for animation)
    get eyes() { return this.registry.eyes; }
    get eyelids() { return this.registry.eyelids; }
    get rightFingers() { return this.registry.rightFingers; }
    get leftFingers() { return this.registry.leftFingers; }
    get rightThumb() { return this.registry.rightThumb; }
    get leftThumb() { return this.registry.leftThumb; }

    equippedMeshes: {
        helm?: THREE.Object3D;
        leftPauldron?: THREE.Object3D;
        rightPauldron?: THREE.Object3D;
        shield?: THREE.Object3D;
        heldItem?: THREE.Object3D;
    } = {};

    private materials: PlayerMaterials;
    private registry: PlayerPartsRegistry;
    private clothing: PlayerClothingManager;
    private hair: PlayerHairManager;
    private scaler: PlayerBodyScaler;
    private debug: PlayerDebugManager;

    private currentHeldItem: string | null = null;

    constructor(config: PlayerConfig) {
        this.materials = new PlayerMaterials(config);
        
        // Build initial mesh structure
        const buildResult = PlayerMeshBuilder.build(this.materials, config);
        this.group = buildResult.group;
        
        // Initialize Registry
        this.registry = new PlayerPartsRegistry(buildResult);
        this.parts = this.registry.parts;

        // Initialize Managers
        this.clothing = new PlayerClothingManager(this.registry, this.materials);
        this.hair = new PlayerHairManager(this.registry, this.materials);
        this.scaler = new PlayerBodyScaler(this.registry, this.materials);
        this.debug = new PlayerDebugManager(this.registry, this.materials);
    }

    update(dt: number, velocity: THREE.Vector3) {
        this.hair.updatePhysics(dt, velocity);
    }

    applyOutfit(outfit: OutfitType, skinColor: string) {
        this.clothing.applyOutfit(outfit, skinColor);
    }

    updateHeldItem(itemName: string | null) {
        this.currentHeldItem = PlayerEquipment.updateHeldItem(
            itemName,
            this.currentHeldItem,
            this.parts,
            this.equippedMeshes
        );
    }

    updateEquipment(equipment: any) {
        PlayerEquipment.updateArmor(equipment, this.parts, this.equippedMeshes);
    }

    sync(config: PlayerConfig, isCombatStance: boolean = false) {
        this.materials.sync(config);
        this.applyOutfit(config.outfit, config.skinColor);
        
        this.debug.update(config.debugHead);
        
        this.scaler.sync(config, isCombatStance);

        this.updateEquipment(config.equipment);
        this.updateHeldItem(config.selectedItem);
        
        this.clothing.update(config);
        
        this.hair.updateConfig(config);
        this.hair.syncColor(config.hairColor);
    }
}
