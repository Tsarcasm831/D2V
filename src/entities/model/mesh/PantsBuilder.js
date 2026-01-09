import * as THREE from 'three';

export class PantsBuilder {
    static build(parts, config) {
        if (!config.equipment.pants) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Use configured color. Default fallback if somehow missing.
        let baseColor = config.pantsColor || '#2d3748';
        let detailColor = '#1a202c';

        // Minor detail adjustments based on outfit style, but respect base color from config
        if (config.outfit === 'peasant') { detailColor = '#3e2723'; }
        else if (config.outfit === 'warrior') { detailColor = '#000000'; }
        else if (config.outfit === 'noble') { detailColor = '#d1c4e9'; }
        else if (config.outfit === 'naked') { detailColor = '#2c5282'; }

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        // Fabric noise
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 4000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#ffffff';
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }

        // Seams
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = detailColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Side seams
        ctx.moveTo(10, 0); ctx.lineTo(10, 512); 
        ctx.moveTo(502, 0); ctx.lineTo(502, 512); 
        // Waistband
        ctx.moveTo(0, 20); ctx.lineTo(512, 20);
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshToonMaterial({ map: tex });
        
        const meshes = [];
        
        // Scale to sit between underwear (1.02) and shirt (~1.1)
        const s = 1.06; 

        // 1. Pelvis / Hips Coverage
        if (parts.pelvis) {
            const pelvisHeight = 0.14;
            const torsoRadiusBottom = 0.22; // Reference from TorsoBuilder
            
            // Match TorsoBuilder pelvis geometry
            const pGeo = new THREE.CylinderGeometry(
                torsoRadiusBottom * 0.95, 
                torsoRadiusBottom * 0.55, 
                pelvisHeight, 
                16
            );
            // Match TorsoBuilder scale (1, 1, 0.7) then apply pants scale
            pGeo.scale(1, 1, 0.7); 
            
            const pMesh = new THREE.Mesh(pGeo, mat);
            pMesh.scale.multiplyScalar(s);
            pMesh.position.y = -pelvisHeight / 2;
            pMesh.castShadow = true;
            parts.pelvis.add(pMesh);
            meshes.push(pMesh);

            // Crotch Sphere
            const cGeo = new THREE.SphereGeometry(torsoRadiusBottom * 0.55, 16, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2);
            cGeo.scale(1, 0.7, 0.7);
            
            const cMesh = new THREE.Mesh(cGeo, mat);
            cMesh.scale.multiplyScalar(s);
            cMesh.position.y = -pelvisHeight;
            parts.pelvis.add(cMesh);
            meshes.push(cMesh);

            // Pants Bulge (Male only)
            if (config.bodyType === 'male') {
                // Slightly larger than underwear bulge (radius 0.042)
                const bGeo = new THREE.CapsuleGeometry(0.046, 0.042, 4, 8);
                const bMesh = new THREE.Mesh(bGeo, mat);
                bMesh.name = 'pantsBulge'; // Tag for Scaler
                bMesh.castShadow = true;
                
                // Initial placement (will be overridden by scaler frame updates)
                bMesh.position.set(0, -0.075, 0.13);
                
                parts.pelvis.add(bMesh);
                meshes.push(bMesh);
            }
        }

        // 2. Legs
         const legs = [
            { parent: parts.leftThigh, len: 0.4, topR: 0.11, botR: 0.085 },
            { parent: parts.rightThigh, len: 0.4, topR: 0.11, botR: 0.085 },
            { parent: parts.leftShin, len: 0.42, topR: 0.095, botR: 0.065 },
            { parent: parts.rightShin, len: 0.42, topR: 0.095, botR: 0.065 },
        ];

        legs.forEach(leg => {
            if (!leg.parent) return;
            
            // Tube
            const geo = new THREE.CylinderGeometry(leg.topR, leg.botR, leg.len, 12);
            geo.translate(0, -leg.len/2, 0);
            
            const mesh = new THREE.Mesh(geo, mat);
            // Apply scale (width/depth only usually, but uniform is fine for pants looseness)
            mesh.scale.set(s, 1.0, s);
            mesh.castShadow = true;
            leg.parent.add(mesh);
            meshes.push(mesh);
            
            // Joint Cover (Top Sphere) - Essential for knee/hip continuity
            const jointGeo = new THREE.SphereGeometry(leg.topR, 12, 12);
            const joint = new THREE.Mesh(jointGeo, mat);
            joint.scale.setScalar(s);
            leg.parent.add(joint);
            meshes.push(joint);
        });

        return meshes;
    }
}
