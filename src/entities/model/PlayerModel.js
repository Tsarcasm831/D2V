import * as THREE from 'three';
import { PlayerMaterials } from './PlayerMaterials.js';
import { PlayerEquipment } from './PlayerEquipment.js';
import { PlayerMeshBuilder } from './mesh/PlayerMeshBuilder.js';
import { PlayerPartsRegistry } from './PlayerPartsRegistry.js';
import { PlayerClothingManager } from './PlayerClothingManager.js';
import { PlayerHairManager } from './PlayerHairManager.js';
import { PlayerBodyScaler } from './PlayerBodyScaler.js';
import { PlayerDebugManager } from './PlayerDebugManager.js';
import { DEFAULT_CONFIG } from '../../data/constants.js';

export class PlayerModel {
    constructor(customConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...customConfig };
        
        this.parts = {}; // Proxy to registry.parts for compatibility with PlayerAnimator
        this.equippedMeshes = {};
        this.currentHeldItem = null;

        this.materials = new PlayerMaterials(this.config);
        
        // Build initial mesh structure
        const buildResult = PlayerMeshBuilder.build(this.materials, this.config);
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

    // Public for Player to access (e.g. eyes for animation)
    get eyes() { return this.registry.eyes; }
    get eyelids() { return this.registry.eyelids; }
    get rightFingers() { return this.registry.rightFingers; }
    get leftFingers() { return this.registry.leftFingers; }
    get rightThumb() { return this.registry.rightThumb; }
    get leftThumb() { return this.registry.leftThumb; }

    update(dt, velocity) {
        this.hair.updatePhysics(dt, velocity);
    }

    applyOutfit(outfit, skinColor) {
        this.clothing.applyOutfit(outfit, skinColor);
    }

    updateHeldItem(itemName) {
        this.currentHeldItem = PlayerEquipment.updateHeldItem(
            itemName,
            this.currentHeldItem,
            this.parts,
            this.equippedMeshes
        );
    }

    updateEquipment(equipment) {
        PlayerEquipment.updateArmor(equipment, this.parts, this.equippedMeshes);
    }

    sync(partialConfig, isCombatStance = false) {
        // Merge with existing config
        this.config = { ...this.config, ...partialConfig };
        
        // Ensure equipment is merged deeply if provided partially, though typically it's a full object
        if (partialConfig.equipment) {
            this.config.equipment = { ...this.config.equipment, ...partialConfig.equipment };
        }

        this.materials.sync(this.config);
        this.applyOutfit(this.config.outfit, this.config.skinColor);
        
        this.debug.update(this.config.debugHead);
        
        this.scaler.sync(this.config, isCombatStance);

        this.updateEquipment(this.config.equipment);
        this.updateHeldItem(this.config.selectedItem);
        
        this.clothing.update(this.config);
        
        this.hair.updateConfig(this.config);
        this.hair.syncColor(this.config.hairColor);
    }
}
