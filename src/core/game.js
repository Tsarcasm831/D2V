import * as THREE from 'three';
import { TimeManager } from '../systems/time_manager.js';
import Player from '../entities/player.js';
import { WorldManager } from '../world/world_manager.js';
import { Minimap } from '../ui/minimap.js';
import { ShardMap } from '../world/shard_map.js';
import { GridLabelManager } from '../world/grid_labels.js';
import { NodeMPManager } from '../network/nodempmanager.js';
import { Shard } from '../world/shard.js';
import { SHARD_SIZE } from '../world/world_bounds.js';
import { InputManager } from '../core/input_manager.js';
import { BuildManager } from '../systems/build_manager.js';
import { EnvironmentManager } from '../systems/environment_manager.js';
import { ChatUI } from '../entities/player_stubs.js';

import { WeatherManager } from '../systems/weather_manager.js';

import { OptionsUI } from '../ui/options_ui.js';
import { ParticleManager } from '../systems/particle_manager.js';
import { MagicSystem } from '../systems/magic_system.js';
import { QuestManager } from '../systems/quest_manager.js';
import { AchievementManager } from '../systems/achievement_manager.js';
import { debugLog } from '../utils/logger.js';
import { SceneManager } from './scene_manager.js';
import { TooltipManager } from './tooltip_manager.js';
import { SpawnManager } from './spawn_manager.js';

