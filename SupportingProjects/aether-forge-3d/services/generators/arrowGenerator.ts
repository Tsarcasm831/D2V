import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials, makeTaperedBox } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateArrow = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;
    
    // Config: 
    // handleLength -> Shaft Length
    // handleRadius -> Shaft Radius
    // guardWidth -> Fletching Size
    // bladeLength -> Tip Length
    // bladeWidth -> Tip Width
    
    const shaftLen = config.handleLength * s;
    const shaftRad = config.handleRadius * s;
    const fletchSize = config.guardWidth * s;
    const tipLen = config.bladeLength * s;
    const tipWidth = config.bladeWidth * s;
    const tipThick = config.bladeThickness * s;

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(shaftRad, shaftRad, shaftLen, 12);
    const shaft = new THREE.Mesh(shaftGeo, mats.handleMat);
    shaft.position.y = shaftLen / 2;
    shaft.name = 'shaftPart'; // Mark for effects
    group.add(shaft);

    // Fletching (Feathers at bottom)
    const fletchMat = new THREE.MeshStandardMaterial({ color: config.guardColor, side: THREE.DoubleSide });
    const fletchGeo = new THREE.PlaneGeometry(fletchSize, shaftLen * 0.25);
    
    for (let i = 0; i < 3; i++) {
        const fletch = new THREE.Mesh(fletchGeo, fletchMat);
        fletch.position.y = shaftLen * 0.15; // Near bottom
        fletch.rotation.y = (i / 3) * Math.PI * 2;
        fletch.translateZ(shaftRad); // Move out from center
        group.add(fletch);
    }

    // Tip
    const tip = makeTaperedBox(tipWidth, tipLen, tipThick, mats.metalMat);
    tip.position.y = shaftLen + (tipLen / 2);
    tip.name = 'damagePart'; // Mark for effects
    tip.castShadow = true;
    group.add(tip);
};