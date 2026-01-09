
import * as THREE from 'three';
import { TreeData, RockData } from './EnvironmentTypes';
import { ObjectFactory } from './ObjectFactory';
import { DebrisSystem } from './DebrisSystem';

export class ObstacleManager {
    obstacles: THREE.Object3D[] = [];
    private scene: THREE.Scene;
    private trees: Map<string, TreeData> = new Map();
    private rocks: Map<string, RockData> = new Map();
    private debrisSystem: DebrisSystem;

    constructor(scene: THREE.Scene, debrisSystem: DebrisSystem) {
        this.scene = scene;
        this.debrisSystem = debrisSystem;
    }

    init() {
        // 1. Blue Box
        const block = ObjectFactory.createBlueBlock();
        this.addObstacle(block);

        // 2. Tree
        this.createTree(new THREE.Vector3(-5, 0, -4));

        // 3. Rock
        this.createRock(new THREE.Vector3(2, 0.8, 4));

        // 4. Dead Wolf
        const wolf = ObjectFactory.createDeadWolf(new THREE.Vector3(2.5, 0, 2.5), Math.PI / 3);
        this.scene.add(wolf.group);
        this.obstacles.push(wolf.obstacle);
    }

    addObstacle(obj: THREE.Object3D) {
        this.scene.add(obj);
        this.obstacles.push(obj);
    }

    addLogs(logs: THREE.Mesh[]) {
        logs.forEach(log => this.obstacles.push(log));
    }

    private createRock(position: THREE.Vector3) {
        const rock = ObjectFactory.createRock(position);
        this.addObstacle(rock);
        
        this.rocks.set(rock.uuid, {
            id: rock.uuid,
            mesh: rock,
            health: 10,
            shudderTimer: 0,
            basePosition: position.clone()
        });
    }

    private createTree(position: THREE.Vector3) {
        const { group, trunk, leaves } = ObjectFactory.createTree(position);
        this.scene.add(group);
        this.obstacles.push(trunk);

        this.trees.set(trunk.uuid, {
            id: trunk.uuid,
            group: group,
            trunk: trunk,
            leaves: leaves,
            health: 8,
            shudderTimer: 0,
            basePosition: group.position.clone()
        });
    }

    update(dt: number) {
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
        this.obstacles = this.obstacles.filter(o => o !== rock.mesh);
        this.rocks.delete(rock.id);
        this.scene.remove(rock.mesh);

        // Spawn Debris
        this.debrisSystem.spawnRockDebris(rock.basePosition, rock.mesh.material as THREE.Material);
    }

    private cutDownTree(tree: TreeData) {
        this.obstacles = this.obstacles.filter(o => o !== tree.trunk);
        this.trees.delete(tree.trunk.uuid);

        tree.trunk.visible = false;
        tree.leaves.visible = false; 

        const trunkPos = new THREE.Vector3();
        tree.trunk.getWorldPosition(trunkPos);
        
        // Spawn Stump
        const stump = ObjectFactory.createStump(trunkPos, tree.trunk.quaternion, tree.trunk.material as THREE.Material);
        this.addObstacle(stump);

        // Spawn Falling Trunk
        const fallGroup = ObjectFactory.createFallingTrunk(trunkPos, tree.trunk.material as THREE.Material);
        this.debrisSystem.addFallingTree(fallGroup);
    }
}
