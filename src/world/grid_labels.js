import * as THREE from 'three';

import { SHARD_SIZE } from './world_bounds.js';

/**
 * Manages unique coordinate labels for the world grid.
 * Designed to be lag-free by using an object pool and texture caching.
 */
export class GridLabelManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.pool = [];
        this.textureCache = new Map();
        this.gridStep = 5.0; // Aligned with GridHelper(3000, 600) in game.js
        this.labelRange = 25; // Slightly increased range for 5-unit grid
        
        this.lastUpdate = 0;
        this.updateInterval = 200; // Update labels at 5Hz
        this.lastPlayerPos = new THREE.Vector3();
    }

    /**
     * Retrieves or creates a canvas texture for the given coordinate text.
     */
    getLabelTexture(text) {
        if (this.textureCache.has(text)) return this.textureCache.get(text);
        
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        
        // Draw a subtle background for the label
        ctx.fillStyle = 'rgba(10, 20, 40, 0.4)';
        const pad = 5;
        ctx.beginPath();
        ctx.roundRect(pad, pad, 160 - pad * 2, 80 - pad * 2, 8);
        ctx.fill();
        
        // Draw the text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Primary text (Grid Coords)
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillStyle = '#66ccff'; // Light blue color to match grid
        ctx.fillText(text.split('\n')[0], 80, 25);
        
        // Secondary text (Shard Coords)
        ctx.font = '16px "Courier New", monospace';
        ctx.fillStyle = '#aaaaaa'; 
        ctx.fillText(text.split('\n')[1], 80, 55);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        this.textureCache.set(text, texture);
        return texture;
    }

    /**
     * Updates label visibility and positions based on player location.
     */
    update(playerPos, isGridVisible) {
        if (!isGridVisible) {
            if (this.group.visible) this.group.visible = false;
            return;
        }
        
        const now = performance.now();
        const distSq = playerPos.distanceToSquared(this.lastPlayerPos);
        
        // Only update if grid visibility changed, time passed, or player moved significantly
        if (this.group.visible && (now - this.lastUpdate < this.updateInterval) && distSq < 1.0) {
            return;
        }
        
        this.lastUpdate = now;
        this.lastPlayerPos.copy(playerPos);
        this.group.visible = true;

        const range = this.labelRange;
        const step = this.gridStep;
        
        // Determine the range of grid indices around the player
        const minIX = Math.floor((playerPos.x - range) / step);
        const maxIX = Math.ceil((playerPos.x + range) / step);
        const minIZ = Math.floor((playerPos.z - range) / step);
        const maxIZ = Math.ceil((playerPos.z + range) / step);

        let activeIndex = 0;
        const rangeSq = range * range;

        for (let ix = minIX; ix <= maxIX; ix++) {
            for (let iz = minIZ; iz <= maxIZ; iz++) {
                // Calculate center of this specific grid square
                const squareCenterX = ix * step + step / 2;
                const squareCenterZ = iz * step + step / 2;
                
                // Distance check for circular range
                const dx = squareCenterX - playerPos.x;
                const dz = squareCenterZ - playerPos.z;
                if (dx * dx + dz * dz > rangeSq) continue;

                // Calculate shard coordinates
                const sx = Math.floor((squareCenterX + SHARD_SIZE / 2) / SHARD_SIZE);
                const sz = Math.floor((squareCenterZ + SHARD_SIZE / 2) / SHARD_SIZE);

                // Create a unique label based on grid index and shard index
                const labelText = `${ix},${iz}\n[${sx},${sz}]`;
                
                let sprite;
                if (activeIndex < this.pool.length) {
                    sprite = this.pool[activeIndex];
                    sprite.visible = true;
                } else {
                    const mat = new THREE.SpriteMaterial({ 
                        transparent: true,
                        depthWrite: false, // Avoid transparency sorting artifacts
                        depthTest: true
                    });
                    sprite = new THREE.Sprite(mat);
                    sprite.scale.set(1.6, 0.8, 1);
                    this.group.add(sprite);
                    this.pool.push(sprite);
                }

                // Apply texture
                const tex = this.getLabelTexture(labelText);
                if (sprite.material.map !== tex) {
                    sprite.material.map = tex;
                    sprite.material.needsUpdate = true;
                }
                
                // Float slightly above the grid to avoid Z-fighting
                const height = this.scene.worldManager ? this.scene.worldManager.getTerrainHeight(squareCenterX, squareCenterZ) : 0;
                sprite.position.set(squareCenterX, height + 0.25, squareCenterZ);
                activeIndex++;
            }
        }

        // Hide any unused sprites in the pool
        for (let i = activeIndex; i < this.pool.length; i++) {
            this.pool[i].visible = false;
        }
    }
}