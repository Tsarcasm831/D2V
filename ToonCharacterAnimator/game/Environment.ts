
import * as THREE from 'three';

interface TreeData {
    id: string;
    group: THREE.Group;
    trunk: THREE.Mesh;
    leaves: THREE.Mesh;
    health: number;
    shudderTimer: number;
    basePosition: THREE.Vector3;
}

interface RockData {
    id: string;
    mesh: THREE.Mesh;
    health: number;
    shudderTimer: number;
    basePosition: THREE.Vector3;
}

interface FallingObject {
    mesh: THREE.Group;
    velocity: number;
    axis: THREE.Vector3;
    angle: number;
}

interface Debris {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVelocity: THREE.Vector3;
    life: number;
}

export class Environment {
    obstacles: THREE.Object3D[] = [];
    scene: THREE.Scene;

    private trees: Map<string, TreeData> = new Map();
    private rocks: Map<string, RockData> = new Map();
    
    private fallingObjects: FallingObject[] = [];
    private rockDebris: Debris[] = [];

    // Pond Configuration
    static POND_X = 8;
    static POND_Z = 6;
    static POND_RADIUS = 4.5;
    static POND_DEPTH = 1.8;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.build(scene);
    }

    update(dt: number) {
        // Animate falling trees
        for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
            const obj = this.fallingObjects[i];
            
            // Gravity acceleration for rotation
            obj.velocity += dt * 5.0; 
            const angleDelta = obj.velocity * dt;
            obj.angle += angleDelta;
            
            // Rotate around the pivot (bottom of trunk)
            obj.mesh.rotateOnWorldAxis(obj.axis, angleDelta);

            // Hit ground at 90 degrees (PI/2)
            if (obj.angle >= Math.PI / 2) {
                this.spawnLogs(obj.mesh);
                this.scene.remove(obj.mesh);
                this.fallingObjects.splice(i, 1);
            }
        }

        // Animate Rock Debris
        const gravity = new THREE.Vector3(0, -25, 0);
        for (let i = this.rockDebris.length - 1; i >= 0; i--) {
            const deb = this.rockDebris[i];
            deb.life -= dt;
            
            if (deb.life <= 0) {
                // Shrink then remove
                deb.mesh.scale.multiplyScalar(0.9);
                if (deb.mesh.scale.x < 0.05) {
                    this.scene.remove(deb.mesh);
                    this.rockDebris.splice(i, 1);
                }
            } else {
                deb.velocity.addScaledVector(gravity, dt);
                deb.mesh.position.addScaledVector(deb.velocity, dt);
                deb.mesh.rotation.x += deb.rotVelocity.x * dt;
                deb.mesh.rotation.y += deb.rotVelocity.y * dt;
                deb.mesh.rotation.z += deb.rotVelocity.z * dt;

                // Floor collision (approximate)
                if (deb.mesh.position.y < 0.2) {
                    deb.mesh.position.y = 0.2;
                    deb.velocity.y *= -0.5; // Bounce
                    deb.velocity.x *= 0.8; // Friction
                    deb.velocity.z *= 0.8;
                }
            }
        }

        // Animate tree shudder
        this.trees.forEach(tree => {
            if (tree.shudderTimer > 0) {
                tree.shudderTimer -= dt;
                if (tree.shudderTimer <= 0) {
                    tree.group.position.copy(tree.basePosition);
                } else {
                    const intensity = 0.1 * (tree.shudderTimer / 0.3);
                    tree.group.position.set(
                        tree.basePosition.x + (Math.random() - 0.5) * intensity,
                        tree.basePosition.y,
                        tree.basePosition.z + (Math.random() - 0.5) * intensity
                    );
                }
            }
        });

        // Animate Rock shudder
        this.rocks.forEach(rock => {
            if (rock.shudderTimer > 0) {
                rock.shudderTimer -= dt;
                if (rock.shudderTimer <= 0) {
                    rock.mesh.position.copy(rock.basePosition);
                } else {
                    const intensity = 0.05 * (rock.shudderTimer / 0.2);
                    rock.mesh.position.set(
                        rock.basePosition.x + (Math.random() - 0.5) * intensity,
                        rock.basePosition.y,
                        rock.basePosition.z + (Math.random() - 0.5) * intensity
                    );
                }
            }
        });
    }

    damageObstacle(object: THREE.Object3D, amount: number): string | null {
        // 1. Check Trees
        const tree = this.trees.get(object.uuid);
        if (tree) {
            tree.health -= amount;
            tree.shudderTimer = 0.3;
            if (tree.health <= 0) {
                this.cutDownTree(tree);
            }
            return 'wood';
        }

        // 2. Check Rocks
        const rock = this.rocks.get(object.uuid);
        if (rock) {
            rock.health -= amount;
            rock.shudderTimer = 0.2;
            if (rock.health <= 0) {
                this.shatterRock(rock);
            }
            return 'stone';
        }
        
        return object.userData.material || null;
    }

    private shatterRock(rock: RockData) {
        // 1. Remove logic
        this.obstacles = this.obstacles.filter(o => o !== rock.mesh);
        this.rocks.delete(rock.id);
        this.scene.remove(rock.mesh);

        // 2. Spawn Debris
        const chunks = 8;
        const geo = new THREE.DodecahedronGeometry(0.3, 0);
        const mat = (rock.mesh.material as THREE.Material).clone(); // Use rock material

        for (let i = 0; i < chunks; i++) {
            const chunk = new THREE.Mesh(geo, mat);
            // Start at rock center
            chunk.position.copy(rock.basePosition);
            // Random offset
            chunk.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ));
            chunk.scale.setScalar(0.5 + Math.random() * 0.6);
            chunk.castShadow = true;
            chunk.receiveShadow = true;
            
            this.scene.add(chunk);

            this.rockDebris.push({
                mesh: chunk,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 8 + 2, // Explode up
                    (Math.random() - 0.5) * 8
                ),
                rotVelocity: new THREE.Vector3(
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                ),
                life: 3.0 + Math.random() // Stay for 3-4 seconds
            });
        }
    }

    private cutDownTree(tree: TreeData) {
        this.obstacles = this.obstacles.filter(o => o !== tree.trunk);
        this.trees.delete(tree.trunk.uuid);

        tree.trunk.visible = false;
        tree.leaves.visible = false; 

        const trunkPos = new THREE.Vector3();
        tree.trunk.getWorldPosition(trunkPos);
        
        const stumpHeight = 0.4;
        const stump = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.5, stumpHeight, 7),
            tree.trunk.material
        );
        stump.position.copy(trunkPos);
        stump.position.y = stumpHeight / 2;
        stump.castShadow = true;
        stump.receiveShadow = true;
        this.scene.add(stump);
        stump.userData = { type: 'hard', material: 'wood' };
        this.obstacles.push(stump);

        const fallGroup = new THREE.Group();
        fallGroup.position.copy(trunkPos);
        fallGroup.position.y = stumpHeight; 
        
        const fallTrunkHeight = 1.6; 
        const fallTrunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, fallTrunkHeight, 7),
            tree.trunk.material
        );
        fallTrunk.position.y = fallTrunkHeight / 2;
        fallTrunk.castShadow = true;
        fallTrunk.receiveShadow = true;
        fallGroup.add(fallTrunk);
        
        this.scene.add(fallGroup);

        const angle = Math.random() * Math.PI * 2;
        const axis = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();

        this.fallingObjects.push({
            mesh: fallGroup,
            velocity: 0,
            axis: axis,
            angle: 0
        });
    }

    private spawnLogs(fallingGroup: THREE.Object3D) {
        const pos = fallingGroup.position.clone();
        const qt = fallingGroup.quaternion.clone();
        
        const logMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const logGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.7, 7);
        
        const log1 = new THREE.Mesh(logGeo, logMat);
        log1.quaternion.copy(qt);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qt);
        log1.position.copy(pos).add(up.multiplyScalar(0.4));
        log1.castShadow = true;
        log1.receiveShadow = true;
        log1.userData = { type: 'hard', material: 'wood' };
        this.scene.add(log1);
        this.obstacles.push(log1);

        const log2 = new THREE.Mesh(logGeo, logMat);
        log2.quaternion.copy(qt);
        log2.position.copy(pos).add(up.multiplyScalar(1.2)); 
        log2.castShadow = true;
        log2.receiveShadow = true;
        log2.userData = { type: 'hard', material: 'wood' };
        this.scene.add(log2);
        this.obstacles.push(log2);
    }

    private build(scene: THREE.Scene) {
        // ... (Sky, Floor, Water setup remains same) ...
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

        const floorGeo = new THREE.PlaneGeometry(100, 100, 128, 128);
        const posAttribute = floorGeo.attributes.position;
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            const worldX = vertex.x;
            const worldZ = -vertex.y; 
            const dx = worldX - Environment.POND_X;
            const dz = worldZ - Environment.POND_Z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < Environment.POND_RADIUS) {
                const normDist = dist / Environment.POND_RADIUS;
                const depth = Environment.POND_DEPTH * (1 - normDist * normDist);
                vertex.z -= depth; 
            }
            posAttribute.setZ(i, vertex.z);
        }
        floorGeo.computeVertexNormals();

        const floor = new THREE.Mesh(
          floorGeo,
          new THREE.MeshStandardMaterial({ 
              color: 0xcccccc, 
              roughness: 0.8,
              metalness: 0.1 
          })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        
        const waterGeo = new THREE.CircleGeometry(Environment.POND_RADIUS - 0.2, 32);
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
        water.position.set(Environment.POND_X, -0.4, Environment.POND_Z); 
        scene.add(water);
    
        const grid = new THREE.GridHelper(100, 40, 0x000000, 0x000000);
        if(grid.material instanceof THREE.Material) {
            grid.material.opacity = 0.1;
            grid.material.transparent = true;
        }
        scene.add(grid);
    
        // 1. Blue Box
        const blockHeight = 3.5;
        const block = new THREE.Mesh(
            new THREE.BoxGeometry(2, blockHeight, 2), 
            new THREE.MeshPhongMaterial({ color: 0x4a90e2 })
        );
        block.position.set(3, blockHeight / 2, -2);
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData = { type: 'hard' };
        scene.add(block);
        this.obstacles.push(block);
    
        // 2. Tree
        this.createTree(new THREE.Vector3(-5, 0, -4));
    
        // 3. Rock
        this.createRock(new THREE.Vector3(2, 0.8, 4));
    
        // 4. Dead Wolf
        const wolfGroup = new THREE.Group();
        wolfGroup.position.set(2.5, 0, 2.5);
        wolfGroup.rotation.y = Math.PI / 3;
        scene.add(wolfGroup);
        this.buildWolf(wolfGroup);
    }

    private createRock(position: THREE.Vector3) {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.9, 0),
            new THREE.MeshStandardMaterial({ color: 0x78909c, flatShading: true })
        );
        rock.position.copy(position); 
        rock.scale.set(1.5, 1.0, 1.5);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.userData = { type: 'hard', material: 'stone' };
        this.scene.add(rock);
        this.obstacles.push(rock);

        // Register Rock Logic
        this.rocks.set(rock.uuid, {
            id: rock.uuid,
            mesh: rock,
            health: 10,
            shudderTimer: 0,
            basePosition: position.clone()
        });
    }

    private createTree(position: THREE.Vector3) {
        const treeGroup = new THREE.Group();
        treeGroup.position.copy(position);
        this.scene.add(treeGroup);
    
        const trunkHeight = 2.0;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.5, trunkHeight, 7),
            new THREE.MeshStandardMaterial({ color: 0x5d4037 })
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.userData = { type: 'hard', material: 'wood' };
        treeGroup.add(trunk);
        this.obstacles.push(trunk);
    
        const leavesHeight = 4.5;
        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(2.5, leavesHeight, 8),
            new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
        );
        leaves.position.y = trunkHeight + leavesHeight / 2 - 0.2;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        leaves.userData = { type: 'soft' };
        treeGroup.add(leaves);

        // Register Tree Data
        this.trees.set(trunk.uuid, {
            id: trunk.uuid,
            group: treeGroup,
            trunk: trunk,
            leaves: leaves,
            health: 8,
            shudderTimer: 0,
            basePosition: treeGroup.position.clone()
        });
    }

    private buildWolf(group: THREE.Group) {
        const furMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
    
        // Blood Pool
        const bloodGeo = new THREE.CircleGeometry(0.7, 10);
        const bloodMat = new THREE.MeshBasicMaterial({ color: 0x4a0a0a, transparent: true, opacity: 0.7 });
        const blood = new THREE.Mesh(bloodGeo, bloodMat);
        blood.rotation.x = -Math.PI / 2;
        blood.position.y = 0.005;
        group.add(blood);
    
        // Torso
        const wBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.9), furMat);
        wBody.position.y = 0.2;
        wBody.rotation.z = Math.PI / 2; 
        wBody.rotation.y = 0.2; 
        wBody.castShadow = true;
        wBody.receiveShadow = true;
        group.add(wBody);
    
        // Head
        const wHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.4), furMat);
        wHead.position.set(0, 0.25, 0.65);
        wHead.rotation.z = Math.PI / 2.2;
        wHead.rotation.y = 0.2;
        wHead.castShadow = true;
        group.add(wHead);
    
        const wSnout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.25), furMat);
        wSnout.position.set(0, -0.1, 0.25);
        wHead.add(wSnout);
    
        // Ears
        const wEarGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
        const wEarL = new THREE.Mesh(wEarGeo, furMat);
        wEarL.position.set(0.12, 0.2, 0);
        wEarL.rotation.x = -0.5;
        wHead.add(wEarL);
        
        const wEarR = new THREE.Mesh(wEarGeo, furMat);
        wEarR.position.set(-0.12, 0.2, 0);
        wEarR.rotation.x = -0.5;
        wHead.add(wEarR);
    
        // Legs
        const wLegGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.5);
        const wLegs = [
            { x: -0.2, y: 0.15, z: 0.3 }, 
            { x: -0.2, y: 0.15, z: -0.3 }, 
            { x: 0.2, y: 0.35, z: 0.35 }, 
            { x: 0.2, y: 0.35, z: -0.25 },
        ];
        wLegs.forEach(p => {
            const l = new THREE.Mesh(wLegGeo, furMat);
            l.position.set(p.x, p.y, p.z); 
            l.rotation.z = Math.PI / 2.5; 
            l.rotation.x = (Math.random() - 0.5) * 0.5;
            l.castShadow = true;
            group.add(l);
        });
    
        // Tail
        const wTail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.5), furMat);
        wTail.position.set(0, 0.1, -0.6);
        wTail.rotation.x = -1.2;
        wTail.rotation.z = -0.2;
        group.add(wTail);
    
        // Register Obstacle
        wBody.userData = { type: 'soft', isSkinnable: true, name: 'Dead Wolf' };
        this.obstacles.push(wBody);
    }
}
