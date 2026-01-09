
import * as THREE from 'three';
import { PlayerConfig } from '../../../types';

const LEATHER_COLOR = '#8B4513';
const LEATHER_DETAIL = '#5D4037';
const GLOBAL_PATTERN_SCALE = 3.5; // Repeats per meter

export class ShirtBuilder {
    static build(parts: any, config: PlayerConfig) {
        // Toggle based on equipment state
        if (!config.equipment.shirt) return null;

        // Use Outfit Type to determine texture style
        const isLeather = config.outfit === 'warrior';
        
        // Procedural Texture Generation
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        if (isLeather) {
            // Leather texture
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
            // === PLAID GENERATION ===
            // Use configured colors
            const baseColor = config.shirtColor || '#cc0000';
            const secColor = config.shirtColor2 || '#ffeb3b';

            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, 512, 512);
            
            // Helper for stripes
            const fillRect = (x: number, y: number, w: number, h: number, col: string) => {
                ctx.fillStyle = col;
                ctx.fillRect(x, y, w, h);
            };

            // 1. Broad Dark Check (Dark Red/Black overlay)
            const darkStripe = 'rgba(0, 0, 0, 0.25)';
            const thick = 60;
            const step = 256;
            
            for (let i = 0; i < 512; i+= step) {
                fillRect(i + 40, 0, thick, 512, darkStripe); // Vertical
                fillRect(0, i + 40, 512, thick, darkStripe); // Horizontal
            }

            // 2. Secondary Color Undertones
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = secColor;
            const thin = 12;
            
            for (let i = 0; i < 512; i+= step) {
                const offset = 40 + (thick/2) - (thin/2);
                ctx.fillRect(i + offset, 0, thin, 512);
                ctx.fillRect(0, i + offset, 512, thin);
            }
            ctx.globalAlpha = 1.0;

            // 3. Accent lines
            const accentStripe = 'rgba(255, 255, 255, 0.15)';
            const superThin = 4;
            for (let i = 0; i < 512; i+= step) {
                fillRect(i + 128 + 40, 0, superThin, 512, accentStripe);
                fillRect(0, i + 128 + 40, 512, superThin, accentStripe);
            }
            
            // Fabric Noise
            ctx.globalAlpha = 0.05;
            for (let i = 0; i < 1000; i++) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
            }
        }

        const shirtTex = new THREE.CanvasTexture(canvas);
        shirtTex.wrapS = THREE.RepeatWrapping;
        shirtTex.wrapT = THREE.RepeatWrapping;
        shirtTex.repeat.set(1, 1);

        const shirtMat = new THREE.MeshToonMaterial({ map: shirtTex });
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

        const scaleUVs = (mesh: THREE.Mesh, radius: number, height: number, isSphere: boolean = false) => {
            const geo = mesh.geometry;
            const uvAttribute = geo.attributes.uv;
            if (!uvAttribute) return;

            const uScale = (2 * Math.PI * radius) * GLOBAL_PATTERN_SCALE;
            let vScale = height * GLOBAL_PATTERN_SCALE;
            
            if (isSphere) {
                vScale = (Math.PI * radius) * GLOBAL_PATTERN_SCALE;
            }

            for (let i = 0; i < uvAttribute.count; i++) {
                const u = uvAttribute.getX(i);
                const v = uvAttribute.getY(i);
                uvAttribute.setXY(i, u * uScale, v * vScale);
            }
            uvAttribute.needsUpdate = true;
        };

        const applyPlanarUVs = (mesh: THREE.Mesh, scale: number) => {
            const geo = mesh.geometry;
            const pos = geo.attributes.position;
            const uv = geo.attributes.uv;
            if (!uv) return;
            
            for(let i=0; i<pos.count; i++) {
                const x = pos.getX(i);
                const z = pos.getZ(i);
                uv.setXY(i, x * scale, z * scale);
            }
            uv.needsUpdate = true;
        };

        const createdMeshes: THREE.Object3D[] = [];

        const shirtRefs: any = {
            torso: null,
            shoulders: [] as THREE.Mesh[],
            delts: [] as THREE.Mesh[],
            sleeves: [] as THREE.Mesh[],
            details: [] as THREE.Mesh[]
        };

        // 1. Torso Shirt
        const torsoRadiusTop = 0.30; 
        const torsoRadiusBottom = 0.24; 
        const avgTorsoRadius = (torsoRadiusTop + torsoRadiusBottom) / 2;
        const shirtLen = 0.52; 
        const torsoDepthScale = 0.68; 
        
        const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, shirtLen, 16);
        shirtTorsoGeo.scale(1, 1, torsoDepthScale); 
        const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
        
        scaleUVs(shirtTorso, avgTorsoRadius, shirtLen); 

        const torsoCenterY = parts.torso?.position?.y ?? (0.56 / 2 + 0.1);
        shirtTorso.position.y = torsoCenterY; 
        shirtTorso.castShadow = true;
        shirtTorso.userData.baseScale = shirtTorso.scale.clone();
        
        parts.torsoContainer.add(shirtTorso);
        createdMeshes.push(shirtTorso);
        shirtRefs.torso = shirtTorso;

        // Shoulder cap
        const shirtShoulderRadius = torsoRadiusTop * 1.01; 
        const shoulderGeo = new THREE.SphereGeometry(shirtShoulderRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
        shoulderGeo.scale(1, 0.45, torsoDepthScale); 
        const shoulderCap = new THREE.Mesh(shoulderGeo, shirtMat);
        
        applyPlanarUVs(shoulderCap, GLOBAL_PATTERN_SCALE);

        shoulderCap.position.y = (shirtLen / 2); 
        shoulderCap.castShadow = true;
        shoulderCap.userData.baseScale = shoulderCap.scale.clone();
        shirtTorso.add(shoulderCap); 
        createdMeshes.push(shoulderCap);
        
        // 1.1 Male Chest/Abs
        if (config.bodyType === 'male' && parts.maleChest) {
            const nipCoverGeo = new THREE.SphereGeometry(0.02, 8, 8);
            [-1, 1].forEach(side => {
                const nx = side * 0.12;
                const ny = 0.17;
                
                const t = (ny + shirtLen/2) / shirtLen;
                const rAtY = THREE.MathUtils.lerp(torsoRadiusBottom, torsoRadiusTop, t);
                const rx = rAtY;
                const rz = rAtY * torsoDepthScale;
                let nz = 0;
                if (Math.abs(nx) < rx) {
                    nz = rz * Math.sqrt(1 - (nx*nx)/(rx*rx));
                }

                const nipCover = new THREE.Mesh(nipCoverGeo, shirtMat);
                scaleUVs(nipCover, 0.02, 0.02, true);

                nipCover.position.set(nx, ny, nz + 0.006);
                nipCover.rotation.y = side * 0.4;
                nipCover.scale.set(1.1, 1.1, 0.3);
                shirtTorso.add(nipCover);
                createdMeshes.push(nipCover);
                shirtRefs.details.push(nipCover);
            });

            const abCoverGeo = new THREE.SphereGeometry(0.055, 8, 8);
            const abRows = [0.02, -0.07, -0.16];

            abRows.forEach((rowY) => {
                for(let side of [-1, 1]) {
                    const ax = side * 0.055;
                    const ay = rowY;
                    
                    const t = (ay + shirtLen/2) / shirtLen;
                    const rAtY = THREE.MathUtils.lerp(torsoRadiusBottom, torsoRadiusTop, t);
                    const rx = rAtY;
                    const rz = rAtY * torsoDepthScale;
                    let az = 0;
                    if (Math.abs(ax) < rx) {
                        az = rz * Math.sqrt(1 - (ax*ax)/(rx*rx));
                    }

                    const abCover = new THREE.Mesh(abCoverGeo, shirtMat);
                    scaleUVs(abCover, 0.055, 0.055, true);

                    abCover.scale.set(1.25, 0.85, 0.35);
                    abCover.position.set(ax, ay, az);
                    abCover.rotation.y = side * 0.15;
                    
                    // Mark as Abs and store base position for Scaler updates
                    abCover.userData.isAbs = true;
                    abCover.userData.basePos = abCover.position.clone();

                    shirtTorso.add(abCover);
                    createdMeshes.push(abCover);
                    shirtRefs.details.push(abCover);
                }
            });
        }
        
        // Female Breast
        if (config.bodyType === 'female' && parts.chest) {
            const breastShirtGeo = new THREE.SphereGeometry(0.135, 16, 16);
            const chestChildren = [...parts.chest.children];
            for (let i = 0; i < chestChildren.length; i++) {
                const child = chestChildren[i];
                if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material !== outlineMat) {
                   const bPos = child.position.clone();
                   const bRot = child.rotation.clone();
                   const breast = new THREE.Mesh(breastShirtGeo, shirtMat);
                   
                   scaleUVs(breast, 0.135, 0.135, true);

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

            const sleeveRadius = 0.078;
            const sleeveStraightLen = 0.16; 
            
            const sleeveGeo = new THREE.CapsuleGeometry(sleeveRadius, sleeveStraightLen, 4, 16);
            const totalHeight = sleeveStraightLen + (sleeveRadius * 2);
            scaleUVs({ geometry: sleeveGeo } as unknown as THREE.Mesh, sleeveRadius, totalHeight);

            sleeveGeo.translate(0, -sleeveStraightLen / 2, 0);

            const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
            sleeve.castShadow = true;
            sleeve.userData.baseScale = sleeve.scale.clone();
            
            arm.add(sleeve);
            createdMeshes.push(sleeve);
            shirtRefs.sleeves.push(sleeve);
        });

        return { meshes: createdMeshes, refs: shirtRefs };
    }
}
