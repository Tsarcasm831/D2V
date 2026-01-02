import * as THREE from 'three';
import { TimeManager } from '../systems/time_manager.js';
import Player from '../entities/player.js';
import { WorldManager } from '../world/world_manager.js';
import { Minimap } from '../ui/minimap.js';
import { ShardMap } from '../world/shard_map.js';
import { GridLabelManager } from '../world/grid_labels.js';
import { NodeMPManager } from '../network/nodempmanager.js';
import { Building } from '../systems/buildings.js';
import { Shard } from '../world/shard.js';
import { SHARD_SIZE } from '../world/world_bounds.js';
import { InputManager } from '../core/input_manager.js';
import { BuildManager } from '../systems/build_manager.js';
import { EnvironmentManager } from '../systems/environment_manager.js';
import { ChatUI } from '../entities/player_stubs.js';

import { WeatherManager } from '../systems/weather_manager.js';
import { FireballProjectile } from '../systems/fireball_projectile.js';

import { CombatScene } from '../systems/combat_scene.js';

export class Game {
    constructor(characterData = {}, roomCode = 'Alpha') {
        this.roomCode = roomCode;
        this.scene = new THREE.Scene();
        this.projectiles = [];
        this.scene.background = new THREE.Color(0x050a14);
        this.scene.fog = new THREE.FogExp2(0x050a14, 0.008);
        
        this.combatScene = null;

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.cameraRotation = { theta: Math.PI / 4, phi: 0.8, distance: 30 };
        this.cameraMode = 'topdown'; // 'topdown' or 'fpv'
        this.fpvRotation = { yaw: 0, pitch: 0 };
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.setupLights();
        
        this.timeManager = new TimeManager(this);
        this.worldManager = new WorldManager(this.scene);
        this.scene.worldManager = this.worldManager;
        this.player = new Player(this.scene, this.worldManager, characterData);
        this.player.game = this;

        this.buildManager = new BuildManager(this);
        this.weatherManager = new WeatherManager(this);
        this.environmentManager = new EnvironmentManager(this);
        this.chat = new ChatUI(this.player);
        this.inputManager = new InputManager(this);
        this.input = this.inputManager.input; // Shortcut for player update

        this.combatScene = new CombatScene(this);

        this.minimap = new Minimap(this.player, this.worldManager);
        this.shardMap = new ShardMap(this.player, this.worldManager);
        this.gridLabels = new GridLabelManager(this.scene);
        this.multiplayer = new NodeMPManager(this);
        window.gameInstance = this;
        this.multiplayer.initialize(characterData, this.roomCode);

        this.raycaster = new THREE.Raycaster();
        
        // Respawn Button Listener
        const respawnBtn = document.getElementById('respawn-btn');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', () => {
                this.player.respawn();
            });
        }

        this.grid = new THREE.GridHelper(3000, 600, 0x4444ff, 0x222244); // 5-unit spacing for alignment
        this.grid.position.y = 0.05;
        this.grid.visible = false;
        this.scene.add(this.grid);

        this.clock = new THREE.Clock();
        
        this.lastTooltipUpdate = 0;
        
        // Performance optimizations: reuse vectors
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        
        // Initialize options from storage
        this.initOptions();

        window.addEventListener('resize', () => this.onResize());
    }

    initOptions() {
        const showFPS = localStorage.getItem('showFPS') === 'true';
        this.toggleFPS(showFPS);

        const quality = localStorage.getItem('graphicsQuality') || 'medium';
        this.setQuality(quality);

        const bloom = (localStorage.getItem('bloomEnabled') ?? 'true') === 'true';
        this.toggleBloom(bloom);
    }

    toggleFPS(enabled) {
        if (enabled) {
            if (!this.fpsCounter) {
                this.fpsCounter = document.createElement('div');
                this.fpsCounter.style.position = 'absolute';
                this.fpsCounter.style.top = '10px';
                this.fpsCounter.style.right = '10px';
                this.fpsCounter.style.color = '#00ff00';
                this.fpsCounter.style.fontFamily = 'monospace';
                this.fpsCounter.style.fontSize = '12px';
                this.fpsCounter.style.pointerEvents = 'none';
                this.fpsCounter.style.zIndex = '1000';
                document.body.appendChild(this.fpsCounter);
                this.lastFPSUpdate = 0;
                this.frames = 0;
            }
            this.fpsCounter.style.display = 'block';
        } else if (this.fpsCounter) {
            this.fpsCounter.style.display = 'none';
        }
    }

    setQuality(quality) {
        if (!this.renderer) return;
        switch (quality) {
            case 'low':
                this.renderer.setPixelRatio(1);
                this.renderer.shadowMap.enabled = false;
                break;
            case 'medium':
                this.renderer.setPixelRatio(window.devicePixelRatio * 0.8);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFShadowMap;
                break;
            case 'high':
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
            case 'ultra':
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.VSMShadowMap;
                break;
        }
    }

    toggleBloom(enabled) {
        // Placeholder for post-processing bloom toggle
        console.log("Bloom toggled:", enabled);
    }

    initAfterLoading() {
        // Initial world generation sweep
        this.worldManager.update(this.player, 0);
        
        // Force process the shard queue to ensure initial shards are loaded
        while (this.worldManager.shardQueue.length > 0) {
            const { x, z, key } = this.worldManager.shardQueue.shift();
            if (!this.worldManager.activeShards.has(key)) {
                const shard = new Shard(this.scene, x, z, this.worldManager);
                this.worldManager.activeShards.set(key, shard);
                if (shard.groundMesh) this.worldManager.terrainMeshes.push(shard.groundMesh);
            }
        }
        this.worldManager.invalidateCache();
        
        // Ensure player is at correct height after world is ready
        if (this.player && this.player.playerPhysics) {
            const floorY = this.worldManager.getTerrainHeight(this.player.playerPhysics.position.x, this.player.playerPhysics.position.z);
            this.player.playerPhysics.position.y = floorY;
            if (this.player.mesh) this.player.mesh.position.y = floorY;
        }
        
        // Spawn starter building
        this.spawnStarterTent();
        this.spawnAllBuildings();

        // Start the loop
        this.animate();
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
                console.log(`Spawned ${type} at ${pos.x}, ${pos.z}`);
            } else {
                console.warn(`Could not find shard for ${type} at ${pos.x}, ${pos.z}`);
            }
        });
    }


    setupLights() {
        const ambient = new THREE.AmbientLight(0x4040ff, 0.4);
        this.scene.add(ambient);

        this.sun = new THREE.DirectionalLight(0xffffff, 1.0); // Reduced intensity slightly
        this.sun.position.set(30, 60, 30);
        this.sun.castShadow = true;
        
        this.sun.shadow.camera.left = -40;
        this.sun.shadow.camera.right = 40;
        this.sun.shadow.camera.top = 40;
        this.sun.shadow.camera.bottom = -40;
        this.sun.shadow.camera.far = 200;
        this.sun.shadow.mapSize.set(1024, 1024); // Reduced from 2048
        this.sun.shadow.bias = -0.001; // Adjusted bias
        this.sun.shadow.normalBias = 0.04; // Increased normalBias
        
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
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
            // DO NOT set pondPos.y yet, as we need the flattened height from the worldManager AFTER registration
            const starterPondRadius = 4.0; // Default base radius from buildings.js
            const pondData = { x: pondPos.x, y: 0, z: pondPos.z, radius: starterPondRadius * 1.3 };
            
            // Get raw terrain height for the pond surface
            pondData.y = this.worldManager._getRawTerrainHeight(pondPos.x, pondPos.z);
            pondPos.y = pondData.y;
            
            this.worldManager.ponds.push(pondData);
            this.worldManager.clearHeightCache();
            
            const pond = new Building(this.scene, shard, 'pond', pondPos);
            shard.resources.push(pond);

            // Spawn Quest Giver next to fireplace
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

    updateUnitTooltip() {
        const now = performance.now();
        if (now - this.lastTooltipUpdate < 100) return; // Update at 10Hz
        this.lastTooltipUpdate = now;

        const tooltip = document.getElementById('unit-tooltip');
        if (!tooltip) return;

        this.raycaster.setFromCamera(this.inputManager.mouse, this.camera);
        
        const npcs = this.worldManager.getNearbyNPCs();
        const fauna = this.worldManager.getNearbyFauna();
        const units = [...npcs, ...fauna].filter(u => !u.isDead && u.level !== undefined);
        
        const hitObjects = units.map(u => u.group || u.mesh);
        const intersects = this.raycaster.intersectObjects(hitObjects, true);

        if (intersects.length > 0) {
            let hitUnit = null;
            for (const unit of units) {
                const obj = unit.group || unit.mesh;
                let found = false;
                obj.traverse(child => {
                    if (child === intersects[0].object) found = true;
                });
                if (found) {
                    hitUnit = unit;
                    break;
                }
            }

            if (hitUnit) {
                tooltip.style.display = 'flex';
                const x = ((this.inputManager.mouse.x + 1) / 2) * window.innerWidth;
                const y = (-(this.inputManager.mouse.y - 1) / 2) * window.innerHeight;
                
                tooltip.style.left = `${x + 20}px`;
                tooltip.style.top = `${y - 20}px`;

                document.getElementById('tt-name').textContent = hitUnit.type.toUpperCase();
                document.getElementById('tt-level').textContent = `LV. ${hitUnit.level}`;
                
                const statusEl = document.getElementById('tt-status');
                if (hitUnit.isEnemy) {
                    statusEl.textContent = 'Hostile';
                    statusEl.style.color = '#ff4444';
                } else {
                    statusEl.textContent = 'Passive';
                    statusEl.style.color = '#44ccff';
                }

                const hpPercent = (hitUnit.health / (hitUnit.maxHealth || 1)) * 100;
                document.getElementById('tt-health').style.width = `${hpPercent}%`;
                return;
            }
        }
        tooltip.style.display = 'none';
    }

    async leaveMark() {
        if (this.player.isDead) return;
        const pos = this.player.mesh.position;
        const locationText = `Location: ${Math.round(pos.x)}, ${Math.round(pos.z)}`;
        
        try {
            const result = await window.websim.postComment({
                content: `Reached this frozen peak! ${locationText}`
            });
            if (result.error) {
                this.player.ui.showStatus("Cannot post message right now.");
            } else {
                this.player.ui.showStatus("Mark left in the snow!", false);
            }
        } catch (e) {
            console.error(e);
        }
    }

    toggleCameraMode() {
        this.cameraMode = this.cameraMode === 'topdown' ? 'fpv' : 'topdown';
        
        if (this.cameraMode === 'fpv') {
            // Initial FPV orientation based on current player rotation if available, or just forward
            this.fpvRotation.yaw = this.cameraRotation.theta;
            this.fpvRotation.pitch = 0;
            this.inputManager.requestPointerLock();
        } else {
            this.inputManager.exitPointerLock();
        }
        
        // Ensure player mesh visibility is handled
        if (this.player && this.player.mesh) {
            this.player.mesh.visible = (this.cameraMode !== 'fpv');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.1);
        const now = performance.now();

        this.inputManager.updateMouseWorldPos(this.worldManager.terrainMeshes);

        this.timeManager.update(delta);
        this.weatherManager.update(delta);
        
        if (this.combatScene && this.combatScene.isActive) {
            this.combatScene.update(delta);
            this.combatScene.handleInput(this.input);
        } else {
            this.worldManager.update(this.player, delta);
            this.player.update(delta, this.input, this.camera);
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(delta);
            if (p.isDead) {
                this.projectiles.splice(i, 1);
            }
        }

        if (this.multiplayer) this.multiplayer.update(performance.now(), delta);
        
        // Throttle secondary systems to ~20 FPS
        this._secondaryUpdateTimer = (this._secondaryUpdateTimer || 0) + delta;
        if (this._secondaryUpdateTimer >= 0.05) {
            this.minimap.update();
            this.shardMap.update();
            this.gridLabels.update(this.player.mesh.position, this.grid.visible);
            this.environmentManager.update(this.player.mesh.position);
            this.updateUnitTooltip();
            this.buildManager.update();
            this._secondaryUpdateTimer = 0;
        }

        const isMounted = this.player.actions && this.player.actions.mountedHorse;
        const targetPos = this._tempVec1.copy(this.player.mesh.position);
        targetPos.y += isMounted ? 2.2 : 1.2;

        if (this.cameraMode === 'fpv') {
            // FPV Camera Logic
            const headOffset = 1.6; // Eye level
            targetPos.y = this.player.mesh.position.y + headOffset;
            
            this.camera.position.copy(targetPos);
            
            // Apply FPV rotation
            const quaternion = new THREE.Quaternion();
            const euler = new THREE.Euler(this.fpvRotation.pitch, this.fpvRotation.yaw, 0, 'YXZ');
            this.camera.quaternion.setFromEuler(euler);
            
            // Basic collision/pushback for FPV
            const rayDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            this.raycaster.set(this.camera.position, rayDirection);
            
            // Push camera back if it's too close to terrain or objects
            const terrainHeight = this.worldManager.getTerrainHeight(this.camera.position.x, this.camera.position.z);
            if (this.camera.position.y < terrainHeight + 0.5) {
                this.camera.position.y = terrainHeight + 0.5;
            }
        } else {
            // TopDown/Third-Person Logic
            const offset = this._tempVec2.set(
                this.cameraRotation.distance * Math.sin(this.cameraRotation.theta) * Math.cos(this.cameraRotation.phi),
                this.cameraRotation.distance * Math.sin(this.cameraRotation.phi),
                this.cameraRotation.distance * Math.cos(this.cameraRotation.theta) * Math.cos(this.cameraRotation.phi)
            );

            this.camera.position.copy(targetPos).add(offset);
            this.camera.lookAt(targetPos);
        }

        if (this.sun) {
            this.sun.position.set(targetPos.x + 30, targetPos.y + 60, targetPos.z + 30);
            this.sun.target.position.copy(targetPos);
            this.sun.target.updateMatrixWorld();
        }

        this.renderer.render(this.scene, this.camera);

        if (this.fpsCounter && this.fpsCounter.style.display !== 'none') {
            this.frames++;
            if (now - this.lastFPSUpdate > 1000) {
                this.fpsCounter.textContent = `FPS: ${Math.round((this.frames * 1000) / (now - this.lastFPSUpdate))}`;
                this.lastFPSUpdate = now;
                this.frames = 0;
            }
        }
    }
}
