import * as THREE from 'three';
import { Building } from '../systems/buildings.js';
import { SHARD_SIZE } from '../world/world_bounds.js';
import { audioManager } from '../utils/audio_manager.js';

export class BuildManager {
    constructor(game) {
        this.game = game;
        this.isBuildMode = false;
        this.buildGhost = null;
        this.buildRotation = 0;
        this.selectedBuildIndex = 0;
        this.buildElevation = 0;
        this.elevationStep = 2.5; 
        this.maxElevation = 10.0;
        this.minElevation = -2.0;
        this.isVerifying = false; 
        this.verifiedPos = null;
        this.verifiedRotation = 0;
        this.buildOptions = [
            { type: 'wall', name: 'Wooden Wall', cost: 10 },
            { type: 'floor', name: 'Wooden Floor', cost: 5 },
            { type: 'firepit', name: 'Firepit', cost: 5 },
            { type: 'doorway', name: 'Wooden Doorway', cost: 12 },
            { type: 'square_hut', name: 'Square Hut', cost: 20 },
            { type: 'long_tavern', name: 'Long Tavern', cost: 100 },
            { type: 'grail_silo', name: 'Grail Silo', cost: 120 },
            { type: 'crop_plot', name: 'Crop Plot', cost: 2 }
        ];
    }

