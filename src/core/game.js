import * as THREE from 'three';
import { Player } from '../entities/player.js';
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
import { ChatUI } from '../entities/player_stubs.js';

import { FireballProjectile } from '../systems/fireball_projectile.js';

export class Game {
    constructor(characterData = {}, roomCode = 'Alpha') {
        this.roomCode = roomCode;
        this.scene = new THREE.Scene();
        this.projectiles = [];
        this.scene.background = new THREE.Color(0x050a14);
        this.scene.fog = new THREE.FogExp2(0x050a14, 0.008);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.cameraRotation = { theta: Math.PI / 4, phi: 0.8, distance: 30 };
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.setupLights();
        
        this.worldManager = new WorldManager(this.scene);
        this.scene.worldManager = this.worldManager;
        this.player = new Player(this.scene, this.worldManager, characterData);
        this.player.game = this;

        this.buildManager = new BuildManager(this);
        this.chat = new ChatUI(this.player);
        this.inputManager = new InputManager(this);
        this.input = this.inputManager.input; // Shortcut for player update

        this.minimap = new Minimap(this.player, this.worldManager);
        this.shardMap = new ShardMap(this.player, this.worldManager);
        this.gridLabels = new GridLabelManager(this.scene);
        this.multiplayer = new NodeMPManager(this);
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
        
        // Spawn starter building
        this.spawnStarterTent();

        this.animate();

        window.addEventListener('resize', () => this.onResize());
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

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.1);
        const now = performance.now();

        this.inputManager.updateMouseWorldPos(this.worldManager.terrainMeshes);

        this.worldManager.update(this.player, delta);
        this.player.update(delta, this.input, this.camera);
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(delta);
            if (p.isDead) {
                this.projectiles.splice(i, 1);
            }
        }

        if (this.multiplayer) this.multiplayer.update(performance.now(), delta);
        this.minimap.update();
        this.shardMap.update();
        this.gridLabels.update(this.player.mesh.position, this.grid.visible);
        this.updateUnitTooltip();
        this.buildManager.update();

        const targetPos = this._tempVec1.copy(this.player.mesh.position);
        targetPos.y += 1.2;

        const offset = this._tempVec2.set(
            this.cameraRotation.distance * Math.sin(this.cameraRotation.theta) * Math.cos(this.cameraRotation.phi),
            this.cameraRotation.distance * Math.sin(this.cameraRotation.phi),
            this.cameraRotation.distance * Math.cos(this.cameraRotation.theta) * Math.cos(this.cameraRotation.phi)
        );

        this.camera.position.copy(targetPos).add(offset);
        this.camera.lookAt(targetPos);

        if (this.sun) {
            this.sun.position.set(targetPos.x + 30, targetPos.y + 60, targetPos.z + 30);
            this.sun.target.position.copy(targetPos);
            this.sun.target.updateMatrixWorld();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
