
import * as THREE from 'three';
import { PlayerConfig, OutfitType } from '../types';
import { PlayerMaterials } from './model/PlayerMaterials';
import { PlayerEquipment } from './model/PlayerEquipment';
import { PlayerMeshBuilder } from './model/PlayerMeshBuilder';
import { ShirtBuilder } from './model/mesh/ShirtBuilder';
import { PantsBuilder } from './model/mesh/PantsBuilder';
import { HairBuilder } from './model/mesh/HairBuilder';

export class PlayerModel {
    group: THREE.Group;
    parts: any = {};
    
    private materials: PlayerMaterials;
    
    // Arrays for easy updates
    private forefootGroups: THREE.Group[] = [];
    private heelGroups: THREE.Group[] = [];
    private toeUnits: THREE.Group[] = [];
    private irises: THREE.Mesh[] = [];
    private pupils: THREE.Mesh[] = [];
    eyes: THREE.Mesh[] = []; // Sclera meshes for rotation
    private eyelids: THREE.Group[] = [];
    private rightFingers: THREE.Group[] = [];
    private rightThumb: THREE.Group | null = null;
    private leftFingers: THREE.Group[] = [];
    private leftThumb: THREE.Group | null = null;
    private buttockCheeks: THREE.Mesh[] = [];

    // Lip References (Object3D because they are Groups now)
    private upperLip: THREE.Object3D | null = null;
    private lowerLip: THREE.Object3D | null = null;

    // Track dynamic meshes to clean up on updates
    private shirtMeshes: THREE.Object3D[] = [];
    private pantsMeshes: THREE.Object3D[] = [];
    private lastShirtConfigHash: string = '';
    private lastPantsConfigHash: string = '';
    
    // Track hair state
    private lastHairHash: string = '';

    // Hair Physics State
    private hairInertia = new THREE.Vector3();
    private hairTargetInertia = new THREE.Vector3();

