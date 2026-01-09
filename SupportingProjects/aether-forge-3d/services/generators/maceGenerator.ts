import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials, makeTaperedBox } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateMace = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;
    
    const handleH = config.handleLength * s;
    const handleR = config.handleRadius * s;
    const bladeL = config.bladeLength * s; // Head Radius
    const bladeW = config.bladeWidth * s; // Spike length
    const bladeT = config.bladeThickness * s; // Spike thickness
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

    // Neck
    const neckH = 0.1 * s;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR * 1.5, neckH), mats.guardMat);
    neck.position.y = connectionY + neckH/2;
    group.add(neck);

    // Head (Spiked Sphere logic)
    const headR = bladeL * 0.5; 
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(headR, 1), mats.metalMat);
    head.position.y = connectionY + neckH + headR;
    head.castShadow = true;
    group.add(head);

    // Spikes
    const posAttr = head.geometry.attributes.position;
    const spikeLen = bladeW * 0.5;
    
    // We only want some vertices to have spikes, otherwise it's a cactus
    for(let i=0; i< posAttr.count; i+=3) { 
            // Simple filter to reduce spike count
            if (i % 6 !== 0) continue;

            const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
            const norm = v.clone().normalize();
            
            const spike = makeTaperedBox(bladeT, spikeLen, bladeT, mats.metalMat, 0.0, 0.0);
            
            // Orient spike
            const spikePos = head.position.clone().add(v);
            spike.position.copy(spikePos);
            spike.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), norm);
            
            // Push it out slightly so it sits on surface
            spike.translateY(spikeLen/2);
            
            group.add(spike);
    }
};