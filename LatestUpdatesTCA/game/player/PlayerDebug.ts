
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

    private static handDebugMaterials = {
        // Multi-material for BoxGeometry Palm: 0=Right, 1=Left, 2=Top, 3=Bottom, 4=Front(Palm), 5=Back
        palmArray: [
            new THREE.MeshBasicMaterial({ color: 0xFFD700 }), // Right - Gold
            new THREE.MeshBasicMaterial({ color: 0xFFD700 }), // Left - Gold
            new THREE.MeshBasicMaterial({ color: 0xFFD700 }), // Top - Gold
            new THREE.MeshBasicMaterial({ color: 0xFFD700 }), // Bottom - Gold
            new THREE.MeshBasicMaterial({ color: 0x000000 }), // Front (Inside/Palm) - Black
            new THREE.MeshBasicMaterial({ color: 0xFFD700 })  // Back (Outside) - Gold
        ],
        palmDefault: new THREE.MeshBasicMaterial({ color: 0xFFFFFF }), // Fallback (white)
        
        thumb: [
            new THREE.MeshBasicMaterial({ color: 0xFF0000 }), // Red (Prox)
            new THREE.MeshBasicMaterial({ color: 0xFF8800 }), // Orange (Dist)
            new THREE.MeshBasicMaterial({ color: 0xFFFF00 })  // Yellow (Tip)
        ],
        fingers: [
            // Index (Greens)
            [new THREE.MeshBasicMaterial({ color: 0x006400 }), new THREE.MeshBasicMaterial({ color: 0x32CD32 }), new THREE.MeshBasicMaterial({ color: 0x98FB98 })],
            // Middle (Blues)
            [new THREE.MeshBasicMaterial({ color: 0x000080 }), new THREE.MeshBasicMaterial({ color: 0x0000FF }), new THREE.MeshBasicMaterial({ color: 0x00FFFF })],
            // Ring (Purples)
            [new THREE.MeshBasicMaterial({ color: 0x4B0082 }), new THREE.MeshBasicMaterial({ color: 0x8A2BE2 }), new THREE.MeshBasicMaterial({ color: 0xE0B0FF })],
            // Pinky (Pinks)
            [new THREE.MeshBasicMaterial({ color: 0x8B008B }), new THREE.MeshBasicMaterial({ color: 0xFF1493 }), new THREE.MeshBasicMaterial({ color: 0xFFB6C1 })]
        ]
    };

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

        // Clear previous lines/spheres
        while(this.skeletonGroup.children.length > 0){ 
            this.skeletonGroup.remove(this.skeletonGroup.children[0]); 
        }

        const parts = player.model.parts;
        if (!parts) return;

        // 1. Define Unique Joints and Colors
        const jointConfig = [
            // Central
            { part: parts.hips, color: 0xFFFFFF },           // White
            { part: parts.torsoContainer, color: 0x888888 }, // Grey
            { part: parts.topCap, color: 0x222222 },         // Black (Shoulders Base)
            { part: parts.neck, color: 0xFF69B4 },           // Pink
            { part: parts.head, color: 0xFF0000 },           // Red

            // Left Leg (Greens)
            { part: parts.leftThigh, color: 0x006400 },      // Dark Green
            { part: parts.leftShin, color: 0x32CD32 },       // Lime Green
            { part: parts.leftAnkle, color: 0x98FB98 },      // Pale Green

            // Right Leg (Blues)
            { part: parts.rightThigh, color: 0x000080 },     // Navy
            { part: parts.rightShin, color: 0x0000FF },      // Blue
            { part: parts.rightAnkle, color: 0x00FFFF },     // Cyan

            // Left Arm (Warm)
            { part: parts.leftArm, color: 0xFF4500 },        // Orange Red
            { part: parts.leftForeArm, color: 0xFFA500 },    // Orange
            { part: parts.leftHand, color: 0xFFFF00 },       // Yellow

            // Right Arm (Cool/Purple)
            { part: parts.rightArm, color: 0x4B0082 },       // Indigo
            { part: parts.rightForeArm, color: 0xEE82EE },   // Violet
            { part: parts.rightHand, color: 0xFF00FF },      // Magenta
        ];

        // 2. Draw Main Spheres
        const worldPos = new THREE.Vector3();
        
        jointConfig.forEach(joint => {
            if (joint.part) {
                this.drawSphere(joint.part, joint.color, 0.035);
            }
        });

        // 3. Draw Main Lines
        const connections: [THREE.Object3D, THREE.Object3D][] = [
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

        connections.forEach(([start, end]) => {
            if (start && end) {
                this.drawLine(start, end);
            }
        });

        // 4. Detailed Hands & Feet
        // Left Hand (Gold Fingers)
        this.drawHandSkeleton(player.model.leftFingers, player.model.leftThumb, parts.leftHand, 0xFFD700);
        // Right Hand (Hot Pink Fingers)
        this.drawHandSkeleton(player.model.rightFingers, player.model.rightThumb, parts.rightHand, 0xFF1493);

        // Left Foot (Spring Green Toes)
        this.drawFootSkeleton(parts.leftShin, 0x00FA9A);
        // Right Foot (Dodger Blue Toes)
        this.drawFootSkeleton(parts.rightShin, 0x1E90FF);
    }

    private static drawHandSkeleton(fingers: THREE.Group[], thumb: THREE.Group | null, hand: THREE.Object3D, color: number) {
        if (!hand) return;
        const wristPos = new THREE.Vector3();
        hand.getWorldPosition(wristPos);

        const drawChain = (group: THREE.Object3D) => {
            const prox = group.children.find(c => c.name === 'proximal');
            if (prox) {
                // Line Wrist -> Prox
                this.drawLinePoints(wristPos, this.getWorldPos(prox), 0xaaaaaa);
                this.drawSphere(prox, color, 0.015);

                const dist = prox.children.find(c => c.name === 'distal');
                if (dist) {
                    this.drawLine(prox, dist, color);
                    this.drawSphere(dist, color, 0.012);

                    // Tip is usually a sphere geom child with y offset
                    const tip = dist.children.find(c => c.type === 'Mesh' && c.position.y < -0.001);
                    if (tip) {
                        this.drawLine(dist, tip, color);
                        this.drawSphere(tip, color, 0.01);
                    }
                }
            }
        };

        fingers.forEach(f => drawChain(f));
        if (thumb) drawChain(thumb);
    }

    private static drawFootSkeleton(shin: THREE.Object3D, color: number) {
        if (!shin) return;
        
        // Find Foot Anchor
        const footAnchor = shin.children.find(c => c.name.includes('foot_anchor'));
        if (!footAnchor) return;

        // Find Forefoot
        const forefoot = footAnchor.children.find(c => c.name.includes('forefoot'));
        if (!forefoot) return;

        // Iterate Toes (toeUnits are children of forefoot)
        // ToeUnit -> ToeMesh
        forefoot.children.forEach(toeUnit => {
            if (toeUnit.type === 'Group') {
                // Base of Toe
                this.drawLine(footAnchor, toeUnit, color); // Line Ankle -> ToeBase
                this.drawSphere(toeUnit, color, 0.015);

                // Tip of Toe (ToeMesh is translated locally, or we can just find the mesh)
                const toeMesh = toeUnit.children.find(c => c.type === 'Mesh');
                if (toeMesh && toeMesh instanceof THREE.Mesh) {
                    // Calculate Tip Position based on geometry box
                    // ToeMesh is translated by length/2 in builder.
                    // We can just use the mesh world position as center, then extend? 
                    // Or simpler: Just draw to the mesh origin which is center of toe.
                    
                    // Actually, toeMesh in FootBuilder is translated Z+ length/2 relative to Unit.
                    // Unit is at base. Mesh pivot is at base. 
                    // Wait, FootBuilder: toeGeo.translate(0,0,tLen/2). Mesh is at 0,0,0 inside Unit.
                    // So Mesh World Pos == Unit World Pos.
                    // To find tip, we need to transform a vector (0,0,tLen) by Mesh Matrix.
                    
                    if (toeMesh.geometry.boundingBox) {
                        const len = toeMesh.geometry.boundingBox.max.z - toeMesh.geometry.boundingBox.min.z;
                        const tipLocal = new THREE.Vector3(0, 0, len);
                        const tipWorld = tipLocal.applyMatrix4(toeMesh.matrixWorld);
                        
                        this.drawLinePoints(this.getWorldPos(toeUnit), tipWorld, color);
                        this.drawSphereAt(tipWorld, color, 0.01);
                    }
                }
            }
        });
    }

    private static getWorldPos(obj: THREE.Object3D): THREE.Vector3 {
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        return v;
    }

    private static drawSphere(obj: THREE.Object3D, color: number, size: number) {
        const pos = this.getWorldPos(obj);
        this.drawSphereAt(pos, color, size);
    }

    private static drawSphereAt(pos: THREE.Vector3, color: number, size: number) {
        if (!this.skeletonGroup) return;
        const geo = new THREE.SphereGeometry(size, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: color, depthTest: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        this.skeletonGroup.add(mesh);
    }

    private static drawLine(startObj: THREE.Object3D, endObj: THREE.Object3D, color?: number) {
        const p1 = this.getWorldPos(startObj);
        const p2 = this.getWorldPos(endObj);
        this.drawLinePoints(p1, p2, color);
    }

    private static drawLinePoints(p1: THREE.Vector3, p2: THREE.Vector3, color: number = 0xffff00) {
        if (!this.skeletonGroup) return;
        const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        // Clone material to allow custom color per line if needed, or use single mat if perf issues arise (unlikely here)
        const mat = this.boneMaterial.clone();
        mat.color.setHex(color);
        const line = new THREE.Line(geometry, mat);
        this.skeletonGroup.add(line);
    }

    static toggleHandDebugMode(player: Player) {
        const enabled = player.isDebugHands;
        const parts = player.model.parts;
        
        const handMeshes = new Set<THREE.Object3D>();
        const registerHand = (handGroup: THREE.Group) => {
            handGroup.traverse(c => {
                if(c instanceof THREE.Mesh) handMeshes.add(c);
            });
        };
        if(parts.rightHand) registerHand(parts.rightHand);
        if(parts.leftHand) registerHand(parts.leftHand);

        player.model.group.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                if (obj.name === 'HitboxOverlay') return;

                if (enabled) {
                    if (obj.userData.originalVisibility === undefined) {
                        obj.userData.originalVisibility = obj.visible;
                    }
                    if (!obj.userData.originalMaterial) {
                        obj.userData.originalMaterial = obj.material;
                    }

                    if (handMeshes.has(obj)) {
                        obj.visible = true;
                        obj.material = this.getColorForHandPart(obj);
                    } else {
                        obj.visible = false;
                    }

                } else {
                    if (obj.userData.originalVisibility !== undefined) {
                        obj.visible = obj.userData.originalVisibility;
                        delete obj.userData.originalVisibility;
                    }
                    if (obj.userData.originalMaterial) {
                        obj.material = obj.userData.originalMaterial;
                        delete obj.userData.originalMaterial;
                    }
                }
            }
        });
    }

    private static getColorForHandPart(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
        if (mesh.name === 'proximal') {
            const fingerGroup = mesh.parent;
            if (fingerGroup && fingerGroup.parent) {
                const siblings = fingerGroup.parent.children;
                const idx = siblings.indexOf(fingerGroup);
                if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx - 1][0];
                if (idx === 5) return this.handDebugMaterials.thumb[0];
            }
        }
        if (mesh.name === 'distal') {
            const proxMesh = mesh.parent;
            const fingerGroup = proxMesh?.parent;
            if (fingerGroup && fingerGroup.parent) {
                const siblings = fingerGroup.parent.children;
                const idx = siblings.indexOf(fingerGroup);
                if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][1];
                if (idx === 5) return this.handDebugMaterials.thumb[1];
            }
        }
        if (mesh.geometry instanceof THREE.SphereGeometry) {
            const parent = mesh.parent;
            if (parent?.name === 'proximal') {
                const fingerGroup = parent.parent;
                const idx = fingerGroup?.parent?.children.indexOf(fingerGroup!) ?? -1;
                if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][0];
                if (idx === 5) return this.handDebugMaterials.thumb[0];
            }
            if (parent?.name === 'distal') {
                const fingerGroup = parent.parent?.parent;
                const idx = fingerGroup?.parent?.children.indexOf(fingerGroup!) ?? -1;
                if (mesh.position.y < -0.01) {
                    if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][2];
                    if (idx === 5) return this.handDebugMaterials.thumb[2];
                } else {
                    if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][1];
                    if (idx === 5) return this.handDebugMaterials.thumb[1];
                }
            }
        }
        if (mesh.parent?.type === 'Group' && mesh.geometry instanceof THREE.BoxGeometry) {
             return this.handDebugMaterials.palmArray;
        }
        return this.handDebugMaterials.palmDefault;
    }
}