    // Track Debug State
    private lastDebugHead: boolean = false;
    private debugHeadMaterials: Record<string, THREE.Material> = {
        'HeadTop': new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.5, name: 'DebugTop' }), // Red
        'HeadFront': new THREE.MeshStandardMaterial({ color: 0x55ffff, roughness: 0.5, name: 'DebugFront' }), // Cyan
        'HeadCheeksBottom': new THREE.MeshStandardMaterial({ color: 0x800080, roughness: 0.5, name: 'DebugCheeksBottom' }), // Purple
        'HeadBackTop': new THREE.MeshStandardMaterial({ color: 0x8888ff, roughness: 0.5, name: 'DebugBackTop' }), // Light Blue
        'HeadBackMiddle': new THREE.MeshStandardMaterial({ color: 0x4444ff, roughness: 0.5, name: 'DebugBackMiddle' }), // Medium Blue
        'HeadBackBottom': new THREE.MeshStandardMaterial({ color: 0x000088, roughness: 0.5, name: 'DebugBackBottom' }), // Dark Blue
        'MaxillaMesh': new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5, name: 'DebugMaxilla' }), // Yellow
        'JawMesh': new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5, name: 'DebugJaw' }), // Green
    };

    equippedMeshes: {
        helm?: THREE.Object3D;
        leftPauldron?: THREE.Object3D;
        rightPauldron?: THREE.Object3D;
        shield?: THREE.Object3D;
        heldItem?: THREE.Object3D;
    } = {};

    private currentHeldItem: string | null = null;

    constructor(config: PlayerConfig) {
        this.materials = new PlayerMaterials(config);
        
        const build = PlayerMeshBuilder.build(this.materials);
        this.group = build.group;
        
        this.parts = build.parts;
        
        this.forefootGroups = build.arrays.forefootGroups;
        this.heelGroups = build.arrays.heelGroups;
        this.toeUnits = build.arrays.toeUnits;
        this.irises = build.arrays.irises;
        this.pupils = build.arrays.pupils;
        this.eyes = build.arrays.eyes;
        this.eyelids = build.arrays.eyelids;
        this.rightFingers = build.arrays.rightFingers;
        this.rightThumb = build.arrays.rightThumb;
        this.leftFingers = build.arrays.leftFingers;
        this.leftThumb = build.arrays.leftThumb;
        this.buttockCheeks = build.arrays.buttockCheeks;

        // Cache Lips directly from builder output
        this.upperLip = this.parts.upperLip || null;
        this.lowerLip = this.parts.lowerLip || null;
    }

    // --- GAME LOOP UPDATE ---
    update(dt: number, velocity: THREE.Vector3) {
        // Physics for Hair
        // 1. Calculate Target Inertia (Opposite to movement)
        // Convert world velocity to head local space for correct deformation relative to head rotation
        if (this.parts.head) {
             // Basic approximation: World velocity damped
             this.hairTargetInertia.copy(velocity).multiplyScalar(-0.06);
             
             // Clamp max bend to avoid looking broken
             this.hairTargetInertia.clampLength(0, 0.15);
             
             // Transform world inertia vector into head's local space
             // This ensures hair bends "back" regardless of which way head is turned
             const invHeadRot = new THREE.Quaternion();
             this.parts.head.getWorldQuaternion(invHeadRot);
             invHeadRot.invert();
             
             this.hairTargetInertia.applyQuaternion(invHeadRot);
        }

        // 2. Spring/Damp towards target
        const spring = 8.0 * dt;
        this.hairInertia.lerp(this.hairTargetInertia, spring);

        // 3. Apply to Shader Uniform
        const hairMesh = this.parts.head?.getObjectByName('HairInstanced');
        if (hairMesh && hairMesh.userData.uInertia) {
            hairMesh.userData.uInertia.value.copy(this.hairInertia);
        }
    }

    applyOutfit(outfit: OutfitType, skinColor: string) {
        this.materials.applyOutfit(outfit, skinColor);
    }

    updateHeldItem(itemName: string | null) {
        this.currentHeldItem = PlayerEquipment.updateHeldItem(
            itemName,
            this.currentHeldItem,
            this.parts,
            this.equippedMeshes
        );
    }

    updateEquipment(equipment: any) {
        PlayerEquipment.updateArmor(equipment, this.parts, this.equippedMeshes);
    }

    private updateShirt(config: PlayerConfig) {
        const hash = `${config.outfit}_${config.shirtColor}_${config.bodyType}_${config.equipment.shirt}`;
        if (hash === this.lastShirtConfigHash) return;
        this.lastShirtConfigHash = hash;

        // Cleanup old shirt
        if (this.parts.shirt) this.parts.shirt = null;

        this.shirtMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            // Dispose geometries/materials if necessary for heavy usage
            if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
        });
        this.shirtMeshes = [];

        // Build new shirt
        const result = ShirtBuilder.build(this.parts, config);
        if (result) {
            this.shirtMeshes = result.meshes;
            this.parts.shirt = result.refs;
        }
    }

    private updatePants(config: PlayerConfig) {
        const hash = `${config.outfit}_${config.equipment.pants}`;
        if (hash === this.lastPantsConfigHash) return;
        this.lastPantsConfigHash = hash;

        // Cleanup old pants
        this.pantsMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
        });
        this.pantsMeshes = [];

        // Build new pants
        const meshes = PantsBuilder.build(this.parts, config);
        if (meshes) {
            this.pantsMeshes = meshes;
        }
    }
    
    private updateHair(config: PlayerConfig) {
        const hash = `${config.hairStyle}_${config.headScale}`; // Style or size change triggers rebuild. Color is handled by material sync.
        if (hash === this.lastHairHash) return;
        this.lastHairHash = hash;
        
        HairBuilder.build(this.parts, config, this.materials.hair);
    }
    
    private updateHeadDebug(enabled: boolean) {
        const headGroup = this.parts.head as THREE.Group;
        if (!headGroup) return;

        headGroup.traverse((obj) => {
             if (obj instanceof THREE.Mesh) {
                 if (this.debugHeadMaterials[obj.name]) {
                     obj.material = enabled ? this.debugHeadMaterials[obj.name] : this.materials.skin;
                 }
             }
        });
    }

    sync(config: PlayerConfig, isCombatStance: boolean = false) {
        const lerp = THREE.MathUtils.lerp;
        const damp = 0.15; // Animation speed for fist transition

        this.materials.sync(config);
        this.applyOutfit(config.outfit, config.skinColor);
        
        // --- Debug Head Toggle ---
        if (config.debugHead !== this.lastDebugHead) {
            this.updateHeadDebug(config.debugHead);
            this.lastDebugHead = config.debugHead;
        }
        
        const isFemale = config.bodyType === 'female';
        const isNaked = config.outfit === 'naked';
        const isNude = config.outfit === 'nude';
        const isClothed = !isNaked && !isNude;

        // --- Body Proportions & Scaling ---
        
        // 1. Torso Scaling
        const tW = config.torsoWidth;
        const tH = config.torsoHeight;
        this.parts.torsoContainer.scale.set(tW, tH, tW);

        // 2. Gender & Hip Adjustments
        let baseLegSpacing = 0.12;
        let hipScale = 1.0;
        let shoulderScale = 1.0;

        if (isFemale) {
            shoulderScale = 0.85;
            hipScale = 1.15;
            baseLegSpacing = 0.14; 
            if (this.parts.buttocks) {
                this.parts.buttocks.visible = true;
                const bs = config.buttScale;
                this.parts.buttocks.scale.set(1 * bs, 1 * bs, 1 * bs);
            }
            this.parts.chest.visible = true;
            this.parts.maleChest.visible = false;
        } else {
            shoulderScale = 1.0;
            hipScale = 1.0;
            baseLegSpacing = 0.12;
            if (this.parts.buttocks) {
                const bs = config.buttScale;
                this.parts.buttocks.scale.set(0.8 * bs, 0.8 * bs, 0.3 * bs);
                this.parts.buttocks.visible = false; 
            }
            this.parts.chest.visible = false;
            this.parts.maleChest.visible = true;
        }

        this.parts.topCap.scale.set(shoulderScale, 0.8, shoulderScale);
        this.parts.pelvis.scale.set(hipScale, 1, hipScale);

        // 3. Limb Positioning
        const legX = baseLegSpacing * tW; 
        this.parts.leftThigh.position.x = legX;
        this.parts.rightThigh.position.x = -legX;

        // 4. Limb Scaling Compensation
        const aS = config.armScale;
        const invTW = 1 / tW;
        const invTH = 1 / tH;
        
        this.parts.rightArm.scale.set(aS * invTW, aS * invTH, aS * invTW);
        this.parts.leftArm.scale.set(aS * invTW, aS * invTH, aS * invTW);

        const lS = config.legScale;
        this.parts.rightThigh.scale.setScalar(lS);
        this.parts.leftThigh.scale.setScalar(lS);

        // 5. Neck & Head Scaling
        const nT = config.neckThickness;
        const nH = config.neckHeight;
        
        if (this.parts.neck) {
            this.parts.neck.scale.set(nT, nH, nT);
            this.parts.neck.position.y = 0.70 + (0.12 * nH);
        }
        if (this.parts.neckBase) {
            this.parts.neckBase.scale.set(nT, 1, nT);
        }

        const hS = config.headScale;
        const parentScaleX = tW * nT;
        const parentScaleY = tH * nH;
        const safePX = parentScaleX || 1;
        const safePY = parentScaleY || 1;

        this.parts.head.scale.set(hS / safePX, hS / safePY, hS / safePX);

        // Brain
        if (this.parts.brain) {
            this.parts.brain.visible = config.showBrain;
            const bS = config.brainSize;
            this.parts.brain.scale.set(bS, bS, bS);
        }

        // Buttocks Material & Underwear Visibility
        if (this.parts.buttocks && this.buttockCheeks.length > 0) {
            this.parts.buttocks.children.forEach((container: THREE.Group, i: number) => {
                const cheek = this.buttockCheeks[i];
                const undie = container.children.find(c => c.name === 'undie');
                if (isClothed) {
                    cheek.material = this.materials.pants;
                    if (undie) undie.visible = false;
                } else {
                    cheek.material = this.materials.skin;
                    if (undie) undie.visible = isNaked; 
                }
            });
        }
        
        if (this.parts.underwearBottom) {
            this.parts.underwearBottom.visible = isNaked;
        }
        
        const showBra = isNaked && isFemale;
        if (this.parts.braStrap) this.parts.braStrap.visible = showBra;
        if (this.parts.braCups) this.parts.braCups.forEach((c: THREE.Mesh) => c.visible = showBra);

        // Face & Feet details
        // Mandible
        this.parts.jaw.scale.setScalar(config.chinSize);
        this.parts.jaw.position.y = -0.05 + config.chinHeight;
        this.parts.jawMesh.scale.y = 0.45 * config.chinLength;
        this.parts.jawMesh.position.z = 0.09 + config.chinForward;

        // Maxilla (Upper Jaw)
        if (this.parts.maxilla) {
            this.parts.maxilla.scale.set(config.maxillaScaleX, config.maxillaScaleY, config.maxillaScaleZ);
            this.parts.maxilla.position.set(0, -0.075 + config.maxillaOffsetY, 0.18 + config.maxillaOffsetZ);
        }

        // Lips
        if (this.upperLip) {
            this.upperLip.scale.set(config.upperLipWidth, config.upperLipHeight, 0.5 * config.upperLipThick);
            // Position relative to Maxilla
            this.upperLip.position.y = -0.028 + config.upperLipOffsetY;
            this.upperLip.position.z = 0.025 + config.upperLipOffsetZ;
        }
        if (this.lowerLip) {
            this.lowerLip.scale.set(config.lowerLipWidth, config.lowerLipHeight, 0.5 * config.lowerLipThick);
            // Position relative to Jaw (which rotates and moves)
            // Updated base positions to match HeadBuilder logic (0.02, 0.12) to ensure offsets behave predictably
            this.lowerLip.position.y = 0.02 + config.lowerLipOffsetY;
            this.lowerLip.position.z = 0.12 + config.lowerLipOffsetZ;
        }

        if (this.parts.nose?.userData.basePosition) {
            const base = this.parts.nose.userData.basePosition as THREE.Vector3;
            this.parts.nose.position.set(
                base.x,
                base.y + config.noseHeight,
                base.z + config.noseForward
            );
        }
        
        this.irises.forEach(i => i.scale.setScalar(config.irisScale));
        this.pupils.forEach(p => p.scale.setScalar(config.pupilScale));
        this.heelGroups.forEach(hg => { hg.scale.setScalar(config.heelScale); hg.scale.y *= config.heelHeight; });
        this.forefootGroups.forEach(fg => fg.scale.set(config.footWidth, 1, config.footLength));
        
        // Correctly apply toe spread using initial positions from builder
        this.toeUnits.forEach(u => {
            if (u.userData.initialX !== undefined) {
                u.position.x = u.userData.initialX * config.toeSpread;
            }
        });

        // Update Hand Pose (Fist formation)
        const isHolding = !!config.selectedItem;

        // Apply hand curls
        const updateHand = (fingers: THREE.Group[], thumb: THREE.Group | null, isLeft: boolean) => {
            const shouldFist = isLeft ? isCombatStance : (isHolding || isCombatStance);
            const baseCurl = shouldFist ? 1.6 : 0.1;
            
            fingers.forEach((fGroup, i) => {
                 const curl = baseCurl + (shouldFist ? i * 0.1 : i * 0.05);
                 const prox = fGroup.children.find(c => c.name === 'proximal');
                 if (prox) {
                     prox.rotation.x = lerp(prox.rotation.x, curl, damp);
                     const dist = prox.children.find(c => c.name === 'distal');
                     if (dist) {
                         dist.rotation.x = lerp(dist.rotation.x, curl * 1.1, damp);
                     }
                 }
            });

            if (thumb) {
                const prox = thumb.children.find(c => c.name === 'proximal');
                if (prox) {
                     const tX = shouldFist ? 0.6 : 0.1;
                     prox.rotation.x = lerp(prox.rotation.x, tX, damp);
                     
                     // Opposition (Z rotation)
                     // Right hand: Inward is -Z. Left hand: Inward is +Z (due to mirrored group setup).
                     const tZBase = shouldFist ? -0.2 : 0;
                     const tZ = isLeft ? -tZBase : tZBase;
                     
                     prox.rotation.z = lerp(prox.rotation.z, tZ, damp); 
                     
                     const dist = prox.children.find(c => c.name === 'distal');
                     if (dist) {
                         dist.rotation.x = lerp(dist.rotation.x, shouldFist ? 1.2 : 0.1, damp);
                     }
                }
            }
        };

        updateHand(this.rightFingers, this.rightThumb, false);
        updateHand(this.leftFingers, this.leftThumb, true);

        this.updateEquipment(config.equipment);
        this.updateHeldItem(config.selectedItem);
        
        // Procedural Clothing
        this.updatePants(config);
        this.updateShirt(config);
        
        // Procedural Hair
        this.updateHair(config);
        
        // Manual Color Sync for Hair InstancedMesh because it uses a cloned material
        const hairMesh = this.parts.head?.getObjectByName('HairInstanced') as THREE.InstancedMesh;
        if (hairMesh && hairMesh.material) {
             (hairMesh.material as THREE.MeshToonMaterial).color.set(config.hairColor);
        }
    }
}
