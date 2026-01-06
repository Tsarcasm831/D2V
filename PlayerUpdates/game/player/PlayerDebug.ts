import * as THREE from 'three';
import type { Player } from '../Player';

export class PlayerDebug {
    private static material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.3
    });

    private static boneMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00,
        depthTest: false,
        linewidth: 2
    });

    private static skeletonGroup: THREE.Group | null = null;

    static updateHitboxVisuals(player: Player) {
        // 1. Hitboxes
        player.model.group.traverse((child) => {
             if (child.name === 'HitboxOverlay') return;

             if (child instanceof THREE.Mesh) {
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
                         if (overlay instanceof THREE.Mesh) {
                             overlay.geometry = undefined as any; 
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

    private static updateSkeleton(player: Player) {
        if (!this.skeletonGroup) {
            this.skeletonGroup = new THREE.Group();
            player.scene.add(this.skeletonGroup);
        }

        // Clear previous lines (inefficient but effective for debug)
        while(this.skeletonGroup.children.length > 0){ 
            this.skeletonGroup.remove(this.skeletonGroup.children[0]); 
        }

        const parts = player.model.parts;
        if (!parts) return;

        // Define Bone Connections (Parent -> Child)
        // We use the objects directly.
        const connections: [THREE.Object3D, THREE.Object3D][] = [
            [parts.hips, parts.torsoContainer], // Spine Base
            [parts.torsoContainer, parts.topCap], // Spine Top
            [parts.topCap, parts.neck], // Neck Base
            [parts.neck, parts.head], // Head
            
            // Left Leg
            [parts.hips, parts.leftThigh],
            [parts.leftThigh, parts.leftShin],
            [parts.leftShin, parts.leftAnkle], // To Ankle Joint
            
            // Right Leg
            [parts.hips, parts.rightThigh],
            [parts.rightThigh, parts.rightShin],
            [parts.rightShin, parts.rightAnkle],

            // Left Arm
            [parts.topCap, parts.leftArm], // Shoulder
            [parts.leftArm, parts.leftForeArm],
            [parts.leftForeArm, parts.leftHand],
            
            // Right Arm
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
                
                // If it's a limb segment, draw to the joint pivot (origin), which is correct for these parts.
                // However, for something like hips -> thigh, thigh origin is offset.
                
                const geometry = new THREE.BufferGeometry().setFromPoints([worldPos1, worldPos2]);
                const line = new THREE.Line(geometry, this.boneMaterial);
                this.skeletonGroup!.add(line);
                
                // Draw Joint Sphere
                const jointGeo = new THREE.SphereGeometry(0.02, 4, 4);
                const jointMesh = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false }));
                jointMesh.position.copy(worldPos1);
                this.skeletonGroup!.add(jointMesh);
                
                const endJoint = jointMesh.clone();
                endJoint.position.copy(worldPos2);
                this.skeletonGroup!.add(endJoint);
            }
        });
    }
}