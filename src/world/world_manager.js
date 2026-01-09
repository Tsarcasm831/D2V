import * as THREE from 'three';
import { CaveGenerator } from './cave_generator.js';
import { Shard } from './shard.js';
import { TownManager } from './town_manager.js';
import { SHARD_SIZE, WORLD_SEED, WORLD_SHARD_LIMIT } from './world_bounds.js';
import { WorldMask } from './world_mask.js';

export class WorldManager {
    constructor(scene, game = null) {
        this.scene = scene;
        this.game = game;
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
        this.caveGenerator = new CaveGenerator(this);
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
        
        // Show loading screen transition
        let loadingPromise = null;
        try {
            const { startLoadingSequence } = await import('../core/main.js');
            const characterData = window.gameInstance?.player?.characterData || {};
            const roomCode = window.gameInstance?.roomCode || 'Alpha';
            loadingPromise = startLoadingSequence(characterData, roomCode, true);
        } catch (e) {
            console.error("Failed to trigger loading sequence:", e);
        }

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

        // 4b. Force-discover key travel points (Yureigakure + Bowl Center) so they are always available
        if (window.gameInstance?.player) {
            const baseDiscover = ['Yureigakure', 'Yurei', 'Center of the Bowl (Yureigakure)'];
            if (!window.gameInstance.player.discoveredLocations) {
                window.gameInstance.player.discoveredLocations = new Set();
            }
            for (const loc of baseDiscover) {
                window.gameInstance.player.discoveredLocations.add(loc);
            }
        }

        // 5. Teleport player to saved position, city, or default
        if (window.gameInstance && window.gameInstance.player) {
            // Explicit start position: world coords [1501, -1393] (shard 125, -117)
            let spawnX = 1501;
            let spawnZ = -1393;

            // If we ever want to keep per-land persistence, we could re-enable it here,
            // but the requirement is to always start at the specified position.

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
            
            // Fast Travel System
            if (this.game?.player) {
                if (!this.game.player.discoveredLocations) {
                    this.game.player.discoveredLocations = new Set();
                }
                
                // Add discovery logic
                if (this.worldMask && this.worldMask.cities) {
                    for (const city of this.worldMask.cities) {
                        const dx = pos.x - city.worldX;
                        const dz = pos.z - city.worldZ;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        
                        if (dist < 100) {
                            if (!this.game.player.discoveredLocations.has(city.name)) {
                                this.game.player.discoveredLocations.add(city.name);
                                console.log(`Discovered: ${city.name}`);
                                if (this.game.player.discoveredLocations.size >= 3) {
                                    this.game.achievementManager?.unlock('explorer');
                                }
                            }
                            ui.innerHTML += ` | Location: <span style="color: #00aaff; font-weight: bold;">${city.name}</span>`;
                        }
                    }
                }
            }

            // Check if teleport buttons exist, if not create them
            if (!document.getElementById('fast-travel-container')) {
                const container = document.createElement('div');
                container.id = 'fast-travel-container';
                container.style.display = 'inline-flex';
                container.style.gap = '10px';
                container.style.marginLeft = '15px';
                container.style.pointerEvents = 'auto';
                
                // Discovered Locations Dropdown or List
                const ftBtn = document.createElement('button');
                ftBtn.textContent = 'Fast Travel';
                ftBtn.style.padding = '4px 8px';
                ftBtn.style.background = 'rgba(0, 255, 170, 0.3)';
                ftBtn.style.border = '1px solid #00ffaa';
                ftBtn.style.color = 'white';
                ftBtn.style.cursor = 'pointer';
                ftBtn.style.borderRadius = '4px';
                ftBtn.style.fontSize = '12px';
                
                ftBtn.onclick = () => {
                    if (!this.game || !this.game.player) {
                        console.warn('Game or player not available for fast travel');
                        return;
                    }
                    const locations = Array.from(this.game.player.discoveredLocations || []);
                    if (locations.length === 0) {
                        if (this.game.player.ui && this.game.player.ui.showStatus) {
                            this.game.player.ui.showStatus("No locations discovered yet!", true);
                        }
                        return;
                    }
                    
                    this.showFastTravelMenu(locations);
                };
                
                container.appendChild(ftBtn);
                ui.appendChild(container);
            }
        }
    }

