import * as THREE from 'three';
import { SHARD_SIZE, SCALE_FACTOR } from './world_bounds.js';

export class CaveGenerator {
    constructor(worldManager) {
        this.worldManager = worldManager;
        this.caveShards = new Map(); // key: "x,z", value: CaveData
    }

    generateCaveShard(gridX, gridZ, seed) {
        const key = `${gridX},${gridZ}`;
        if (this.caveShards.has(key)) return this.caveShards.get(key);

        const caveData = {
            gridX,
            gridZ,
            rooms: [],
            tunnels: [],
            entrancePos: null
        };

        // Simplified cave generation: a few circular rooms connected by lines
        const rng = this.getSeededRandom(seed + gridX * 131 + gridZ * 71);
        const roomCount = 2 + Math.floor(rng() * 3);

        for (let i = 0; i < roomCount; i++) {
            caveData.rooms.push({
                x: (rng() - 0.5) * SHARD_SIZE * 0.8,
                z: (rng() - 0.5) * SHARD_SIZE * 0.8,
                radius: (4 + rng() * 6) * SCALE_FACTOR
            });
        }

        // Entrance at shard center for now
        caveData.entrancePos = new THREE.Vector3(gridX * SHARD_SIZE, 0, gridZ * SHARD_SIZE);
        
        this.caveShards.set(key, caveData);
        return caveData;
    }

    getSeededRandom(seed) {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }
}
