
import * as THREE from 'three';
import { PlayerMaterials } from '../PlayerMaterials';

export class TorsoBuilder {
    static build(materials: PlayerMaterials, arrays: any) {
        const matTorso = materials.shirt;
        const matShoulder = materials.shirt;
        const matNeckBase = materials.shirt;
        const matPelvis = materials.skin;
        const matCrotch = materials.skin;
        const matNeck = materials.skin;

        const hips = new THREE.Group();
        hips.position.y = 1.0;

        const torsoLen = 0.56;
        const torsoContainer = new THREE.Group();
        hips.add(torsoContainer);

        const torsoRadiusTop = 0.28, torsoRadiusBottom = 0.22;
        const torsoDepthScale = 0.65;
        
        // Flatten the torso geometry
        const torsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoLen, 16);
        torsoGeo.scale(1, 1, torsoDepthScale); // Make it oval
        const torso = new THREE.Mesh(torsoGeo, matTorso); 
        torso.position.y = torsoLen / 2 + 0.1; 
        torso.castShadow = true;
        torso.userData.baseScale = torso.scale.clone();
        torsoContainer.add(torso);

        // TOP SECTION: Shoulders & Traps (Unified Slope)
        // We use a wider, flatter sphere to cap the torso, providing a base for the traps
        const shoulderGeo = new THREE.SphereGeometry(torsoRadiusTop, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        shoulderGeo.scale(1, 0.5, torsoDepthScale); 
        const topCap = new THREE.Mesh(shoulderGeo, matShoulder);
        topCap.position.y = torsoLen / 2;
        topCap.userData.baseY = topCap.position.y;
        torso.add(topCap);

        // Neck Base (Connecting shoulders to neck)
        const neckBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.08, 12), matNeckBase);
        neckBase.position.y = torsoLen/2 + 0.06;
        neckBase.scale.set(1, 1, 0.8);
        torso.add(neckBase);

        // BOTTOM SECTION: Pelvis (More realistic than simple dome)
        const pelvis = new THREE.Group();
        pelvis.position.y = -torsoLen / 2;
        torso.add(pelvis);
        
        // Tapered cylinder for hips/groin area
        const pelvisHeight = 0.14;
        const pelvisGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 0.95, torsoRadiusBottom * 0.55, pelvisHeight, 16);
        pelvisGeo.scale(1, 1, 0.7);
        const pelvisMesh = new THREE.Mesh(pelvisGeo, matPelvis);
        pelvisMesh.position.y = -pelvisHeight / 2;
        pelvis.add(pelvisMesh);

        // Rounded Crotch
        const crotchGeo = new THREE.SphereGeometry(torsoRadiusBottom * 0.55, 16, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2);
        crotchGeo.scale(1, 0.7, 0.7);
        const crotchMesh = new THREE.Mesh(crotchGeo, matCrotch);
        crotchMesh.position.y = -pelvisHeight;
        pelvis.add(crotchMesh);
        
        // UNDERWEAR (Briefs - Main Body)
        const underwearBottom = new THREE.Group();
        pelvis.add(underwearBottom);

        const uPelvis = new THREE.Mesh(pelvisGeo, materials.underwear);
        uPelvis.scale.set(1.02, 1.02, 1.02);
        uPelvis.position.y = -pelvisHeight / 2;
        underwearBottom.add(uPelvis);

        const uCrotch = new THREE.Mesh(crotchGeo, materials.underwear);
        uCrotch.scale.set(1.02, 1.02, 1.02);
        uCrotch.position.y = -pelvisHeight;
        underwearBottom.add(uCrotch);

        // Male Bulge (Underwear)
        // Use CapsuleGeometry for a more realistic, elongated shape
        const bulgeRadius = 0.042;
        const bulgeLength = 0.04;
        const bulgeGeo = new THREE.CapsuleGeometry(bulgeRadius, bulgeLength, 4, 8);
        
        const maleBulge = new THREE.Mesh(bulgeGeo, materials.underwear);
        // Positioned higher up on the pelvis front face
        // Default position, will be overridden by Scaler
        maleBulge.position.set(0, -0.075, 0.13); 
        maleBulge.rotation.x = -0.15;
        maleBulge.castShadow = true;
        maleBulge.visible = false;
        underwearBottom.add(maleBulge);

        // BUTTOCKS
        const buttocks = new THREE.Group();
        pelvis.add(buttocks);

        const buttRadius = 0.125;
        const buttGeo = new THREE.SphereGeometry(buttRadius, 16, 16);
        
        // Underwear part (Panties Style)
        // Top 65% of sphere to cover the top of butt
        const undieGeo = new THREE.SphereGeometry(buttRadius * 1.04, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);

        [-1, 1].forEach(side => {
            const cheekGroup = new THREE.Group();
            cheekGroup.position.set(side * 0.075, -0.06, -0.11); 
            // Angled outwards and down
            cheekGroup.rotation.x = 0.2; 
            cheekGroup.rotation.y = side * 0.25; 
            buttocks.add(cheekGroup);

            // Skin part (Full volume)
            const cheek = new THREE.Mesh(buttGeo, materials.skin);
            cheek.scale.set(1, 0.95, 0.85);
            cheekGroup.add(cheek);
            arrays.buttockCheeks.push(cheek);

            // Underwear part (Partial coverage with diagonal cut)
            const undie = new THREE.Mesh(undieGeo, materials.underwear);
            undie.name = 'undie';
            undie.scale.set(1, 0.95, 0.85);
            
            // Rotate so the "Pole" (center of coverage) tilts Inwards (-side).
            // This makes the outer edge (Hip side) higher, creating a high-cut leg look.
            // Also tilt slightly forward to align with waist.
            // side = -1 (Right in 3JS X+ is Left), side = 1 (Left). 
            // We want pole to tilt towards centerline (x=0).
            
            undie.rotation.z = side * 0.7; // Tilt 40 degrees inward
            undie.rotation.x = 0.2; // Tilt slightly forward
            
            cheekGroup.add(undie);
        });

        // FEMALE CHEST
        const chest = new THREE.Group();
        chest.visible = false; 
        chest.position.set(0, 0.15, 0.12);
        torso.add(chest);
        const breastGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const nippleGeoFem = new THREE.CircleGeometry(0.012, 8);
        
        const braCups: THREE.Mesh[] = [];

        [-0.11, 0.11].forEach(x => {
            const b = new THREE.Mesh(breastGeo, materials.shirt);
            b.position.x = x; 
            b.scale.set(1, 0.9, 0.6); 
            // Angle breasts outwards slightly for natural look
            b.rotation.y = (x > 0 ? 1 : -1) * 0.15; 
            b.castShadow = true;
            
            // Bra Cup
            const cup = new THREE.Mesh(breastGeo, materials.underwear);
            cup.scale.set(1.03, 1.03, 1.03);
            b.add(cup);
            braCups.push(cup);

            // Female Nipples
            const n = new THREE.Mesh(nippleGeoFem, materials.lip);
            n.position.set(0, 0, 0.13); 
            b.add(n);
            
            chest.add(b);
        });

        // Bra Strap
        const strapGeo = new THREE.CylinderGeometry(0.27, 0.26, 0.05, 16);
        strapGeo.scale(1, 1, 0.65);
        const braStrap = new THREE.Mesh(strapGeo, materials.underwear);
        braStrap.position.y = 0.15;
        braStrap.scale.set(1.02, 1, 1.02);
        torso.add(braStrap);

        // MALE CHEST (Nipples & Abs)
        const maleChest = new THREE.Group();
        maleChest.visible = false;
        torso.add(maleChest);

        const chestSurfaceZ = torsoRadiusTop * torsoDepthScale;

        // Nipples
        const nippleGeo = new THREE.CircleGeometry(0.012, 8);
        
        [-1, 1].forEach(side => {
            const nx = side * 0.12;
            const ny = 0.17;
            
            // Calculate exact surface Z on the cylinder/ellipse at this height
            const t = (ny + torsoLen/2) / torsoLen;
            const rAtY = THREE.MathUtils.lerp(torsoRadiusBottom, torsoRadiusTop, t);
            
            // Ellipse equation: (x/rx)^2 + (z/rz)^2 = 1
            const rx = rAtY;
            const rz = rAtY * torsoDepthScale;
            let nz = 0;
            // Solve for z
            if (Math.abs(nx) < rx) {
                nz = rz * Math.sqrt(1 - (nx*nx)/(rx*rx));
            }

            const n = new THREE.Mesh(nippleGeo, materials.lip);
            n.position.set(nx, ny, nz + 0.005); // +0.005 offset for z-fighting
            n.rotation.y = side * 0.4;
            n.rotation.x = -0.05; 
            maleChest.add(n);
        });

        // Abs (6-pack)
        const abGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const abRows = [
            { y: 0.02, z: chestSurfaceZ - 0.008 },
            { y: -0.07, z: chestSurfaceZ - 0.017 },
            { y: -0.16, z: chestSurfaceZ - 0.024 }
        ];

        abRows.forEach((row, i) => {
             for(let side of [-1, 1]) {
                const ab = new THREE.Mesh(abGeo, materials.skin);
                ab.scale.set(1.2, 0.8, 0.3);
                ab.position.set(side * 0.055, row.y, row.z);
                ab.rotation.y = side * 0.15; 
                ab.rotation.x = -0.05;
                
                // Store base position for scaler adjustments
                ab.userData.basePos = ab.position.clone();
                
                maleChest.add(ab);
            }
        });

        const neckRadius = 0.11;
        const neckHeight = 0.24;
        const neck = new THREE.Mesh(new THREE.CapsuleGeometry(neckRadius, neckHeight, 4, 8), matNeck);
        neck.position.y = torsoLen + 0.24;
        neck.castShadow = true;
        torsoContainer.add(neck);

        return {
            hips,
            torsoContainer,
            torso,
            topCap,
            neckBase,
            pelvis,
            underwearBottom,
            maleBulge,
            buttocks,
            chest,
            braCups,
            braStrap,
            maleChest,
            neck
        };
    }
}