    showFastTravelMenu(locations) {
        if (!this.fastTravelMenu) {
            this.fastTravelMenu = this.createFastTravelMenu();
            document.body.appendChild(this.fastTravelMenu.overlay);
        }

        const { overlay, listEl, messageEl } = this.fastTravelMenu;
        listEl.innerHTML = '';

        const cityMap = new Map();
        for (const city of this.worldMask?.cities || []) {
            cityMap.set(city.name, city);
        }

        locations.forEach(locName => {
            const city = cityMap.get(locName);
            if (!city) return;
            const btn = document.createElement('button');
            btn.textContent = city.name;
            btn.className = 'fast-travel-option';
            btn.onclick = () => {
                if (this.game?.player?.discoveredLocations?.has(city.name)) {
                    const { x: destX, z: destZ } = this.getTeleportCoords(city);
                    this.game.player.teleport(destX, destZ);
                    if (this.game.player.chat?.addMessage) {
                        this.game.player.chat.addMessage(`Teleported to ${city.name}`, 'System');
                    }
                    if (this.game.player.ui?.showStatus) {
                        this.game.player.ui.showStatus(`Teleported to ${city.name}`, false);
                    }
                } else if (this.game?.player?.ui?.showStatus) {
                    this.game.player.ui.showStatus(`Location not discovered: ${city.name}`, true);
                }
                overlay.style.display = 'none';
            };
            listEl.appendChild(btn);
        });

        if (locations.length === 0) {
            messageEl.textContent = 'No locations discovered yet!';
        } else {
            messageEl.textContent = 'Select a discovered location to travel:';
        }

        overlay.style.display = 'flex';
    }

