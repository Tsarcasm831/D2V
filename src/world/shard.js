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
import { AssassinNPC } from '../entities/enemy_npc_assassin_1.js';
import { KonohaNinjaNPC } from '../entities/konoha_ninja_npc.js';
import { Tree } from './tree.js';
import { Ore } from './ore.js';
import { BerryBush } from './berry_bush.js';
import { ItemDrop } from '../items/item_drop.js';

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
        this.setupEnvironment();
    }

    getBiomeNoise(x, z) {
        if (this.worldManager && this.worldManager.getBiomeNoise) {
            return this.worldManager.getBiomeNoise(x, z);
        }
        // Fallback noise logic
        const nx = x * 0.05, nz = z * 0.05;
        const val = Math.sin(nx) + Math.sin(nz) + 
                    Math.cos(nx * 0.7 + nz * 0.3) + 
                    Math.sin(Math.sqrt(nx*nx + nz*nz) * 0.15);
        return (val + 4) / 8; 
    }

    setupEnvironment() {
        const shardSeed = getShardSeed(this.gridX, this.gridZ, WORLD_SEED);
        const rng = getSeededRandom(shardSeed);

        // Determine ground texture and biome characteristics based on noise
        const h = this.getBiomeNoise(this.offsetX, this.offsetZ);
        let texPath = 'assets/textures/snow_texture.png';
        let treeCount = 12;
        let grassDensity = 1500; // Reduced from 2500
        let berryCount = 2; // Reduced from 3
        let pondChance = 0.3; // Reduced from 0.4
        let oreTypes = ['rock', 'iron', 'copper', 'sulfur', 'coal', 'silver', 'gold'];

        if (h < 0.15) { // Swamp
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

        const wm = this.worldManager;
        const sandTex = wm ? wm.getTexture('assets/textures/swamp_ground_texture.png') : new THREE.TextureLoader().load('assets/textures/swamp_ground_texture.png');
        const dirtTex = wm ? wm.getTexture('assets/textures/dirt_texture.png') : new THREE.TextureLoader().load('assets/textures/dirt_texture.png');
        const grassTex = wm ? wm.getTexture('assets/textures/grass_texture.png') : new THREE.TextureLoader().load('assets/textures/grass_texture.png');
        const snowTex = wm ? wm.getTexture('assets/textures/snow_texture.png') : new THREE.TextureLoader().load('assets/textures/snow_texture.png');

        const segments = 60; // Match SHARD_SIZE for 1 unit per grid cell
        
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
                const nearbyRes = this.worldManager.getNearbyResources();
                for (const res of nearbyRes) {
                    if (res.type === 'pond' && res.group) {
                        if (res.group.position.distanceTo(pPos) < 50.0) {
                            canSpawnPond = false;
                            break;
                        }
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
        const gridRes = segments + 1;
        const heights = new Float32Array(gridRes * gridRes);
        
        for (let i = 0; i < gridRes; i++) {
            for (let j = 0; j < gridRes; j++) {
                // PlaneGeometry vertices: i=0 is top (local Y=30), i=segments is bottom (local Y=-30)
                // Rotated -PI/2 on X: Y=30 becomes World Z=-30, Y=-30 becomes World Z=30
                const vx = (j / segments - 0.5) * SHARD_SIZE;
                const vy = (0.5 - i / segments) * SHARD_SIZE;
                const worldX = vx + this.offsetX;
                const worldZ = -vy + this.offsetZ; 
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
                
                // Approximate normals using neighbor heights
                const hL = j > 0 ? heights[idx - 1] : this.getTerrainHeight(this.offsetX + (j-1)/segments*SHARD_SIZE - SHARD_SIZE/2, this.offsetZ - ((0.5 - i/segments)*SHARD_SIZE));
                const hR = j < segments ? heights[idx + 1] : this.getTerrainHeight(this.offsetX + (j+1)/segments*SHARD_SIZE - SHARD_SIZE/2, this.offsetZ - ((0.5 - i/segments)*SHARD_SIZE));
                const hD = i > 0 ? heights[idx - gridRes] : this.getTerrainHeight(this.offsetX + (j/segments - 0.5)*SHARD_SIZE, this.offsetZ - ((0.5 - (i-1)/segments)*SHARD_SIZE));
                const hU = i < segments ? heights[idx + gridRes] : this.getTerrainHeight(this.offsetX + (j/segments - 0.5)*SHARD_SIZE, this.offsetZ - ((0.5 - (i+1)/segments)*SHARD_SIZE));

                const texelSize = SHARD_SIZE / segments;
                // Normal in local space (Plane is XY, height is Z): (-df/dx, -df/dy, 1)
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
            shader.uniforms.uPonds = terrainUniforms.uPonds;
            shader.uniforms.uPondCount = terrainUniforms.uPondCount;

            shader.vertexShader = `
                varying float vHeight;
                varying vec3 vWorldPos;
                varying float vInPond;
                
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
                
                if (h < -0.25) {
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
        for (let i = 0; i < grassCount; i++) {
            const x = (rng() - 0.5) * SHARD_SIZE + this.offsetX;
            const z = (rng() - 0.5) * SHARD_SIZE + this.offsetZ;

            let inPond = false;
            const sdx = x - (-10), sdz = z - (-5);
            if (sdx * sdx + sdz * sdz < 22) inPond = true;
            
            if (!inPond) {
                for (const pond of this.ponds) {
                    const dx = x - pond.pos.x;
                    const dz = z - pond.pos.z;
                    if (dx * dx + dz * dz < (pond.radius + 1.2) ** 2) {
                        inPond = true;
                        break;
                    }
                }
            }
            if (inPond) continue;

            const y = this.getTerrainHeight(x, z);
            
            dummy.position.set(x, y, z);
            dummy.rotation.set(0, rng() * Math.PI, 0);
            // Randomly lean the grass slightly at rest
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
        while (treesSpawned < treeCount && treeAttempts < 20) {
            treeAttempts++;
            let x = (rng() - 0.5) * SHARD_SIZE * 0.95 + this.offsetX;
            let z = (rng() - 0.5) * SHARD_SIZE * 0.95 + this.offsetZ;

            // Avoid starter tent in shard (0,0)
            if (this.gridX === 0 && this.gridZ === 0) {
                const dx = x - 6, dz = z - 6;
                if (dx * dx + dz * dz < 25) continue;
            }

            let y = this.getTerrainHeight(x, z);
            
            const newPos = new THREE.Vector3(x, y, z);
            
            // Pond exclusion for trees
            let inPond = false;
            const sdx = x - (-10), sdz = z - (-5);
            if (sdx * sdx + sdz * sdz < 25) inPond = true;
            if (!inPond) {
                for (const pond of this.ponds) {
                    if (newPos.distanceToSquared(pond.pos) < (pond.radius + 1.5) ** 2) {
                        inPond = true; break;
                    }
                }
            }
            
            const tooClose = this.resources.some(r => r.group && r.group.position.distanceToSquared(newPos) < 25);
            
            if (!tooClose && !inPond) {
                let variant;
                if (h < 0.3) { // Swamp and Dirt Plains: mostly Oak
                    variant = 3 + Math.floor(rng() * 3);
                } else if (h < 0.45) { // Forest: Mixed Oak and Pine
                    variant = Math.floor(rng() * 6);
                } else { // Steppes and Peaks: Pine only
                    variant = Math.floor(rng() * 3);
                }
                const tree = new Tree(this.scene, this, newPos, variant);
                // LOD for trees
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

            // 7. Assassin (1 per shard, except near spawn)
            const ax = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetX;
            const az = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetZ;
            const ay = this.getTerrainHeight(ax, az);
            this.npcs.push(new AssassinNPC(this.scene, this, new THREE.Vector3(ax, ay, az)));

            // 8. Konoha Ninja Cell (Exactly 1 group of 4 per shard)
            const kx = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetX;
            const kz = (rng() - 0.5) * SHARD_SIZE * 0.8 + this.offsetZ;
            const ky = this.getTerrainHeight(kx, kz);
            
            // Spawn a group of 4
            for (let i = 0; i < 4; i++) {
                const offset = (i - 1.5) * 2 * SCALE_FACTOR; // Spread them out slightly
                const pos = new THREE.Vector3(kx + offset, ky, kz + offset);
                this.npcs.push(new KonohaNinjaNPC(this.scene, this, pos));
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
        this.npcs.forEach(n => {
            const npcPos = (n.group || n.mesh).position;
            const distSq = npcPos.distanceToSquared(playerPos);
            
            if (distSq < 1600) { // Within 40m: Normal update
                n.update(delta, player);
                if (n.group || n.mesh) (n.group || n.mesh).visible = true;
                if (n.animator) n.animator.isEnabled = true;
            } else if (distSq < 6400) { // Within 80m: 15Hz update
                n._updateTimer = (n._updateTimer || 0) + delta;
                if (n._updateTimer >= 0.066) {
                    n.update(n._updateTimer, player);
                    n._updateTimer = 0;
                }
                if (n.group || n.mesh) (n.group || n.mesh).visible = true;
                if (n.animator) n.animator.isEnabled = false; 
            } else { // Far: 5Hz update + Hide mesh
                n._updateTimer = (n._updateTimer || 0) + delta;
                if (n._updateTimer >= 0.2) {
                    n.update(n._updateTimer, player);
                    n._updateTimer = 0;
                }
                if (n.group || n.mesh) (n.group || n.mesh).visible = false;
                if (n.animator) n.animator.isEnabled = false;
            }
        });

        this.fauna.forEach(f => {
            const fPos = (f.group || f.mesh).position;
            const distSq = fPos.distanceToSquared(playerPos);

            if (distSq < 1600) { // Within 40m
                f.update(delta, player);
                if (f.group || f.mesh) (f.group || f.mesh).visible = true;
            } else if (distSq < 6400) { // Within 80m
                f._updateTimer = (f._updateTimer || 0) + delta;
                if (f._updateTimer >= 0.066) {
                    f.update(f._updateTimer, player);
                    f._updateTimer = 0;
                }
                if (f.group || f.mesh) (f.group || f.mesh).visible = true;
            } else { // Beyond 80m
                f._updateTimer = (f._updateTimer || 0) + delta;
                if (f._updateTimer >= 0.2) {
                    f.update(f._updateTimer, player);
                    f._updateTimer = 0;
                }
                if (f.group || f.mesh) (f.group || f.mesh).visible = false;
            }
        });

        this.resources.forEach(r => {
            if (r.update) {
                const rPos = (r.group || r.mesh).position;
                if (rPos.distanceToSquared(playerPos) < 10000) {
                    r.update(delta);
                }
            }
        });
        
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