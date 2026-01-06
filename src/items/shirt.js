import * as THREE from 'three';

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
        ctx.fillStyle = config.shirtColor || '#5d4037';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add some leather-like grain
        for (let i = 0; i < 2000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.01)';
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
        
        // Simple stitching lines
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
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
    shirtTex.repeat.set(6, 1.1); 
    shirtTex.needsUpdate = true;

    const shirtMat = new THREE.MeshToonMaterial({ map: shirtTex });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    // Match body torso dimensions from TorsoBuilder
    const torsoRadiusTop = 0.28, torsoRadiusBottom = 0.22;
    const torsoLen = 0.56;
    
    // 1. Torso Shirt - Slightly larger to cover abs and avoid clipping
    const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoLen, 16);
    shirtTorsoGeo.scale(1, 1, 0.65); // Match body scaling
    const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
    
    // Position to match body torso mesh exactly. 
    // Since we parent to parts.torso, we use (0,0,0).
    shirtTorso.position.set(0, 0, 0.015); // Nudge forward to hug torso contour
    shirtTorso.scale.set(1.04, 1.03, 1.16); // Inflate mostly in Z to cover abs without ballooning
    shirtTorso.castShadow = true;
    parts.torso.add(shirtTorso);

    // Female Breast Coverage
    if (config.bodyType === 'female' && parts.chest) {
        const breastShirtGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const chestChildren = [...parts.chest.children];
        for (let i = 0; i < chestChildren.length; i++) {
            const child = chestChildren[i];
            if (child.isMesh && child.material !== outlineMat) {
                const breastShirt = new THREE.Mesh(breastShirtGeo, shirtMat);
                breastShirt.position.copy(child.position);
                breastShirt.scale.copy(child.scale).multiplyScalar(1.03);
                parts.chest.add(breastShirt);
                
                const breastO = new THREE.Mesh(breastShirtGeo, outlineMat);
                breastO.position.copy(breastShirt.position);
                breastO.scale.copy(breastShirt.scale).multiplyScalar(1.06);
                parts.chest.add(breastO);
            }
        }
    }
    
    // Torso Top Cap (Shoulders) - Match body shoulders
    const topCapGeo = new THREE.SphereGeometry(torsoRadiusTop * 1.06, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    topCapGeo.scale(1.0, 0.5, 0.68); // Smooth shoulder slope to sit under the vest
    const topCap = new THREE.Mesh(topCapGeo, shirtMat);
    topCap.position.y = torsoLen / 2 - 0.03; // Lower position to meet breast coverage
    shirtTorso.add(topCap);


    // Shirt Outlines
    [shirtTorsoGeo, topCapGeo].forEach(g => {
        const o = new THREE.Mesh(g, outlineMat);
        const outlineScale = (g === topCapGeo) ? 1.03 : 1.05;
        o.scale.setScalar(outlineScale);
        if (g === topCapGeo) o.position.y = torsoLen / 2 - 0.03;
        shirtTorso.add(o);
    });

    // 2. Sleeves - Match arm dimensions
    const sleeveRadius = 0.1, sleeveLen = 0.36; 
    const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLen, 12);
    
    const attachSleeve = (armPart) => {
        const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
        // Cover upper part of arm
        sleeve.position.y = -sleeveLen / 2 + 0.1; 
        sleeve.scale.set(1.02, 1.02, 1.02);
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
            o.scale.setScalar(1.1);
            if (g === sJointGeo) o.position.y = sleeveLen / 2;
            sleeve.add(o);
        });

        return sleeve;
    };

    const rightSleeve = attachSleeve(parts.rightArm);
    const leftSleeve = attachSleeve(parts.leftArm);

    return { shirtTorso, rightSleeve, leftSleeve };
}
