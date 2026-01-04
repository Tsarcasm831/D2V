import { getSeededRandom, getShardSeed } from '../utils/seeded_random.js';
import { SHARD_SIZE, WORLD_SEED, WORLD_SHARD_LIMIT } from './world_bounds.js';

export class TownManager {
    constructor(worldManager) {
        this.worldManager = worldManager;
        this.towns = new Map(); // key: "sx,sz", value: townData
        this.shardToTown = new Map(); // key: "sx,sz", value: townId
        this.initialized = false;
    }

    initialize(seed = WORLD_SEED) {
        // Reset state for new land
        this.towns.clear();
        this.shardToTown.clear();
        
        const rng = getSeededRandom(seed);
        this.generateTownLocations(rng);
        this.initialized = true;
    }

    generateTownLocations(rng) {
        const minDistanceShards = 5;
        const townCount = 10; // Number of towns to try to place
        const candidates = [];

        // Simple approach: try to find valid shards for towns
        for (let i = 0; i < 100; i++) { // Max attempts to find locations
            if (candidates.length >= townCount) break;

            const sx = Math.floor((rng() - 0.5) * WORLD_SHARD_LIMIT * 2);
            const sz = Math.floor((rng() - 0.5) * WORLD_SHARD_LIMIT * 2);

            // 1. Check world mask
            if (this.worldManager.worldMask && !this.worldManager.worldMask.containsShard(sx, sz)) continue;

            // 2. Check distance to existing towns
            let tooClose = false;
            for (const cand of candidates) {
                const dist = Math.max(Math.abs(cand.sx - sx), Math.abs(cand.sz - sz));
                if (dist < minDistanceShards) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                const townId = `town_${sx}_${sz}`;
                const townData = this.generateTownData(sx, sz, townId, rng);
                candidates.push({ sx, sz, data: townData });
                this.towns.set(`${sx},${sz}`, townData);
                
                // Map shards that are part of this town
                // For now, towns are 1x1 shards, but can be expanded
                this.shardToTown.set(`${sx},${sz}`, townId);
            }
        }
        console.log(`TownManager: Generated ${this.towns.size} towns.`);
    }

    generateTownData(sx, sz, id, rng) {
        // Basic town metadata
        const town = {
            id,
            sx,
            sz,
            name: `Town of ${id}`,
            buildings: [],
            roads: []
        };

        // Simple cross road
        town.roads.push({ type: 'main', axis: 'x' });
        town.roads.push({ type: 'main', axis: 'z' });

        // Place a few buildings around center
        const buildingTypes = ['tavern', 'blacksmith', 'well', 'hut', 'windmill'];
        const count = 3 + Math.floor(rng() * 4);

        for (let i = 0; i < count; i++) {
            const type = buildingTypes[Math.floor(rng() * buildingTypes.length)];
            // Local offset within shard (-0.4 to 0.4 of SHARD_SIZE)
            const ox = (rng() - 0.5) * SHARD_SIZE * 0.7;
            const oz = (rng() - 0.5) * SHARD_SIZE * 0.7;
            
            town.buildings.push({
                type,
                offsetX: ox,
                offsetZ: oz,
                rotation: rng() * Math.PI * 2,
                npcs: type === 'tavern' ? [{ type: 'innkeeper' }] : []
            });
        }

        return town;
    }

    getTownAtShard(sx, sz) {
        return this.towns.get(`${sx},${sz}`);
    }
}
