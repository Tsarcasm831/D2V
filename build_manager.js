import * as THREE from 'three';
import { Building } from './buildings.js';
import { SHARD_SIZE } from './world_bounds.js';
import { audioManager } from './audio_manager.js';

export class BuildManager {
    constructor(game) {
        this.game = game;
        this.isBuildMode = false;
        this.buildGhost = null;
        this.buildRotation = 0;
        this.selectedBuildIndex = 0;
        this.buildOptions = [
            { type: 'wall', name: 'Wooden Wall', cost: 10 },
            { type: 'floor', name: 'Wooden Floor', cost: 5 },
            { type: 'firepit', name: 'Firepit', cost: 5 },
            { type: 'doorway', name: 'Wooden Doorway', cost: 12 }
        ];
    }

    toggle() {
        this.isBuildMode = !this.isBuildMode;
        this.game.isBuildMode = this.isBuildMode; // Keep game state in sync for now

        if (this.game.player.ui) {
            this.game.player.ui.showStatus(this.isBuildMode ? "Build Mode: ON" : "Build Mode: OFF", false);
            if (this.isBuildMode) {
                this.game.player.ui.hotbarWrapper.style.display = 'none';
                this.game.player.ui.buildHotbarWrapper.style.display = 'flex';
                this.game.player.ui.updateBuildHotbar(this.selectedBuildIndex);
            } else {
                this.game.player.ui.hotbarWrapper.style.display = 'flex';
                this.game.player.ui.buildHotbarWrapper.style.display = 'none';
            }
        }

        if (!this.isBuildMode && this.buildGhost) {
            this.game.scene.remove(this.buildGhost);
            this.buildGhost = null;
        } else if (this.isBuildMode) {
            this.createGhost();
        }
    }

    selectSlot(index) {
        if (index >= 0 && index < this.buildOptions.length) {
            this.selectedBuildIndex = index;
            if (this.game.player.ui) this.game.player.ui.updateBuildHotbar(index);
            if (this.buildGhost) {
                this.game.scene.remove(this.buildGhost);
                this.buildGhost = null;
            }
            this.createGhost();
        }
    }

    rotate() {
        this.buildRotation += Math.PI / 2;
    }

    createGhost() {
        if (this.buildGhost) return;
        
        const option = this.buildOptions[this.selectedBuildIndex];
        const type = option.type;
        
        this.buildGhost = new THREE.Group();
        const ghostMat = new THREE.MeshStandardMaterial({ 
            color: 0x5d4037, 
            transparent: true, 
            opacity: 0.5 
        });

        if (type === 'wall') {
            const logRad = 0.18;
            const logLen = 5.0; // Increased to match grid width
            const logGeo = new THREE.CylinderGeometry(logRad, logRad, logLen, 8);
            logGeo.rotateZ(Math.PI / 2);
            for (let i = 0; i < 12; i++) {
                const log = new THREE.Mesh(logGeo, ghostMat);
                log.position.y = logRad + (i * logRad * 1.85);
                this.buildGhost.add(log);
            }
            // Vertical beams for ghost
            const beamGeo = new THREE.CylinderGeometry(logRad * 0.8, logRad * 0.8, logRad * 24, 8);
            for (let side of [-1, 1]) {
                const beam = new THREE.Mesh(beamGeo, ghostMat);
                beam.position.set(side * 2.4, logRad * 12, 0);
                this.buildGhost.add(beam);
            }
        } else if (type === 'floor') {
            const floorSize = 5.0; // Increased to match grid width
            const floorGeo = new THREE.BoxGeometry(floorSize, 0.1, floorSize);
            const floor = new THREE.Mesh(floorGeo, ghostMat);
            floor.position.y = 0.05;
            this.buildGhost.add(floor);
        } else if (type === 'firepit') {
            const fireGeo = new THREE.TorusGeometry(0.6, 0.15, 8, 16);
            const fire = new THREE.Mesh(fireGeo, ghostMat);
            fire.rotation.x = Math.PI / 2;
            fire.position.y = 0.08;
            this.buildGhost.add(fire);
        } else if (type === 'doorway') {
            const logRad = 0.18;
            const wallWidth = 5.0; // Increased to match grid width
            const openingWidth = 1.5;
            const sideLogWidth = (wallWidth - openingWidth) / 2;
            const fullLogGeo = new THREE.CylinderGeometry(logRad, logRad, wallWidth, 8);
            fullLogGeo.rotateZ(Math.PI / 2);
            const shortLogGeo = new THREE.CylinderGeometry(logRad, logRad, sideLogWidth, 8);
            shortLogGeo.rotateZ(Math.PI / 2);
            const logCount = 12;
            const doorHeightLimit = 8;
            for (let i = 0; i < logCount; i++) {
                const yPos = logRad + (i * logRad * 1.85);
                if (i < doorHeightLimit) {
                    for (let side of [-1, 1]) {
                        const log = new THREE.Mesh(shortLogGeo, ghostMat);
                        log.position.set(side * (wallWidth/2 - sideLogWidth/2), yPos, 0);
                        this.buildGhost.add(log);
                    }
                } else {
                    const log = new THREE.Mesh(fullLogGeo, ghostMat);
                    log.position.y = yPos;
                    this.buildGhost.add(log);
                }
            }
            const pillarHeight = logRad + (doorHeightLimit * logRad * 1.85);
            const pillarGeo = new THREE.CylinderGeometry(logRad * 1.1, logRad * 1.1, pillarHeight, 8);
            for (let side of [-1, 1]) {
                const pillar = new THREE.Mesh(pillarGeo, ghostMat);
                pillar.position.set(side * (openingWidth/2 + logRad/2), pillarHeight/2, 0);
                this.buildGhost.add(pillar);
            }
        }
        this.game.scene.add(this.buildGhost);
    }

