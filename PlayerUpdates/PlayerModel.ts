import * as THREE from 'three';
import { PlayerConfig, OutfitType } from '../types';
import { PlayerMaterials } from './model/PlayerMaterials';
import { PlayerEquipment } from './model/PlayerEquipment';
import { PlayerMeshBuilder } from './model/PlayerMeshBuilder';

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
    private rightFingers: THREE.Group[] = [];
    private rightThumb: THREE.Group | null = null;

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
        this.rightFingers = build.arrays.rightFingers;
        this.rightThumb = build.arrays.rightThumb;
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

    sync(config: PlayerConfig) {
        const lerp = THREE.MathUtils.lerp;
        const damp = 0.15; // Animation speed for fist transition

        this.materials.sync(config);
        
        this.parts.head.scale.setScalar(config.headScale);
        this.parts.jaw.scale.setScalar(config.chinSize);
        this.parts.jaw.position.y = -0.05 + config.chinHeight;
        this.parts.jawMesh.scale.y = 0.45 * config.chinLength;
        this.parts.jawMesh.position.z = 0.09 + config.chinForward;
        this.parts.torsoContainer.scale.set(config.torsoWidth, config.torsoHeight, config.torsoWidth);
        this.parts.rightArm.scale.setScalar(config.armScale);
        this.parts.leftArm.scale.setScalar(config.armScale);
        this.parts.rightThigh.scale.setScalar(config.legScale);
        this.parts.leftThigh.scale.setScalar(config.legScale);
        this.parts.chest.visible = (config.bodyType === 'female');
        this.irises.forEach(i => i.scale.setScalar(config.irisScale));
        this.pupils.forEach(p => p.scale.setScalar(config.pupilScale));
        this.heelGroups.forEach(hg => { hg.scale.setScalar(config.heelScale); hg.scale.y *= config.heelHeight; });
        this.forefootGroups.forEach(fg => fg.scale.set(config.footWidth, 1, config.footLength));
        this.toeUnits.forEach((u, i) => u.position.x = ((i % 5) - 2) * 0.035 * config.toeSpread);

        // Update Hand Pose (Tighter Fist vs Flat)
        const isHolding = !!config.selectedItem;
        const targetCurl = isHolding ? 1.6 : 0; 
        const targetThumbCurl = isHolding ? 1.4 : 0;
        
        this.rightFingers.forEach(f => f.rotation.x = lerp(f.rotation.x, targetCurl, damp));
        if (this.rightThumb) {
            this.rightThumb.rotation.x = lerp(this.rightThumb.rotation.x, targetThumbCurl, damp);
        }

        this.updateEquipment(config.equipment);
        this.updateHeldItem(config.selectedItem);
    }
}