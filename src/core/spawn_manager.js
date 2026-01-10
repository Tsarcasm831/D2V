import * as THREE from 'three';
import { Building } from '../systems/buildings.js';
import { Shard } from '../world/shard.js';
import { SHARD_SIZE } from '../world/world_bounds.js';
import { debugLog } from '../utils/logger.js';

export class SpawnManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.worldManager = game.worldManager;
    }

    async onLandLoaded(landId) {
        debugLog(`SpawnManager: Land ${landId} loaded, updating spawns...`);
        
        if (this.game.player && this.game.player.mesh) {
            const pos = this.game.player.mesh.position;
            const sx = Math.floor((pos.x + SHARD_SIZE / 2) / SHARD_SIZE);
            const sz = Math.floor((pos.z + SHARD_SIZE / 2) / SHARD_SIZE);
            
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    const x = sx + dx;
                    const z = sz + dz;
                    const key = `${x},${z}`;
                    if (this.worldManager.worldMask.containsShard(x, z) && !this.worldManager.activeShards.has(key)) {
                        this.worldManager.shardQueue.push({ x, z, key });
                    }
                }
            }

            while (this.worldManager.shardQueue.length > 0) {
                const { x, z, key } = this.worldManager.shardQueue.shift();
                if (!this.worldManager.activeShards.has(key)) {
                    const shard = new Shard(this.scene, x, z, this.worldManager);
                    this.worldManager.activeShards.set(key, shard);
                    if (shard.groundMesh) this.worldManager.terrainMeshes.push(shard.groundMesh);
                }
            }
            this.worldManager.invalidateCache();
        }
        
        if (landId === 'Land01') {
            this.spawnStarterTent();
            this.spawnAllBuildings();
        } else if (landId === 'Land23') {
            this.spawnYureigakureTown();
        }
    }

    spawnAllBuildings() {
        const startPos = new THREE.Vector3(-20, 0, 15);
        const spacing = 10;
        const buildingTypes = [
            'hut', 'tavern', 'silo', 'square_hut', 
            'long_tavern', 'grail_silo', 'beehive', 'crop_plot',
            'well', 'blacksmith', 'windmill', 'guard_tower', 'stable'
        ];

        buildingTypes.forEach((type, index) => {
            const pos = startPos.clone().add(new THREE.Vector3(index * spacing, 0, 0));
            const sx = Math.floor((pos.x + SHARD_SIZE / 2) / SHARD_SIZE);
            const sz = Math.floor((pos.z + SHARD_SIZE / 2) / SHARD_SIZE);
            const shard = this.worldManager.activeShards.get(`${sx},${sz}`);

            if (shard) {
                pos.y = this.worldManager.getTerrainHeight(pos.x, pos.z);
                const building = new Building(this.scene, shard, type, pos);
                shard.resources.push(building);
                debugLog(`Spawned ${type} at ${pos.x}, ${pos.z}`);
            }
        });
    }

    spawnYureigakureTown() {
        // Town logic moved to Shard.setupEnvironment for persistence
    }

    spawnStarterTent() {
        const campCenter = new THREE.Vector3(6, 0, 10.2);
        const sx = Math.floor((campCenter.x + SHARD_SIZE / 2) / SHARD_SIZE);
        const sz = Math.floor((campCenter.z + SHARD_SIZE / 2) / SHARD_SIZE);
        const shard = this.worldManager.activeShards.get(`${sx},${sz}`);
        
        if (shard) {
            const firePos = campCenter.clone();
            firePos.y = this.worldManager.getTerrainHeight(firePos.x, firePos.z);
            const firepit = new Building(this.scene, shard, 'firepit', firePos);
            shard.resources.push(firepit);

            const dist = 4.2;
            const tentConfigs = [
                { pos: new THREE.Vector3(6, 0, 10.2 - dist), rot: 0 },
                { pos: new THREE.Vector3(6 - dist, 0, 10.2), rot: Math.PI/2 },
                { pos: new THREE.Vector3(6 + dist, 0, 10.2), rot: -Math.PI/2 }
            ];

            const pondPos = new THREE.Vector3(-10, 0, -5);
            const starterPondRadius = 4.0;
            const pondData = { x: pondPos.x, y: 0, z: pondPos.z, radius: starterPondRadius * 1.3 };
            
            pondData.y = this.worldManager._getRawTerrainHeight(pondPos.x, pondPos.z);
            pondPos.y = pondData.y;
            
            this.worldManager.ponds.push(pondData);
            this.worldManager.clearHeightCache();
            
            const pond = new Building(this.scene, shard, 'pond', pondPos);
            shard.resources.push(pond);

            import('../entities/quest_giver.js').then(({ QuestGiver }) => {
                const questGiverPos = firePos.clone().add(new THREE.Vector3(2, 0, 0));
                questGiverPos.y = this.worldManager.getTerrainHeight(questGiverPos.x, questGiverPos.z);
                const questGiver = new QuestGiver(this.scene, shard, questGiverPos);
                shard.npcs.push(questGiver);
                this.worldManager.invalidateCache();
            });

            import('../entities/humanoid_npc.js').then(({ HumanoidNPC }) => {
                tentConfigs.forEach((config) => {
                    const tentPos = config.pos.clone();
                    tentPos.y = this.worldManager.getTerrainHeight(tentPos.x, tentPos.z);
                    const tent = new Building(this.scene, shard, 'tent', tentPos, config.rot);
                    shard.resources.push(tent);

                    const offset = new THREE.Vector3(1.5, 0, 1.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), config.rot);
                    const npcPos = tentPos.clone().add(offset);
                    npcPos.y = this.worldManager.getTerrainHeight(npcPos.x, npcPos.z);
                    
                    const survivor = new HumanoidNPC(this.scene, shard, npcPos);
                    survivor.setHome(tentPos, 20);
                    shard.npcs.push(survivor);
                });
            });
        }
    }
}
