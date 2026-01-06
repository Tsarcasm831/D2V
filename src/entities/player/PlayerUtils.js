import * as THREE from 'three';

export class PlayerUtils {
    static getHitboxBounds(position, config) {
        const { legScale = 1.0, torsoHeight = 1.0, torsoWidth = 1.0, headScale = 1.0 } = config;
        
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

    static checkCollision(pos, config, obstacles) {
        const playerBox = this.getHitboxBounds(pos, config);
        for (const obs of obstacles) {
            if (obs.userData?.type === 'soft') continue;
            const obsBox = new THREE.Box3().setFromObject(obs);
            if (obsBox.intersectsBox(playerBox)) return true;
        }
        return false;
    }

    static getGroundHeight(pos, config, obstacles) {
        let highest = -1000; // Use a very low value as default
        const width = 0.6 * (config.torsoWidth || 1.0);
        const depth = width * 0.7;
        
        // Dynamic box height based on player position
        const boxHeight = 20; 
        const pBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(pos.x, pos.y, pos.z), 
            new THREE.Vector3(width, boxHeight, depth)
        );

        for (const obs of obstacles) {
            if (obs.userData?.type === 'soft') continue; 
            
            const obsBox = new THREE.Box3().setFromObject(obs);
            if (pBox.min.x < obsBox.max.x && pBox.max.x > obsBox.min.x &&
                pBox.min.z < obsBox.max.z && pBox.max.z > obsBox.min.z) {
                // Only consider it ground if it's below or slightly above the player's feet
                if (obsBox.max.y <= pos.y + 0.5) {
                    highest = Math.max(highest, obsBox.max.y);
                }
            }
        }
        return highest === -1000 ? 0 : highest;
    }
}
