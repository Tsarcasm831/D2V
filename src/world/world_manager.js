import * as THREE from 'three';
import { Shard } from './shard.js';
import { SHARD_SIZE, WORLD_SHARD_LIMIT } from './world_bounds.js';
import { WorldMask } from './world_mask.js';

export class WorldManager {
    constructor(scene) {
        this.scene = scene;
        this.worldMask = new WorldMask();
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
        
        // Use a simpler check or throttle this if needed, 
        // but for now, we'll keep the full update when invalidated.
        
        this._cachedNPCs.length = 0;
        this._cachedFauna.length = 0;
        this._cachedResources.length = 0;
        this._cachedItems.length = 0;
        
        this.stats.resourceCount = 0;
        this.stats.npcCount = 0;
        this.stats.faunaCount = 0;
        this.stats.hostileCount = 0;
        
        for (const shard of this.activeShards.values()) {
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
        if (ui) ui.innerHTML = `Shard Coordinate: ${sx}, ${sz}`;
    }

    getBiomeNoise(x, z) {
        // Use higher precision for biome noise to avoid blocky transitions
        // 0.1 unit precision (multiply by 10)
        const keyX = (x * 10 + 300000) | 0;
        const keyZ = (z * 10 + 300000) | 0;
        const numKey = BigInt(keyX) << 32n | BigInt(keyZ);
        
        if (this.biomeNoiseCache.has(numKey)) return this.biomeNoiseCache.get(numKey);

        // Shared noise logic for all systems
        const scale = 0.02;
        const nx = x * scale, nz = z * scale;
        
        // Simplex-like layered noise (octaves)
        const v1 = Math.sin(nx) + Math.sin(nz);
        const v2 = Math.sin(nx * 2.1 + nz * 0.5) * 0.5;
        const v3 = Math.cos(nx * 0.7 - nz * 1.3) * 0.25;
        const v4 = Math.sin(Math.sqrt(nx*nx + nz*nz) * 0.5) * 0.5;
        
        const combined = (v1 + v2 + v3 + v4 + 2) / 4;
        const result = THREE.MathUtils.clamp(combined, 0, 1);

        if (this.biomeNoiseCache.size > 10000) {
            // Remove oldest entries instead of clearing all
            const keys = this.biomeNoiseCache.keys();
            for (let i = 0; i < 1000; i++) {
                this.biomeNoiseCache.delete(keys.next().value);
            }
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
        // Increased precision to 0.01 (multiply by 100) to eliminate height stepping during movement
        const cacheX = (x * 100 + 3000000) | 0;
        const cacheZ = (z * 100 + 3000000) | 0;
        const numKey = BigInt(cacheX) << 32n | BigInt(cacheZ);
        
        if (this.heightCache.has(numKey)) return this.heightCache.get(numKey);

        const h = this.getBiomeNoise(x, z);
        let height = 0;
        
        // Define height based on biome thresholds with continuous transitions
        // 0.0 - 0.15: Swamp (Low, slightly submerged)
        // 0.15 - 0.3: Dirt Plains (Flatlands)
        // 0.3 - 0.45: Forest (Rolling hills)
        // 0.45 - 0.6: Grassy Steppes (Steeper hills)
        // 0.6 - 1.0: Frozen Peaks (Mountains)

        if (h < 0.15) {
            // Swamp: -1.0 to -0.25
            height = -1.0 + (h / 0.15) * 0.75;
        } else if (h < 0.3) {
            // Plains: -0.25 to 0.5
            height = -0.25 + ((h - 0.15) / 0.15) * 0.75;
        } else if (h < 0.45) {
            // Forest: 0.5 to 3.0
            height = 0.5 + ((h - 0.3) / 0.15) * 2.5;
        } else if (h < 0.6) {
            // Steppes: 3.0 to 8.0
            height = 3.0 + ((h - 0.45) / 0.15) * 5.0;
        } else {
            // Peaks: 8.0 to 48.0 (exponential)
            const peakH = (h - 0.6) / 0.4;
            height = 8.0 + peakH * peakH * 40.0;
        }

        // Add fine detail noise for ground texture
        const detail = (Math.sin(x * 0.5) * Math.cos(z * 0.5)) * 0.2;
        
        const finalHeight = height + detail;
        
        // Limit cache size
        if (this.heightCache.size > 10000) {
            const keys = this.heightCache.keys();
            for (let i = 0; i < 1000; i++) {
                this.heightCache.delete(keys.next().value);
            }
        }
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
            if (entityPos.distanceToSquared(pos) < radSq) {
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