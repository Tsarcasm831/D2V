
import * as THREE from 'three';
import { ENV_CONSTANTS } from './EnvironmentTypes';
import { TerrainTextureFactory } from './TerrainTextureFactory';

export class SceneBuilder {
    static build(scene: THREE.Scene) {
        // Sky
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `;
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize( vWorldPosition ).y;
                gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), 0.6 ), 0.0 ) ), 1.0 );
            }
        `;
        const uniforms = {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xf0f5ff) }
        };
        const skyGeo = new THREE.SphereGeometry(90, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            side: THREE.BackSide,
            fog: false
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        scene.add(sky);

        // --- TERRAIN GENERATION (3x3 Grid of 40x40 patches) ---
        const patchSize = 40;
        const gridRadius = 1; // 1 means -1 to 1 (3x3)
        
        // Define Terrain Map (Center 0,0 is Grass)
        // Grid coordinates: x (col), z (row)
        const terrainMap: Record<string, string> = {
            '0,0': 'Grass',
            '1,0': 'Sand',
            '1,1': 'Gravel',
            '0,1': 'Dirt',
            '-1,1': 'Wood',
            '-1,0': 'Stone',
            '-1,-1': 'Metal',
            '0,-1': 'Snow',
            '1,-1': 'Leaves'
        };

        for (let x = -gridRadius; x <= gridRadius; x++) {
            for (let z = -gridRadius; z <= gridRadius; z++) {
                const key = `${x},${z}`;
                const type = terrainMap[key] || 'Grass';
                
                const geo = new THREE.PlaneGeometry(patchSize, patchSize, 64, 64);
                const posAttribute = geo.attributes.position;
                const vertex = new THREE.Vector3();
                
                // Patch Center in World Space
                const centerX = x * patchSize;
                const centerZ = z * patchSize;

                // Apply Height Deformation (Pond)
                for (let i = 0; i < posAttribute.count; i++) {
                    vertex.fromBufferAttribute(posAttribute, i);
                    
                    // Convert local vertex to world to check pond distance
                    const worldX = centerX + vertex.x;
                    const worldZ = centerZ - vertex.y; // Plane is X-Y initially, rotated later to X-Z. 
                    // Note: When rotated -PI/2 X, Y becomes -Z.
                    
                    // Let's perform calculation as if flat on XZ plane
                    // PlaneGeometry is created on XY plane. We will rotate x -90deg.
                    // So Local Y becomes World -Z.
                    // World Z = centerZ + (Local Y * -1) => centerZ - Local Y. No wait.
                    // Rot -90 X:
                    // new Y = old Z (0)
                    // new Z = old Y * -1 (so positive Y becomes negative Z)
                    
                    // Actually, simpler: just calculate the world coordinate based on where the vertex ends up.
                    // Local Y goes from +Size/2 to -Size/2.
                    // Rotated: World Z goes from (centerZ - Size/2) to (centerZ + Size/2).
                    
                    // Standard ThreeJS Plane: X is width, Y is height.
                    const vY = vertex.y; // Local Y
                    
                    const absX = centerX + vertex.x;
                    const absZ = centerZ + vY; // We will handle rotation by manually setting Z in geom loop or object rotation.
                    // If we rotate object, we must pre-calculate based on final position.
                    
                    // Let's modify Z height (which is local Z before rotation, but after rotation it's world Y? No.)
                    // Easiest way: Use PlaneGeometry, modifying Z attribute (displacement), then rotate Mesh -90 X.
                    // This puts displacement on World Y (up/down).
                    
                    // Pond logic
                    const dx = absX - ENV_CONSTANTS.POND_X;
                    const dz = (-absZ) - ENV_CONSTANTS.POND_Z; // In ThreeJS World, +Z is towards camera (South), -Z is North.
                    // In SceneBuilder previously: worldZ = -vertex.y. 
                    // Let's stick to consistent mapping.
                    
                    // Actually, let's look at previous implementation:
                    // worldZ = -vertex.y.
                    // This implies the plane Y axis pointed to World -Z.
                    // So (0, 40) local -> (0, -40) world Z.
                    
                    const wX = centerX + vertex.x;
                    const wZ = centerZ - vertex.y; 
                    
                    const pdx = wX - ENV_CONSTANTS.POND_X;
                    const pdz = wZ - ENV_CONSTANTS.POND_Z;
                    const dist = Math.sqrt(pdx*pdx + pdz*pdz);
                    
                    if (dist < ENV_CONSTANTS.POND_RADIUS) {
                        const normDist = dist / ENV_CONSTANTS.POND_RADIUS;
                        const depth = ENV_CONSTANTS.POND_DEPTH * (1 - normDist * normDist);
                        // Displace "Z" of plane (which becomes Y world)
                        vertex.z -= depth; 
                    }
                    
                    posAttribute.setZ(i, vertex.z);
                }
                
                geo.computeVertexNormals();

                const texture = TerrainTextureFactory.getTexture(type);
                const mat = new THREE.MeshStandardMaterial({ 
                    map: texture,
                    color: 0xdddddd, // Tint slightly
                    roughness: 0.9,
                    metalness: type === 'Metal' ? 0.6 : 0.1
                });

                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(centerX, 0, centerZ);
                mesh.receiveShadow = true;
                
                // Tag for SoundManager
                mesh.userData = { type: 'terrain', terrainType: type };
                
                scene.add(mesh);
            }
        }
        
        // Water Plane
        const waterGeo = new THREE.CircleGeometry(ENV_CONSTANTS.POND_RADIUS - 0.2, 32);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x2196f3,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.5,
            side: THREE.DoubleSide
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(ENV_CONSTANTS.POND_X, -0.4, ENV_CONSTANTS.POND_Z);
        water.userData = { type: 'terrain', terrainType: 'Water' }; // Just in case walked on
        scene.add(water);
    
        // Grid (Visual Aid)
        const grid = new THREE.GridHelper(100, 40, 0x000000, 0x000000);
        if(grid.material instanceof THREE.Material) {
            grid.material.opacity = 0.05;
            grid.material.transparent = true;
        }
        grid.position.y = 0.01;
        scene.add(grid);
    }
}