    place() {
        console.log("BuildManager: place() called", {
            mouseWorldPos: this.game.mouseWorldPos,
            isBuildMode: this.isBuildMode,
            selectedBuildIndex: this.selectedBuildIndex,
            isInvulnerable: this.game.player.isInvulnerable,
            playerName: this.game.player.characterData?.name,
            sceneId: this.game.scene.uuid
        });

        if (!this.game.mouseWorldPos) {
            console.warn("BuildManager: No mouseWorldPos found");
            return;
        }

        const option = this.buildOptions[this.selectedBuildIndex];
        const type = option.type;
        const woodCost = option.cost;
        const isFree = this.game.player.isInvulnerable || 
                       (this.game.player.characterData && this.game.player.characterData.name?.toLowerCase() === 'lordtsarcasm');

        if (!isFree) {
            let totalWood = 0;
            const hotbar = this.game.player.inventory.hotbar || [];
            const storage = this.game.player.inventory.storage || [];
            const allSlots = [...hotbar, ...storage];
            
            allSlots.forEach(item => {
                if (item && item.type === 'wood') totalWood += item.count;
            });

            console.log(`BuildManager: Resource check - Have: ${totalWood}, Need: ${woodCost}`);

            if (totalWood < woodCost) {
                console.log(`BuildManager: Not enough wood.`);
                this.game.player.ui.showStatus(`Need ${woodCost} Wood!`);
                return;
            }

            let needed = woodCost;
            const consumeFrom = (arr) => {
                for (let i = 0; i < arr.length; i++) {
                    const item = arr[i];
                    if (item && item.type === 'wood') {
                        const take = Math.min(item.count, needed);
                        item.count -= take;
                        needed -= take;
                        if (item.count <= 0) arr[i] = null;
                    }
                    if (needed <= 0) break;
                }
            };
            consumeFrom(this.game.player.inventory.hotbar);
            if (needed > 0) consumeFrom(this.game.player.inventory.storage);
            console.log("BuildManager: Wood consumed, remaining needed:", needed);
        } else {
            console.log("BuildManager: Placement is free");
        }

        const gridStep = 5.0; // Increased to match grid width
        const halfStep = gridStep / 2;
        let posX, posZ;

        const mousePos = this.game.mouseWorldPos;

        if (type === 'floor' || type === 'firepit') {
            posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
            posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
        } else {
            const normRot = ((this.buildRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
            const isHorizontal = Math.abs(Math.sin(normRot)) < 0.1; 

            if (isHorizontal) {
                // Wall along X-axis: snap Z to line, center X in cell
                posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
                posZ = Math.round(mousePos.z / gridStep) * gridStep;
            } else {
                // Wall along Z-axis: snap X to line, center Z in cell
                posX = Math.round(mousePos.x / gridStep) * gridStep;
                posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
            }
        }

        const pos = new THREE.Vector3(posX, 0, posZ);
        pos.y = this.game.worldManager.getTerrainHeight(pos.x, pos.z);

        const sx = Math.floor((pos.x + SHARD_SIZE / 2) / SHARD_SIZE);
        const sz = Math.floor((pos.z + SHARD_SIZE / 2) / SHARD_SIZE);
        const shard = this.game.worldManager.activeShards.get(`${sx},${sz}`);

        console.log(`BuildManager: Target shard ${sx},${sz}`, {
            shardFound: !!shard,
            activeShards: Array.from(this.game.worldManager.activeShards.keys())
        });

        if (shard) {
            console.log(`BuildManager: Placing ${type} at ${pos.x}, ${pos.y}, ${pos.z} in shard ${sx}, ${sz}`);
            
            // Place locally immediately (Prediction)
            const building = new Building(this.game.scene, shard, type, pos, this.buildRotation);
            if (!shard.resources) shard.resources = [];
            shard.resources.push(building);
            if (this.game.worldManager) this.game.worldManager.invalidateCache();
            console.log("BuildManager: Local placement complete, shard resource count:", shard.resources.length);

            // Notify server if in multiplayer
            const isMultiplayer = this.game.multiplayer && this.game.multiplayer.socket && this.game.multiplayer.socket.isConnected;
            if (isMultiplayer) {
                console.log("BuildManager: Notifying multiplayer server");
                this.game.multiplayer.requestPlaceBuilding(type, pos, this.buildRotation, sx, sz);
            }

            if (this.game.player.ui) {
                this.game.player.ui.updateHotbar();
                this.game.player.ui.renderInventory();
            }
            audioManager.play('harvest', 0.5, 0.8);
        } else {
            console.warn(`BuildManager: Shard not found at ${sx}, ${sz}. Active shards:`, Array.from(this.game.worldManager.activeShards.keys()));
            this.game.player.ui.showStatus("Cannot build here (Shard not loaded)");
        }
    }

    update() {
        const mousePos = this.game.mouseWorldPos;
        if (this.isBuildMode && this.buildGhost) {
            // Update location UI if possible
            if (mousePos) {
                const hx = Math.floor((mousePos.x + SHARD_SIZE / 2) / SHARD_SIZE);
                const hz = Math.floor((mousePos.z + SHARD_SIZE / 2) / SHARD_SIZE);
                const locationDisplay = document.getElementById('location-display');
                if (locationDisplay) {
                    locationDisplay.innerHTML = `Shard: ${hx}, ${hz} (Building...)`;
                }
            }

            // Ghost placement logic
            const gridStep = 5.0; // Increased to match grid width
            const halfStep = gridStep / 2;
            let posX = 0, posZ = 0;

            if (mousePos) {
                const type = this.buildOptions[this.selectedBuildIndex].type;
                if (type === 'floor' || type === 'firepit') {
                    posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
                    posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
                } else {
                    const normRot = ((this.buildRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                    const isHorizontal = Math.abs(Math.sin(normRot)) < 0.1; 

                    if (isHorizontal) {
                         // Wall along X-axis: snap Z to line, center X in cell
                        posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
                        posZ = Math.round(mousePos.z / gridStep) * gridStep;
                    } else {
                        // Wall along Z-axis: snap X to line, center Z in cell
                        posX = Math.round(mousePos.x / gridStep) * gridStep;
                        posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
                    }
                }
                
                this.buildGhost.position.set(posX, this.game.worldManager.getTerrainHeight(posX, posZ), posZ);
                
                if (type === 'firepit') {
                    const normal = this.game.worldManager.getTerrainNormal(posX, posZ);
                    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
                    const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.buildRotation);
                    this.buildGhost.quaternion.multiplyQuaternions(quaternion, rotY);
                } else {
                    this.buildGhost.rotation.set(0, this.buildRotation, 0);
                }
                
                this.buildGhost.visible = true;
            } else {
                this.buildGhost.visible = false;
            }
        }
    }
}