    toggle() {
        this.isBuildMode = !this.isBuildMode;
        this.game.isBuildMode = this.isBuildMode;
        this.isVerifying = false; 
        this.verifiedPos = null;

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
            this.buildElevation = 0;
            this.isVerifying = false; 
            this.verifiedPos = null;
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

    changeElevation(delta) {
        const option = this.buildOptions[this.selectedBuildIndex];
        if (option.type === 'floor' || option.type === 'wall' || option.type === 'doorway') {
            this.buildElevation = THREE.MathUtils.clamp(
                this.buildElevation + (delta * this.elevationStep),
                this.minElevation,
                this.maxElevation
            );
        }
    }

    cancel() {
        if (this.isBuildMode) {
            if (this.isVerifying) {
                this.isVerifying = false;
                this.verifiedPos = null;
                if (this.game.player.ui) this.game.player.ui.showStatus("Placement Cancelled", false);
            } else {
                this.toggle();
            }
        }
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
            const logLen = 5.0; 
            const logGeo = new THREE.CylinderGeometry(logRad, logRad, logLen, 8);
            logGeo.rotateZ(Math.PI / 2);
            for (let i = 0; i < 12; i++) {
                const log = new THREE.Mesh(logGeo, ghostMat);
                log.position.y = logRad + (i * logRad * 1.85);
                this.buildGhost.add(log);
            }
            const beamGeo = new THREE.CylinderGeometry(logRad * 0.8, logRad * 0.8, logRad * 24, 8);
            for (let side of [-1, 1]) {
                const beam = new THREE.Mesh(beamGeo, ghostMat);
                beam.position.set(side * 2.4, logRad * 12, 0);
                this.buildGhost.add(beam);
            }
        } else if (type === 'floor') {
            const floorSize = 5.0; 
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
            const wallWidth = 5.0; 
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
        } else if (type === 'square_hut') {
            const size = 5.0;
            const height = 3.0;
            const wallGeo = new THREE.BoxGeometry(size, height, size);
            const walls = new THREE.Mesh(wallGeo, ghostMat);
            walls.position.y = height / 2;
            this.buildGhost.add(walls);
            const roofGeo = new THREE.ConeGeometry(size * 0.8, height * 0.6, 4);
            const roof = new THREE.Mesh(roofGeo, ghostMat);
            roof.position.y = height + (height * 0.3);
            roof.rotation.y = Math.PI / 4;
            this.buildGhost.add(roof);
        } else if (type === 'long_tavern') {
            const width = 15.0;
            const depth = 5.0;
            const height = 4.0;
            const bodyGeo = new THREE.BoxGeometry(width, height, depth);
            const body = new THREE.Mesh(bodyGeo, ghostMat);
            body.position.y = height / 2;
            this.buildGhost.add(body);
            const roofGeo = new THREE.CylinderGeometry(0.1, depth * 0.7, width, 4);
            const roof = new THREE.Mesh(roofGeo, ghostMat);
            roof.position.y = height + (height * 0.2);
            roof.rotation.z = Math.PI / 2;
            roof.rotation.y = Math.PI / 4;
            this.buildGhost.add(roof);
        } else if (type === 'grail_silo') {
            const radius = 2.5;
            const height = 8.0;
            const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 16);
            const body = new THREE.Mesh(bodyGeo, ghostMat);
            body.position.y = height / 2;
            this.buildGhost.add(body);
            const domeGeo = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
            const dome = new THREE.Mesh(domeGeo, ghostMat);
            dome.position.y = height;
            this.buildGhost.add(dome);
        } else if (type === 'crop_plot') {
            const soilGeo = new THREE.BoxGeometry(1.8, 0.2, 1.8);
            const soil = new THREE.Mesh(soilGeo, ghostMat);
            soil.position.y = 0.05;
            this.buildGhost.add(soil);

            const borderGeo = new THREE.BoxGeometry(2.0, 0.3, 0.1);
            for (let i = 0; i < 4; i++) {
                const border = new THREE.Mesh(borderGeo, ghostMat);
                border.position.y = 0.1;
                if (i === 0) border.position.z = 0.95;
                else if (i === 1) border.position.z = -0.95;
                else if (i === 2) { border.position.x = 0.95; border.rotation.y = Math.PI / 2; }
                else if (i === 3) { border.position.x = -0.95; border.rotation.y = Math.PI / 2; }
                this.buildGhost.add(border);
            }
        }
        this.game.scene.add(this.buildGhost);
    }

    place() {
        const mousePos = this.game.mouseWorldPos;
        if (!mousePos && !this.isVerifying) return;

        const option = this.buildOptions[this.selectedBuildIndex];
        const type = option.type;

        if (!this.isVerifying) {
            this.isVerifying = true;
            this.verifiedPos = this.buildGhost.position.clone();
            this.verifiedRotation = this.buildRotation;
            if (this.game.player.ui) this.game.player.ui.showStatus("Click again to confirm", false);
            return;
        }

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

            if (totalWood < woodCost) {
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
        }

        const gridStep = 5.0; 
        const halfStep = gridStep / 2;
        let posX, posY, posZ, finalRotation;

        if (this.isVerifying && this.verifiedPos) {
            posX = this.verifiedPos.x;
            posY = this.verifiedPos.y;
            posZ = this.verifiedPos.z;
            finalRotation = this.verifiedRotation;
        } else {
            if (type === 'floor' || type === 'firepit' || type === 'square_hut' || type === 'long_tavern' || type === 'grail_silo' || type === 'crop_plot') {
                posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
                posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
            } else {
                const normRot = ((this.buildRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                const isHorizontal = Math.abs(Math.sin(normRot)) < 0.1; 
                if (isHorizontal) {
                    posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
                    posZ = Math.round(mousePos.z / gridStep) * gridStep;
                } else {
                    posX = Math.round(mousePos.x / gridStep) * gridStep;
                    posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
                }
            }
            let snappedPos = this.checkSnapping(posX, posZ, type);
            if (snappedPos) {
                posX = snappedPos.x;
                posY = snappedPos.y;
                posZ = snappedPos.z;
            } else {
                posY = this.game.worldManager.getTerrainHeight(posX, posZ) + this.buildElevation;
            }
            finalRotation = this.buildRotation;
        }

        const pos = new THREE.Vector3(posX, posY, posZ);
        const sx = Math.floor((pos.x + SHARD_SIZE / 2) / SHARD_SIZE);
        const sz = Math.floor((pos.z + SHARD_SIZE / 2) / SHARD_SIZE);
        const shard = this.game.worldManager.activeShards.get(`${sx},${sz}`);

        if (shard) {
            const building = new Building(this.game.scene, shard, type, pos, finalRotation);
            if (!shard.resources) shard.resources = [];
            shard.resources.push(building);
            if (this.game.worldManager) this.game.worldManager.invalidateCache();
            
            const isMultiplayer = this.game.multiplayer && this.game.multiplayer.socket && this.game.multiplayer.socket.isConnected;
            if (isMultiplayer) {
                this.game.multiplayer.requestPlaceBuilding(type, pos, finalRotation, sx, sz);
            }

            this.isVerifying = false; 
            this.verifiedPos = null;

            if (this.game.player.ui) {
                this.game.player.ui.updateHotbar();
                this.game.player.ui.renderInventory();
            }
            audioManager.play('harvest', 0.5, 0.8);
        } else {
            this.game.player.ui.showStatus("Cannot build here (Shard not loaded)");
        }
    }

    checkSnapping(posX, posZ, type) {
        const gridStep = 5.0;
        const halfStep = gridStep / 2;
        const nearbyResources = this.game.worldManager.getNearbyResources(new THREE.Vector3(posX, 0, posZ), 10);
        
        for (const res of nearbyResources) {
            if (!(res instanceof Building)) continue;
            
            if (type === 'floor') {
                if (res.type === 'floor') {
                    const distSq = Math.pow(res.group.position.x - posX, 2) + Math.pow(res.group.position.z - posZ, 2);
                    if (distSq < 0.1) return new THREE.Vector3(posX, res.group.position.y, posZ);
                    if (distSq < gridStep * gridStep + 0.1) return new THREE.Vector3(posX, res.group.position.y, posZ);
                }
            }
            
            if (type === 'wall' || type === 'doorway') {
                if (res.type === 'floor') {
                    const dx = Math.abs(res.group.position.x - posX);
                    const dz = Math.abs(res.group.position.z - posZ);
                    if ((dx < 0.1 && dz < halfStep + 0.1) || (dz < 0.1 && dx < halfStep + 0.1)) {
                        return new THREE.Vector3(posX, res.group.position.y, posZ);
                    }
                } else if (res.type === 'wall' || res.type === 'doorway') {
                    const distSq = Math.pow(res.group.position.x - posX, 2) + Math.pow(res.group.position.z - posZ, 2);
                    if (distSq < 0.1) return new THREE.Vector3(posX, res.group.position.y, posZ);
                }
            }
        }
        return null;
    }

    update() {
        const mousePos = this.game.mouseWorldPos;
        if (this.isBuildMode && this.buildGhost) {
            if (mousePos) {
                const hx = Math.floor((mousePos.x + SHARD_SIZE / 2) / SHARD_SIZE);
                const hz = Math.floor((mousePos.z + SHARD_SIZE / 2) / SHARD_SIZE);
                const locationDisplay = document.getElementById('location-display');
                if (locationDisplay) {
                    locationDisplay.innerHTML = `Shard: ${hx}, ${hz} (Building...) Elevation: ${this.buildElevation.toFixed(1)}`;
                }
            }

            const gridStep = 5.0; 
            const halfStep = gridStep / 2;
            let posX = 0, posY = 0, posZ = 0;

            if (mousePos) {
                const type = this.buildOptions[this.selectedBuildIndex].type;
                if (type === 'floor' || type === 'firepit' || type === 'square_hut' || type === 'long_tavern' || type === 'grail_silo' || type === 'crop_plot') {
                    posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
                    posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
                } else {
                    const normRot = ((this.buildRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                    const isHorizontal = Math.abs(Math.sin(normRot)) < 0.1; 

                    if (isHorizontal) {
                        posX = Math.floor(mousePos.x / gridStep) * gridStep + halfStep;
                        posZ = Math.round(mousePos.z / gridStep) * gridStep;
                    } else {
                        posX = Math.round(mousePos.x / gridStep) * gridStep;
                        posZ = Math.floor(mousePos.z / gridStep) * gridStep + halfStep;
                    }
                }
                
                let snappedPos = this.checkSnapping(posX, posZ, type);
                if (snappedPos) {
                    posX = snappedPos.x;
                    posY = snappedPos.y;
                    posZ = snappedPos.z;
                } else {
                    posY = this.game.worldManager.getTerrainHeight(posX, posZ) + this.buildElevation;
                }

                if (this.isVerifying && this.verifiedPos) {
                    this.buildGhost.position.copy(this.verifiedPos);
                    
                    const option = this.buildOptions[this.selectedBuildIndex];
                    if (option.type === 'firepit') {
                        const normal = this.game.worldManager.getTerrainNormal(this.verifiedPos.x, this.verifiedPos.z);
                        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
                        const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.verifiedRotation);
                        this.buildGhost.quaternion.multiplyQuaternions(quaternion, rotY);
                    } else {
                        this.buildGhost.rotation.set(0, this.verifiedRotation, 0);
                    }
                    
                    const pulse = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
                    this.buildGhost.traverse(child => {
                        if (child.material) {
                            child.material.opacity = 0.4 * pulse;
                            child.material.transparent = true;
                        }
                    });

                    const distSq = Math.pow(mousePos.x - this.verifiedPos.x, 2) + Math.pow(mousePos.z - this.verifiedPos.z, 2);
                    if (distSq > 4.0) { 
                        this.isVerifying = false;
                        this.verifiedPos = null;
                        if (this.game.player.ui) this.game.player.ui.showStatus("Build Mode", false);
                    }
                } else {
                    this.buildGhost.position.set(posX, posY, posZ);
                    if (type === 'firepit') {
                        const normal = this.game.worldManager.getTerrainNormal(posX, posZ);
                        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
                        const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.buildRotation);
                        this.buildGhost.quaternion.multiplyQuaternions(quaternion, rotY);
                    } else {
                        this.buildGhost.rotation.set(0, this.buildRotation, 0);
                    }

                    this.buildGhost.traverse(child => {
                        if (child.material) {
                            child.material.opacity = 0.5;
                            child.material.transparent = true;
                        }
                    });
                }
                
                this.buildGhost.visible = true;
            } else {
                this.buildGhost.visible = false;
            }
        }
    }
}