    createFastTravelMenu() {
        const overlay = document.createElement('div');
        overlay.id = 'fast-travel-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.display = 'none';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1500';

        const panel = document.createElement('div');
        panel.style.background = '#0b1220';
        panel.style.border = '1px solid rgba(0, 255, 170, 0.4)';
        panel.style.boxShadow = '0 0 20px rgba(0,0,0,0.6)';
        panel.style.padding = '16px';
        panel.style.width = '280px';
        panel.style.borderRadius = '8px';
        panel.style.color = 'white';
        panel.style.fontFamily = 'monospace';

        const header = document.createElement('div');
        header.textContent = 'Fast Travel';
        header.style.fontSize = '16px';
        header.style.fontWeight = 'bold';
        header.style.marginBottom = '10px';
        header.style.color = '#00ffaa';

        const messageEl = document.createElement('div');
        messageEl.style.fontSize = '12px';
        messageEl.style.marginBottom = '10px';

        const listEl = document.createElement('div');
        listEl.id = 'fast-travel-list';
        listEl.style.display = 'flex';
        listEl.style.flexDirection = 'column';
        listEl.style.gap = '8px';
        listEl.style.maxHeight = '220px';
        listEl.style.overflowY = 'auto';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '12px';
        closeBtn.style.padding = '6px 10px';
        closeBtn.style.background = 'rgba(255,255,255,0.08)';
        closeBtn.style.border = '1px solid rgba(255,255,255,0.15)';
        closeBtn.style.color = 'white';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.borderRadius = '4px';
        closeBtn.onclick = () => {
            overlay.style.display = 'none';
        };

        panel.appendChild(header);
        panel.appendChild(messageEl);
        panel.appendChild(listEl);
        panel.appendChild(closeBtn);
        overlay.appendChild(panel);

        const style = document.createElement('style');
        style.textContent = `
            #fast-travel-overlay .fast-travel-option {
                padding: 8px 10px;
                background: rgba(0, 255, 170, 0.15);
                border: 1px solid rgba(0, 255, 170, 0.4);
                color: white;
                text-align: left;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.15s, transform 0.1s;
            }
            #fast-travel-overlay .fast-travel-option:hover {
                background: rgba(0, 255, 170, 0.25);
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);

        return { overlay, listEl, messageEl };
    }

    getTeleportCoords(city) {
        // Default to city world coords
        let x = city.worldX;
        let z = city.worldZ;

        // Special handling: Center of the Bowl in Yureigakure should land at the bowl center
        const nameLower = (city.name || '').toLowerCase();
        if (nameLower.includes('center of the bowl') || city.id === 'poi-center-bowl-yurei') {
            x = this.levelCenter?.x ?? 7509.5;
            z = this.levelCenter?.z ?? -6949.1;
        }

        return { x, z };
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

    getTerrainHeight(x, z, skipInterpolation = false) {
        // Cut out terrain outside the world mask
        if (this.worldMask && !this.worldMask.containsXZ(x, z)) {
            return -2.0; // Ocean/Void height
        }

        let h = 0;
        let inPond = false;

        // Apply pond flattening first
        for (const pond of this.ponds) {
            const dx = x - pond.x;
            const dz = z - pond.z;
            const distSq = dx * dx + dz * dz;
            const innerRadius = pond.radius * 0.95;
            const outerRadius = pond.radius * 1.1;
            
            if (distSq < innerRadius * innerRadius) {
                // Slightly below the water level for depth
                h = pond.y - 0.1;
                inPond = true;
                break;
            } else if (distSq < outerRadius * outerRadius) {
                const dist = Math.sqrt(distSq);
                const t = (dist - innerRadius) / (outerRadius - innerRadius);
                // Smootherstep for better blending
                const smoothT = t * t * t * (t * (t * 6 - 15) + 10);
                
                const baseH = this._getRawTerrainHeight(x, z);
                // Blend from pond basin depth to natural terrain
                const pondTargetH = pond.y - 0.1;
                h = pondTargetH * (1 - smoothT) + baseH * smoothT;
                inPond = true;
                break;
            }
        }

        if (!inPond) {
            h = this._getRawTerrainHeight(x, z);
        }

        if (skipInterpolation) return h;

        const sx = Math.floor((x + SHARD_SIZE / 2) / SHARD_SIZE);
        const sz = Math.floor((z + SHARD_SIZE / 2) / SHARD_SIZE);
        const shard = this.activeShards.get(`${sx},${sz}`);
        
        if (shard && shard.heights) {
            const segments = 12;
            const gridRes = segments + 1;
            const localX = x - shard.offsetX;
            const localZ = z - shard.offsetZ;
            
            // Map to grid index (0 to segments)
            const fj = (localX / SHARD_SIZE + 0.5) * segments;
            const fi = (localZ / SHARD_SIZE + 0.5) * segments;
            
            const j0 = Math.floor(fj);
            const i0 = Math.floor(fi);
            const j1 = Math.min(j0 + 1, segments);
            const i1 = Math.min(i0 + 1, segments);
            
            const tj = fj - j0;
            const ti = fi - i0;
            
            if (j0 >= 0 && j0 <= segments && i0 >= 0 && i0 <= segments) {
                const h00 = shard.heights[i0 * gridRes + j0];
                const h10 = shard.heights[i0 * gridRes + j1];
                const h01 = shard.heights[i1 * gridRes + j0];
                const h11 = shard.heights[i1 * gridRes + j1];
                
                const hRow0 = h00 * (1 - tj) + h10 * tj;
                const hRow1 = h01 * (1 - tj) + h11 * tj;
                return hRow0 * (1 - ti) + hRow1 * ti;
            }
        }

        return h;
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
        const landId = this.worldMask ? this.worldMask.landId : null;
        
        if (landId === 'Land15') {
            const cityX = (27.88521217690938 - 5.5) * 1500;
            const cityZ = (35.83878130952189 - 5.5) * 1500;
            const dx = x - cityX;
            const dz = z - cityZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const cityRadius = 600.0;
            const transition = 150.0;

            let cityInfluence = 1.0;
            if (dist < cityRadius) {
                cityInfluence = 0.0;
            } else if (dist < cityRadius + transition) {
                const t = (dist - cityRadius) / transition;
                cityInfluence = t * t * (3 - 2 * t);
            }

            const scale = 0.002;
            const h1 = Math.sin(x * scale) * Math.cos(z * scale * 1.2) * 20.0;
            const h2 = Math.sin(x * scale * 2.5 + 500) * Math.sin(z * scale * 2.1) * 10.0;
            const h3 = Math.cos(x * scale * 0.5) * 15.0;
            const hills = (h1 + h2 + h3) + 15.0;
            return hills * cityInfluence;
        }

        if (landId !== 'Land23') {
            return 0;
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
