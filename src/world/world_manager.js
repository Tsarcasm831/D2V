import * as THREE from 'three';
import { Shard } from './shard.js';
import { TownManager } from './town_manager.js';
import { SHARD_SIZE, WORLD_SEED, WORLD_SHARD_LIMIT } from './world_bounds.js';
import { WorldMask } from './world_mask.js';

export class WorldManager {
    constructor(scene) {
        this.scene = scene;
        const PLATEAU_X = 7509.5;
        const PLATEAU_Z = -6949.1;
        this.levelCenter = new THREE.Vector3(PLATEAU_X, 0, PLATEAU_Z);
        this.worldMask = null;
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

    async loadLand(landData) {
        if (!landData) return;
        
        // Save current position for the land we are leaving
        if (this.worldMask && window.gameInstance && window.gameInstance.player) {
            const pos = window.gameInstance.player.mesh.position;
            window.gameInstance.landPositions[this.worldMask.landId] = {
                x: pos.x,
                y: pos.y,
                z: pos.z
            };
        }

        console.log(`WorldManager: Loading land ${landData.name || landData.id}`);

        // 1. Clear existing shards
        for (const shard of this.activeShards.values()) {
            if (shard.groundMesh) {
                const idx = this.terrainMeshes.indexOf(shard.groundMesh);
                if (idx !== -1) this.terrainMeshes.splice(idx, 1);
            }
            shard.destroy();
        }
        this.activeShards.clear();
        this.shardQueue = [];
        this.lastShardCoord = { x: null, z: null };

        // 2. Reset caches
        this.heightCache.clear();
        this.biomeNoiseCache.clear();
        this.ponds = [];
        this._needsCacheUpdate = true;

        // 3. Update WorldMask
        this.worldMask = new WorldMask(landData);

        // 4. Update TownManager seed
        this.townManager.initialize(this.worldMask.seed);

        // 5. Teleport player to saved position, city, or default
        if (window.gameInstance && window.gameInstance.player) {
            const savedPos = window.gameInstance.landPositions[landData.id];
            let spawnX = 0;
            let spawnZ = 0;
            
            if (savedPos) {
                spawnX = savedPos.x;
                spawnZ = savedPos.z;
            } else if (this.worldMask.cities && this.worldMask.cities.length > 0) {
                spawnX = this.worldMask.cities[0].worldX;
                spawnZ = this.worldMask.cities[0].worldZ;
            }
            
            window.gameInstance.player.teleport(spawnX, spawnZ);
        }

        // 6. Notify game of land change
        if (window.gameInstance && window.gameInstance.onLandLoaded) {
            window.gameInstance.onLandLoaded(landData.id);
        }

        console.log(`WorldManager: Land ${landData.id} loaded.`);
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
                // Far shards update much less frequently (approx every 0.5s)
                shard._farUpdateTimer = (shard._farUpdateTimer || 0) + delta;
                if (shard._farUpdateTimer >= 0.5) {
                    shard.update(shard._farUpdateTimer, player, this.isGridVisible);
                    shard._farUpdateTimer = 0;
                }
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
        
        // Clear instead of re-allocating to reduce GC pressure
        this._cachedNPCs.length = 0;
        this._cachedFauna.length = 0;
        this._cachedResources.length = 0;
        this._cachedItems.length = 0;
        
        this.stats.resourceCount = 0;
        this.stats.npcCount = 0;
        this.stats.faunaCount = 0;
        this.stats.hostileCount = 0;
        
        // Use for...of instead of entries() or forEach for performance
        for (const shard of this.activeShards.values()) {
            const nLen = shard.npcs.length;
            if (nLen > 0) {
                for (let i = 0; i < nLen; i++) {
                    const n = shard.npcs[i];
                    this._cachedNPCs.push(n);
                    if (n.isEnemy && !n.isDead) this.stats.hostileCount++;
                }
                this.stats.npcCount += nLen;
            }
            
            const fLen = shard.fauna.length;
            if (fLen > 0) {
                for (let i = 0; i < fLen; i++) {
                    const f = shard.fauna[i];
                    this._cachedFauna.push(f);
                    if (f.isEnemy && !f.isDead) this.stats.hostileCount++;
                }
                this.stats.faunaCount += fLen;
            }
            
            const rLen = shard.resources.length;
            if (rLen > 0) {
                for (let i = 0; i < rLen; i++) {
                    const r = shard.resources[i];
                    this._cachedResources.push(r);
                    if (!r.isDead) this.stats.resourceCount++;
                }
            }
            
            const iLen = shard.items.length;
            if (iLen > 0) {
                for (let i = 0; i < iLen; i++) {
                    this._cachedItems.push(shard.items[i]);
                }
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
            
            // Check for nearby cities from Land23
            if (this.worldMask && this.worldMask.cities) {
                const currentWorldX = pos.x;
                const currentWorldZ = pos.z;
                
                for (const city of this.worldMask.cities) {
                    const dx = currentWorldX - city.worldX;
                    const dz = currentWorldZ - city.worldZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    
                    // If within 100 units of a city, show its name
                    if (dist < 100) {
                        ui.innerHTML += ` | Location: <span style="color: #00aaff; font-weight: bold;">${city.name}</span>`;
                        break;
                    }
                }
            }

            // Check if teleport buttons exist, if not create them
            if (!document.getElementById('tp-shard-btn')) {
                const btnContainer = document.createElement('div');
                btnContainer.style.display = 'inline-flex';
                btnContainer.style.gap = '10px';
                btnContainer.style.marginLeft = '15px';
                btnContainer.style.pointerEvents = 'auto';

                const tpBtn = document.createElement('button');
                tpBtn.id = 'tp-shard-btn';
                tpBtn.textContent = 'TP: Shard (80, -108)';
                tpBtn.style.padding = '4px 8px';
                tpBtn.style.background = 'rgba(0, 170, 255, 0.3)';
                tpBtn.style.border = '1px solid var(--primary)';
                tpBtn.style.color = 'white';
                tpBtn.style.cursor = 'pointer';
                tpBtn.style.borderRadius = '4px';
                tpBtn.style.fontSize = '12px';
                tpBtn.onclick = async () => {
                    if (window.gameInstance && window.gameInstance.player) {
                        const targetX = 80 * SHARD_SIZE;
                        const targetZ = -108 * SHARD_SIZE;
                        window.gameInstance.player.teleport(targetX, targetZ);

                        // Spawn assassin at the destination
                        const sx = 80;
                        const sz = -108;
                        const key = `${sx},${sz}`;
                        
                        // Ensure the shard is loaded or available
                        let shard = this.activeShards.get(key);
                        if (!shard) {
                            shard = new Shard(this.scene, sx, sz, this);
                            this.activeShards.set(key, shard);
                            if (shard.groundMesh) this.terrainMeshes.push(shard.groundMesh);
                            this.invalidateCache();
                        }

                        const { AssassinNPC } = await import('../entities/enemy_npc_assassin_1.js');
                        const spawnPos = new THREE.Vector3(targetX, this.getTerrainHeight(targetX, targetZ), targetZ);
                        const assassin = new AssassinNPC(this.scene, shard, spawnPos);
                        shard.npcs.push(assassin);
                        this.invalidateCache();
                    }
                };

                const tpYureiBtn = document.createElement('button');
                tpYureiBtn.id = 'tp-yurei-btn';
                tpYureiBtn.textContent = 'TP: YUREI';
                tpYureiBtn.style.padding = '4px 8px';
                tpYureiBtn.style.background = 'rgba(170, 0, 255, 0.3)';
                tpYureiBtn.style.border = '1px solid #aa00ff';
                tpYureiBtn.style.color = 'white';
                tpYureiBtn.style.cursor = 'pointer';
                tpYureiBtn.style.borderRadius = '4px';
                tpYureiBtn.style.fontSize = '12px';
                tpYureiBtn.onclick = () => {
                    if (window.gameInstance && window.gameInstance.player) {
                        const PLATEAU_X = 7509.5;
                        const PLATEAU_Z = -6949.1;
                        if (this.levelCenter) {
                            this.levelCenter.set(PLATEAU_X, 0, PLATEAU_Z);
                        }
                        window.gameInstance.player.teleport(PLATEAU_X, PLATEAU_Z);
                    }
                };

                btnContainer.appendChild(tpBtn);
                btnContainer.appendChild(tpYureiBtn);
                ui.appendChild(btnContainer);
            }
        }
    }

    getBiomeNoise(x, z, scaleOverride = null) {
        // Quick lookup for cache to avoid BigInt and complex keys if possible
        const keyX = Math.round(x * 10);
        const keyZ = Math.round(z * 10);
        
        // Optimization: Use numeric key to avoid string allocation
        // Map keys from +/- 500,000 range to unique safe integer
        const offset = 500000;
        const numKey = (keyX + offset) * 1000000 + (keyZ + offset);
        
        if (this.biomeNoiseCache.has(numKey)) return this.biomeNoiseCache.get(numKey);
        
        // Shared noise logic for all systems
        const scale = scaleOverride !== null ? scaleOverride : 0.005; 
        const ox = x * scale;
        const oz = z * scale;
        
        // Seeded noise logic
        const seed = this.worldMask ? (this.worldMask.seed % 10000) : 0;
        
        // Simplified noise for performance (3 octaves instead of 5)
        const v1 = Math.sin(ox + seed) + Math.sin(oz + seed);
        const v2 = Math.sin((ox * 2.1 + oz * 0.5) + seed) * 0.5;
        const v3 = Math.cos((ox * 0.7 - oz * 1.3) + seed) * 0.25;
        
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
        // Only Land23 has complex terrain features (plateaus, canyons, mountains)
        const isLand23 = this.worldMask && this.worldMask.landId === 'Land23';
        if (!isLand23) {
            return 0; // All other lands are flat
        }

        const PLATEAU_X = 7509.5;
        const PLATEAU_Z = -6949.1;
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
        // High-performance numeric cache key using Float32 rounding
        // Round to 0.1 precision to balance quality vs cache hits
        const rx = Math.round(x * 10);
        const rz = Math.round(z * 10);
        
        // Optimization: Use numeric key to avoid string allocation
        // Map rx, rz from +/- 500,000 range to unique safe integer
        // (rx + offset) * multiplier + (rz + offset)
        const offset = 500000;
        const numKey = (rx + offset) * 1000000 + (rz + offset);
        
        const cached = this.heightCache.get(numKey);
        if (cached !== undefined) return cached;

        // Use land config if available
        const config = this.worldMask ? this.worldMask.config : {};
        const baseH_config = config.baseHeight !== undefined ? config.baseHeight : 0;
        const multiplier = config.heightMultiplier !== undefined ? config.heightMultiplier : 1.0;
        const noiseScale = config.noiseScale !== undefined ? config.noiseScale : 0.005;

        const h = this.getBiomeNoise(x, z, noiseScale);
        let height = 0;
        
        if (h < 0.15) {
            const t = h * 6.666;
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
            const peakH = (h - 0.6) * 2.5;
            height = 8.0 + (peakH * peakH * Math.sqrt(peakH)) * 40.0;
        }

        const finalHeight = (height * multiplier) + baseH_config + (Math.sin(x * 0.5) * Math.cos(z * 0.5)) * 0.15;
        
        if (this.heightCache.size > 2000) {
            // Faster than clearing the whole map
            const keys = this.heightCache.keys();
            for (let i = 0; i < 500; i++) this.heightCache.delete(keys.next().value);
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
            if (!n || (!n.group && !n.mesh)) continue;
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
            if (!f || (!f.group && !f.mesh)) continue;
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
            if (!r || (!r.group && !r.mesh)) continue;
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
            if (!item || (!item.group && !item.mesh)) continue;
            const entityPos = (item.group || item.mesh).position;
            if (entityPos.distanceToSquared(pos) < radSq) {
                this._nearbyItemsResult.push(item);
            }
        }
        return this._nearbyItemsResult;
    }
}