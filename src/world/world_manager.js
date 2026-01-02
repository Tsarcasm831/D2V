import * as THREE from 'three';
import { Shard } from './shard.js';
import { TownManager } from './town_manager.js';
import { SHARD_SIZE, WORLD_SEED, WORLD_SHARD_LIMIT } from './world_bounds.js';
import { WorldMask } from './world_mask.js';

export class WorldManager {
    constructor(scene) {
        this.scene = scene;
        this.worldMask = new WorldMask();
        this.townManager = new TownManager(this);
        this.activeShards = new Map(); // key: "x,z", value: Shard instance
        this.terrainMeshes = []; // NEW: Array of terrain meshes for raycasting
        this.lastShardCoord = { x: null, z: null };
        
        // Cached entity lists
        this._cachedNPCs = [];
        this._cachedFauna = [];
        this._cachedResources = [];
        this._cachedItems = [];
        
        // Spatial hash for faster lookups
        this.shardGrid = new Map(); // key: "x,z", value: Shard
        
        // Pre-calculated stats for UI/Maps
        this.stats = {
            resourceCount: 0,
            npcCount: 0,
            faunaCount: 0,
            hostileCount: 0
        };
        
        this._needsCacheUpdate = true;
        this.shardQueue = []; // NEW: Queue for progressive shard loading
        
        this.heightCache = new Map(); // Cache for terrain height checks
        this.biomeNoiseCache = new Map(); // Cache for biome noise
        this.textureCache = new Map();
        this.textureLoader = new THREE.TextureLoader();
        this.materialCache = new Map();
        this.geometryCache = new Map();

        // Reusable result arrays to reduce GC pressure
        this._nearbyNPCsResult = [];
        this._nearbyFaunaResult = [];
        this._nearbyResourcesResult = [];
        this._nearbyItemsResult = [];
        this.ponds = []; // Cache for active ponds to flatten terrain

        // Load data files
        this.itemsData = null;
        this.lootTables = null;
        this.plantsData = null;
        this.statsData = null;
        
        this.loadData();
        this.townManager.initialize(WORLD_SEED);
    }

    async loadData() {
        try {
            const [items, loot, plants, stats] = await Promise.all([
                fetch('data/items.json').then(r => r.json()),
                fetch('data/loot_tables.json').then(r => r.json()),
                fetch('data/plants.json').then(r => r.json()),
                fetch('data/stats.json').then(r => r.json())
            ]);
            this.itemsData = items;
            this.lootTables = loot;
            this.plantsData = plants;
            this.statsData = stats;
            console.log('WorldManager: Data files loaded successfully');
        } catch (e) {
            console.error('WorldManager: Error loading data files', e);
        }
    }

    clearHeightCache() {
        this.heightCache.clear();
        this._needsCacheUpdate = true;
    }

