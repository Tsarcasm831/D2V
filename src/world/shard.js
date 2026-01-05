import * as THREE from 'three';
import { SCALE_FACTOR, SHARD_SIZE, WORLD_SEED } from './world_bounds.js';
import { getSeededRandom, getShardSeed } from '../utils/seeded_random.js';
import { NPC } from '../entities/npc.js';
import { Wolf } from '../entities/wolf.js';
import { Deer } from '../entities/deer.js';
import { Bear } from '../entities/bear.js';
import { HumanoidNPC } from '../entities/humanoid_npc.js';
import { Pig } from '../entities/pig.js';
import { Sheep } from '../entities/sheep.js';
import { Chicken } from '../entities/chicken.js';
import { Owl } from '../entities/owl.js';
import { AssassinNPC } from '../entities/enemy_npc_assassin_1.js';
import { KonohaNinjaNPC } from '../entities/konoha_ninja_npc.js';
import { Cow } from '../entities/cow.js';
import { Horse } from '../entities/horse.js';
import { Tree } from './tree.js';
import { Ore } from './ore.js';
import { BerryBush } from './berry_bush.js';
import { ItemDrop } from '../items/item_drop.js';
import { Building } from '../systems/buildings.js';

export class Shard {
    constructor(scene, gridX = 0, gridZ = 0, worldManager = null) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridZ = gridZ;
        this.worldManager = worldManager;
        this.offsetX = gridX * SHARD_SIZE;
        this.offsetZ = gridZ * SHARD_SIZE;
        
        this.npcs = []; // Humanoids
        this.fauna = []; // Animals
        this.resources = [];
        this.items = [];
        this.objects = new THREE.Group();
        this.scene.add(this.objects);

        this._accumulatedDelta = 0;
        this._lastUpdateNPC = 0;

