
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
        palm: new THREE.MeshBasicMaterial({ color: 0xFFFFFF }), // White
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

        // Clear previous lines
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

        // 2. Draw Spheres for Joints
        const worldPos = new THREE.Vector3();
        
        jointConfig.forEach(joint => {
            if (joint.part) {
                joint.part.getWorldPosition(worldPos);
                
                const geo = new THREE.SphereGeometry(0.035, 8, 8);
                const mat = new THREE.MeshBasicMaterial({ color: joint.color, depthTest: false });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.copy(worldPos);
                this.skeletonGroup!.add(mesh);
            }
        });

        // 3. Draw Lines for Bones
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

        const worldPos2 = new THREE.Vector3();

        connections.forEach(([start, end]) => {
            if (start && end) {
                start.getWorldPosition(worldPos);
                end.getWorldPosition(worldPos2);
                
                const geometry = new THREE.BufferGeometry().setFromPoints([worldPos, worldPos2]);
                const line = new THREE.Line(geometry, this.boneMaterial);
                this.skeletonGroup!.add(line);
            }
        });
    }

    static toggleHandDebugMode(player: Player) {
        const enabled = player.isDebugHands;
        const parts = player.model.parts;
        const modelAny = player.model as any;

        // Collect all hand meshes for easy checking
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
                // Ignore overlay meshes (hitbox debug)
                if (obj.name === 'HitboxOverlay') return;

                if (enabled) {
                    // --- ENABLING DEBUG ---
                    
                    // Save Original State if not already saved
                    if (obj.userData.originalVisibility === undefined) {
                        obj.userData.originalVisibility = obj.visible;
                    }
                    if (!obj.userData.originalMaterial) {
                        obj.userData.originalMaterial = obj.material;
                    }

                    if (handMeshes.has(obj)) {
                        obj.visible = true;
                        // Apply Debug Color
                        obj.material = this.getColorForHandPart(obj);
                    } else {
                        obj.visible = false;
                    }

                } else {
                    // --- DISABLING DEBUG ---
                    
                    // Restore Visibility
                    if (obj.userData.originalVisibility !== undefined) {
                        obj.visible = obj.userData.originalVisibility;
                        delete obj.userData.originalVisibility;
                    }
                    
                    // Restore Material
                    if (obj.userData.originalMaterial) {
                        obj.material = obj.userData.originalMaterial;
                        delete obj.userData.originalMaterial;
                    }
                }
            }
        });
    }

    private static getColorForHandPart(mesh: THREE.Mesh): THREE.Material {
        const pName = mesh.parent?.name;
        
        // 1. Palm (Direct child of Hand Group, usually unnamed or just geometry)
        // HandBuilder adds "palm" mesh directly to group.
        // It's the only direct Mesh child of the Hand Group usually.
        // But hierarchy is complex. Let's check naming conventions from HandBuilder.
        
        if (mesh.name === 'proximal') {
            // It's a proximal phalanx. Which finger?
            // Need to find index in parent array.
            const fingerGroup = mesh.parent;
            // Check against stored arrays in PlayerModel via some messy traversal or assume based on siblings?
            // Actually, we can just use the color arrays and cycle? No, needs to be consistent.
            
            // Hacky check: Parent is a Group. Grandparent is Hand Group.
            // Hand Group children are [Palm, Finger0, Finger1, Finger2, Finger3, Thumb]
            if (fingerGroup && fingerGroup.parent) {
                const siblings = fingerGroup.parent.children;
                const idx = siblings.indexOf(fingerGroup);
                // Child 0 is Palm.
                // Child 1-4 are Fingers.
                // Child 5 is Thumb (or Muscle then Thumb)
                
                // HandBuilder:
                // 1. Palm
                // 2. F0, F1, F2, F3
                // 3. ThumbGroup
                // 4. Muscle
                
                if (idx >= 1 && idx <= 4) {
                    const fingerIdx = idx - 1;
                    return this.handDebugMaterials.fingers[fingerIdx][0];
                }
                if (idx === 5) {
                    // Thumb Group
                    return this.handDebugMaterials.thumb[0];
                }
            }
        }

        if (mesh.name === 'distal') {
            // Parent is Proximal Mesh
            const proxMesh = mesh.parent;
            const fingerGroup = proxMesh?.parent;
            if (fingerGroup && fingerGroup.parent) {
                const siblings = fingerGroup.parent.children;
                const idx = siblings.indexOf(fingerGroup);
                
                if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][1];
                if (idx === 5) return this.handDebugMaterials.thumb[1];
            }
        }

        // Spheres (Joints/Tips/Knuckles)
        // They are unnamed usually in HandBuilder, just added to Proximal or Distal meshes.
        if (mesh.geometry instanceof THREE.SphereGeometry) {
            // Check parent
            const parent = mesh.parent;
            if (parent?.name === 'proximal') {
                // Knuckle inside proximal
                // Treat as Proximal Color (0)
                const fingerGroup = parent.parent;
                const idx = fingerGroup?.parent?.children.indexOf(fingerGroup!) ?? -1;
                if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][0];
                if (idx === 5) return this.handDebugMaterials.thumb[0];
            }
            if (parent?.name === 'distal') {
                // Could be joint (k2) or tip (k3)
                // Tip is lower in Y? HandBuilder: k3.y = -dLen.
                if (mesh.position.y < -0.01) {
                    // Tip
                    const fingerGroup = parent.parent?.parent;
                    const idx = fingerGroup?.parent?.children.indexOf(fingerGroup!) ?? -1;
                    if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][2];
                    if (idx === 5) return this.handDebugMaterials.thumb[2];
                } else {
                    // Joint
                    const fingerGroup = parent.parent?.parent;
                    const idx = fingerGroup?.parent?.children.indexOf(fingerGroup!) ?? -1;
                    if (idx >= 1 && idx <= 4) return this.handDebugMaterials.fingers[idx-1][1];
                    if (idx === 5) return this.handDebugMaterials.thumb[1];
                }
            }
            
            // Muscle (Thenar)
            if (parent?.type === 'Group' && parent.children.indexOf(mesh) > 5) {
                 return this.handDebugMaterials.palm;
            }
        }
        
        // Palm
        // It's a BoxGeometry child of the Hand Group
        if (mesh.parent?.type === 'Group' && mesh.geometry instanceof THREE.BoxGeometry) {
             return this.handDebugMaterials.palm;
        }

        return this.handDebugMaterials.palm; // Fallback
    }
}
