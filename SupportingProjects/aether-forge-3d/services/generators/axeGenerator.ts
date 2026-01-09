import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials, sharpenGeometry } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateAxe = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;
    
    const handleH = config.handleLength * s;
    const handleR = config.handleRadius * s;
    const bladeL = config.bladeLength * s; // Head Height
    const bladeW = config.bladeWidth * s; // Head Width (distance from shaft)
    const bladeT = config.bladeThickness * s;
    const pommelR = config.pommelSize * s;

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

    // Shaft Cap
    const capH = 0.1 * s;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(handleR*1.1, handleR, capH), mats.guardMat);
    cap.position.y = connectionY;
    group.add(cap);

    // Axe Head
    const headHeight = bladeL; 
    const headWidth = bladeW; 
    const headThick = bladeT;
    
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(headWidth, headHeight / 2); // Top flare
    shape.quadraticCurveTo(headWidth * 0.8, 0, headWidth, -headHeight / 2); // Curved blade edge?
    shape.lineTo(0, -headHeight * 0.2); // Back to handle
    
    const extrudeSettings = {
        steps: 4, // More steps for better gradient
        depth: headThick,
        bevelEnabled: false // We will manually sharpen
    };

    const axeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    axeGeo.translate(0, 0, -headThick/2);

    const axeHead = new THREE.Mesh(axeGeo, mats.metalMat);
    axeHead.position.y = connectionY - (headHeight * 0.1); 
    axeHead.position.x = handleR * 0.5; 
    axeHead.castShadow = true;
    
    // Sharpen the blade edge
    sharpenGeometry(axeHead);

    axeHead.name = 'damagePart';
    group.add(axeHead);

    // Back Spike
    const spikeGeo = new THREE.ConeGeometry(headThick, headWidth * 0.4, 8);
    const spike = new THREE.Mesh(spikeGeo, mats.guardMat);
    spike.rotation.z = Math.PI / 2;
    spike.position.y = connectionY - (headHeight * 0.1);
    spike.position.x = -handleR;
    group.add(spike);
};