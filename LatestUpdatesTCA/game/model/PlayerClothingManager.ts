
import * as THREE from 'three';
import { PlayerConfig, OutfitType } from '../../types';
import { PlayerMaterials } from './PlayerMaterials';
import { PlayerPartsRegistry } from './PlayerPartsRegistry';
import { ShirtBuilder } from './mesh/ShirtBuilder';
import { PantsBuilder } from './mesh/PantsBuilder';
import { ShoeBuilder } from './mesh/ShoeBuilder';
import { FootBuilder } from './mesh/FootBuilder';

export class PlayerClothingManager {
    private partsRegistry: PlayerPartsRegistry;
    private materials: PlayerMaterials;

    private shirtMeshes: THREE.Object3D[] = [];
    private pantsMeshes: THREE.Object3D[] = [];
    
    private lastShirtConfigHash: string = '';
    private lastPantsConfigHash: string = '';
    private lastShoeState: boolean | null = null;

    constructor(registry: PlayerPartsRegistry, materials: PlayerMaterials) {
        this.partsRegistry = registry;
        this.materials = materials;
    }

    applyOutfit(outfit: OutfitType, skinColor: string) {
        this.materials.applyOutfit(outfit, skinColor);
    }

    update(config: PlayerConfig) {
        this.updatePants(config);
        this.updateShirt(config);
        this.updateShoes(config);
    }

    private updateShirt(config: PlayerConfig) {
        const hash = `${config.outfit}_${config.shirtColor}_${config.shirtColor2}_${config.bodyType}_${config.equipment.shirt}`;
        if (hash === this.lastShirtConfigHash) return;
        this.lastShirtConfigHash = hash;

        // Cleanup old shirt
        if (this.partsRegistry.parts.shirt) this.partsRegistry.parts.shirt = null;

        this.shirtMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
        });
        this.shirtMeshes = [];

        // Build new shirt
        const result = ShirtBuilder.build(this.partsRegistry.parts, config);
        if (result) {
            this.shirtMeshes = result.meshes;
            this.partsRegistry.parts.shirt = result.refs;
        }
    }

    private updatePants(config: PlayerConfig) {
        const hash = `${config.outfit}_${config.equipment.pants}_${config.pantsColor}`;
        if (hash === this.lastPantsConfigHash) return;
        this.lastPantsConfigHash = hash;

        this.pantsMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
        });
        this.pantsMeshes = [];

        const meshes = PantsBuilder.build(this.partsRegistry.parts, config);
        if (meshes) {
            this.pantsMeshes = meshes;
        }
    }

    private updateShoes(config: PlayerConfig) {
        const currentShoes = config.equipment.shoes;
        if (currentShoes === this.lastShoeState) return;
        this.lastShoeState = currentShoes;

        const removeGroups = (groups: THREE.Group[]) => {
            groups.forEach(g => {
                if (g.parent) g.parent.remove(g);
                g.traverse(c => {
                    if (c instanceof THREE.Mesh) c.geometry.dispose();
                });
            });
        };

        // Clear existing feet/shoes arrays in registry
        removeGroups(this.partsRegistry.forefootGroups);
        removeGroups(this.partsRegistry.heelGroups);
        this.partsRegistry.forefootGroups.length = 0;
        this.partsRegistry.heelGroups.length = 0;
        this.partsRegistry.toeUnits.length = 0; // Cleared as FootBuilder populates it

        // Helper to attach new foot parts
        const attachFoot = (isLeft: boolean, shin: THREE.Group) => {
            const oldFoot = shin.children.find(c => c.name.includes('_foot_anchor') || c.name.includes('_heel'));
            if (oldFoot) shin.remove(oldFoot);

            // Create temporary arrays to capture output, then push to registry
            const arrays = {
                forefootGroups: [],
                heelGroups: [],
                toeUnits: []
            };

            const result = currentShoes 
                ? ShoeBuilder.create(this.materials, isLeft, arrays)
                : FootBuilder.create(this.materials, isLeft, arrays);
            
            const footOffsetY = -0.42; // shinLen
            result.heelGroup.position.y = footOffsetY;
            shin.add(result.heelGroup);

            // Update Registry
            // @ts-ignore
            this.partsRegistry.forefootGroups.push(...arrays.forefootGroups);
            // @ts-ignore
            this.partsRegistry.heelGroups.push(...arrays.heelGroups);
            // @ts-ignore
            this.partsRegistry.toeUnits.push(...arrays.toeUnits);
        };

        attachFoot(false, this.partsRegistry.parts.rightShin);
        attachFoot(true, this.partsRegistry.parts.leftShin);
    }
}
