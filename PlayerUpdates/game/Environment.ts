import * as THREE from 'three';

export class Environment {
    obstacles: THREE.Object3D[] = [];

    constructor(scene: THREE.Scene) {
        this.build(scene);
    }

    private build(scene: THREE.Scene) {
        // Floor
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(100, 100),
          new THREE.MeshPhongMaterial({ color: 0xcccccc })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
    
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
        const treeGroup = new THREE.Group();
        treeGroup.position.set(-5, 0, -4);
        scene.add(treeGroup);
    
        const trunkHeight = 2.0;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.5, trunkHeight, 7),
            new THREE.MeshStandardMaterial({ color: 0x5d4037 })
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.userData = { type: 'hard' };
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
        this.obstacles.push(leaves);
    
        // 3. Rock
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.9, 0),
            new THREE.MeshStandardMaterial({ color: 0x78909c, flatShading: true })
        );
        rock.position.set(2, 0.8, 4); 
        rock.scale.set(1.5, 1.0, 1.5);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.userData = { type: 'hard' };
        scene.add(rock);
        this.obstacles.push(rock);
    
        // 4. Dead Wolf
        const wolfGroup = new THREE.Group();
        wolfGroup.position.set(2.5, 0, 2.5);
        wolfGroup.rotation.y = Math.PI / 3;
        scene.add(wolfGroup);
    
        this.buildWolf(wolfGroup);
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