
import * as THREE from 'three';
import { PlayerConfig } from '../../types';

export class PlayerUtils {
    // Matching constants from Environment.ts to calculate pond depth mathematically
    static POND_X = 8;
    static POND_Z = 6;
    static POND_RADIUS = 4.5;
    static POND_DEPTH = 1.8;

    static getHitboxBounds(position: THREE.Vector3, config: PlayerConfig): THREE.Box3 {
        const { legScale, torsoHeight, torsoWidth, headScale } = config;
        
        // Height Calculation derived from model structure
        const hipHeight = 0.94 * legScale;
        const torsoStack = 1.01 * torsoHeight;
        const headRadius = 0.21 * headScale;
        const totalHeight = hipHeight + torsoStack + headRadius;
        
        // Width & Depth Calculation
        const width = 0.6 * torsoWidth;
        const depth = width * 0.7; // Thinner profile
        
        const rX = width / 2;
        const rZ = depth / 2;
        
        const box = new THREE.Box3();
        // Lift collision bottom slightly to smooth out step climbing
        const stepOffset = 0.1; 
        
        box.min.set(position.x - rX, position.y + stepOffset, position.z - rZ);
        box.max.set(position.x + rX, position.y + totalHeight, position.z + rZ);
        
        return box;
    }

    static checkCollision(pos: THREE.Vector3, config: PlayerConfig, obstacles: THREE.Object3D[]): boolean {
        const playerBox = this.getHitboxBounds(pos, config);
        for (const obs of obstacles) {
            if (obs.userData.type === 'soft') continue;
            const obsBox = new THREE.Box3().setFromObject(obs);
            if (obsBox.intersectsBox(playerBox)) return true;
        }
        return false;
    }

    static getTerrainHeight(x: number, z: number): number {
        const dx = x - this.POND_X;
        const dz = z - this.POND_Z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist < this.POND_RADIUS) {
            const normDist = dist / this.POND_RADIUS;
            return -this.POND_DEPTH * (1 - normDist * normDist);
        }
        return 0;
    }

    static getGroundHeight(pos: THREE.Vector3, config: PlayerConfig, obstacles: THREE.Object3D[]): number {
        // Base ground height comes from terrain math (supports negative/pond)
        let highest = this.getTerrainHeight(pos.x, pos.z);
        
        const width = 0.6 * config.torsoWidth;
        const depth = width * 0.7;
        
        // Cast check from high up
        const pBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(pos.x, 5, pos.z), // Start high
            new THREE.Vector3(width, 10, depth)
        );

        for (const obs of obstacles) {
            if (obs.userData.type === 'soft') continue; 
            
            const obsBox = new THREE.Box3().setFromObject(obs);
            if (pBox.min.x < obsBox.max.x && pBox.max.x > obsBox.min.x &&
                pBox.min.z < obsBox.max.z && pBox.max.z > obsBox.min.z) {
                // If we hit an obstacle, use its top surface
                highest = Math.max(highest, obsBox.max.y);
            }
        }
        return highest;
    }
}