    getTexture(path) {
        if (this.textureCache.has(path)) return this.textureCache.get(path);
        const tex = this.textureLoader.load(path);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1); // Reset to 1,1; shader handles world-space tiling
        this.textureCache.set(path, tex);
        return tex;
    }

    getSharedMaterial(type, config = {}) {
        const cacheKey = `${type}_${JSON.stringify(config)}`;
        if (this.materialCache.has(cacheKey)) return this.materialCache.get(cacheKey);

        let mat;
        switch (type) {
            case 'standard':
                mat = new THREE.MeshStandardMaterial(config);
                break;
            case 'toon':
                mat = new THREE.MeshToonMaterial(config);
                break;
            case 'basic':
                mat = new THREE.MeshBasicMaterial(config);
                break;
            default:
                mat = new THREE.MeshStandardMaterial(config);
        }
        this.materialCache.set(cacheKey, mat);
        return mat;
    }

    getSharedGeometry(type, ...params) {
        const cacheKey = JSON.stringify({ type, params });
        if (this.geometryCache.has(cacheKey)) return this.geometryCache.get(cacheKey);

        let geo;
        switch (type) {
            case 'box': geo = new THREE.BoxGeometry(...params); break;
            case 'cylinder': geo = new THREE.CylinderGeometry(...params); break;
            case 'cone': geo = new THREE.ConeGeometry(...params); break;
            case 'sphere': geo = new THREE.SphereGeometry(...params); break;
            case 'tetrahedron': geo = new THREE.TetrahedronGeometry(...params); break;
            case 'dodecahedron': geo = new THREE.DodecahedronGeometry(...params); break;
            case 'torus': geo = new THREE.TorusGeometry(...params); break;
            default: geo = new THREE.BufferGeometry();
        }
        this.geometryCache.set(cacheKey, geo);
        return geo;
    }

    update(player, delta) {
        if (!player || !player.mesh) return;
        const playerPos = player.mesh.position;
        const sx = Math.floor((playerPos.x + SHARD_SIZE / 2) / SHARD_SIZE);
        const sz = Math.floor((playerPos.z + SHARD_SIZE / 2) / SHARD_SIZE);

        if (sx !== this.lastShardCoord.x || sz !== this.lastShardCoord.z) {
            this.updateShards(sx, sz);
            this.lastShardCoord = { x: sx, z: sz };
            this.updateLocationUI(playerPos);
        }

        this.activeShards.forEach((shard) => {
            const dist = Math.max(Math.abs(shard.gridX - this.lastShardCoord.x), Math.abs(shard.gridZ - this.lastShardCoord.z));
            
            // Only update logic for shards within 2 units, others are "dormant" or update less often
            if (dist <= 2) {
                shard.update(delta, player, this.isGridVisible);
            } else if (dist <= 4) {
                // Far shards only update time-based things or animations occasionally
                if (Math.random() < 0.2) shard.update(delta * 5, player, this.isGridVisible);
            }
        });

        // Process shard queue (1 per frame max)
        if (this.shardQueue.length > 0) {
            const { x, z, key } = this.shardQueue.shift();
            if (!this.activeShards.has(key)) {
                const shard = new Shard(this.scene, x, z, this);
                this.activeShards.set(key, shard);
                if (shard.groundMesh) this.terrainMeshes.push(shard.groundMesh);
                this.invalidateCache();
            }
        }
    }

    setGridVisibility(visible) {
        this.isGridVisible = visible;
    }

    invalidateCache() {
        this._needsCacheUpdate = true;
    }

    _updateEntityCaches() {
        if (!this._needsCacheUpdate) return;
        
        this._cachedNPCs.length = 0;
        this._cachedFauna.length = 0;
        this._cachedResources.length = 0;
        this._cachedItems.length = 0;
        
        this.stats.resourceCount = 0;
        this.stats.npcCount = 0;
        this.stats.faunaCount = 0;
        this.stats.hostileCount = 0;
        
        for (const [key, shard] of this.activeShards.entries()) {
            const nLen = shard.npcs.length;
            if (nLen > 0) {
                this._cachedNPCs.push(...shard.npcs);
                this.stats.npcCount += nLen;
                for (let i = 0; i < nLen; i++) {
                    const n = shard.npcs[i];
                    if (n.isEnemy && !n.isDead) this.stats.hostileCount++;
                }
            }
            
            const fLen = shard.fauna.length;
            if (fLen > 0) {
                this._cachedFauna.push(...shard.fauna);
                this.stats.faunaCount += fLen;
                for (let i = 0; i < fLen; i++) {
                    const f = shard.fauna[i];
                    if (f.isEnemy && !f.isDead) this.stats.hostileCount++;
                }
            }
            
            const rLen = shard.resources.length;
            if (rLen > 0) {
                this._cachedResources.push(...shard.resources);
                for (let i = 0; i < rLen; i++) {
                    if (!shard.resources[i].isDead) this.stats.resourceCount++;
                }
            }
            
            const iLen = shard.items.length;
            if (iLen > 0) {
                this._cachedItems.push(...shard.items);
            }
        }
        
        this._needsCacheUpdate = false;
    }

    updateShards(centerX, centerZ) {
        const viewDist = 4;
        const newKeys = new Set();
        let changed = false;

        // Clean up queue of keys that are no longer in view
        this.shardQueue = this.shardQueue.filter(item => {
            const dist = Math.max(Math.abs(item.x - centerX), Math.abs(item.z - centerZ));
            return dist <= viewDist;
        });

        for (let x = centerX - viewDist; x <= centerX + viewDist; x++) {
            if (x < -WORLD_SHARD_LIMIT || x > WORLD_SHARD_LIMIT) continue;
            
            for (let z = centerZ - viewDist; z <= centerZ + viewDist; z++) {
                if (z < -WORLD_SHARD_LIMIT || z > WORLD_SHARD_LIMIT) continue;

                // Skip shards outside the world mask
                if (this.worldMask && !this.worldMask.containsShard(x, z)) continue;

                const key = `${x},${z}`;
                newKeys.add(key);
                if (!this.activeShards.has(key) && !this.shardQueue.some(q => q.key === key)) {
                    // Queue for creation instead of immediate load
                    this.shardQueue.push({ x, z, key, distSq: (x - centerX)**2 + (z - centerZ)**2 });
                }
            }
        }

        // Sort queue by proximity
        this.shardQueue.sort((a, b) => a.distSq - b.distSq);

        for (const [key, shard] of this.activeShards.entries()) {
            if (!newKeys.has(key)) {
                if (shard.groundMesh) {
                    const idx = this.terrainMeshes.indexOf(shard.groundMesh);
                    if (idx !== -1) this.terrainMeshes.splice(idx, 1);
                }
                shard.destroy();
                this.activeShards.delete(key);
                changed = true;
            }
        }
        
        if (changed) this.invalidateCache();
    }

    updateLocationUI(pos) {
        const sx = Math.floor((pos.x + SHARD_SIZE / 2) / SHARD_SIZE);
        const sz = Math.floor((pos.z + SHARD_SIZE / 2) / SHARD_SIZE);
        const ui = document.getElementById('location-display');
        if (ui) {
            ui.innerHTML = `Shard Coordinate: ${sx}, ${sz}`;
            
            // Check if teleport button exists, if not create it
            if (!document.getElementById('tp-shard-btn')) {
                const tpBtn = document.createElement('button');
                tpBtn.id = 'tp-shard-btn';
                tpBtn.textContent = 'Teleport to Shard (80, -108)';
                tpBtn.style.marginLeft = '15px';
                tpBtn.style.padding = '4px 8px';
                tpBtn.style.background = 'rgba(0, 170, 255, 0.3)';
                tpBtn.style.border = '1px solid var(--primary)';
                tpBtn.style.color = 'white';
                tpBtn.style.cursor = 'pointer';
                tpBtn.style.borderRadius = '4px';
                tpBtn.style.fontSize = '12px';
                tpBtn.style.pointerEvents = 'auto';
                tpBtn.onclick = () => {
                    if (window.gameInstance && window.gameInstance.player) {
                        const targetX = 80 * SHARD_SIZE;
                        const targetZ = -108 * SHARD_SIZE;
                        window.gameInstance.player.teleport(targetX, targetZ);
                    }
                };
                tpBtn.innerText = "TP TO YUREIGAKURE";
                ui.appendChild(tpBtn);
            }
        }
    }

    getBiomeNoise(x, z) {
        // Quick lookup for cache to avoid BigInt and complex keys if possible
        const keyX = (x * 10 + 300000) | 0;
        const keyZ = (z * 10 + 300000) | 0;
        const numKey = (keyX << 16) ^ keyZ; // Simpler hash key
        
        if (this.biomeNoiseCache.has(numKey)) return this.biomeNoiseCache.get(numKey);
        
        // Shared noise logic for all systems
        const scale = 0.005; 
        const ox = x * scale;
        const oz = z * scale;
        
        // Simplified noise for performance (3 octaves instead of 5)
        const v1 = Math.sin(ox) + Math.sin(oz);
        const v2 = Math.sin(ox * 2.1 + oz * 0.5) * 0.5;
        const v3 = Math.cos(ox * 0.7 - oz * 1.3) * 0.25;
        
        const combined = (v1 + v2 + v3 + 1.75) / 3.5;
        const result = combined < 0 ? 0 : (combined > 1 ? 1 : combined);

        if (this.biomeNoiseCache.size > 5000) {
            this.biomeNoiseCache.clear();
        }
        this.biomeNoiseCache.set(numKey, result);

        return result;
    }

    getTerrainHeight(x, z) {
        // Cut out terrain outside the world mask
        if (this.worldMask && !this.worldMask.containsXZ(x, z)) {
            return -2.0; // Ocean/Void height
        }

        // Apply pond flattening first
        for (const pond of this.ponds) {
            const dx = x - pond.x;
            const dz = z - pond.z;
            const distSq = dx * dx + dz * dz;
            const innerRadius = pond.radius * 0.95;
            const outerRadius = pond.radius * 1.1;
            
            if (distSq < innerRadius * innerRadius) {
                // Slightly below the water level for depth
                return pond.y - 0.1;
            } else if (distSq < outerRadius * outerRadius) {
                const dist = Math.sqrt(distSq);
                const t = (dist - innerRadius) / (outerRadius - innerRadius);
                // Smootherstep for better blending
                const smoothT = t * t * t * (t * (t * 6 - 15) + 10);
                
                const baseH = this._getRawTerrainHeight(x, z);
                // Blend from pond basin depth to natural terrain
                const pondTargetH = pond.y - 0.1;
                return pondTargetH * (1 - smoothT) + baseH * smoothT;
            }
        }
        return this._getRawTerrainHeight(x, z);
    }

    getTerrainNormal(x, z) {
        const eps = 0.1;
        const hL = this.getTerrainHeight(x - eps, z);
        const hR = this.getTerrainHeight(x + eps, z);
        const hD = this.getTerrainHeight(x, z - eps);
        const hU = this.getTerrainHeight(x, z + eps);
        
        const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
        return normal;
    }

    _getRawTerrainHeight(x, z) {
        const PLATEAU_X = 4800;
        const PLATEAU_Z = -6480;
        const dx = x - PLATEAU_X;
        const dz = z - PLATEAU_Z;

        // Influence logic for the entire elevated area (Plateau + Mountains)
        const regionRadius = 150.0; // Shards are 60 units, so ~2.5 shards radius
        const regionTransition = 30.0;
        const distSq = dx * dx + dz * dz;
        const dist = Math.sqrt(distSq);

        let areaInfluence = 0;
        if (dist < regionRadius + regionTransition) {
            if (dist < regionRadius) {
                areaInfluence = 1;
            } else {
                const t = (dist - regionRadius) / regionTransition;
                areaInfluence = 1 - (t * t * (3 - 2 * t));
            }
        }

        // Canyon logic
        const canyonHalfWidth = 15.0;
        const canyonTransitionWidth = 10.0;
        const canyonLength = 240.0;
        const canyonHalfLength = canyonLength / 2;
        const absDx = Math.abs(dx);
        const absDz = Math.abs(dz);
        let canyonInfluence = 0;
        if (absDx < canyonHalfWidth + canyonTransitionWidth && absDz < canyonHalfLength) {
            if (absDx < canyonHalfWidth) {
                canyonInfluence = 1;
            } else {
                const t = (absDx - canyonHalfWidth) / canyonTransitionWidth;
                canyonInfluence = 1 - (t * t * (3 - 2 * t));
            }
        }

        const baseH = this._getBaseTerrainHeight(x, z);
        if (areaInfluence <= 0 && canyonInfluence <= 0) return baseH;

        // Structured area features
        const plateauRadiusSq = 6561.0; // 81 * 81
        const bottomLevel = 20.0;
        const plateauSurfaceH = 36.0;

        // Randomized mountain noise
        const mountainNoise = (Math.sin(x * 0.1) * Math.cos(z * 0.15)) * 12.0 +
                             (Math.sin(x * 0.25) * Math.sin(z * 0.2)) * 6.0 +
                             (Math.cos(x * 0.05 + z * 0.05)) * 8.0;
        const noisyBaseH = baseH + mountainNoise + 30.0;

        let targetH;
        if (distSq < plateauRadiusSq) {
            const bowlRadiusSq = 5184.0;
            const bowlCenterRadiusSq = 2025.0;
            if (distSq < bowlCenterRadiusSq) {
                targetH = bottomLevel;
            } else if (distSq < bowlRadiusSq) {
                const d = Math.sqrt(distSq);
                const t = (d - 45.0) / 27.0;
                targetH = bottomLevel + (plateauSurfaceH - bottomLevel) * (t * t * (3 - 2 * t));
            } else {
                targetH = plateauSurfaceH;
            }
        } else {
            targetH = noisyBaseH;
        }

        // Blend features with canyon
        if (canyonInfluence > 0) {
            targetH = targetH * (1 - canyonInfluence) + bottomLevel * canyonInfluence;
        }

        // Final smooth blend of the entire area into the world
        return baseH * (1 - areaInfluence) + targetH * areaInfluence;
    }

    _getBaseTerrainHeight(x, z) {
        // High-performance numeric cache key
        const cx = (x * 10) | 0;
        const cz = (z * 10) | 0;
        const numKey = (cx << 16) ^ cz;
        
        if (this.heightCache.has(numKey)) return this.heightCache.get(numKey);

        const h = this.getBiomeNoise(x, z);
        let height = 0;
        
        if (h < 0.15) {
            const t = h * 6.666; // / 0.15
            height = -1.0 + (t * t * (3 - 2 * t)) * 0.75;
        } else if (h < 0.3) {
            const t = (h - 0.15) * 6.666;
            height = -0.25 + (t * t) * 0.75;
        } else if (h < 0.45) {
            const t = (h - 0.3) * 6.666;
            height = 0.5 + t * 2.5 + Math.sin(t * 6.283) * 0.5;
        } else if (h < 0.6) {
            const t = (h - 0.45) * 6.666;
            const steps = ((t * 3) | 0) * 0.333;
            height = 3.0 + steps * 5.0 + (t - steps) * 2.0;
        } else {
            const peakH = (h - 0.6) * 2.5; // / 0.4
            height = 8.0 + (peakH * peakH * Math.sqrt(peakH)) * 40.0;
        }

        const finalHeight = height + (Math.sin(x * 0.5) * Math.cos(z * 0.5)) * 0.15;
        
        if (this.heightCache.size > 5000) this.heightCache.clear();
        this.heightCache.set(numKey, finalHeight);
        
        return finalHeight;
    }

    getNearbyNPCs(pos, radius = 20) { 
        this._updateEntityCaches(); 
        if (!pos) return this._cachedNPCs;
        
        this._nearbyNPCsResult.length = 0;
        const radSq = radius * radius;
        for (let i = 0; i < this._cachedNPCs.length; i++) {
            const n = this._cachedNPCs[i];
            const entityPos = (n.group || n.mesh).position;
            const distSq = entityPos.distanceToSquared(pos);
            
            if (distSq < radSq) {
                this._nearbyNPCsResult.push(n);
            }
        }
        return this._nearbyNPCsResult;
    }
    getNearbyFauna(pos, radius = 20) { 
        this._updateEntityCaches(); 
        if (!pos) return this._cachedFauna;
        
        this._nearbyFaunaResult.length = 0;
        const radSq = radius * radius;
        for (let i = 0; i < this._cachedFauna.length; i++) {
            const f = this._cachedFauna[i];
            const entityPos = (f.group || f.mesh).position;
            if (entityPos.distanceToSquared(pos) < radSq) {
                this._nearbyFaunaResult.push(f);
            }
        }
        return this._nearbyFaunaResult;
    }
    getNearbyResources(pos, radius = 20) { 
        this._updateEntityCaches(); 
        if (!pos) return this._cachedResources;
        
        this._nearbyResourcesResult.length = 0;
        const radSq = radius * radius;
        for (let i = 0; i < this._cachedResources.length; i++) {
            const r = this._cachedResources[i];
            const entityPos = (r.group || r.mesh).position;
            if (entityPos.distanceToSquared(pos) < radSq) {
                this._nearbyResourcesResult.push(r);
            }
        }
        return this._nearbyResourcesResult;
    }
    getNearbyItems(pos, radius = 10) { 
        this._updateEntityCaches(); 
        if (!pos) return this._cachedItems;
        
        this._nearbyItemsResult.length = 0;
        const radSq = radius * radius;
        for (let i = 0; i < this._cachedItems.length; i++) {
            const item = this._cachedItems[i];
            const entityPos = (item.group || item.mesh).position;
            if (entityPos.distanceToSquared(pos) < radSq) {
                this._nearbyItemsResult.push(item);
            }
        }
        return this._nearbyItemsResult;
    }
}