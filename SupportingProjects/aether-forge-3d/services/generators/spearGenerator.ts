import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials, makeTaperedBox } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateSpear = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;

    const handleH = config.handleLength * s;
    const handleR = config.handleRadius * s;
    const bladeL = config.bladeLength * s;
    const bladeW = config.bladeWidth * s;
    const bladeT = config.bladeThickness * s;
    const pommelR = config.pommelSize * s;

    // Shaft
    const handleGeo = new THREE.CylinderGeometry(handleR, handleR, handleH, 16);
    const handle = new THREE.Mesh(handleGeo, mats.handleMat);
    handle.castShadow = true;
    handle.position.y = handleH / 2;
    group.add(handle);

    // Butt cap (Pommel)
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(handleR, 0, pommelR * 2, 8), mats.guardMat);
    pommel.position.y = -pommelR;
    group.add(pommel);

    const connectionY = handleH;

    // Collar
    const collarH = 0.1 * s;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(handleR * 1.2, handleR, collarH, 12), mats.guardMat);
    collar.position.y = connectionY - (collarH/2);
    group.add(collar);

    // Blade/Tip
    const tip = makeTaperedBox(bladeW, bladeL, bladeT, mats.metalMat, 0.01, 0.1);
    tip.position.y = connectionY + (bladeL/2);
    tip.castShadow = true;
    group.add(tip);
};