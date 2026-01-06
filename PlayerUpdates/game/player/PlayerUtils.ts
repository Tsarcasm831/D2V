import * as THREE from 'three';
import { PlayerConfig } from '../../types';

export class PlayerUtils {
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

    static getGroundHeight(pos: THREE.Vector3, config: PlayerConfig, obstacles: THREE.Object3D[]): number {
        let highest = 0;
        const width = 0.6 * config.torsoWidth;
        const depth = width * 0.7;
        
        const pBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(pos.x, 5, pos.z), // Start high
            new THREE.Vector3(width, 10, depth)
        );

        for (const obs of obstacles) {
            if (obs.userData.type === 'soft') continue; 
            
            const obsBox = new THREE.Box3().setFromObject(obs);
            if (pBox.min.x < obsBox.max.x && pBox.max.x > obsBox.min.x &&
                pBox.min.z < obsBox.max.z && pBox.max.z > obsBox.min.z) {
                highest = Math.max(highest, obsBox.max.y);
            }
        }
        return highest;
    }
}