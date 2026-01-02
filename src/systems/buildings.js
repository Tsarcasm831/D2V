import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class Building {
    constructor(scene, shard, type, pos, rotationY = 0) {
        this.scene = scene;
        this.shard = shard;
        this.type = type;
        this.isDead = false;
        this.health = 20;
        this.radius = 1.2 * SCALE_FACTOR;

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        
        // Align to terrain normal if tent, firepit, or pond
        if (this.type === 'tent' || this.type === 'firepit' || this.type === 'pond') {
            const normal = this.shard.worldManager.getTerrainNormal(pos.x, pos.z);
            
            // Create a quaternion to align up vector (0,1,0) to the normal
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            
            // Create a quaternion for the Y rotation
            const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
            
            // Combine them: first apply Y rotation, then align to normal
            this.group.quaternion.multiplyQuaternions(quaternion, rotY);
        } else {
            this.group.rotation.y = rotationY;
        }

        this.scene.add(this.group);
        console.log(`Building: Added ${this.type} to scene ${this.scene.uuid} at`, this.group.position);

        this.setupMesh();

        if (this.type === 'crop_plot') {
            this.isCropPlot = true;
            this.plantedCrop = null;
            this.growthStage = 0;
            this.growthTimer = 0;
            this.lastUpdate = Date.now();
            this.cropMesh = null;
        }
    }

    update() {
        if (this.isCropPlot && this.plantedCrop) {
            const now = Date.now();
            const dt = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;

            const plantData = this.shard.worldManager.plantsData?.plants?.[this.plantedCrop];
            if (plantData && this.growthStage < plantData.growthStages - 1) {
                this.growthTimer += dt;
                if (this.growthTimer >= plantData.timePerStage) {
                    this.growthTimer = 0;
                    this.growthStage++;
                    this.updateCropMesh();
                }
            }
        }
    }

    plantSeed(seedId) {
        if (!this.isCropPlot || this.plantedCrop) return false;

        const itemData = this.shard.worldManager.itemsData?.items?.[seedId];
        if (!itemData || !itemData.plantId) return false;

        this.plantedCrop = itemData.plantId;
        this.growthStage = 0;
        this.growthTimer = 0;
        this.lastUpdate = Date.now();
        this.updateCropMesh();
        return true;
    }

    updateCropMesh() {
        if (this.cropMesh) {
            this.group.remove(this.cropMesh);
            this.cropMesh = null;
        }

        if (!this.plantedCrop) return;

        const plantData = this.shard.worldManager.plantsData?.plants?.[this.plantedCrop];
        if (!plantData) return;

        const wm = this.shard.worldManager;
        const color = this.getPlantColor(this.plantedCrop, this.growthStage, plantData.growthStages);
        const mat = wm ? wm.getSharedMaterial('standard', { color }) : new THREE.MeshStandardMaterial({ color });
        
        const scale = 0.2 + (this.growthStage / (plantData.growthStages - 1)) * 0.8;
        const height = 0.5 * scale;
        const geo = wm ? wm.getSharedGeometry('cylinder', 0.1 * scale, 0.05 * scale, height) : new THREE.CylinderGeometry(0.1 * scale, 0.05 * scale, height);
        
        this.cropMesh = new THREE.Mesh(geo, mat);
        this.cropMesh.position.y = height / 2;
        this.group.add(this.cropMesh);
    }

    getPlantColor(plantId, stage, totalStages) {
        const isMature = stage === totalStages - 1;
        switch (plantId) {
            case 'wheat': return isMature ? 0xEDC9AF : 0x7CFC00;
            case 'carrot': return isMature ? 0xFFA500 : 0x228B22;
            case 'potato': return isMature ? 0x8B4513 : 0x556B2F;
            case 'tomato': return isMature ? 0xFF0000 : 0x32CD32;
            case 'lettuce': return isMature ? 0x90EE90 : 0x006400;
            default: return 0x00FF00;
        }
    }

    harvest() {
        if (!this.isCropPlot || !this.plantedCrop) return null;

        const wm = this.shard.worldManager;
        const plantData = wm?.plantsData?.plants?.[this.plantedCrop];
        if (!plantData || this.growthStage < plantData.growthStages - 1) return null;

        const yieldData = plantData.yield;
        const lootKey = `harvest_${this.plantedCrop}`;
        const lootTable = wm?.lootTables?.loot_tables?.[lootKey];

        let results = [];
        if (lootTable) {
            for (let i = 0; i < (lootTable.rolls || 1); i++) {
                lootTable.items.forEach(loot => {
                    if (Math.random() < loot.chance) {
                        const count = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
                        results.push({ itemId: loot.id, count });
                    }
                });
            }
        }

        // If no loot table results, use default yield
        if (results.length === 0) {
            const count = Math.floor(Math.random() * (yieldData.max - yieldData.min + 1)) + yieldData.min;
            results.push({ itemId: yieldData.itemId, count });
        }
        
        this.plantedCrop = null;
        this.growthStage = 0;
        this.growthTimer = 0;
        this.updateCropMesh();

        return results;
    }

    setupMesh() {
        const wm = this.shard.worldManager;
        if (this.type === 'tent') {
            const fabricMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: 0x5d4037, side: THREE.DoubleSide });
            const poleMat = wm ? wm.getSharedMaterial('standard', { color: 0x3e2723 }) : new THREE.MeshStandardMaterial({ color: 0x3e2723 });
            
            // Triangular prism for the tent
            const s = 1.4;
            const h = 1.6;
            const l = 2.4;
            
            // Tent geometry is relatively unique but we could cache it if needed.
            // For now, let's keep it as is since tents are few.
            const tentGeo = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                -s, 0, l/2,   s, 0, l/2,   0, h, l/2, // Front
                -s, 0, -l/2,  s, 0, -l/2,  0, h, -l/2 // Back
            ]);
            const indices = [
                0, 1, 2, 
                3, 5, 4,
                0, 2, 3, 2, 5, 3,
                1, 4, 2, 4, 5, 2,
                0, 3, 1, 3, 4, 1
            ];
            tentGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            tentGeo.setIndex(indices);
            tentGeo.computeVertexNormals();
            
            const tent = new THREE.Mesh(tentGeo, fabricMat);
            tent.castShadow = true;
            tent.receiveShadow = true;
            this.group.add(tent);
            
            // Dark interior shadow
            const innerMat = wm ? wm.getSharedMaterial('basic', { color: 0x0a0a0a, side: THREE.BackSide }) : new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.BackSide });
            const innerTent = new THREE.Mesh(tentGeo, innerMat);
            innerTent.scale.set(0.98, 0.98, 0.98);
            this.group.add(innerTent);
            
            // Front flap (slightly open)
            const flapGeo = wm ? wm.getSharedGeometry('plane', s * 0.8, h) : new THREE.PlaneGeometry(s * 0.8, h);
            const flap = new THREE.Mesh(flapGeo, fabricMat);
            flap.position.set(-s/2.2, h/2.2, l/2 + 0.02);
            flap.rotation.y = 0.4;
            this.group.add(flap);

            // Support poles
            const poleGeo = wm ? wm.getSharedGeometry('cylinder', 0.04, 0.04, h) : new THREE.CylinderGeometry(0.04, 0.04, h);
            const poleF = new THREE.Mesh(poleGeo, poleMat);
            poleF.position.set(0, h/2, l/2);
            this.group.add(poleF);
            
            const poleB = new THREE.Mesh(poleGeo, poleMat);
            poleB.position.set(0, h/2, -l/2);
            this.group.add(poleB);
            
            // Sleeping mat inside
            const matGeo = wm ? wm.getSharedGeometry('box', 0.8, 0.05, 1.8) : new THREE.BoxGeometry(0.8, 0.05, 1.8);
            const matMesh = new THREE.Mesh(matGeo, wm ? wm.getSharedMaterial('standard', { color: 0x2e4053 }) : new THREE.MeshStandardMaterial({ color: 0x2e4053 }));
            matMesh.position.set(0.3, 0.02, 0);
            this.group.add(matMesh);
        } else if (this.type === 'wall') {
            const logMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const ropeMat = wm ? wm.getSharedMaterial('standard', { color: 0x3e2723 }) : new THREE.MeshStandardMaterial({ color: 0x3e2723 });
            
            const logRad = 0.18 * SCALE_FACTOR;
            const logLen = 5.0 * SCALE_FACTOR;
            const logGeo = wm ? wm.getSharedGeometry('cylinder', logRad, logRad, logLen, 8) : new THREE.CylinderGeometry(logRad, logRad, logLen, 8);
            // Warning: shared geometry should not be modified like logGeo.rotateZ(Math.PI / 2)
            // Need to fix this in the InstancedMesh loop or use a separate geometry for horizontal logs.
            
            const logCount = 12;
            const logMesh = new THREE.InstancedMesh(logGeo, logMat, logCount + 2); // logs + 2 vertical beams
            logMesh.castShadow = true;
            logMesh.receiveShadow = true;
            this.group.add(logMesh);

            const dummy = new THREE.Object3D();
            for (let i = 0; i < logCount; i++) {
                dummy.position.set(0, logRad + (i * logRad * 1.85), (Math.random() - 0.5) * 0.04);
                dummy.rotation.set(0, (Math.random() - 0.5) * 0.04, Math.PI / 2);
                dummy.scale.setScalar(1);
                dummy.updateMatrix();
                logMesh.setMatrixAt(i, dummy.matrix);
            }

            // Vertical beams
            const beamHeight = logRad * 24;
            for (let i = 0; i < 2; i++) {
                const xSide = i === 0 ? -1 : 1;
                dummy.position.set(xSide * 2.4 * SCALE_FACTOR, logRad * 12, 0);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(0.8, beamHeight / logLen, 0.8);
                dummy.updateMatrix();
                logMesh.setMatrixAt(logCount + i, dummy.matrix);
            }
            logMesh.instanceMatrix.needsUpdate = true;

            // Ropes
            const ropeGeo = wm ? wm.getSharedGeometry('torus', logRad * 1.8, 0.04 * SCALE_FACTOR, 6, 12) : new THREE.TorusGeometry(logRad * 1.8, 0.04 * SCALE_FACTOR, 6, 12);
            const ropeMesh = new THREE.InstancedMesh(ropeGeo, ropeMat, 6);
            ropeMesh.castShadow = true;
            this.group.add(ropeMesh);

            let rIdx = 0;
            for (let xSide of [-1, 1]) {
                for (let h of [logRad * 4, logRad * 12, logRad * 20]) {
                    dummy.position.set(xSide * 2.4 * SCALE_FACTOR, h, 0);
                    dummy.rotation.set(0, Math.PI / 2, 0);
                    dummy.scale.setScalar(1);
                    dummy.updateMatrix();
                    ropeMesh.setMatrixAt(rIdx++, dummy.matrix);
                }
            }
            ropeMesh.instanceMatrix.needsUpdate = true;
            
            this.health = 30;
            this.radius = 2.5 * SCALE_FACTOR;
        } else if (this.type === 'doorway') {
            const logMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const ropeMat = wm ? wm.getSharedMaterial('standard', { color: 0x3e2723 }) : new THREE.MeshStandardMaterial({ color: 0x3e2723 });
            
            const logRad = 0.18 * SCALE_FACTOR;
            const wallWidth = 5.0 * SCALE_FACTOR;
            const openingWidth = 1.5 * SCALE_FACTOR;
            const sideLogWidth = (wallWidth - openingWidth) / 2;
            
            const fullLogGeo = wm ? wm.getSharedGeometry('cylinder', logRad, logRad, wallWidth, 8) : new THREE.CylinderGeometry(logRad, logRad, wallWidth, 8);
            const shortLogGeo = wm ? wm.getSharedGeometry('cylinder', logRad, logRad, sideLogWidth, 8) : new THREE.CylinderGeometry(logRad, logRad, sideLogWidth, 8);

            const logCount = 12;
            const doorHeightLimit = 8;

            const fullLogCount = logCount - doorHeightLimit;
            const shortLogCount = doorHeightLimit * 2;

            const fullLogMesh = new THREE.InstancedMesh(fullLogGeo, logMat, fullLogCount);
            const shortLogMesh = new THREE.InstancedMesh(shortLogGeo, logMat, shortLogCount);
            
            [fullLogMesh, shortLogMesh].forEach(m => {
                m.castShadow = true;
                m.receiveShadow = true;
                this.group.add(m);
            });

            const dummy = new THREE.Object3D();
            let fIdx = 0, sIdx = 0;
            for (let i = 0; i < logCount; i++) {
                const yPos = logRad + (i * logRad * 1.85);
                if (i < doorHeightLimit) {
                    for (let side of [-1, 1]) {
                        dummy.position.set(side * (wallWidth/2 - sideLogWidth/2), yPos, (Math.random() - 0.5) * 0.04);
                        dummy.rotation.set(0, (Math.random() - 0.5) * 0.04, Math.PI / 2);
                        dummy.updateMatrix();
                        shortLogMesh.setMatrixAt(sIdx++, dummy.matrix);
                    }
                } else {
                    dummy.position.set(0, yPos, (Math.random() - 0.5) * 0.04);
                    dummy.rotation.set(0, (Math.random() - 0.5) * 0.04, Math.PI / 2);
                    dummy.updateMatrix();
                    fullLogMesh.setMatrixAt(fIdx++, dummy.matrix);
                }
            }
            fullLogMesh.instanceMatrix.needsUpdate = true;
            shortLogMesh.instanceMatrix.needsUpdate = true;

            // Vertical side logs
            const pillarHeight = logRad + (doorHeightLimit * logRad * 1.85);
            const pillarGeo = wm ? wm.getSharedGeometry('cylinder', logRad * 1.1, logRad * 1.1, pillarHeight, 8) : new THREE.CylinderGeometry(logRad * 1.1, logRad * 1.1, pillarHeight, 8);
            const pillarMesh = new THREE.InstancedMesh(pillarGeo, logMat, 2);
            pillarMesh.castShadow = true;
            this.group.add(pillarMesh);

            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? -1 : 1;
                dummy.position.set(side * (openingWidth/2 + logRad/2), pillarHeight/2, 0);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                pillarMesh.setMatrixAt(i, dummy.matrix);
            }
            pillarMesh.instanceMatrix.needsUpdate = true;

            // Ropes
            const ropeGeo = wm ? wm.getSharedGeometry('torus', logRad * 1.8, 0.04 * SCALE_FACTOR, 6, 12) : new THREE.TorusGeometry(logRad * 1.8, 0.04 * SCALE_FACTOR, 6, 12);
            const ropeMesh = new THREE.InstancedMesh(ropeGeo, ropeMat, 2);
            ropeMesh.castShadow = true;
            this.group.add(ropeMesh);

            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? -1 : 1;
                dummy.position.set(side * (openingWidth/2 + logRad/2), pillarHeight - logRad, 0);
                dummy.rotation.set(0, Math.PI / 2, 0);
                dummy.updateMatrix();
                ropeMesh.setMatrixAt(i, dummy.matrix);
            }
            ropeMesh.instanceMatrix.needsUpdate = true;

            this.health = 25;
            this.radius = 1.0 * SCALE_FACTOR; 
        } else if (this.type === 'floor') {
            const woodMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const floorSize = 5.0 * SCALE_FACTOR;
            const floorThickness = 0.2 * SCALE_FACTOR; // Increased thickness for better visibility/collision
            const floorGeo = wm ? wm.getSharedGeometry('box', floorSize, floorThickness, floorSize) : new THREE.BoxGeometry(floorSize, floorThickness, floorSize);
            const floor = new THREE.Mesh(floorGeo, woodMat);
            // Center the mesh vertically so half is above and half is below the position
            floor.position.y = 0; 
            floor.receiveShadow = true;
            this.group.add(floor);
            
            // Add some "plank" lines for visual detail
            const lineMat = wm ? wm.getSharedMaterial('standard', { color: 0x3e2723 }) : new THREE.MeshStandardMaterial({ color: 0x3e2723 });
            const lineGeo = wm ? wm.getSharedGeometry('box', 0.04 * SCALE_FACTOR, 0.02 * SCALE_FACTOR, floorSize) : new THREE.BoxGeometry(0.04 * SCALE_FACTOR, 0.02 * SCALE_FACTOR, floorSize);
            for (let i = -2; i <= 2; i++) {
                if (i === 0) continue;
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.position.set(i * (floorSize / 5), floorThickness/2 + 0.01 * SCALE_FACTOR, 0);
                this.group.add(line);
            }

            this.health = 20;
            this.radius = 2.0 * SCALE_FACTOR;
            // Floor-specific height for physics
            this.floorHeight = floorThickness / 2;
        } else if (this.type === 'firepit') {
            const wm = this.shard.worldManager;
            const stoneMat = wm ? wm.getSharedMaterial('standard', { color: 0x757575, roughness: 0.8 }) : new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.8 });
            const logMat = wm ? wm.getSharedMaterial('standard', { color: 0x3e2723 }) : new THREE.MeshStandardMaterial({ color: 0x3e2723 });
            const fireMat = wm ? wm.getSharedMaterial('standard', { 
                color: 0xff4400, 
                emissive: 0xff2200, 
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.8
            }) : new THREE.MeshStandardMaterial({ 
                color: 0xff4400, 
                emissive: 0xff2200, 
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.8
            });

            // Stones in a circle (Instanced)
            const stoneCount = 8;
            const stoneRadius = 0.6;
            const stoneGeo = new THREE.DodecahedronGeometry(0.2, 0);
            const stoneMesh = new THREE.InstancedMesh(stoneGeo, stoneMat, stoneCount);
            stoneMesh.castShadow = true;
            this.group.add(stoneMesh);

            const dummy = new THREE.Object3D();
            for (let i = 0; i < stoneCount; i++) {
                const angle = (i / stoneCount) * Math.PI * 2;
                dummy.position.set(Math.cos(angle) * stoneRadius, 0.05, Math.sin(angle) * stoneRadius);
                dummy.rotation.set(Math.random(), Math.random(), Math.random());
                dummy.scale.setScalar(0.75 + Math.random() * 0.5);
                dummy.updateMatrix();
                stoneMesh.setMatrixAt(i, dummy.matrix);
            }
            stoneMesh.instanceMatrix.needsUpdate = true;

            // Crossed logs (Instanced)
            const logGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
            const logMesh = new THREE.InstancedMesh(logGeo, logMat, 3);
            logMesh.castShadow = true;
            this.group.add(logMesh);

            for (let i = 0; i < 3; i++) {
                dummy.position.set(0, 0.08, 0);
                dummy.rotation.set(0, (i / 3) * Math.PI, Math.PI / 2);
                dummy.scale.setScalar(1);
                dummy.updateMatrix();
                logMesh.setMatrixAt(i, dummy.matrix);
            }
            logMesh.instanceMatrix.needsUpdate = true;

            // Central fire glow
            const fireGeo = new THREE.ConeGeometry(0.3, 0.6, 6);
            this.fireMesh = new THREE.Mesh(fireGeo, fireMat);
            this.fireMesh.position.y = 0.3;
            this.group.add(this.fireMesh);

            // Light source
            const light = new THREE.PointLight(0xff6600, 15, 8);
            light.position.y = 0.5;
            light.castShadow = true;
            this.group.add(light);

            // Flicker logic
            this.update = (delta) => {
                const t = performance.now() * 0.005;
                if (this.fireMesh) {
                    this.fireMesh.scale.set(
                        1 + Math.sin(t * 2) * 0.1,
                        1 + Math.cos(t * 3) * 0.2,
                        1 + Math.sin(t * 2.5) * 0.1
                    );
                    light.intensity = 15 + Math.sin(t * 10) * 5;
                }
            };
        } else if (this.type === 'pond') {
            const waterMat = new THREE.MeshStandardMaterial({ 
                color: 0x0077be, 
                roughness: 0.1, 
                metalness: 0.4, 
                transparent: true, 
                opacity: 0.7 
            });
            const iceMat = new THREE.MeshStandardMaterial({ color: 0xe0f7fa, roughness: 0.05, metalness: 0.1 });
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x607d8b });

            // Generate an oblong, irregular shape using spline points
            // We use position-based deterministic "randomness" to keep shapes consistent
            const pos = this.group.position;
            const baseSeed = (pos.x * 0.13 + pos.z * 0.17);
            const getLocalDet = (offset) => Math.abs(Math.sin(baseSeed + offset) * 10000) % 1;

            const pondRadius = 4.0 * SCALE_FACTOR;
            const pointsCount = 12;
            const points = [];
            const radiusVariations = [];
            
            // Create irregular radii for the "oblong" look
            const stretchAxis = getLocalDet(1) * Math.PI; 
            const stretchIntensity = 0.8 + getLocalDet(2) * 1.2;
            
            for (let i = 0; i < pointsCount; i++) {
                const angle = (i / pointsCount) * Math.PI * 2;
                // Stretch along the chosen axis (oblong)
                const stretch = 1.0 + Math.abs(Math.cos(angle - stretchAxis)) * stretchIntensity; 
                const r = pondRadius * stretch * (0.7 + getLocalDet(i + 10) * 0.4);
                radiusVariations.push(r);
                points.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
            }

            const pondShape = new THREE.Shape();
            pondShape.moveTo(points[0].x, points[0].y);
            // Use quadratic curves for smooth blobby shape
            for (let i = 0; i < pointsCount; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % pointsCount];
                const mid = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
                // Push mid point out a bit for curve variation
                mid.multiplyScalar(1.0 + getLocalDet(i + 30) * 0.2);
                pondShape.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
            }
            pondShape.closePath();

            const extrudeSettings = { depth: 0.1 * SCALE_FACTOR, bevelEnabled: false };
            const waterGeo = new THREE.ExtrudeGeometry(pondShape, extrudeSettings);
            const water = new THREE.Mesh(waterGeo, waterMat);
            
            // Orient correctly for XZ plane
            water.rotation.x = Math.PI / 2;
            water.position.y = 0.08 * SCALE_FACTOR;
            water.receiveShadow = true;
            this.group.add(water);

            // Small rim of stones and ice patches following the irregular shape
            const rimCount = 35;
            for (let i = 0; i < rimCount; i++) {
                const angle = (i / rimCount) * Math.PI * 2;
                // Interpolate radius for this angle
                const index = (angle / (Math.PI * 2)) * pointsCount;
                const i1 = Math.floor(index) % pointsCount;
                const i2 = (i1 + 1) % pointsCount;
                const t = index - Math.floor(index);
                const rBase = radiusVariations[i1] * (1 - t) + radiusVariations[i2] * t;
                
                const det = getLocalDet(i + 100);
                const dist = rBase + (det - 0.2) * 0.7 * SCALE_FACTOR;
                const isStone = det > 0.35;
                
                const mesh = new THREE.Mesh(
                    isStone ? new THREE.DodecahedronGeometry((0.2 + getLocalDet(i + 200) * 0.4) * SCALE_FACTOR, 0) 
                            : new THREE.BoxGeometry(1.2 * SCALE_FACTOR, 0.15 * SCALE_FACTOR, 0.8 * SCALE_FACTOR),
                    isStone ? stoneMat : iceMat
                );
                
                mesh.position.set(Math.cos(angle) * dist, 0.05 * SCALE_FACTOR, Math.sin(angle) * dist);
                mesh.rotation.set(det * 0.2, det * Math.PI, det * 0.2);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.group.add(mesh);
            }

            // A few floating ice chunks in the middle
            for (let i = 0; i < 4; i++) {
                const iceChunk = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8 * SCALE_FACTOR, 0.08 * SCALE_FACTOR, 0.6 * SCALE_FACTOR),
                    iceMat
                );
                const det = getLocalDet(i + 300);
                const r = det * radiusVariations[Math.floor(det * pointsCount)] * 0.8;
                const a = getLocalDet(i + 400) * Math.PI * 2;
                iceChunk.position.set(Math.cos(a) * r, 0.1 * SCALE_FACTOR, Math.sin(a) * r);
                iceChunk.rotation.y = det * Math.PI;
                this.group.add(iceChunk);
            }

            // Calculate an approximate maximum radius for collision/exclusion
            const maxR = Math.max(...radiusVariations);
            this.radius = maxR * 0.9; 
            this.radiusVariations = radiusVariations;
            this.health = 10000; // Indestructible terrain-like object
        } else if (this.type === 'square_hut') {
            const woodMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const roofMat = wm ? wm.getSharedMaterial('standard', { color: 0x3e2723 }) : new THREE.MeshStandardMaterial({ color: 0x3e2723 });
            
            const size = 5.0 * SCALE_FACTOR;
            const height = 3.0 * SCALE_FACTOR;
            
            // Walls
            const wallGeo = wm ? wm.getSharedGeometry('box', size, height, size) : new THREE.BoxGeometry(size, height, size);
            const walls = new THREE.Mesh(wallGeo, woodMat);
            walls.position.y = height / 2;
            walls.castShadow = true;
            walls.receiveShadow = true;
            this.group.add(walls);
            
            // Roof (Pyramid)
            const roofGeo = new THREE.ConeGeometry(size * 0.8, height * 0.6, 4);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = height + (height * 0.3);
            roof.rotation.y = Math.PI / 4;
            roof.castShadow = true;
            this.group.add(roof);
            
            this.health = 100;
            this.radius = size / 2;
        } else if (this.type === 'long_tavern') {
            const woodMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const roofMat = wm ? wm.getSharedMaterial('standard', { color: 0x2e1a16 }) : new THREE.MeshStandardMaterial({ color: 0x2e1a16 });
            
            const width = 15.0 * SCALE_FACTOR;
            const depth = 5.0 * SCALE_FACTOR;
            const height = 4.0 * SCALE_FACTOR;
            
            // Main structure
            const bodyGeo = wm ? wm.getSharedGeometry('box', width, height, depth) : new THREE.BoxGeometry(width, height, depth);
            const body = new THREE.Mesh(bodyGeo, woodMat);
            body.position.y = height / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            this.group.add(body);
            
            // Slanted roof
            const roofGeo = new THREE.CylinderGeometry(0.1, depth * 0.7, width, 4);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = height + (height * 0.2);
            roof.rotation.z = Math.PI / 2;
            roof.rotation.y = Math.PI / 4;
            roof.castShadow = true;
            this.group.add(roof);
            
            this.health = 300;
            this.radius = width / 2;
        } else if (this.type === 'grail_silo') {
            const stoneMat = wm ? wm.getSharedMaterial('standard', { color: 0x808080 }) : new THREE.MeshStandardMaterial({ color: 0x808080 });
            const topMat = wm ? wm.getSharedMaterial('standard', { color: 0xffd700, metalness: 0.8, roughness: 0.2 }) : new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
            
            const radius = 2.5 * SCALE_FACTOR;
            const height = 8.0 * SCALE_FACTOR;
            
            // Tower body
            const bodyGeo = wm ? wm.getSharedGeometry('cylinder', radius, radius, height, 16) : new THREE.CylinderGeometry(radius, radius, height, 16);
            const body = new THREE.Mesh(bodyGeo, stoneMat);
            body.position.y = height / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            this.group.add(body);
            
            // Dome top
            const domeGeo = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
            const dome = new THREE.Mesh(domeGeo, topMat);
            dome.position.y = height;
            dome.castShadow = true;
            this.group.add(dome);
            
            this.health = 500;
            this.radius = radius;
        } else if (this.type === 'crop_plot') {
            const dirtMat = wm ? wm.getSharedMaterial('standard', { color: 0x3d2b1f }) : new THREE.MeshStandardMaterial({ color: 0x3d2b1f });
            const woodMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            
            // Soil area
            const soilGeo = wm ? wm.getSharedGeometry('box', 1.8, 0.2, 1.8) : new THREE.BoxGeometry(1.8, 0.2, 1.8);
            const soil = new THREE.Mesh(soilGeo, dirtMat);
            soil.position.y = 0.05;
            soil.receiveShadow = true;
            this.group.add(soil);

            // Border
            const borderGeo = wm ? wm.getSharedGeometry('box', 2.0, 0.3, 0.1) : new THREE.BoxGeometry(2.0, 0.3, 0.1);
            for (let i = 0; i < 4; i++) {
                const border = new THREE.Mesh(borderGeo, woodMat);
                border.position.y = 0.1;
                if (i === 0) border.position.z = 0.95;
                else if (i === 1) border.position.z = -0.95;
                else if (i === 2) { border.position.x = 0.95; border.rotation.y = Math.PI / 2; }
                else if (i === 3) { border.position.x = -0.95; border.rotation.y = Math.PI / 2; }
                border.castShadow = true;
                border.receiveShadow = true;
                this.group.add(border);
            }
            this.radius = 1.0;
        }
    }

    resolveCollision(entityPos, entityRadius) {
        if (this.type === 'wall' || this.type === 'doorway') {
            const dx = entityPos.x - this.group.position.x;
            const dz = entityPos.z - this.group.position.z;
            const rot = this.group.rotation.y;
            const cos = Math.cos(-rot);
            const sin = Math.sin(-rot);
            const lx = dx * cos - dz * sin;
            const lz = dx * sin + dz * cos;
            
            const hw = 2.5 * SCALE_FACTOR;
            const hh = 0.25 * SCALE_FACTOR;
            
            if (this.type === 'wall') {
                const cx = Math.max(-hw, Math.min(hw, lx));
                const cz = Math.max(-hh, Math.min(hh, lz));
                const dfx = lx - cx;
                const dfz = lz - cz;
                const dSq = dfx * dfx + dfz * dfz;
                
                if (dSq < entityRadius * entityRadius) {
                    const dist = Math.sqrt(dSq);
                    let nx, nz, overlap;
                    if (dist < 0.001) {
                        const dR = hw - lx; const dL = lx + hw; const dT = hh - lz; const dB = lz + hh;
                        const mD = Math.min(dR, dL, dT, dB);
                        overlap = entityRadius + mD;
                        if (mD === dR) { nx = 1; nz = 0; }
                        else if (mD === dL) { nx = -1; nz = 0; }
                        else if (mD === dT) { nx = 0; nz = 1; }
                        else { nx = 0; nz = -1; }
                    } else {
                        overlap = entityRadius - dist;
                        nx = dfx / dist; nz = dfz / dist;
                    }
                    const wNX = nx * Math.cos(rot) - nz * Math.sin(rot);
                    const wNZ = nx * Math.sin(rot) + nz * Math.cos(rot);
                    entityPos.x += wNX * overlap;
                    entityPos.z += wNZ * overlap;
                    return { nx: wNX, nz: wNZ };
                }
            } else {
                // Doorway: Two smaller hitboxes on either side
                const opW = 0.75 * SCALE_FACTOR;
                const segW = (hw - opW) / 2;
                const off = opW + segW;
                for (let side of [-1, 1]) {
                    const slx = lx - (side * off);
                    const cx = Math.max(-segW, Math.min(segW, slx));
                    const cz = Math.max(-hh, Math.min(hh, lz));
                    const dfx = slx - cx;
                    const dfz = lz - cz;
                    const dSq = dfx * dfx + dfz * dfz;
                    if (dSq < entityRadius * entityRadius) {
                        const dist = Math.sqrt(dSq);
                        const nx = dist < 0.001 ? side : dfx / dist;
                        const nz = dist < 0.001 ? 0 : dfz / dist;
                        const overlap = entityRadius - dist;
                        const wNX = nx * Math.cos(rot) - nz * Math.sin(rot);
                        const wNZ = nx * Math.sin(rot) + nz * Math.cos(rot);
                        entityPos.x += wNX * overlap;
                        entityPos.z += wNZ * overlap;
                        return { nx: wNX, nz: wNZ };
                    }
                }
            }
        }
        return null;
    }

    getCollisionRadiusAtAngle(angle) {
        if (this.type === 'wall') {
            const localAngle = angle - this.group.rotation.y;
            const hw = 2.5 * SCALE_FACTOR; // Half-length of the wall segment
            const hh = 0.3 * SCALE_FACTOR; // Half-thickness of the wall segment
            const cos = Math.cos(localAngle);
            const sin = Math.sin(localAngle);
            // Box-to-circle collision radius approximation using polar coordinates
            return 1 / Math.max(Math.abs(cos / hw), Math.abs(sin / hh));
        }

        if (this.type === 'pond' && this.radiusVariations) {
            const pointsCount = 12;
            let a = angle;
            while (a < 0) a += Math.PI * 2;
            while (a >= Math.PI * 2) a -= Math.PI * 2;
            
            const index = (a / (Math.PI * 2)) * pointsCount;
            const i1 = Math.floor(index) % pointsCount;
            const i2 = (i1 + 1) % pointsCount;
            const t = index - Math.floor(index);
            
            const r = (this.radiusVariations[i1] * (1 - t) + this.radiusVariations[i2] * t);
            return r * (this.group ? this.group.scale.x : 1.0);
        }

        if (this.type === 'doorway') {
            // Logic: High radius at the sides (East/West relative to building rotation)
            // Low radius at the front/back (North/South relative to building rotation)
            // angle is world angle. localAngle = worldAngle - rotationY
            const localAngle = angle - this.group.rotation.y;
            // cos(localAngle) is 1 at 0 (East), -1 at PI (West).
            // sin(localAngle) is 1 at PI/2 (North), -1 at 3PI/2 (South).
            const isAtOpening = Math.abs(Math.sin(localAngle)) > 0.4;
            return isAtOpening ? 0 : 1.6 * SCALE_FACTOR;
        }

        return this.radius;
    }

    setRadius(r) {
        if (this.type !== 'pond') return;
        // For irregular ponds, this radius serves as a base scale factor
        const oldRadius = this.radius;
        this.radius = r * SCALE_FACTOR;
        const baseSize = 4.0 * SCALE_FACTOR;
        const scale = this.radius / baseSize;
        // Apply uniform scale for XZ while preserving Y (thickness/alignment)
        this.group.scale.set(scale, this.group.scale.y, scale);
        // Ensure radius is updated for collisions (approximate)
        this.radius = (oldRadius / baseSize) * r * SCALE_FACTOR;
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.health -= amount;
        
        // Shake feedback
        const origScale = this.group.scale.clone();
        this.group.scale.multiplyScalar(1.05);
        setTimeout(() => { if(this.group) this.group.scale.copy(origScale); }, 50);
        
        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('harvest', 0.4);
        });

        if (this.health <= 0) this.die();
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        // Drop some wood on collapse
        if (this.shard && this.shard.spawnItem) {
            for(let i=0; i<3; i++) {
                const p = this.group.position.clone();
                p.x += (Math.random()-0.5)*2;
                p.z += (Math.random()-0.5)*2;
                this.shard.spawnItem('wood', p, { 
                    type: 'wood', 
                    name: 'Tent Poles', 
                    icon: 'assets/icons/wood_log_icon.png', 
                    count: 1,
                    stackLimit: 99
                });
            }
        }
        
        // Sink and remove
        const interval = setInterval(() => {
            if (!this.group) {
                clearInterval(interval);
                return;
            }
            this.group.position.y -= 0.1;
            this.group.scale.multiplyScalar(0.9);
            if (this.group.scale.x < 0.1) {
                this.scene.remove(this.group);
                this.group = null;
                clearInterval(interval);
            }
        }, 30);
    }
}