export class Game {
    constructor(characterData = {}, roomCode = 'Alpha') {
        this.roomCode = roomCode;
        
        this.sceneManager = new SceneManager(this);
        this.scene = this.sceneManager.scene;
        this.camera = this.sceneManager.camera;
        this.renderer = this.sceneManager.renderer;
        this.sun = this.sceneManager.sun;

        this.projectiles = [];
        this.particleManager = new ParticleManager(this.scene);
        this.achievementManager = new AchievementManager(this);
        this.magicSystem = new MagicSystem(this);
        this.questManager = new QuestManager(this);
        
        this.cameraRotation = { theta: Math.PI / 4, phi: 0.8, distance: 30 };
        this.cameraMode = 'topdown'; // 'topdown' or 'fpv'
        this.fpvRotation = { yaw: 0, pitch: 0 };

        this.timeManager = new TimeManager(this);
        this.worldManager = new WorldManager(this.scene, this);
        this.scene.worldManager = this.worldManager;
        this.player = new Player(this.scene, this.worldManager, characterData);
        this.player.game = this;

        const spawn = this.worldManager.levelCenter;
        this.player.teleport(spawn.x, spawn.z);

        this.buildManager = new BuildManager(this);
        this.weatherManager = new WeatherManager(this);
        this.environmentManager = new EnvironmentManager(this);
        this.chat = new ChatUI(this.player);
        this.inputManager = new InputManager(this);
        this.input = this.inputManager.input;

        this.minimap = new Minimap(this.player, this.worldManager);
        this.shardMap = new ShardMap(this.player, this.worldManager);
        this.gridLabels = new GridLabelManager(this.scene);
        this.multiplayer = new NodeMPManager(this);
        this.optionsUI = new OptionsUI(this);
        window.gameInstance = this;
        this.multiplayer.initialize(characterData, this.roomCode);

        this.tooltipManager = new TooltipManager(this.scene, this.inputManager, this.worldManager);
        this.spawnManager = new SpawnManager(this);
        
        // Respawn Button Listener
        const respawnBtn = document.getElementById('respawn-btn');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', () => {
                this.player.respawn();
            });
        }

        this.grid = new THREE.GridHelper(3000, 600, 0x4444ff, 0x222244);
        this.grid.position.y = 0.05;
        this.grid.visible = false;
        this.scene.add(this.grid);

        this.clock = new THREE.Clock();
        this.landPositions = {};
        
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        
        this.initOptions();
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
        if (this.sceneManager) {
            this.sceneManager.setQuality(quality);
        }
    }

    toggleBloom(enabled) {
        // Placeholder for post-processing bloom toggle
        debugLog("Bloom toggled:", enabled);
    }

    async initAfterLoading() {
        // Load default land (Land23 - Land of Ghosts) if none specified
        // In a real scenario, we might check localStorage here
        const { Land23 } = await import('../world/lands/Land23.js');
        await this.worldManager.loadLand(Land23);

        // Enforce explicit spawn after land load
        if (this.player) {
            const spawn = this.worldManager.levelCenter;
            this.player.teleport(spawn.x, spawn.z);
        }

        // Initial world generation sweep
        this.worldManager.update(this.player, 0);
        
        // Force load initial building spawn area shards if we are in Land01 (for demo/legacy support)
        if (this.worldManager.worldMask && this.worldManager.worldMask.landId === 'Land01') {
            const startPos = new THREE.Vector3(-20, 0, 15);
            const spacing = 10;
            const buildingCount = 13;
            
            for (let i = 0; i < buildingCount; i++) {
                const xPos = startPos.x + (i * spacing);
                const zPos = startPos.z;
                const sx = Math.floor((xPos + SHARD_SIZE / 2) / SHARD_SIZE);
                const sz = Math.floor((zPos + SHARD_SIZE / 2) / SHARD_SIZE);
                const key = `${sx},${sz}`;
                if (!this.worldManager.activeShards.has(key)) {
                    this.worldManager.shardQueue.push({ x: sx, z: sz, key });
                }
            }
        }

        // Force process the shard queue
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
            this.player.playerPhysics.position.y = floorY + 1; // Slightly above ground
            if (this.player.mesh) this.player.mesh.position.y = this.player.playerPhysics.position.y;
        }
        
        // Spawn starter buildings based on land
        if (this.worldManager.worldMask && this.worldManager.worldMask.landId === 'Land01') {
            this.spawnManager.spawnStarterTent();
            this.spawnManager.spawnAllBuildings();
        }

        // Start the loop
        this.animate();
    }

    triggerCombat(enemies) {
        if (this.combatScene && !this.combatScene.isActive) {
            this.combatScene.enemies = enemies;
            this.combatScene.start(this.player.mesh.position.x, this.player.mesh.position.z);
            if (this.inputManager) this.inputManager.enabled = false;
        }
    }

    onResize() {
        if (this.sceneManager) this.sceneManager.onResize();
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

    async onLandLoaded(landId) {
        if (this.spawnManager) await this.spawnManager.onLandLoaded(landId);
    }

    onSeasonChanged(season) {
        debugLog(`Game: Season changed to ${season}`);
        
        // Update weather weights based on season
        if (this.weatherManager) {
            switch (season) {
                case 'SPRING':
                    this.weatherManager.weatherWeights = {
                        'clear': 40, 'cloudy': 30, 'rain': 20, 'storm': 5, 'fog': 5, 'snowstorm': 0
                    };
                    break;
                case 'SUMMER':
                    this.weatherManager.weatherWeights = {
                        'clear': 70, 'cloudy': 15, 'rain': 5, 'storm': 10, 'fog': 0, 'snowstorm': 0
                    };
                    break;
                case 'AUTUMN':
                    this.weatherManager.weatherWeights = {
                        'clear': 30, 'cloudy': 30, 'rain': 20, 'storm': 5, 'fog': 15, 'snowstorm': 0
                    };
                    break;
                case 'WINTER':
                    this.weatherManager.weatherWeights = {
                        'clear': 20, 'cloudy': 20, 'rain': 0, 'storm': 0, 'fog': 10, 'snowstorm': 50
                    };
                    break;
            }
        }

        // Show season change notification
        if (this.player && this.player.ui) {
            this.player.ui.showStatus(`THE SEASON HAS CHANGED TO ${season}`, false);
        }
    }

    animate() {
        if (this._stopped) return;
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.1);
        const now = performance.now();

        // 1. Core Logic
        this.inputManager.updateMouseWorldPos(this.worldManager.terrainMeshes);
        this.timeManager.update(delta);
        this.weatherManager.update(delta);
        this.particleManager.update(delta);
        
        this.worldManager.update(this.player, delta);
        this.player.update(delta, this.input, this.camera);
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(delta);
            if (p.isDead) {
                this.projectiles.splice(i, 1);
            }
        }

        if (this.multiplayer) this.multiplayer.update(now, delta);
        
        // 2. Secondary Logic (Staggered)
        this._frameCount = (this._frameCount || 0) + 1;
        const staggerFrame = this._frameCount % 4;

        if (staggerFrame === 0) {
            this.minimap.update();
            this.shardMap.update();
        } else if (staggerFrame === 1) {
            this.gridLabels.update(this.player.mesh.position, (this.grid && this.grid.visible));
            this.environmentManager.update(this.player.mesh.position);
        } else if (staggerFrame === 2) {
            this.tooltipManager.update(this.player, this.camera);
        } else if (staggerFrame === 3) {
            this.buildManager.update();
        }

        // 3. Camera and Rendering
        const isMounted = this.player.actions && this.player.actions.mountedHorse;
        const targetPos = this._tempVec1.copy(this.player.mesh.position);
        targetPos.y += isMounted ? 2.2 : 1.2;

        if (this.cameraMode === 'fpv') {
            const headOffset = 1.6;
            targetPos.y = this.player.mesh.position.y + headOffset;
            this.camera.position.copy(targetPos);
            
            const euler = new THREE.Euler(this.fpvRotation.pitch, this.fpvRotation.yaw, 0, 'YXZ');
            this.camera.quaternion.setFromEuler(euler);
            
            this._cameraPushbackTimer = (this._cameraPushbackTimer || 0) + delta;
            if (this._cameraPushbackTimer > 0.1) {
                const terrainHeight = this.worldManager.getTerrainHeight(this.camera.position.x, this.camera.position.z);
                if (this.camera.position.y < terrainHeight + 0.5) {
                    this.camera.position.y = terrainHeight + 0.5;
                }
                this._cameraPushbackTimer = 0;
            }
        } else {
            const offset = this._tempVec2.set(
                this.cameraRotation.distance * Math.sin(this.cameraRotation.theta) * Math.cos(this.cameraRotation.phi),
                this.cameraRotation.distance * Math.sin(this.cameraRotation.phi),
                this.cameraRotation.distance * Math.cos(this.cameraRotation.theta) * Math.cos(this.cameraRotation.phi)
            );

            this.camera.position.copy(targetPos).add(offset);
            this.camera.lookAt(targetPos);
        }

        this.sceneManager.updateSun(targetPos);
        this.sceneManager.render();

        // 4. FPS Counter
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
