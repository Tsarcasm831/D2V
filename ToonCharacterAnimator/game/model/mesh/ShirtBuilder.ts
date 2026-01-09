import * as THREE from 'three';
import { PlayerConfig } from '../../../types';

const LEATHER_COLOR = '#8B4513';
const LEATHER_DETAIL = '#5D4037';

export class ShirtBuilder {
    static build(parts: any, config: PlayerConfig) {
        // Toggle based on equipment state
        if (!config.equipment.shirt) return null;

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
            const darken = (c: string, amt: number) => {
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

        const createdMeshes: THREE.Object3D[] = [];

        const shirtRefs: any = {
            torso: null,
            shoulders: [] as THREE.Mesh[],
            delts: [] as THREE.Mesh[],
            sleeves: [] as THREE.Mesh[],
            details: [] as THREE.Mesh[]
        };

        // 1. Torso Shirt
        const torsoRadiusTop = 0.30; // Slightly reduced from 0.33 to fix bloat while covering skin
        const torsoRadiusBottom = 0.24; // Slightly reduced from 0.27
        const shirtLen = 0.52; 
        const torsoDepthScale = 0.68; // Slightly reduced from 0.72 to look less bloated
        
        const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, shirtLen, 16);
        shirtTorsoGeo.scale(1, 1, torsoDepthScale); // Make it oval to match torso
        const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
        const torsoCenterY = parts.torso?.position?.y ?? (0.56 / 2 + 0.1);
        shirtTorso.position.y = torsoCenterY; 
        shirtTorso.castShadow = true;
        shirtTorso.userData.baseScale = shirtTorso.scale.clone();
        
        parts.torsoContainer.add(shirtTorso);
        createdMeshes.push(shirtTorso);
        shirtRefs.torso = shirtTorso;

        // Shoulder cap to cover traps/shoulders (stays welded to torso)
        // Match torsoRadiusTop + minimal padding for outer shell
        const shirtShoulderRadius = torsoRadiusTop * 1.01; 
        const shoulderGeo = new THREE.SphereGeometry(shirtShoulderRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        // Match torso top cap slope/height so seams line up
        shoulderGeo.scale(1, 0.45, torsoDepthScale); // Flattened slightly more
        const shoulderCap = new THREE.Mesh(shoulderGeo, shirtMat);
        
        // Align with the top edge of the shirtTorso
        shoulderCap.position.y = shirtLen / 2; 
        
        shoulderCap.castShadow = true;
        shoulderCap.userData.baseScale = shoulderCap.scale.clone();
        shirtTorso.add(shoulderCap); 
        createdMeshes.push(shoulderCap);
        shirtRefs.shoulders.push(shoulderCap);
        
        // 1.1 Male Chest/Abs Coverage Details
        if (config.bodyType === 'male' && parts.maleChest) {
            const torsoRadiusTop = 0.28;
            const torsoDepthScale = 0.65;
            const chestSurfaceZ = torsoRadiusTop * torsoDepthScale;

            // Nipple Covers (Slightly larger spheres/disks to cover)
            const nipCoverGeo = new THREE.SphereGeometry(0.02, 8, 8);
            [-1, 1].forEach(side => {
                const nipCover = new THREE.Mesh(nipCoverGeo, shirtMat);
                nipCover.position.set(side * 0.12, 0.17, chestSurfaceZ + 0.006);
                nipCover.rotation.y = side * 0.4;
                nipCover.scale.set(1.1, 1.1, 0.3);
                shirtTorso.add(nipCover);
                createdMeshes.push(nipCover);
                shirtRefs.details.push(nipCover);
            });

            // Abs Covers (Overlapping the 6-pack spheres)
            const abCoverGeo = new THREE.SphereGeometry(0.055, 8, 8);
            const abRows = [
                { y: 0.02, z: chestSurfaceZ - 0.008 },
                { y: -0.07, z: chestSurfaceZ - 0.017 },
                { y: -0.16, z: chestSurfaceZ - 0.024 }
            ];

            abRows.forEach((row) => {
                for(let side of [-1, 1]) {
                    const abCover = new THREE.Mesh(abCoverGeo, shirtMat);
                    abCover.scale.set(1.25, 0.85, 0.35);
                    abCover.position.set(side * 0.055, row.y, row.z + 0.005);
                    abCover.rotation.y = side * 0.15;
                    shirtTorso.add(abCover);
                    createdMeshes.push(abCover);
                    shirtRefs.details.push(abCover);
                }
            });
        }
        
        // Female Breast Coverage
        if (config.bodyType === 'female' && parts.chest) {
            const breastShirtGeo = new THREE.SphereGeometry(0.135, 16, 16);
            const chestChildren = [...parts.chest.children];
            for (let i = 0; i < chestChildren.length; i++) {
                const child = chestChildren[i];
                if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material !== outlineMat) {
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

        // 2. Sleeves (short, cover shoulder & upper half only)
        const armPairs = [
            { arm: parts.rightArm, forearm: parts.rightForeArm },
            { arm: parts.leftArm, forearm: parts.leftForeArm }
        ];

        armPairs.forEach(({ arm, forearm }) => {
            if (!arm || !forearm) return;

            const deltRadius = 0.115; // Slightly larger than 0.11 base
            const shoulderLength = 0.3;
            const deltGeo = new THREE.CapsuleGeometry(
                deltRadius,
                Math.max(0.01, shoulderLength - deltRadius * 2),
                6,
                16
            );
            deltGeo.scale(1.1, 0.65, 1.25); // Matches PlayerMeshBuilder proportions but slightly larger
            const delt = new THREE.Mesh(deltGeo, shirtMat);
            delt.position.set(0, 0.03, 0); // Matches PlayerMeshBuilder Y
            delt.rotation.z = 0.12; // Matches PlayerMeshBuilder Z rotation
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
            upperSleeve.position.y = 0.03; // Align with delt position y
            upperSleeve.castShadow = true;
            upperSleeve.userData.baseScale = upperSleeve.scale.clone();
            arm.add(upperSleeve);
            createdMeshes.push(upperSleeve);
            shirtRefs.sleeves.push(upperSleeve);
        });

        return { meshes: createdMeshes, refs: shirtRefs };
    }
}