        this.ponds = []; // Store pond data for exclusion
        this.worldPonds = []; // Track ponds added to WorldManager for cleanup
        this.townData = worldManager ? worldManager.townManager.getTownAtShard(gridX, gridZ) : null;
        this.setupEnvironment();
    }

    getBiomeNoise(x, z) {
        if (this.worldManager && this.worldManager.getBiomeNoise) {
            return this.worldManager.getBiomeNoise(x, z);
        }
        // Fallback noise logic (matching WorldManager.js exactly)
        const scale = 0.005;
        
        // Offset x,z to stay within smaller floating point range for Sin/Cos stability
        const ox = x % 10000;
        const oz = z % 10000;
        
        const nx = ox * scale, nz = oz * scale;
        
        // Layered noise (octaves) with more variance
        const v1 = Math.sin(nx) + Math.sin(nz);
        const v2 = Math.sin(nx * 2.1 + nz * 0.5) * 0.5;
        const v3 = Math.cos(nx * 0.7 - nz * 1.3) * 0.25;
        const v4 = Math.sin(Math.sqrt(nx*nx + nz*nz) * 0.5) * 0.5;
        const v5 = Math.sin(nx * 4.0) * Math.cos(nz * 4.0) * 0.125; // Extra detail layer
        
        const combined = (v1 + v2 + v3 + v4 + v5 + 2.125) / 4.25;
        return (combined + 4) / 8; // Maintain original normalization for biomes if needed, or unify
    }

    setupEnvironment() {
        const landSeed = (this.worldManager && this.worldManager.worldMask) ? this.worldManager.worldMask.seed : WORLD_SEED;
        const shardSeed = getShardSeed(this.gridX, this.gridZ, landSeed);
        const rng = getSeededRandom(shardSeed);

        // Determine ground texture and biome characteristics based on noise
        let h = this.getBiomeNoise(this.offsetX, this.offsetZ);
        
        // Land config overrides
        const landId = (this.worldManager && this.worldManager.worldMask) ? this.worldManager.worldMask.landId : null;
        const isLand15 = landId === 'Land15';
        
        // Fast distance check to avoid heavy math for distant shards
        const PLATEAU_X = 7509.5;
        const PLATEAU_Z = -6949.1;
        const dx_plateau = this.offsetX - PLATEAU_X;
        const dz_plateau = this.offsetZ - PLATEAU_Z;
        const distSq_plateau = dx_plateau * dx_plateau + dz_plateau * dz_plateau;
        const plateauRadiusWithMarginSq = 8281.0; // (81 + 10)^2

        // Canyon influence check for environment (Trees/Ponds)
        const canyonHalfWidth = 15.0;
        const canyonTransitionWidth = 10.0;
        const canyonLength = 240.0; // matching world_manager
        const canyonHalfLength = canyonLength / 2;
        const absDx = Math.abs(dx_plateau);
        const absDz = Math.abs(dz_plateau);
        const inCanyon = absDx < (canyonHalfWidth + canyonTransitionWidth) && absDz < canyonHalfLength;

        // Only apply plateau logic if we are in Land23 (Land of Ghosts) or if specifically configured
        const isLand23 = (this.worldManager && this.worldManager.worldMask && this.worldManager.worldMask.landId === 'Land23');
        const onPlateau = isLand23 && (distSq_plateau < plateauRadiusWithMarginSq || inCanyon);

        // Force Snowy Plateau characteristics if near the center or in canyon
        if (onPlateau) {
            h = 0.9; 
        }

        let texPath = 'assets/textures/snow_texture.png';
        let treeCount = 12;
        let grassDensity = 1500; // Reduced from 2500
        let berryCount = 2; // Reduced from 3
        let pondChance = 0.3; // Reduced from 0.4
        let oreTypes = ['rock', 'iron', 'copper', 'sulfur', 'coal', 'silver', 'gold'];

        if (isLand15) {
            texPath = 'assets/textures/sand.png';
            treeCount = 0;
            grassDensity = 0;
            berryCount = 0;
            pondChance = 0;
            oreTypes = ['rock', 'iron']; // Desert ores
        } else if (h < 0.15) { // Swamp
            texPath = 'assets/textures/swamp_ground_texture.png';
            treeCount = 4; // Reduced from 6
            grassDensity = 2500; // Reduced from 4000
            berryCount = 1;
            pondChance = 0.6;
            oreTypes = ['coal', 'iron', 'sulfur'];
        } else if (h < 0.3) { // Dirt Plains
            texPath = 'assets/textures/dirt_texture.png';
            treeCount = 3; // Reduced from 4
            grassDensity = 800; // Reduced from 1000
            berryCount = 1;
            pondChance = 0.1;
            oreTypes = ['rock', 'copper', 'coal'];
        } else if (h < 0.45) { // Forest
            texPath = 'assets/textures/forest_ground_texture.png';
            treeCount = 25; // Reduced from 35
            grassDensity = 2000; // Reduced from 3000
            berryCount = 4; // Reduced from 6
            pondChance = 0.2;
        } else if (h < 0.6) { // Grassy Steppes
            texPath = 'assets/textures/grass_texture.png';
            treeCount = 10; // Reduced from 14
            grassDensity = 2200; // Reduced from 3500
            berryCount = 3; // Reduced from 4
            pondChance = 0.3;
        } else { // Frozen Peaks (Snow)
            texPath = 'assets/textures/snow_texture.png';
            treeCount = 4; // Reduced from 5
            grassDensity = 100; // Reduced from 200
            berryCount = 1;
            pondChance = 0.2;
            oreTypes = ['silver', 'gold', 'iron', 'rock'];
        }

        // Special adjustments for shards on or near the plateau
        if (onPlateau) {
            treeCount = 0; // Clear trees for the plateau
            pondChance = 0; // No ponds on the plateau
            grassDensity = 50; // Very sparse grass
        }

        const wm = this.worldManager;
        const sandTex = wm ? wm.getTexture(isLand15 ? 'assets/textures/sand.png' : 'assets/textures/swamp_ground_texture.png') : new THREE.TextureLoader().load(isLand15 ? 'assets/textures/sand.png' : 'assets/textures/swamp_ground_texture.png');
        const dirtTex = wm ? wm.getTexture('assets/textures/dirt_texture.png') : new THREE.TextureLoader().load('assets/textures/dirt_texture.png');
        const grassTex = wm ? wm.getTexture('assets/textures/grass_texture.png') : new THREE.TextureLoader().load('assets/textures/grass_texture.png');
        const snowTex = wm ? wm.getTexture('assets/textures/snow_texture.png') : new THREE.TextureLoader().load('assets/textures/snow_texture.png');

        const segments = 20; // Optimization: Reduced from 60 to 20 for performance
        
        // --- Pond flattened terrain logic ---
        // We move pond generation UP before the terrain mesh is built
        // to ensure getTerrainHeight uses the updated pond-flattened data.
        const hasPond = rng() < pondChance;
        let pendingPond = null;
        if (hasPond) {
            const px = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetX;
            const pz = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetZ;
            const pRadius = 2.5 + rng() * 3.5;
            const pRotation = rng() * Math.PI * 2;
            const py = this.getTerrainHeight(px, pz);
            const pPos = new THREE.Vector3(px, py, pz);
            
            let canSpawnPond = true;
            if (this.gridX === 0 && this.gridZ === 0) {
                const dx = px - 6, dz = pz - 10;
                if (dx * dx + dz * dz < 144) canSpawnPond = false;
            }

            if (canSpawnPond && this.worldManager) {
                // Efficiently check only world manager's pond list
                for (const p of this.worldManager.ponds) {
                    const dx = px - p.x;
                    const dz = pz - p.z;
                    if (dx * dx + dz * dz < 2500) { // 50m squared
                        canSpawnPond = false;
                        break;
                    }
                }
            }

            if (canSpawnPond) {
                const pondData = { x: px, y: 0, z: pz, radius: pRadius * 1.3 };
                
                // Get raw terrain height for the pond surface to avoid circular logic
                if (this.worldManager) {
                    pondData.y = this.worldManager._getRawTerrainHeight(px, pz);
                } else {
                    pondData.y = py;
                }
                
                const finalPPos = new THREE.Vector3(px, pondData.y, pz);
                this.ponds.push({ pos: finalPPos, radius: pondData.radius });
                
                if (this.worldManager) {
                    this.worldManager.ponds.push(pondData);
                    this.worldManager.clearHeightCache();
                }
                pendingPond = { pos: finalPPos, rot: pRotation, rad: pRadius };
            }
        }
        // --- End Pond flattened terrain logic ---

        const groundGeo = new THREE.PlaneGeometry(SHARD_SIZE, SHARD_SIZE, segments, segments);
        
        // Deform vertices based on heightmap
        const posAttr = groundGeo.getAttribute('position');
        const normalAttr = groundGeo.getAttribute('normal');
        
        // Progressive height and normal calculation to reduce noise calls
        // Throttled height calculation: only call noise once per grid point
        const gridRes = segments + 1;
        const heights = new Float32Array(gridRes * gridRes);
        const texelSize = SHARD_SIZE / segments;
        
        for (let i = 0; i < gridRes; i++) {
            const vy = (0.5 - i / segments) * SHARD_SIZE;
            const worldZ = -vy + this.offsetZ; 
            for (let j = 0; j < gridRes; j++) {
                const vx = (j / segments - 0.5) * SHARD_SIZE;
                const worldX = vx + this.offsetX;
                heights[i * gridRes + j] = this.getTerrainHeight(worldX, worldZ);
            }
        }

        for (let i = 0; i < posAttr.count; i++) {
            posAttr.setZ(i, heights[i]);
        }

        const tempNormal = new THREE.Vector3();
        for (let i = 0; i < gridRes; i++) {
            for (let j = 0; j < gridRes; j++) {
                const idx = i * gridRes + j;
                
                // Faster normal estimation using pre-calculated height grid
                const hL = j > 0 ? heights[idx - 1] : heights[idx];
                const hR = j < segments ? heights[idx + 1] : heights[idx];
                const hD = i > 0 ? heights[idx - gridRes] : heights[idx];
                const hU = i < segments ? heights[idx + gridRes] : heights[idx];

                const nx = (hL - hR) / (2 * texelSize);
                const ny = (hU - hD) / (2 * texelSize); 
                tempNormal.set(nx, ny, 1.0).normalize();
                normalAttr.setXYZ(idx, tempNormal.x, tempNormal.y, tempNormal.z);
            }
        }
        
        groundGeo.attributes.position.needsUpdate = true;
        groundGeo.attributes.normal.needsUpdate = true;
        groundGeo.computeBoundingSphere();
        groundGeo.computeBoundingBox();

        const groundMat = new THREE.MeshStandardMaterial({ 
            roughness: 0.8, 
            metalness: 0.1 
        });

        const terrainUniforms = {
            uSandTex: { value: sandTex },
            uDirtTex: { value: dirtTex },
            uGrassTex: { value: grassTex },
            uSnowTex: { value: snowTex },
            uIsLand15: { value: isLand15 },
            uPonds: { value: this.ponds.map(p => ({ pos: p.pos, radius: p.radius })) },
            uPondCount: { value: this.ponds.length }
        };

        // Fill remaining slots if any
        while (terrainUniforms.uPonds.value.length < 4) {
            terrainUniforms.uPonds.value.push({ pos: new THREE.Vector3(0, -1000, 0), radius: 0 });
        }

        groundMat.onBeforeCompile = (shader) => {
            shader.uniforms.uSandTex = terrainUniforms.uSandTex;
            shader.uniforms.uDirtTex = terrainUniforms.uDirtTex;
            shader.uniforms.uGrassTex = terrainUniforms.uGrassTex;
            shader.uniforms.uSnowTex = terrainUniforms.uSnowTex;
            shader.uniforms.uIsLand15 = terrainUniforms.uIsLand15;
            shader.uniforms.uPonds = terrainUniforms.uPonds;
            shader.uniforms.uPondCount = terrainUniforms.uPondCount;

            shader.vertexShader = `
                varying float vHeight;
                varying vec3 vWorldPos;
                varying float vInPond;
                uniform bool uIsLand15;
                
                struct Pond {
                    vec3 pos;
                    float radius;
                };
                uniform Pond uPonds[4];
                uniform int uPondCount;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vHeight = position.z;
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                
                vInPond = 0.0;
                for(int i = 0; i < 4; i++) {
                    if (i >= uPondCount) break;
                    float dist = distance(vWorldPos.xz, uPonds[i].pos.xz);
                    if (dist < uPonds[i].radius) {
                        vInPond = 1.0;
                    } else if (dist < uPonds[i].radius * 1.5) {
                        float t = (dist - uPonds[i].radius) / (uPonds[i].radius * 0.5);
                        vInPond = 1.0 - smoothstep(0.0, 1.0, t);
                    }
                }
                `
            );

            shader.fragmentShader = `
                uniform sampler2D uSandTex;
                uniform sampler2D uDirtTex;
                uniform sampler2D uGrassTex;
                uniform sampler2D uSnowTex;
                uniform bool uIsLand15;
                varying float vHeight;
                varying vec3 vWorldPos;
                varying float vInPond;
            ` + shader.fragmentShader;

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                vec2 uv = vWorldPos.xz * 0.1; 
                
                vec4 sand = texture2D(uSandTex, uv);
                vec4 dirt = texture2D(uDirtTex, uv);
                vec4 grass = texture2D(uGrassTex, uv);
                vec4 snow = texture2D(uSnowTex, uv);
                
                float h = vHeight;
                vec4 terrainColor;
                
                if (uIsLand15) {
                    // Land15 is all sand
                    terrainColor = sand;
                } else if (h < -0.25) {
                    float t = smoothstep(-1.0, -0.25, h);
                    terrainColor = mix(sand, dirt, t);
                } else if (h < 0.5) {
                    float t = smoothstep(-0.25, 0.5, h);
                    terrainColor = mix(dirt, grass, t);
                } else if (h < 8.0) {
                    float t = smoothstep(0.5, 8.0, h);
                    terrainColor = mix(grass, snow, t);
                } else {
                    terrainColor = snow;
                }
                
                // Force sand/dirt texture inside ponds regardless of height
                vec4 finalColor = mix(terrainColor, sand, vInPond);
                
                diffuseColor *= finalColor;
                `
            );
        };

        const ground = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh = ground;
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(this.offsetX, 0, this.offsetZ);
        ground.receiveShadow = true;
        
        // Ensure terrain is on Layer 1 so player light illuminates it
        ground.layers.enable(1);
        
        this.objects.add(ground);

        // Add a shard-specific grid that follows the terrain
        const gridMat = new THREE.LineBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.2 });
        // Use a simpler grid visualization to avoid artifacting
        const size = SHARD_SIZE;
        const divisions = segments;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x4444ff, 0x4444ff);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.2;
        gridHelper.rotation.x = 0; // GridHelper is already on XZ plane
        gridHelper.position.set(this.offsetX, 0.05, this.offsetZ);
        this.objects.add(gridHelper);
        this.shardGrid = gridHelper;
        this.shardGrid.visible = false;

        // Procedural Ponds (Actual building instantiation)
        if (pendingPond) {
            import('../systems/buildings.js').then(({ Building }) => {
                const pond = new Building(this.scene, this, 'pond', pendingPond.pos, pendingPond.rot);
                if (pond.setRadius) pond.setRadius(pendingPond.rad);
                this.resources.push(pond);
            });
        }

        // High-performance Grass System: Crossed Planes with Vertex Shader Wind
        const grassCount = grassDensity;
        const grassWidth = 0.25; // Narrower blades
        const grassHeight = 0.6; // Slightly shorter for better look
        
        // Build a "crossed plane" geometry with tapered tops
        const grassGeo = new THREE.BufferGeometry();
        const halfW = grassWidth / 2;
        
        // Vertices for two crossed planes (tapered top)
        const vertices = new Float32Array([
            // Plane 1 (Facing Z)
            -halfW, 0, 0,    halfW, 0, 0,   0, grassHeight, 0, // Triangle 1 (Tapered)
            // Plane 2 (Facing X)
            0, 0, -halfW,    0, 0, halfW,   0, grassHeight, 0, // Triangle 2 (Tapered)
        ]);

        const uvs = new Float32Array([
            0, 0,  1, 0,  0.5, 1,
            0, 0,  1, 0,  0.5, 1,
        ]);

        grassGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        grassGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        // Vertex colors for bottom-to-top gradient (lighter greens)
        const colors = [];
        const colorTop = new THREE.Color(0xa8e063); // Bright grass green
        const colorBottom = new THREE.Color(0x2d5a27); // Deep forest green
        for (let i = 0; i < 6; i++) {
            const y = vertices[i * 3 + 1];
            const t = THREE.MathUtils.clamp(y / grassHeight, 0, 1);
            const c = new THREE.Color().copy(colorBottom).lerp(colorTop, t);
            // Add slight randomness to each blade's color
            const noise = (rng() - 0.5) * 0.1;
            c.r += noise; c.g += noise; c.b += noise;
            colors.push(c.r, c.g, c.b);
        }
        grassGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        this.grassUniforms = {
            uTime: { value: 0 }
        };

        const grassMat = new THREE.MeshLambertMaterial({ // Use Lambert for softer lighting
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: false,
            alphaTest: 0.1
        });

        grassMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.grassUniforms.uTime;
            shader.vertexShader = `
                uniform float uTime;
                varying float vY;
                
                // Simplex 2D noise for wind
                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                float snoise(vec2 v){
                  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
                  vec2 i  = floor(v + dot(v, C.yy) );
                  vec2 x0 = v -   i + dot(i, C.xx);
                  vec2 i1;
                  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                  vec4 x12 = x0.xyxy + C.xxzz;
                  x12.xy -= i1;
                  i = mod(i, 289.0);
                  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                  + i.x + vec3(0.0, i1.x, 1.0 ));
                  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                    dot(x12.zw,x12.zw)), 0.0);
                  m = m*m ;
                  m = m*m ;
                  vec3 x = 2.0 * fract(p * C.www) - 1.0;
                  vec3 h = abs(x) - 0.5;
                  vec3 ox = floor(x + 0.5);
                  vec3 a0 = x - ox;
                  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                  vec3 g;
                  g.x  = a0.x  * x0.x  + h.x  * x0.y;
                  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                  return 130.0 * dot(m, g);
                }
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                
                // World position for noise phase
                vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                
                // Multi-layered noise for organic wind
                float noise = snoise(worldPos.xz * 0.15 + uTime * 0.4);
                noise += snoise(worldPos.xz * 0.3 - uTime * 0.7) * 0.5;
                
                float sway = noise * 0.3;
                float strength = position.y / ${grassHeight.toFixed(2)};
                strength = pow(strength, 1.2); 
                
                transformed.x += sway * strength;
                transformed.z += sway * 0.4 * strength;
                transformed.y -= abs(sway * 0.15) * strength; // Tucking effect
                `
            );
        };

        this.grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
        this.grassMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        this.grassMesh.castShadow = false;
        this.grassMesh.receiveShadow = true;
        
        const dummy = new THREE.Object3D();
        let validGrassCount = 0;
        const grassRadiusSq = SHARD_SIZE * SHARD_SIZE * 0.25;
        
        for (let i = 0; i < grassCount; i++) {
            const x = (rng() - 0.5) * SHARD_SIZE + this.offsetX;
            const z = (rng() - 0.5) * SHARD_SIZE + this.offsetZ;

            // Fast pond exclusion
            let inPond = false;
            for (const pond of this.ponds) {
                const dx = x - pond.pos.x;
                const dz = z - pond.pos.z;
                if (dx * dx + dz * dz < (pond.radius + 1.2) ** 2) {
                    inPond = true;
                    break;
                }
            }
            if (inPond) continue;

            // Simplified height lookup for grass (could use height grid interpolation, but direct is safer for now)
            const y = this.getTerrainHeight(x, z);
            
            dummy.position.set(x, y, z);
            dummy.rotation.set(0, rng() * Math.PI, 0);
            dummy.rotation.x = (rng() - 0.5) * 0.2;
            dummy.rotation.z = (rng() - 0.5) * 0.2;
            dummy.scale.setScalar(0.7 + rng() * 0.6);
            dummy.updateMatrix();
            this.grassMesh.setMatrixAt(validGrassCount++, dummy.matrix);
        }
        this.grassMesh.count = validGrassCount;
        this.grassMesh.instanceMatrix.needsUpdate = true;
        this.objects.add(this.grassMesh);

        // Dedicated dense forest generation
        let treesSpawned = 0;
        let treeAttempts = 0;
        const maxTreeAttempts = treeCount * 2;
        
        while (treesSpawned < treeCount && treeAttempts < maxTreeAttempts) {
            treeAttempts++;
            const rx = (rng() - 0.5);
            const rz = (rng() - 0.5);
            const x = rx * SHARD_SIZE * 0.95 + this.offsetX;
            const z = rz * SHARD_SIZE * 0.95 + this.offsetZ;

            // Avoid starter tent in shard (0,0)
            if (this.gridX === 0 && this.gridZ === 0) {
                const dx = x - 6, dz = z - 6;
                if (dx * dx + dz * dz < 25) continue;
            }

            // Pond exclusion for trees using squared distances
            let inPond = false;
            for (const pond of this.ponds) {
                const dx = x - pond.pos.x;
                const dz = z - pond.pos.z;
                if (dx * dx + dz * dz < (pond.radius + 1.5) ** 2) {
                    inPond = true; 
                    break;
                }
            }
            if (inPond) continue;

            const tooClose = this.resources.some(r => {
                if (!r.group) return false;
                const dx = x - r.group.position.x;
                const dz = z - r.group.position.z;
                return (dx * dx + dz * dz) < 25;
            });
            
            if (!tooClose) {
                const y = this.getTerrainHeight(x, z);
                const newPos = new THREE.Vector3(x, y, z);
                
                let variant;
                if (h < 0.3) variant = 3 + Math.floor(rng() * 3);
                else if (h < 0.45) variant = Math.floor(rng() * 6);
                else variant = Math.floor(rng() * 3);
                
                const tree = new Tree(this.scene, this, newPos, variant);
                if (tree.group) {
                    tree.group.matrixAutoUpdate = false;
                    tree.group.updateMatrix();
                }
                this.resources.push(tree);
                treesSpawned++;
            }
        }

        // Elemental Ores & Rocks
        for (let i = 0; i < 4; i++) {
            const type = oreTypes[Math.floor(rng() * oreTypes.length)];
            let x, z, y, pos, tooClose, tooCloseToTent;
            let attempts = 0;
            do {
                x = (rng() - 0.5) * SHARD_SIZE * 0.9 + this.offsetX;
                z = (rng() - 0.5) * SHARD_SIZE * 0.9 + this.offsetZ;
                
                tooCloseToTent = false;
                if (this.gridX === 0 && this.gridZ === 0) {
                    const dx = x - 6, dz = z - 6;
                    if (dx * dx + dz * dz < 25) tooCloseToTent = true;
                }

                y = this.getTerrainHeight(x, z);
                pos = new THREE.Vector3(x, y, z);
                
                // Pond exclusion for Ores
                let inPond = false;
                const sdx = x - (-10), sdz = z - (-5);
                if (sdx * sdx + sdz * sdz < 20) inPond = true;
                if (!inPond) {
                    for (const pond of this.ponds) {
                        if (pos.distanceToSquared(pond.pos) < (pond.radius + 1.0) ** 2) {
                            inPond = true; break;
                        }
                    }
                }

                tooClose = this.resources.some(r => r.group && r.group.position.distanceToSquared(pos) < 16);
                attempts++;
                if (inPond) tooClose = true;
            } while ((tooClose || tooCloseToTent) && attempts < 10);
            
            this.resources.push(new Ore(this.scene, this, type, pos));
        }

        // Berry bushes
        for (let i = 0; i < berryCount; i++) {
            let x, z, y, pos, tooClose, tooCloseToTent;
            let attempts = 0;
            do {
                x = (rng() - 0.5) * SHARD_SIZE * 0.9 + this.offsetX;
                z = (rng() - 0.5) * SHARD_SIZE * 0.9 + this.offsetZ;

                tooCloseToTent = false;
                if (this.gridX === 0 && this.gridZ === 0) {
                    const dx = x - 6, dz = z - 6;
                    if (dx * dx + dz * dz < 16) tooCloseToTent = true;
                }

                y = this.getTerrainHeight(x, z);
                pos = new THREE.Vector3(x, y, z);
                tooClose = this.resources.some(r => r.group && r.group.position.distanceToSquared(pos) < 9);
                attempts++;
            } while ((tooClose || tooCloseToTent) && attempts < 10);
            
            this.resources.push(new BerryBush(this.scene, this, pos));
        }

        // --- Town Building Placement ---
        if (this.townData) {
            console.log(`Shard ${this.gridX}, ${this.gridZ}: Placing town ${this.townData.id}`);
            for (const bData of this.townData.buildings) {
                const wx = this.offsetX + bData.offsetX;
                const wz = this.offsetZ + bData.offsetZ;
                const wy = this.getTerrainHeight(wx, wz);
                const pos = new THREE.Vector3(wx, wy, wz);
                
                const building = new Building(this.scene, this, bData.type, pos, bData.rotation);
                this.resources.push(building);

                // Place building NPCs
                if (bData.npcs) {
                    for (const npcData of bData.npcs) {
                        if (npcData.type === 'innkeeper') {
                            const npcPos = pos.clone().add(new THREE.Vector3(0, 0, 2)); // Offset from building center
                            const npc = new HumanoidNPC(this.scene, this, npcPos);
                            npc.name = "Innkeeper";
                            this.npcs.push(npc);
                        }
                    }
                }
            }
        }
        // --- End Town Building Placement ---

        // Fauna Spawning (Animals)
        // Target: at least 5 deer, 3 wolves, and 1 bear per 9 shards.
        // On average: 0.55 deer, 0.33 wolves, 0.11 bears per shard.
        // We set probabilities slightly higher to ensure the "minimum" is met over areas.
        
        // Safety check: No fauna within 1 shard of spawn (3x3 grid centered on 0,0)
        const isSpawnArea = Math.abs(this.gridX) <= 1 && Math.abs(this.gridZ) <= 1;

        if (!isSpawnArea) {
            // 1. Deer (Avg ~1.0 per shard)
            const numDeer = rng() < 0.7 ? (rng() < 0.3 ? 2 : 1) : 0;
            for (let i = 0; i < numDeer; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Deer(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 2. Wolves (Avg ~0.5 per shard)
            const numWolves = rng() < 0.45 ? 1 : (rng() < 0.1 ? 2 : 0);
            for (let i = 0; i < numWolves; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Wolf(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 3. Bears (Avg ~0.2 per shard)
            const numBears = rng() < 0.18 ? 1 : 0;
            for (let i = 0; i < numBears; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Bear(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 4. Pigs (Avg ~0.6 per shard)
            const numPigs = rng() < 0.5 ? 1 : (rng() < 0.1 ? 2 : 0);
            for (let i = 0; i < numPigs; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Pig(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 5. Sheep (Avg ~0.5 per shard)
            const numSheep = rng() < 0.4 ? 1 : (rng() < 0.1 ? 2 : 0);
            for (let i = 0; i < numSheep; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Sheep(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 6. Chickens (Avg ~0.8 per shard)
            const numChickens = rng() < 0.6 ? (rng() < 0.2 ? 2 : 1) : 0;
            for (let i = 0; i < numChickens; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Chicken(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 7. Owls (Avg ~0.4 per shard)
            const numOwls = rng() < 0.4 ? 1 : 0;
            for (let i = 0; i < numOwls; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Owl(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 8. Cows (Avg ~0.4 per shard)
            const numCows = rng() < 0.4 ? 1 : 0;
            for (let i = 0; i < numCows; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Cow(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 9. Horses (Avg ~0.3 per shard)
            const numHorses = rng() < 0.3 ? 1 : 0;
            for (let i = 0; i < numHorses; i++) {
                const x = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetX;
                const z = (rng() - 0.5) * SHARD_SIZE * 0.85 + this.offsetZ;
                const y = this.getTerrainHeight(x, z);
                this.fauna.push(new Horse(this.scene, this, new THREE.Vector3(x, y, z)));
            }

            // 10. Assassin (~2% chance per shard for ~20k total)
            if (rng() < 0.02) {
                let ax = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetX;
                let az = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetZ;
                
                // Prevent spawning in the bowl area at (7509.5, -6949.1)
                const dx_bowl = ax - 7509.5;
                const dz_bowl = az - (-6949.1);
                const bowlRadiusSq = 5184.0; 
                
                // Check for Yurei city location
                let isNearYurei = false;
                if (this.worldManager && this.worldManager.worldMask && this.worldManager.worldMask.cities) {
                    const yurei = this.worldManager.worldMask.cities.find(c => c.id === 'City-1');
                    if (yurei) {
                        const dy = ax - yurei.worldX;
                        const dz = az - yurei.worldZ;
                        if (dy * dy + dz * dz < 2500) isNearYurei = true; // 50m radius
                    }
                }

                if (dx_bowl * dx_bowl + dz_bowl * dz_bowl < bowlRadiusSq || isNearYurei) {
                    // Shift spawn outside
                    ax += (ax > this.offsetX ? 1 : -1) * 75;
                    az += (az > this.offsetZ ? 1 : -1) * 75;
                }

                const ay = this.getTerrainHeight(ax, az);
                this.npcs.push(new AssassinNPC(this.scene, this, new THREE.Vector3(ax, ay, az)));
            }

            // 8. Konoha Ninja Cell (~0.002% chance for ~80 total, or guaranteed at Yurei)
            let kx, kz, ky;
            let shouldSpawnNinja = rng() < 0.00002;
            let placedAtYurei = false;

            if (this.worldManager && this.worldManager.worldMask && this.worldManager.worldMask.cities) {
                const yurei = this.worldManager.worldMask.cities.find(c => c.id === 'City-1');
                if (yurei) {
                    const sx = Math.floor((yurei.worldX + SHARD_SIZE / 2) / SHARD_SIZE);
                    const sz = Math.floor((yurei.worldZ + SHARD_SIZE / 2) / SHARD_SIZE);
                    if (sx === this.gridX && sz === this.gridZ) {
                        kx = yurei.worldX;
                        kz = yurei.worldZ;
                        ky = this.getTerrainHeight(kx, kz);
                        placedAtYurei = true;
                        shouldSpawnNinja = true; // Always spawn at Yurei
                    }
                }
            }

            if (shouldSpawnNinja) {
                if (!placedAtYurei) {
                    kx = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetX;
                    kz = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetZ;
                    ky = this.getTerrainHeight(kx, kz);
                }
                
                // Spawn a group of 4
                for (let i = 0; i < 4; i++) {
                    const offset = (i - 1.5) * 2 * SCALE_FACTOR; // Spread them out slightly
                    const pos = new THREE.Vector3(kx + offset, ky, kz + offset);
                    this.npcs.push(new KonohaNinjaNPC(this.scene, this, pos));
                }
            }
        }
    }

    getTerrainHeight(x, z) {
        if (this.worldManager) {
            return this.worldManager.getTerrainHeight(x, z);
        }
        return 0;
    }

    update(delta, player, isGridVisible = false) {
        if (!player || !player.mesh) return;
        const playerPos = player.mesh.position;

        // Throttled and distance-based updates
        for (let i = 0, len = this.npcs.length; i < len; i++) {
            const n = this.npcs[i];
            const npcPos = (n.group || n.mesh).position;
            const distSq = npcPos.distanceToSquared(playerPos);
            
            if (distSq < 900) { // Within 30m: Normal update
                n.update(delta, player);
                if (n.group || n.mesh) (n.group || n.mesh).visible = true;
                if (n.animator) n.animator.isEnabled = true;
            } else if (distSq < 2500) { // Within 50m: 10Hz update
                n._updateTimer = (n._updateTimer || 0) + delta;
                if (n._updateTimer >= 0.1) {
                    n.update(n._updateTimer, player);
                    n._updateTimer = 0;
                }
                if (n.group || n.mesh) (n.group || n.mesh).visible = true;
                if (n.animator) n.animator.isEnabled = false; 
            } else { // Far: 2Hz update + Hide mesh
                n._updateTimer = (n._updateTimer || 0) + delta;
                if (n._updateTimer >= 0.5) {
                    n.update(n._updateTimer, player);
                    n._updateTimer = 0;
                }
                if (n.group || n.mesh) (n.group || n.mesh).visible = false;
                if (n.animator) n.animator.isEnabled = false;
            }
        }

        for (let i = 0, len = this.fauna.length; i < len; i++) {
            const f = this.fauna[i];
            const fPos = (f.group || f.mesh).position;
            const distSq = fPos.distanceToSquared(playerPos);

            if (distSq < 900) { // Within 30m
                f.update(delta, player);
                if (f.group || f.mesh) (f.group || f.mesh).visible = true;
            } else if (distSq < 2500) { // Within 50m
                f._updateTimer = (f._updateTimer || 0) + delta;
                if (f._updateTimer >= 0.1) {
                    f.update(f._updateTimer, player);
                    f._updateTimer = 0;
                }
                if (f.group || f.mesh) (f.group || f.mesh).visible = true;
            } else { // Beyond 50m: 2Hz update
                f._updateTimer = (f._updateTimer || 0) + delta;
                if (f._updateTimer >= 0.5) {
                    f.update(f._updateTimer, player);
                    f._updateTimer = 0;
                }
                if (f.group || f.mesh) (f.group || f.mesh).visible = false;
            }
        }

        for (let i = 0, len = this.resources.length; i < len; i++) {
            const r = this.resources[i];
            if (r.update) {
                const rPos = (r.group || r.mesh).position;
                if (rPos.distanceToSquared(playerPos) < 10000) {
                    r.update(delta);
                }
            }
        }
        
        if (this.shardGrid) {
            this.shardGrid.visible = isGridVisible;
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(delta);
            if (item.isDead) {
                this.items.splice(i, 1);
                if (this.worldManager) this.worldManager.invalidateCache();
            }
        }

        // Update GPU uniforms for grass wind
        if (this.grassUniforms) {
            this.grassUniforms.uTime.value += delta;
        }
    }

    destroy() {
        // Clean up ponds from WorldManager to prevent performance degradation
        if (this.worldManager && this.worldPonds.length > 0) {
            this.worldManager.ponds = this.worldManager.ponds.filter(p => !this.worldPonds.includes(p));
            this.worldManager.clearHeightCache();
        }

        this.objects.traverse(child => {
            if (child.isMesh || child.isLineSegments) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        this.scene.remove(this.objects);
        this.npcs.forEach(n => {
            if (n.group) this.scene.remove(n.group);
            if (n.mesh && !n.group) this.scene.remove(n.mesh);
        });
        this.fauna.forEach(f => {
            if (f.group) this.scene.remove(f.group);
            if (f.mesh && !f.group) this.scene.remove(f.mesh);
        });
        this.resources.forEach(r => {
            if (r.group) this.scene.remove(r.group);
        });
        this.items.forEach(i => {
            if (i.group) this.scene.remove(i.group);
        });
    }

    spawnItem(type, pos, data) {
        const item = new ItemDrop(this.scene, this, type, pos, data);
        this.items.push(item);
        if (this.worldManager) {
            this.worldManager.invalidateCache();
        }
    }
}