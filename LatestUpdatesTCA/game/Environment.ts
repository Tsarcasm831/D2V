
import * as THREE from 'three';
import { ENV_CONSTANTS } from './environment/EnvironmentTypes';
import { SceneBuilder } from './environment/SceneBuilder';
import { DebrisSystem } from './environment/DebrisSystem';
import { ObstacleManager } from './environment/ObstacleManager';

export class Environment {
    private scene: THREE.Scene;
    private obstacleManager: ObstacleManager;
    private debrisSystem: DebrisSystem;

    // Static constants for compatibility
    static POND_X = ENV_CONSTANTS.POND_X;
    static POND_Z = ENV_CONSTANTS.POND_Z;
    static POND_RADIUS = ENV_CONSTANTS.POND_RADIUS;
    static POND_DEPTH = ENV_CONSTANTS.POND_DEPTH;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        
        // Initialize Systems
        this.debrisSystem = new DebrisSystem(scene, (logs) => {
            this.obstacleManager.addLogs(logs);
        });
        
        this.obstacleManager = new ObstacleManager(scene, this.debrisSystem);

        this.build();
    }

    // Accessor for collision system
    get obstacles(): THREE.Object3D[] {
        return this.obstacleManager.obstacles;
    }

    update(dt: number) {
        this.debrisSystem.update(dt);
        this.obstacleManager.update(dt);
    }

    damageObstacle(object: THREE.Object3D, amount: number): string | null {
        return this.obstacleManager.damageObstacle(object, amount);
    }

    private build() {
        SceneBuilder.build(this.scene);
        this.obstacleManager.init();
    }
}
