import * as THREE from 'three';
import { ShirtBuilder } from './mesh/ShirtBuilder.js';
import { PantsBuilder } from './mesh/PantsBuilder.js';
import { ShoeBuilder } from './mesh/ShoeBuilder.js';
import { FootBuilder } from './mesh/FootBuilder.js';

export class PlayerClothingManager {
    constructor(registry, materials) {
        this.partsRegistry = registry;
        this.materials = materials;

        this.shirtMeshes = [];
        this.pantsMeshes = [];
        
        this.lastShirtConfigHash = '';
        this.lastPantsConfigHash = '';
        this.lastShoeState = null;
    }

    applyOutfit(outfit, skinColor) {
        this.materials.applyOutfit(outfit, skinColor);
    }

    update(config) {
        this.updatePants(config);
        this.updateShirt(config);
        this.updateShoes(config);
    }

    updateShirt(config) {
        const hash = `${config.outfit}_${config.shirtColor}_${config.shirtColor2}_${config.bodyType}_${config.equipment.shirt}`;
        if (hash === this.lastShirtConfigHash) return;
        this.lastShirtConfigHash = hash;

        // Cleanup old shirt
        if (this.partsRegistry.parts.shirt) this.partsRegistry.parts.shirt = null;

        this.shirtMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            if (m.geometry) m.geometry.dispose();
        });
        this.shirtMeshes = [];

        // Build new shirt
        const result = ShirtBuilder.build(this.partsRegistry.parts, config);
        if (result) {
            this.shirtMeshes = result.meshes;
            this.partsRegistry.parts.shirt = result.refs;
        }
    }

    updatePants(config) {
        const hash = `${config.outfit}_${config.equipment.pants}_${config.pantsColor}`;
        if (hash === this.lastPantsConfigHash) return;
        this.lastPantsConfigHash = hash;

        this.pantsMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            if (m.geometry) m.geometry.dispose();
        });
        this.pantsMeshes = [];

        const meshes = PantsBuilder.build(this.partsRegistry.parts, config);
        if (meshes) {
            this.pantsMeshes = meshes;
        }
    }

    updateShoes(config) {
        const currentShoes = config.equipment.shoes;
        if (currentShoes === this.lastShoeState) return;
        this.lastShoeState = currentShoes;

        const removeGroups = (groups) => {
            groups.forEach(g => {
                if (g.parent) g.parent.remove(g);
                g.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
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
        const attachFoot = (isLeft, shin) => {
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
            this.partsRegistry.forefootGroups.push(...arrays.forefootGroups);
            this.partsRegistry.heelGroups.push(...arrays.heelGroups);
            this.partsRegistry.toeUnits.push(...arrays.toeUnits);
        };

        if (this.partsRegistry.parts.rightShin) attachFoot(false, this.partsRegistry.parts.rightShin);
        if (this.partsRegistry.parts.leftShin) attachFoot(true, this.partsRegistry.parts.leftShin);
    }
}
