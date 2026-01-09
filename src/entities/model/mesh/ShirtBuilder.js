import * as THREE from 'three';

const LEATHER_COLOR = '#8B4513';
const LEATHER_DETAIL = '#5D4037';

export class ShirtBuilder {
    static build(parts, config) {
        // Toggle based on equipment state
        if (!config.equipment || !config.equipment.shirt) return null;

        // Use Outfit Type to determine material style if shirt is enabled
        const isLeather = config.outfit === 'warrior';
        
        // Procedural Texture Generation
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
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
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([10, 8]);
            ctx.strokeRect(10, 10, 492, 492);
            
            ctx.strokeRect(128, 0, 256, 512); // Central panel
            
            ctx.globalAlpha = 1.0;
            ctx.setLineDash([]);
        } else {
            // Checkered / Plaid Pattern using shirtColor
            const baseColor = config.shirtColor || '#ffffff';
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, 512, 512);
            
            // Generate complementary or darker stripe color
            const darken = (c, amt) => {
                const num = parseInt(c.replace("#",""), 16);
                let r = (num >> 16) - amt;
                let b = ((num >> 8) & 0x00FF) - amt;
                let g = (num & 0x0000FF) - amt;
                return "#" + (0x1000000 + (r<0?0:r)*0x10000 + (b<0?0:b)*0x100 + (g<0?0:g)).toString(16).slice(1);
            };
            const stripeColor = darken(baseColor, 40);

            // Plaid Stripes
            ctx.fillStyle = stripeColor;
            ctx.globalAlpha = 0.4;
            // Vertical
            ctx.fillRect(100, 0, 60, 512);
            ctx.fillRect(350, 0, 60, 512);
            // Horizontal
            ctx.fillRect(0, 150, 512, 60);
            ctx.fillRect(0, 350, 512, 60);
            
            // Crosshatch areas darker
            ctx.fillStyle = '#000000';
            ctx.globalAlpha = 0.1;
            ctx.fillRect(100, 150, 60, 60);
            ctx.fillRect(350, 350, 60, 60);
            ctx.fillRect(100, 350, 60, 60);
            ctx.fillRect(350, 150, 60, 60);
        }

        const shirtTex = new THREE.CanvasTexture(canvas);
        shirtTex.wrapS = THREE.RepeatWrapping;
        shirtTex.wrapT = THREE.RepeatWrapping;
        
        // Compensate for cylinder aspect ratio to keep texture proportional
        shirtTex.repeat.set(4, 1); 

        const shirtMat = new THREE.MeshToonMaterial({ map: shirtTex });
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

        const createdMeshes = [];

        const shirtRefs = {
            torso: null,
            shoulders: [],
            delts: [],
            sleeves: [],
            details: []
        };

        // 1. Torso Shirt
        const torsoRadiusTop = 0.30; 
        const torsoRadiusBottom = 0.24; 
        const shirtLen = 0.52; 
        const torsoDepthScale = 0.78; // Increased from 0.72 to extend forward more
        
        const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, shirtLen, 16);
        shirtTorsoGeo.scale(1, 1, torsoDepthScale); // Make it oval to match torso
        const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
        const torsoCenterY = parts.torso?.position?.y ?? (0.56 / 2 + 0.1);
        shirtTorso.position.y = torsoCenterY; 
        shirtTorso.position.z = 0.02; // Shift slightly forward to cover poking areas
        shirtTorso.castShadow = true;
        shirtTorso.userData.baseScale = shirtTorso.scale.clone();
        
        parts.torsoContainer.add(shirtTorso);
        createdMeshes.push(shirtTorso);
        shirtRefs.torso = shirtTorso;

        const shirtShoulderRadius = torsoRadiusTop * 1.01; 
        const shoulderGeo = new THREE.SphereGeometry(shirtShoulderRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        shoulderGeo.scale(1, 0.45, torsoDepthScale); 
        const shoulderCap = new THREE.Mesh(shoulderGeo, shirtMat);
        shoulderCap.position.y = shirtLen / 2; 
        shoulderCap.castShadow = true;
        shoulderCap.userData.baseScale = shoulderCap.scale.clone();
        shirtTorso.add(shoulderCap); 
        createdMeshes.push(shoulderCap);
        shirtRefs.shoulders.push(shoulderCap);
        
        // 1.1 Male Chest/Abs Coverage Details - REMOVED (Moved forward via torsoDepthScale)
        /*
        if (config.bodyType === 'male' && parts.maleChest) {
            ...
        }
        */
        
        // Female Breast Coverage
        if (config.bodyType === 'female' && parts.chest) {
            const breastShirtGeo = new THREE.SphereGeometry(0.135, 16, 16);
            const chestChildren = [...parts.chest.children];
            for (let i = 0; i < chestChildren.length; i++) {
                const child = chestChildren[i];
                if (child.isMesh && child.material !== outlineMat) {
                   const bPos = child.position.clone();
                   const bRot = child.rotation.clone();
                   const breast = new THREE.Mesh(breastShirtGeo, shirtMat);
                   breast.position.copy(bPos);
                   breast.rotation.copy(bRot);
                   breast.scale.set(1.05, 0.95, 0.65);
                   parts.chest.add(breast);
                   createdMeshes.push(breast);
                }
            }
        }

        // 2. Sleeves
        const armPairs = [
            { arm: parts.rightArm, forearm: parts.rightForeArm },
            { arm: parts.leftArm, forearm: parts.leftForeArm }
        ];

        armPairs.forEach(({ arm, forearm }) => {
            if (!arm || !forearm) return;

            const deltRadius = 0.115; 
            const shoulderLength = 0.3;
            const deltGeo = new THREE.CapsuleGeometry(
                deltRadius,
                Math.max(0.01, shoulderLength - deltRadius * 2),
                6,
                16
            );
            deltGeo.scale(1.1, 0.65, 1.25); 
            const delt = new THREE.Mesh(deltGeo, shirtMat);
            delt.position.set(0, 0.03, 0); 
            delt.rotation.z = 0.12; 
            delt.castShadow = true;
            delt.userData.baseScale = delt.scale.clone();
            arm.add(delt);
            createdMeshes.push(delt);
            shirtRefs.delts.push(delt);

            const upperArmLen = 0.32;
            const uTop = 0.11;
            const uBot = 0.085;
            const upperGeo = new THREE.CylinderGeometry(uTop, uBot, upperArmLen * 0.7, 14);
            upperGeo.translate(0, -upperArmLen * 0.3, 0); 
            const upperSleeve = new THREE.Mesh(upperGeo, shirtMat);
            upperSleeve.position.y = 0.03; 
            upperSleeve.castShadow = true;
            upperSleeve.userData.baseScale = upperSleeve.scale.clone();
            arm.add(upperSleeve);
            createdMeshes.push(upperSleeve);
            shirtRefs.sleeves.push(upperSleeve);
        });

        return { meshes: createdMeshes, refs: shirtRefs };
    }
}
