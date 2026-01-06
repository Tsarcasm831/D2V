import * as THREE from 'three';

export class PlayerDebug {
    static material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.3
    });

    static boneMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00,
        depthTest: false,
        linewidth: 2
    });

    static skeletonGroup = null;

    static updateHitboxVisuals(player) {
        if (!player.model || !player.model.group) return;

        // 1. Hitboxes
        player.model.group.traverse((child) => {
             if (child.name === 'HitboxOverlay') return;

             if (child.isMesh) {
                 const overlay = child.children.find(c => c.name === 'HitboxOverlay');
                 
                 if (player.isDebugHitbox) {
                     if (!overlay) {
                         const m = new THREE.Mesh(child.geometry, this.material);
                         m.name = 'HitboxOverlay';
                         child.add(m);
                     }
                 } else {
                     if (overlay) {
                         child.remove(overlay);
                         if (overlay.isMesh) {
                             overlay.geometry = null; 
                         }
                     }
                 }
             }
        });

        // 2. Skeleton
        if (player.isDebugHitbox) {
            this.updateSkeleton(player);
        } else if (this.skeletonGroup) {
            player.scene.remove(this.skeletonGroup);
            this.skeletonGroup = null;
        }
    }

    static updateSkeleton(player) {
        if (!this.skeletonGroup) {
            this.skeletonGroup = new THREE.Group();
            player.scene.add(this.skeletonGroup);
        }

        // Clear previous lines
        while(this.skeletonGroup.children.length > 0){ 
            const child = this.skeletonGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            this.skeletonGroup.remove(child); 
        }

        const parts = player.model.parts;
        if (!parts) return;

        // Define Bone Connections (Parent -> Child)
        const connections = [
            [parts.hips, parts.torsoContainer],
            [parts.torsoContainer, parts.topCap],
            [parts.topCap, parts.neck],
            [parts.neck, parts.head],
            
            [parts.hips, parts.leftThigh],
            [parts.leftThigh, parts.leftShin],
            [parts.leftShin, parts.leftAnkle],
            
            [parts.hips, parts.rightThigh],
            [parts.rightThigh, parts.rightShin],
            [parts.rightShin, parts.rightAnkle],

            [parts.topCap, parts.leftArm],
            [parts.leftArm, parts.leftForeArm],
            [parts.leftForeArm, parts.leftHand],
            
            [parts.topCap, parts.rightArm],
            [parts.rightArm, parts.rightForeArm],
            [parts.rightForeArm, parts.rightHand],
        ];

        const worldPos1 = new THREE.Vector3();
        const worldPos2 = new THREE.Vector3();

        connections.forEach(([start, end]) => {
            if (start && end) {
                start.getWorldPosition(worldPos1);
                end.getWorldPosition(worldPos2);
                
                const geometry = new THREE.BufferGeometry().setFromPoints([worldPos1, worldPos2]);
                const line = new THREE.Line(geometry, this.boneMaterial);
                this.skeletonGroup.add(line);
                
                // Joint Spheres
                const jointGeo = new THREE.SphereGeometry(0.02, 4, 4);
                const jointMesh = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false }));
                
                const startJoint = jointMesh.clone();
                startJoint.position.copy(worldPos1);
                this.skeletonGroup.add(startJoint);
                
                const endJoint = jointMesh.clone();
                endJoint.position.copy(worldPos2);
                this.skeletonGroup.add(endJoint);
            }
        });
    }
}
