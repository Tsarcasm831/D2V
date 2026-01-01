import * as THREE from 'three';
import { SCALE_FACTOR } from './world_bounds.js';
import { LEATHER_COLOR, LEATHER_DETAIL } from './gear.js';

export function attachShirt(parts, config = {}) {
    // Determine if the shirt should be leather (sync with leather armor)
    const isLeather = config.gear?.leatherArmor;
    
    // The red/yellow plaid shirt is reserved for lordtsarcasm, unless wearing leather armor
    const isLordTsarcasm = config.name?.toLowerCase() === 'lordtsarcasm';
    
    if (!isLordTsarcasm && !isLeather && !config.shirtColor) return null;

    // Generate Procedural Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (isLeather) {
        // Leather color sync
        ctx.fillStyle = LEATHER_COLOR;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add some leather-like grain
        for (let i = 0; i < 2000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.01)';
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
        
        // Simple stitching lines
        ctx.strokeStyle = LEATHER_DETAIL;
        ctx.globalAlpha = 0.3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(10, 10, 492, 492);
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([]);
    } else if (isLordTsarcasm) {
        // Base Red
        ctx.fillStyle = '#a91b1b'; 
        ctx.fillRect(0, 0, 512, 512);
        
        // Yellow Stripes
        ctx.fillStyle = '#e5b700';
        ctx.globalAlpha = 0.7;
        // Vertical
        ctx.fillRect(128, 0, 96, 512);
        ctx.fillRect(384, 0, 96, 512);
        // Horizontal
        ctx.fillRect(0, 128, 512, 96);
        ctx.fillRect(0, 384, 512, 96);
        
        // Accents
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(128, 128, 96, 96);
        ctx.fillRect(384, 384, 96, 96);
        ctx.fillRect(128, 384, 96, 96);
        ctx.fillRect(384, 128, 96, 96);
    } else {
        // Use custom shirt color from character creator
        ctx.fillStyle = config.shirtColor || '#ffffff';
        ctx.fillRect(0, 0, 512, 512);
    }

    const shirtTex = new THREE.CanvasTexture(canvas);
    shirtTex.wrapS = THREE.RepeatWrapping;
    shirtTex.wrapT = THREE.RepeatWrapping;
    
    // Compensate for cylinder aspect ratio to keep plaid square
    // Circumference ~1.8, height ~0.32 -> ratio ~5.6
    shirtTex.repeat.set(6, 1.1); 
    shirtTex.needsUpdate = true;

    const shirtMat = new THREE.MeshToonMaterial({ map: shirtTex });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    // 1. Torso Shirt (Shortened to only cover top 2/3)
    // We adjust radii and length to wrap the upper torso without gaps
    const torsoRadiusTop = 0.3, torsoRadiusBottom = 0.26, shirtLen = 0.32;
    const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, shirtLen, 16);
    const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
    
    // Female Breast Coverage
    if (config.bodyType === 'female' && parts.chest) {
        const breastShirtGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const chestChildren = [...parts.chest.children];
        for (let i = 0; i < chestChildren.length; i++) {
            const child = chestChildren[i];
            if (child.isMesh && child.material !== outlineMat) {
                const breastShirt = new THREE.Mesh(breastShirtGeo, shirtMat);
                breastShirt.position.copy(child.position);
                breastShirt.scale.copy(child.scale).multiplyScalar(1.02);
                parts.chest.add(breastShirt);
                
                const breastO = new THREE.Mesh(breastShirtGeo, outlineMat);
                breastO.position.copy(breastShirt.position);
                breastO.scale.copy(breastShirt.scale).multiplyScalar(1.05);
                breastO.position.z -= 0.01;
                parts.chest.add(breastO);
            }
        }
    }
    
    // Position it high on the torso (Base torso top is at ~0.55, bottom at ~0.1)
    shirtTorso.position.y = 0.41 * SCALE_FACTOR;
    shirtTorso.castShadow = true;
    parts.torsoContainer.add(shirtTorso);

    // Torso Top Cap (Shoulders) - No bottom cap to prevent seams/overlapping with waist
    const topCapGeo = new THREE.SphereGeometry(torsoRadiusTop, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const topCap = new THREE.Mesh(topCapGeo, shirtMat);
    topCap.position.y = shirtLen / 2;
    shirtTorso.add(topCap);

    // Shirt Outlines
    [shirtTorsoGeo, topCapGeo].forEach(g => {
        const o = new THREE.Mesh(g, outlineMat);
        o.scale.setScalar(1.05);
        if (g === topCapGeo) o.position.y = shirtLen / 2;
        shirtTorso.add(o);
    });

    // 2. Sleeves
    const sleeveRadius = 0.12, sleeveLen = 0.25;
    const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLen, 12);
    
    const attachSleeve = (armPart) => {
        const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
        sleeve.position.y = -sleeveLen / 2; // Cover upper part of the arm segment
        sleeve.castShadow = true;
        armPart.add(sleeve);

        // Sleeve top joint (Shoulder)
        const sJointGeo = new THREE.SphereGeometry(sleeveRadius, 12, 12);
        const sJoint = new THREE.Mesh(sJointGeo, shirtMat);
        sleeve.add(sJoint);
        sJoint.position.y = sleeveLen / 2;

        // Sleeve Outlines
        [sleeveGeo, sJointGeo].forEach(g => {
            const o = new THREE.Mesh(g, outlineMat);
            o.scale.setScalar(1.08);
            if (g === sJointGeo) o.position.y = sleeveLen / 2;
            sleeve.add(o);
        });

        return sleeve;
    };

    parts.rightSleeve = attachSleeve(parts.rightArm);
    parts.leftSleeve = attachSleeve(parts.leftArm);

    return { shirtTorso, rightSleeve: parts.rightSleeve, leftSleeve: parts.leftSleeve };
}