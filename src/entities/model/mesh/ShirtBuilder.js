import * as THREE from 'three';

const LEATHER_COLOR = '#8B4513';
const LEATHER_DETAIL = '#5D4037';

export class ShirtBuilder {
    static build(parts, config) {
        if (!config.equipment || !config.equipment.shirt) return null;

        const isLeather = config.outfit === 'warrior';
        
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        if (isLeather) {
            ctx.fillStyle = LEATHER_COLOR;
            ctx.fillRect(0, 0, 512, 512);
            
            for (let i = 0; i < 2000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.01)';
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
            }
            
            ctx.strokeStyle = LEATHER_DETAIL;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([10, 8]);
            ctx.strokeRect(10, 10, 492, 492);
            
            ctx.strokeRect(128, 0, 256, 512); 
            
            ctx.globalAlpha = 1.0;
            ctx.setLineDash([]);
        } else {
            const baseColor = config.shirtColor || '#ffffff';
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, 512, 512);
            
            const darken = (c, amt) => {
                const num = parseInt(c.replace("#",""), 16);
                let r = (num >> 16) - amt;
                let b = ((num >> 8) & 0x00FF) - amt;
                let g = (num & 0x0000FF) - amt;
                return "#" + (0x1000000 + (r<0?0:r)*0x10000 + (b<0?0:b)*0x100 + (g<0?0:g)).toString(16).slice(1);
            };
            const stripeColor = darken(baseColor, 40);

            ctx.fillStyle = stripeColor;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(100, 0, 60, 512);
            ctx.fillRect(350, 0, 60, 512);
            ctx.fillRect(0, 150, 512, 60);
            ctx.fillRect(0, 350, 512, 60);
            
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
        shirtTex.repeat.set(4, 1); 

        const shirtMat = new THREE.MeshToonMaterial({ map: shirtTex });
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

        const createdMeshes = [];

        const torsoRadiusTop = 0.30;
        const torsoRadiusBottom = 0.25;
        const shirtLen = 0.42; 
        
        const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, shirtLen, 16);
        const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
        
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
                    createdMeshes.push(breastShirt);
                    
                    const breastO = new THREE.Mesh(breastShirtGeo, outlineMat);
                    breastO.position.copy(breastShirt.position);
                    breastO.scale.copy(breastShirt.scale).multiplyScalar(1.05);
                    breastO.position.z -= 0.01;
                    parts.chest.add(breastO);
                    createdMeshes.push(breastO);
                }
            }
        }
        
        shirtTorso.position.y = 0.42; 
        shirtTorso.castShadow = true;
        parts.torsoContainer.add(shirtTorso);
        createdMeshes.push(shirtTorso);

        const topCapGeo = new THREE.SphereGeometry(torsoRadiusTop, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        topCapGeo.scale(1, 0.6, 0.8);
        const topCap = new THREE.Mesh(topCapGeo, shirtMat);
        topCap.position.y = shirtLen / 2;
        shirtTorso.add(topCap);

        [shirtTorsoGeo, topCapGeo].forEach(g => {
            const o = new THREE.Mesh(g, outlineMat);
            o.scale.setScalar(1.03);
            if (g === topCapGeo) o.position.y = shirtLen / 2;
            shirtTorso.add(o);
        });

        const sleeveRadius = 0.125;
        const sleeveLen = 0.22;
        const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius * 1.05, sleeveRadius, sleeveLen, 12);
        
        const attachSleeve = (armPart) => {
            const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
            sleeve.position.y = -sleeveLen / 2 + 0.05; 
            sleeve.castShadow = true;
            armPart.add(sleeve);
            createdMeshes.push(sleeve);

            const sJointGeo = new THREE.SphereGeometry(sleeveRadius * 1.15, 12, 12);
            sJointGeo.scale(0.95, 1.4, 0.85); 
            
            const sJoint = new THREE.Mesh(sJointGeo, shirtMat);
            sJoint.position.set(0, 0, 0); 
            sleeve.add(sJoint);

            [sleeveGeo, sJointGeo].forEach(g => {
                const o = new THREE.Mesh(g, outlineMat);
                o.scale.setScalar(1.05);
                if (g === sJointGeo) o.position.set(0,0,0);
                sleeve.add(o);
            });
        };

        if (parts.rightArm) attachSleeve(parts.rightArm);
        if (parts.leftArm) attachSleeve(parts.leftArm);

        return createdMeshes;
    }
}
