import * as THREE from 'three';
import { PlayerConfig, OutfitType } from '../types';
import { PlayerMaterials } from './model/PlayerMaterials';
import { PlayerEquipment } from './model/PlayerEquipment';
import { PlayerMeshBuilder } from './model/PlayerMeshBuilder';
import { ShirtBuilder } from './mesh/ShirtBuilder';
import { HairBuilder } from './mesh/HairBuilder';

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
    private eyelids: THREE.Group[] = [];
    private rightFingers: THREE.Group[] = [];
    private rightThumb: THREE.Group | null = null;
    private buttockCheeks: THREE.Mesh[] = [];

    // Track dynamic shirt meshes to clean up on updates
    private shirtMeshes: THREE.Object3D[] = [];
    private lastShirtConfigHash: string = '';
    
    // Track hair state
    private lastHairHash: string = '';

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
        this.eyelids = build.arrays.eyelids;
        this.rightFingers = build.arrays.rightFingers;
        this.rightThumb = build.arrays.rightThumb;
        this.buttockCheeks = build.arrays.buttockCheeks;
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
        this.shirtMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            // Dispose geometries/materials if necessary for heavy usage
            if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
        });
        this.shirtMeshes = [];

        // Build new shirt
        const newMeshes = ShirtBuilder.build(this.parts, config);
        if (newMeshes) {
            this.shirtMeshes = newMeshes;
        }
    }
    
    private updateHair(config: PlayerConfig) {
        const hash = `${config.hairStyle}_${config.headScale}`; // Style or size change triggers rebuild. Color is handled by material sync.
        if (hash === this.lastHairHash) return;
        this.lastHairHash = hash;
        
        HairBuilder.build(this.parts, config, this.materials.hair);
    }

    sync(config: PlayerConfig) {
        const lerp = THREE.MathUtils.lerp;
        const damp = 0.15; // Animation speed for fist transition

        this.materials.sync(config);
        this.applyOutfit(config.outfit, config.skinColor);
        
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
        this.parts.jaw.scale.setScalar(config.chinSize);
        this.parts.jaw.position.y = -0.05 + config.chinHeight;
        this.parts.jawMesh.scale.y = 0.45 * config.chinLength;
        this.parts.jawMesh.position.z = 0.09 + config.chinForward;
        
        this.irises.forEach(i => i.scale.setScalar(config.irisScale));
        this.pupils.forEach(p => p.scale.setScalar(config.pupilScale));
        this.heelGroups.forEach(hg => { hg.scale.setScalar(config.heelScale); hg.scale.y *= config.heelHeight; });
        this.forefootGroups.forEach(fg => fg.scale.set(config.footWidth, 1, config.footLength));
        this.toeUnits.forEach((u, i) => u.position.x = ((i % 5) - 2) * 0.035 * config.toeSpread);

        // Update Hand Pose (Fist formation)
        const isHolding = !!config.selectedItem;
        const baseCurl = isHolding ? 1.6 : 0.1; 
        
        this.rightFingers.forEach((fGroup, i) => {
             const curl = baseCurl + (isHolding ? i * 0.1 : i * 0.05);
             
             const prox = fGroup.children.find(c => c.name === 'proximal');
             if (prox) {
                 prox.rotation.x = lerp(prox.rotation.x, curl, damp);
                 const dist = prox.children.find(c => c.name === 'distal');
                 if (dist) {
                     dist.rotation.x = lerp(dist.rotation.x, curl * 1.1, damp);
                 }
             }
        });

        // THUMB: 
        if (this.rightThumb) {
            const prox = this.rightThumb.children.find(c => c.name === 'proximal');
            if (prox) {
                 const tX = isHolding ? 0.6 : 0.1;
                 prox.rotation.x = lerp(prox.rotation.x, tX, damp);
                 const tZ = isHolding ? -0.2 : 0;
                 prox.rotation.z = lerp(prox.rotation.z, tZ, damp); 
                 
                 const dist = prox.children.find(c => c.name === 'distal');
                 if (dist) {
                     dist.rotation.x = lerp(dist.rotation.x, isHolding ? 1.2 : 0.1, damp);
                 }
            }
        }

        this.updateEquipment(config.equipment);
        this.updateHeldItem(config.selectedItem);
        
        // Procedural Shirt
        this.updateShirt(config);
        
        // Procedural Hair
        this.updateHair(config);
    }
}