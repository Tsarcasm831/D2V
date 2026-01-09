
import * as THREE from 'three';

export class ObjectFactory {
    static createTree(position: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(position);
    
        const trunkHeight = 2.0;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.5, trunkHeight, 7),
            new THREE.MeshStandardMaterial({ color: 0x5d4037 })
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.userData = { type: 'hard', material: 'wood' };
        group.add(trunk);
    
        const leavesHeight = 4.5;
        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(2.5, leavesHeight, 8),
            new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
        );
        leaves.position.y = trunkHeight + leavesHeight / 2 - 0.2;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        leaves.userData = { type: 'soft' };
        group.add(leaves);

        return { group, trunk, leaves };
    }

    static createRock(position: THREE.Vector3) {
        const mesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.9, 0),
            new THREE.MeshStandardMaterial({ color: 0x78909c, flatShading: true })
        );
        mesh.position.copy(position); 
        mesh.scale.set(1.5, 1.0, 1.5);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'hard', material: 'stone' };
        
        return mesh;
    }

    static createBlueBlock() {
        const blockHeight = 3.5;
        const block = new THREE.Mesh(
            new THREE.BoxGeometry(2, blockHeight, 2), 
            new THREE.MeshPhongMaterial({ color: 0x4a90e2 })
        );
        block.position.set(3, blockHeight / 2, -2);
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData = { type: 'hard' };
        return block;
    }

    static createDeadWolf(position: THREE.Vector3, rotationY: number) {
        const group = new THREE.Group();
        group.position.copy(position);
        group.rotation.y = rotationY;

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
    
        // Register Obstacle Interaction
        wBody.userData = { type: 'soft', isSkinnable: true, name: 'Dead Wolf' };
        
        return { group, obstacle: wBody };
    }

    static createStump(position: THREE.Vector3, rotation: THREE.Quaternion, material: THREE.Material) {
        const stumpHeight = 0.4;
        const stump = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.5, stumpHeight, 7),
            material
        );
        stump.position.copy(position);
        stump.quaternion.copy(rotation);
        // Correct height if needed, assuming position is base
        stump.position.y = stumpHeight / 2;
        stump.castShadow = true;
        stump.receiveShadow = true;
        stump.userData = { type: 'hard', material: 'wood' };
        return stump;
    }

    static createFallingTrunk(position: THREE.Vector3, material: THREE.Material) {
        const fallGroup = new THREE.Group();
        fallGroup.position.copy(position);
        
        const stumpHeight = 0.4;
        fallGroup.position.y = stumpHeight; 
        
        const fallTrunkHeight = 1.6; 
        const fallTrunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, fallTrunkHeight, 7),
            material
        );
        fallTrunk.position.y = fallTrunkHeight / 2;
        fallTrunk.castShadow = true;
        fallTrunk.receiveShadow = true;
        fallGroup.add(fallTrunk);
        
        return fallGroup;
    }

    static createLogs(position: THREE.Vector3, quaternion: THREE.Quaternion) {
        const logMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const logGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.7, 7);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
        
        const logs = [];

        const log1 = new THREE.Mesh(logGeo, logMat);
        log1.quaternion.copy(quaternion);
        log1.position.copy(position).add(up.clone().multiplyScalar(0.4));
        log1.castShadow = true;
        log1.receiveShadow = true;
        log1.userData = { type: 'hard', material: 'wood' };
        logs.push(log1);

        const log2 = new THREE.Mesh(logGeo, logMat);
        log2.quaternion.copy(quaternion);
        log2.position.copy(position).add(up.clone().multiplyScalar(1.2)); 
        log2.castShadow = true;
        log2.receiveShadow = true;
        log2.userData = { type: 'hard', material: 'wood' };
        logs.push(log2);

        return logs;
    }

    static createDebrisChunk(position: THREE.Vector3, material: THREE.Material) {
        const geo = new THREE.DodecahedronGeometry(0.3, 0);
        const chunk = new THREE.Mesh(geo, material);
        chunk.position.copy(position);
        chunk.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        ));
        chunk.scale.setScalar(0.5 + Math.random() * 0.6);
        chunk.castShadow = true;
        chunk.receiveShadow = true;
        return chunk;
    }
}
