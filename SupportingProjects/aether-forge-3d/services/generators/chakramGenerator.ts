import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateChakram = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;

    // For Chakram:
    // bladeLength -> Outer Radius
    // bladeWidth -> Ring Width (how thick the metal band is)
    // bladeThickness -> Thickness of the metal
    // handleRadius -> Inner grip thickness?
    
    const outerRadius = config.bladeLength * s * 0.5; 
    const ringWidth = config.bladeWidth * s * 0.5;
    const thickness = config.bladeThickness * s;

    // Main Ring
    const innerRadius = Math.max(0.01, outerRadius - ringWidth);
    
    // Using ExtrudeGeometry for a flat ring with sharp edge
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const extrudeSettings = {
        steps: 2,
        depth: thickness,
        bevelEnabled: true,
        bevelThickness: thickness, // Sharp edge
        bevelSize: thickness, // Sharp edge taper
        bevelSegments: 2
    };

    const ringGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    ringGeo.translate(0, 0, -thickness/2);

    const chakram = new THREE.Mesh(ringGeo, mats.metalMat);
    // Rotate to face camera/be upright
    chakram.rotation.x = Math.PI / 2; 
    chakram.position.y = outerRadius; // Sit on floor
    chakram.castShadow = true;
    chakram.name = 'damagePart';
    chakram.userData.isRing = true; // Hint for effect builder
    group.add(chakram);

    // Grip (Optional inner handle bar)
    const gripLen = innerRadius * 2;
    const gripGeo = new THREE.CylinderGeometry(config.handleRadius * s, config.handleRadius * s, gripLen, 8);
    const grip = new THREE.Mesh(gripGeo, mats.handleMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.y = outerRadius;
    group.add(grip);
};