import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials, makeTaperedBox, makeWavyBox, makeCurvedBox, makeDoubleEdgedBlade } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateSword = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;
    
    // Config dimensions * Scale
    const handleH = config.handleLength * s;
    const handleR = config.handleRadius * s;
    const guardW = config.guardWidth * s;
    const bladeL = config.bladeLength * s;
    const bladeW = config.bladeWidth * s;
    const bladeT = config.bladeThickness * s;
    const pommelR = config.pommelSize * s;
    
    const variant = config.variant || 'standard';

    // Handle
    const handleGeo = new THREE.CylinderGeometry(handleR, handleR, handleH, 16);
    const handle = new THREE.Mesh(handleGeo, mats.handleMat);
    handle.castShadow = true;
    handle.position.y = handleH / 2;
    group.add(handle);

    // Pommel
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(pommelR, 16, 16), mats.guardMat);
    pommel.position.y = -pommelR * 0.5;
    group.add(pommel);

    const connectionY = handleH;

    // Guard
    let guard: THREE.Mesh;
    if (variant === 'rapier') {
        // Cup Guard - Needs DoubleSide to see inside
        mats.guardMat.side = THREE.DoubleSide; 
        const cupGeo = new THREE.SphereGeometry(guardW * 0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        guard = new THREE.Mesh(cupGeo, mats.guardMat);
        guard.rotation.x = Math.PI; // Face down
        guard.position.y = connectionY + (guardW * 0.2);
    } else if (variant === 'katana') {
        // Tsuba (Disk)
        const tsubaGeo = new THREE.CylinderGeometry(guardW * 0.5, guardW * 0.5, 0.02 * s, 16);
        guard = new THREE.Mesh(tsubaGeo, mats.guardMat);
        guard.position.y = connectionY;
    } else {
        // Standard Crossguard
        const guardH = 0.05 * s;
        const guardD = 0.06 * s;
        guard = new THREE.Mesh(new THREE.BoxGeometry(guardW, guardH, guardD), mats.guardMat);
        guard.position.y = connectionY;
    }
    guard.castShadow = true;
    group.add(guard);

    // Blade
    let blade: THREE.Mesh;
    const bladeStartY = connectionY + (variant === 'rapier' ? 0 : 0.02 * s);
    
    if (variant === 'wavy') {
        // Kris blade
        blade = makeWavyBox(bladeW, bladeL, bladeT, mats.metalMat);
        blade.position.y = bladeStartY + bladeL/2;
    } else if (variant === 'katana') {
        // Curved blade - Curve amount negative to curve back
        blade = makeCurvedBox(bladeW, bladeL, bladeT, mats.metalMat, -bladeL * 0.15);
        blade.position.y = bladeStartY + bladeL/2;
    } else if (variant === 'rapier') {
        // Thin tapering needle (Diamond profile)
        blade = makeTaperedBox(bladeW, bladeL, bladeT, mats.metalMat, 0.1, 0.1);
        blade.position.y = bladeStartY + bladeL/2;
    } else {
        // Standard Blade - Double Edged
        const bladeMainH = bladeL * 0.8; 
        blade = makeDoubleEdgedBlade(bladeW, bladeMainH, bladeT, mats.metalMat);
        blade.position.y = bladeStartY + (bladeMainH / 2);
        
        // Tip
        const tipH = bladeL * 0.2;
        const tip = makeTaperedBox(bladeW, tipH, bladeT, mats.metalMat);
        tip.position.y = bladeStartY + bladeMainH + (tipH/2);
        tip.castShadow = true;
        group.add(tip);
    }

    blade.name = 'damagePart';
    blade.castShadow = true;
    group.add(blade);
};