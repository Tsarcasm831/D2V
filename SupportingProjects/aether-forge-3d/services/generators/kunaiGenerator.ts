import * as THREE from 'three';
import { WeaponConfig } from '../../types';
import { WeaponMaterials } from '../geometryUtils';
import { SCALE_FACTOR } from '../../constants';

export const generateKunai = (group: THREE.Group, config: WeaponConfig, mats: WeaponMaterials) => {
    const s = SCALE_FACTOR;

    const handleH = config.handleLength * s;
    const handleR = config.handleRadius * s;
    const bladeL = config.bladeLength * s;
    const bladeW = config.bladeWidth * s;
    const bladeT = config.bladeThickness * s;
    const pommelR = config.pommelSize * s; // Ring size

    // Ring (Pommel) at bottom
    const ringGeo = new THREE.TorusGeometry(pommelR, pommelR * 0.2, 8, 16);
    const ring = new THREE.Mesh(ringGeo, mats.metalMat);
    ring.position.y = 0;
    ring.rotation.y = Math.PI / 2; 
    group.add(ring);

    // Handle above ring
    const handleGeo = new THREE.CylinderGeometry(handleR, handleR, handleH, 12);
    const handle = new THREE.Mesh(handleGeo, mats.handleMat);
    handle.position.y = pommelR + handleH/2;
    group.add(handle);

    // Blade above handle
    const bladeStart = pommelR + handleH;

    // Use BoxGeometry with segments to sculpt the shape for sharp edges
    // 4 width segments gives us vertices at center, mid-point, and edge
    const segments = 12; 
    const bladeGeo = new THREE.BoxGeometry(bladeW, bladeL, bladeT, 4, segments, 1);
    const pos = bladeGeo.attributes.position;
    const arr = pos.array;
    
    // Shift Y to start at 0 relative to local space, makes math easier
    bladeGeo.translate(0, bladeL/2, 0);

    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1]; // 0 to bladeL
        
        const v = Math.max(0, Math.min(1, y / bladeL)); // Normalized height 0 to 1
        
        // 1. Profile (Kite/Leaf Shape)
        // Widest point at ~20% height
        const widestV = 0.25;
        let scaleX = 1.0;
        
        if (v < widestV) {
             // Base to widest
             // Start at handle width (approx) to seamless fit
             const baseRatio = (handleR * 1.8) / bladeW; 
             scaleX = THREE.MathUtils.lerp(baseRatio, 1.0, v / widestV);
        } else {
             // Widest to Tip
             // Lerp to 0
             scaleX = THREE.MathUtils.lerp(1.0, 0.0, (v - widestV) / (1 - widestV));
        }
        
        // Apply Profile Width
        arr[i] = x * scaleX;
        
        // 2. Diamond Cross-Section (Sharpening)
        // Original X determines if it's an edge vertex or spine vertex
        const originalRelativeX = Math.abs(x) / (bladeW / 2);
        
        if (originalRelativeX > 0.35) {
            // Edges: Flatten Z to create sharp edge
            arr[i + 2] *= 0.05;
        } else {
            // Spine: Keep thickness, maybe taper slightly at very tip
            const tipTaper = v > 0.9 ? (1.0 - ((v - 0.9)/0.1)) : 1.0;
            arr[i + 2] *= tipTaper;
        }
    }
    
    pos.needsUpdate = true;
    bladeGeo.computeVertexNormals();
    
    const blade = new THREE.Mesh(bladeGeo, mats.metalMat);
    blade.position.y = bladeStart;
    blade.castShadow = true;
    blade.name = 'damagePart';
    group.add(blade);
    
    // Centering
    const totalHeight = pommelR + handleH + bladeL;
    group.position.y = -totalHeight / 2;
};