import * as THREE from 'three';
import { SHARD_SIZE, WORLD_SHARD_LIMIT } from './world_bounds.js';

export class ShardMap {
    constructor(player, worldManager) {
        this.player = player;
        this.worldManager = worldManager;
        this.container = document.getElementById('shard-map-container');
        this.canvas = document.getElementById('shard-map-canvas');
        this.coordEl = document.getElementById('map-coords');
        this.shardEl = document.getElementById('map-shard');
        this.ctx = this.canvas.getContext('2d');
        this.visible = false;

        // Configuration
        this.worldLimit = WORLD_SHARD_LIMIT;
        this.worldSize = this.worldLimit * 2;
        this.cacheScale = 4; // Pixels per shard in cache
        this.updateInterval = 1000 / 60; // Max 60 FPS

        // Performance caches
        this.noiseCacheArray = new Float32Array(this.worldSize * this.worldSize).fill(-1.0);
        this.cachedShardsArray = new Uint8Array(this.worldSize * this.worldSize);
        
        // Offscreen terrain cache
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.worldSize * this.cacheScale;
        this.offscreenCanvas.height = this.worldSize * this.cacheScale;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.terrainImageData = this.offscreenCtx.createImageData(this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        // Initialize cache with base color
        this.initTerrainImageData();

        this.terrainImage = new Image();
        this.terrainImage.src = '../../assets/textures/snow_texture.png';
        this.terrainPattern = null;
        this.terrainImage.onload = () => {
            this.terrainPattern = this.ctx.createPattern(this.terrainImage, 'repeat');
        };
        
        this.visitedShards = new Set();
        this.discoveryBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
        this.peakDistance = 0;

        this.scale = 0.5; // units to pixels
        this.zoom = 1.0;
        this.needsResize = true;
        this.lastUiUpdateTime = 0;
        this.lastRenderX = 0;
        this.lastRenderZ = 0;
        this.lastRenderZoom = 0;
        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / 60; // Max 60 FPS for map

        // Static biome color lookup for batching
        this.biomeColors = [
            'rgba(40, 60, 40, 0.8)',  // Swamp
            'rgba(100, 80, 60, 0.7)', // Dirt
            'rgba(60, 80, 40, 0.6)',  // Forest
            'rgba(80, 120, 60, 0.5)', // Steppes
            'rgba(255, 255, 255, 0.0)' // Snow
        ];
        this.needsImageDataUpdate = true;
        this.isCachingComplete = false;
        this.cachingProgress = 0;
        this.onCachingComplete = null;

        this.setupListeners();
    }

    async preCacheWorld(onProgress) {
        const totalShards = this.worldSize * this.worldSize;
        let processed = 0;
        const batchSize = 500; // Process in chunks to avoid blocking UI

        for (let x = -this.worldLimit; x < this.worldLimit; x++) {
            for (let z = -this.worldLimit; z < this.worldLimit; z++) {
                this.renderShardToCache(x, z);
                processed++;
                
                if (processed % batchSize === 0) {
                    this.cachingProgress = processed / totalShards;
                    if (onProgress) onProgress(this.cachingProgress);
                    await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
                }
            }
        }
        
        this.isCachingComplete = true;
        this.cachingProgress = 1.0;
        if (onProgress) onProgress(1.0);
        if (this.onCachingComplete) this.onCachingComplete();
    }

    initTerrainImageData() {
        const d = this.terrainImageData.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i] = 238; d[i+1] = 242; d[i+2] = 246; d[i+3] = 255;
        }
        this.offscreenCtx.putImageData(this.terrainImageData, 0, 0);
    }

    clearCache() {
        this.cachedShardsArray.fill(0);
        this.noiseCacheArray.fill(-1.0);
        this.initTerrainImageData();
    }

    setupListeners() {
        this.container.addEventListener('wheel', (e) => {
            if (!this.visible) return;
            e.preventDefault();
            const zoomSpeed = 0.2;
            this.zoom *= (e.deltaY < 0) ? (1 + zoomSpeed) : (1 - zoomSpeed);
            this.zoom = Math.max(0.005, Math.min(10, this.zoom));
        }, { passive: false });
    }

    toggle() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'flex' : 'none';
        if (this.visible) {
            this.needsResize = true;
            if (this.player.game?.minimap) this.player.game.minimap.container.style.display = 'none';
        } else {
            if (this.player.game?.minimap?.visible) this.player.game.minimap.container.style.display = 'block';
        }
    }

    getTerrainNoise(x, z) {
        if (this.worldManager && this.worldManager.getBiomeNoise) {
            return this.worldManager.getBiomeNoise(x, z);
        }
        // Fallback noise logic (matching WorldManager.js exactly)
        const scale = 0.005; // Reduced from 0.02 for much larger biomes
        const nx = x * scale, nz = z * scale;
        
        // Layered noise (octaves) with more variance
        const v1 = Math.sin(nx) + Math.sin(nz);
        const v2 = Math.sin(nx * 2.1 + nz * 0.5) * 0.5;
        const v3 = Math.cos(nx * 0.7 - nz * 1.3) * 0.25;
        const v4 = Math.sin(Math.sqrt(nx*nx + nz*nz) * 0.5) * 0.5;
        const v5 = Math.sin(nx * 4.0) * Math.cos(nz * 4.0) * 0.125; // Extra detail layer
        
        const combined = (v1 + v2 + v3 + v4 + v5 + 2.125) / 4.25;
        return THREE.MathUtils.clamp(combined, 0, 1);
    }

    getTerrainColor(h) {
        if (h < 0.15) return this.biomeColors[0];
        if (h < 0.3) return this.biomeColors[1];
        if (h < 0.45) return this.biomeColors[2];
        if (h < 0.6) return this.biomeColors[3];
        return this.biomeColors[4];
    }

    getBiomeName(h) {
        if (h < 0.15) return 'Murky Swamp';
        if (h < 0.3) return 'Dirt Plains';
        if (h < 0.45) return 'Forest Edge';
        if (h < 0.6) return 'Grassy Steppes';
        return 'Frozen Peaks';
    }

    renderShardToCache(x, z) {
        const arrayX = x + this.worldLimit;
        const arrayZ = z + this.worldLimit;
        if (arrayX < 0 || arrayX >= this.worldSize || arrayZ < 0 || arrayZ >= this.worldSize) return;
        
        const idx = arrayZ * this.worldSize + arrayX;
        if (this.cachedShardsArray[idx] === 1) return;

        // Mask check for ShardMap
        if (this.worldManager && this.worldManager.worldMask && !this.worldManager.worldMask.containsShard(x, z)) {
            // Render as deep water/void
            const data = this.terrainImageData.data;
            const width = this.offscreenCanvas.width;
            const sX = arrayX * this.cacheScale;
            const sY = arrayZ * this.cacheScale;
            for (let dy = 0; dy < this.cacheScale; dy++) {
                for (let dx = 0; dx < this.cacheScale; dx++) {
                    const pIdx = ((sY + dy) * width + (sX + dx)) * 4;
                    data[pIdx] = 5; data[pIdx+1] = 10; data[pIdx+2] = 20; data[pIdx+3] = 255;
                }
            }
            this.cachedShardsArray[idx] = 1;
            this.needsImageDataUpdate = true;
            return;
        }

        const h = this.getTerrainNoise(x * SHARD_SIZE, z * SHARD_SIZE);
        let r, g, b, a;
        if (h < 0.15) { r = 40; g = 60; b = 40; a = 204; }
        else if (h < 0.3) { r = 100; g = 80; b = 60; a = 178; }
        else if (h < 0.45) { r = 60; g = 80; b = 40; a = 153; }
        else if (h < 0.6) { r = 80; g = 120; b = 60; a = 127; }
        else { r = 240; g = 244; b = 248; a = 255; }

        const data = this.terrainImageData.data;
        const width = this.offscreenCanvas.width;
        const sX = arrayX * this.cacheScale;
        const sY = arrayZ * this.cacheScale;

        for (let dy = 0; dy < this.cacheScale; dy++) {
            for (let dx = 0; dx < this.cacheScale; dx++) {
                const pIdx = ((sY + dy) * width + (sX + dx)) * 4;
                const alpha = a / 255;
                data[pIdx] = Math.floor(r * alpha + 238 * (1 - alpha));
                data[pIdx+1] = Math.floor(g * alpha + 242 * (1 - alpha));
                data[pIdx+2] = Math.floor(b * alpha + 246 * (1 - alpha));
                data[pIdx+3] = 255;
            }
        }
        this.cachedShardsArray[idx] = 1;
        this.needsImageDataUpdate = true;
    }

    update() {
        if (!this.visible || !this.player?.mesh) return;

        const now = performance.now();
        const px = this.player.mesh.position.x;
        const pz = this.player.mesh.position.z;
        const curShardX = Math.floor((px + SHARD_SIZE / 2) / SHARD_SIZE);
        const curShardZ = Math.floor((pz + SHARD_SIZE / 2) / SHARD_SIZE);

        const hasMoved = Math.abs(px - this.lastRenderX) > 0.5 || Math.abs(pz - this.lastRenderZ) > 0.5;
        const hasZoomed = Math.abs(this.zoom - this.lastRenderZoom) > 0.01;

        if (!hasMoved && !hasZoomed && !this.needsResize && (now - this.lastUpdateTime < this.updateInterval)) return;

        this.lastUpdateTime = now;
        this.lastRenderX = px;
        this.lastRenderZ = pz;
        this.lastRenderZoom = this.zoom;

        if (this.needsResize) {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.scale = Math.min(this.canvas.width, this.canvas.height) / (SHARD_SIZE * 5.5);
            this.needsResize = false;
        }

        if (now - this.lastUiUpdateTime > 100) {
            this.updateUI(px, pz, curShardX, curShardZ);
            this.lastUiUpdateTime = now;
        }

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const effectiveScale = this.scale * this.zoom;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);

        const visibleW = Math.ceil(width / (SHARD_SIZE * effectiveScale)) + 2;
        const visibleH = Math.ceil(height / (SHARD_SIZE * effectiveScale)) + 2;
        const startX = Math.max(-this.worldLimit, curShardX - Math.ceil(visibleW / 2));
        const endX = Math.min(this.worldLimit - 1, curShardX + Math.ceil(visibleW / 2));
        const startZ = Math.max(-this.worldLimit, curShardZ - Math.ceil(visibleH / 2));
        const endZ = Math.min(this.worldLimit - 1, curShardZ + Math.ceil(visibleH / 2));

        if (this.zoom < 0.8) {
            // Cache mode
            const sX = (startX + this.worldLimit) * this.cacheScale;
            const sZ = (startZ + this.worldLimit) * this.cacheScale;
            const sW = (endX - startX + 1) * this.cacheScale;
            const sH = (endZ - startZ + 1) * this.cacheScale;

            const dX = (startX * SHARD_SIZE - px) * effectiveScale - (SHARD_SIZE * effectiveScale) / 2;
            const dZ = (startZ * SHARD_SIZE - pz) * effectiveScale - (SHARD_SIZE * effectiveScale) / 2;
            const dW = (endX - startX + 1) * SHARD_SIZE * effectiveScale;
            const dH = (endZ - startZ + 1) * SHARD_SIZE * effectiveScale;

            if (this.needsImageDataUpdate) {
                this.offscreenCtx.putImageData(this.terrainImageData, 0, 0);
                this.needsImageDataUpdate = false;
            }
            ctx.drawImage(this.offscreenCanvas, sX, sZ, sW, sH, dX, dZ, dW, dH);
        } else {
            // Detailed mode
            const sSize = SHARD_SIZE * effectiveScale;
            const batches = { [this.biomeColors[0]]: [], [this.biomeColors[1]]: [], [this.biomeColors[2]]: [], [this.biomeColors[3]]: [], [this.biomeColors[4]]: [] };
            const glintsX = [], glintsZ = [];

            for (let x = startX; x <= endX; x++) {
                for (let z = startZ; z <= endZ; z++) {
                    // Skip detailed rendering for masked shards
                    if (this.worldManager && this.worldManager.worldMask && !this.worldManager.worldMask.containsShard(x, z)) continue;

                    const sx = (x * SHARD_SIZE - px) * effectiveScale - sSize / 2;
                    const sz = (z * SHARD_SIZE - pz) * effectiveScale - sSize / 2;
                    const h = this.getTerrainNoise(x * SHARD_SIZE, z * SHARD_SIZE);
                    batches[this.getTerrainColor(h)].push(sx, sz);

                    if (this.zoom > 0.5) {
                        const gn = Math.abs(Math.sin(x * 3.1 + z * 7.9));
                        if (gn > 0.92) {
                            glintsX.push(sx + sSize / 2 + (gn - 0.95) * sSize);
                            glintsZ.push(sz + sSize / 2 + (gn - 0.98) * sSize);
                        }
                    }
                }
            }

            if (this.terrainPattern) {
                ctx.fillStyle = this.terrainPattern;
                const pScale = 0.5 * this.zoom;
                ctx.save();
                ctx.scale(pScale, pScale);
                const invP = 1 / pScale;
                ctx.fillRect((startX * SHARD_SIZE - px) * effectiveScale * invP - (sSize * 0.5 * invP), (startZ * SHARD_SIZE - pz) * effectiveScale * invP - (sSize * 0.5 * invP), (endX - startX + 1) * SHARD_SIZE * effectiveScale * invP, (endZ - startZ + 1) * SHARD_SIZE * effectiveScale * invP);
                ctx.restore();
            }

            for (const color in batches) {
                const b = batches[color]; if (b.length === 0) continue;
                ctx.fillStyle = color; ctx.beginPath();
                for (let i = 0; i < b.length; i += 2) ctx.rect(b[i], b[i+1], sSize, sSize);
                ctx.fill();
            }

            if (glintsX.length > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.beginPath();
                for (let i = 0; i < glintsX.length; i++) ctx.rect(glintsX[i], glintsZ[i], 2, 2);
                ctx.fill();
            }
        }

        // Grid & Entities
        if (this.zoom > 0.1) {
            const sSize = SHARD_SIZE * effectiveScale;
            ctx.fillStyle = 'rgba(0, 170, 255, 0.15)';
            ctx.fillRect((curShardX * SHARD_SIZE - px) * effectiveScale - sSize/2, (curShardZ * SHARD_SIZE - pz) * effectiveScale - sSize/2, sSize, sSize);
            
            ctx.strokeStyle = 'rgba(0, 170, 255, 0.4)';
            ctx.lineWidth = Math.max(1, 2 * this.zoom);
            ctx.beginPath();
            for (let x = startX; x <= endX; x++) {
                const sx = (x * SHARD_SIZE - px) * effectiveScale - sSize / 2;
                ctx.moveTo(sx, (startZ * SHARD_SIZE - pz) * effectiveScale - sSize/2);
                ctx.lineTo(sx, (endZ * SHARD_SIZE - pz) * effectiveScale + sSize/2);
            }
            for (let z = startZ; z <= endZ; z++) {
                const sz = (z * SHARD_SIZE - pz) * effectiveScale - sSize / 2;
                ctx.moveTo((startX * SHARD_SIZE - px) * effectiveScale - sSize/2, sz);
                ctx.lineTo((endX * SHARD_SIZE - px) * effectiveScale + sSize/2, sz);
            }
            ctx.stroke();
        }

        if (this.zoom > 0.05) this.drawEntities(ctx, px, pz, effectiveScale, width, height);
        this.drawPlayerIndicator(ctx);
        
        // Draw Yurei marker (visible at all times)
        if (this.worldManager && this.worldManager.worldMask && this.worldManager.worldMask.cities) {
            const yurei = this.worldManager.worldMask.cities.find(c => c.id === 'City-1');
            if (yurei) {
                const yx = (yurei.worldX - px) * effectiveScale;
                const yz = (yurei.worldZ - pz) * effectiveScale;
                
                // Draw a special glowing marker for Yurei
                ctx.save();
                
                // Glow effect
                const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
                const glowSize = 10 + pulse * 5;
                const gradient = ctx.createRadialGradient(yx, yz, 0, yx, yz, glowSize);
                gradient.addColorStop(0, 'rgba(170, 0, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(170, 0, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(yx, yz, glowSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Center dot
                ctx.fillStyle = '#aa00ff';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(yx, yz, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Label
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'black';
                ctx.fillText('YUREI', yx, yz - 12);
                
                ctx.restore();
            }
        }

        ctx.restore();

        this.drawCompass(ctx, width, height);
        this.drawScale(ctx, width, height, effectiveScale);
    }

    updateUI(px, pz, curShardX, curShardZ) {
        if (this.coordEl) this.coordEl.textContent = `Pos: ${Math.round(px)}, ${Math.round(pz)}`;
        if (this.shardEl) this.shardEl.textContent = `Shard: ${curShardX}, ${curShardZ}`;

        const key = `${curShardX},${curShardZ}`;
        if (!this.visitedShards.has(key)) {
            this.visitedShards.add(key);
            this.discoveryBounds.minX = Math.min(this.discoveryBounds.minX, curShardX);
            this.discoveryBounds.maxX = Math.max(this.discoveryBounds.maxX, curShardX);
            this.discoveryBounds.minZ = Math.min(this.discoveryBounds.minZ, curShardZ);
            this.discoveryBounds.maxZ = Math.max(this.discoveryBounds.maxZ, curShardZ);
            this.renderShardToCache(curShardX, curShardZ);
        }

        this.peakDistance = Math.max(this.peakDistance, Math.sqrt(px * px + pz * pz));
        const stats = this.worldManager.stats;
        
        const updateText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        updateText('stats-biome', this.getBiomeName(this.getTerrainNoise(curShardX * SHARD_SIZE, curShardZ * SHARD_SIZE)));
        updateText('stats-shards-visited', this.visitedShards.size);
        updateText('stats-active-shards', this.worldManager.activeShards.size);
        updateText('stats-peak-dist', `${Math.round(this.peakDistance)}m`);
        updateText('stats-total-area', `${(this.visitedShards.size * SHARD_SIZE * SHARD_SIZE).toLocaleString()} m²`);
        updateText('stats-discovery-bounds', `[${this.discoveryBounds.minX},${this.discoveryBounds.minZ}] → [${this.discoveryBounds.maxX},${this.discoveryBounds.maxZ}]`);
        updateText('stats-res-count', stats.resourceCount);
        updateText('stats-npc-count', stats.npcCount);
        updateText('stats-fauna-count', stats.faunaCount);
        updateText('stats-hostile-count', stats.hostileCount);

        const fill = document.getElementById('stats-discovery-fill');
        if (fill) fill.style.width = `${Math.max(2, Math.min(100, (this.visitedShards.size / 1000) * 100))}%`;
    }

    drawEntities(ctx, px, pz, effectiveScale, width, height) {
        const mapRadius = (Math.max(width, height) / effectiveScale) * 0.6;
        const resources = this.worldManager.getNearbyResources(this.player.mesh.position, mapRadius);
        const npcs = this.worldManager.getNearbyNPCs(this.player.mesh.position, mapRadius);
        const fauna = this.worldManager.getNearbyFauna(this.player.mesh.position, mapRadius);

        // Batch by type/color
        const batches = {};

        resources.forEach(res => {
            if (res.isDead) return;
            const rx = (res.group.position.x - px) * effectiveScale;
            const rz = (res.group.position.z - pz) * effectiveScale;
            if (Math.abs(rx) > width/2 + 20 || Math.abs(rz) > height/2 + 20) return;

            let color, dotSize;
            if (res.type === 'tree') { color = '#2d5a27'; dotSize = 1.5 * this.zoom; }
            else if (res.type === 'berry_bush') { color = '#e91e63'; dotSize = 2 * this.zoom; }
            else if (res.type === 'gold') { color = '#ffd700'; dotSize = 3 * this.zoom; }
            else if (res.type === 'silver') { color = '#bdc3c7'; dotSize = 2.5 * this.zoom; }
            else { color = '#757575'; dotSize = 2 * this.zoom; }
            
            const batchKey = `${color}_${dotSize}`;
            if (!batches[batchKey]) batches[batchKey] = { color, dotSize, points: [] };
            batches[batchKey].points.push(rx, rz);
        });

        const allEntities = [...npcs, ...fauna];
        allEntities.forEach(npc => {
            if (npc.isDead) return;
            const pos = npc.group ? npc.group.position : npc.mesh.position;
            const nx = (pos.x - px) * effectiveScale;
            const nz = (pos.z - pz) * effectiveScale;
            if (Math.abs(nx) > width/2 + 20 || Math.abs(nz) > height/2 + 20) return;

            const dotSize = 3 * this.zoom;
            let color;
            if (npc.type === 'humanoid') color = '#9c27b0';
            else color = npc.isEnemy ? '#f44336' : '#2196f3';
            
            const batchKey = `npc_${color}_${dotSize}`;
            if (!batches[batchKey]) batches[batchKey] = { color, dotSize, points: [], isNpc: true, isEnemy: npc.isEnemy };
            batches[batchKey].points.push(nx, nz);
        });

        // Execute batches
        for (const key in batches) {
            const batch = batches[key];
            ctx.fillStyle = batch.color;
            ctx.beginPath();
            const pts = batch.points;
            for (let i = 0; i < pts.length; i += 2) {
                const x = pts[i];
                const z = pts[i+1];
                ctx.moveTo(x + batch.dotSize, z);
                ctx.arc(x, z, batch.dotSize, 0, Math.PI * 2);
            }
            ctx.fill();

            // Pulse for enemies
            if (batch.isEnemy && this.zoom > 0.5) {
                const pulseRadius = (batch.dotSize * 2) + Math.sin(Date.now() * 0.01) * batch.dotSize * 0.5;
                ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < pts.length; i += 2) {
                    const x = pts[i];
                    const z = pts[i+1];
                    ctx.moveTo(x + pulseRadius, z);
                    ctx.arc(x, z, pulseRadius, 0, Math.PI * 2);
                }
                ctx.stroke();
            }
        }
    }

    drawPlayerIndicator(ctx) {
        ctx.save();
        const fv = new THREE.Vector3(); this.player.mesh.getWorldDirection(fv);
        ctx.rotate(Math.atan2(fv.x, -fv.z));
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(-10, 8); ctx.lineTo(0, 3); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
        ctx.restore();
    }

    drawCompass(ctx, w, h) {
        ctx.save(); ctx.translate(w - 50, h - 50);
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText('N', 0, -18); ctx.fillText('S', 0, 24); ctx.fillText('E', 22, 4); ctx.fillText('W', -22, 4);
        const fv = new THREE.Vector3(); this.player.mesh.getWorldDirection(fv);
        ctx.rotate(Math.atan2(fv.x, -fv.z));
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(5, 0); ctx.lineTo(0, 15); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fillStyle = '#00aaff'; ctx.fill();
        ctx.restore();
    }

    drawScale(ctx, w, h, scale) {
        const p = 50, m = Math.round(p / scale);
        ctx.save(); ctx.translate(20, h - 30);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 0); ctx.lineTo(p, 0); ctx.lineTo(p, -5); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText(`${m}m`, p/2 - 10, -8);
        ctx.restore();
    }
}