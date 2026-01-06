import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';
import { ClothSimulator } from '../utils/cloth_physics_new.js';

// --- LEATHER TEXTURE GENERATION ---
const createLeatherTexture = (color, detailColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);
    
    // Grain/Noise
    for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    
    // Scratches/Wear
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.lineTo(Math.random() * 512, Math.random() * 512);
        ctx.stroke();
    }
    
    // Stitching borders
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = detailColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 492, 492);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
};

export const LEATHER_COLOR = '#4e342e'; 
export const LEATHER_DETAIL = '#3e2723'; 
const METAL_COLOR = '#90a4ae'; 
const TACTICAL_GREEN = '#6b8e23'; // Restored missing variable

const leatherTex = createLeatherTexture(LEATHER_COLOR, LEATHER_DETAIL);
const detailTex = createLeatherTexture(LEATHER_DETAIL, '#211512');

const LEATHER_MAT = new THREE.MeshToonMaterial({ map: leatherTex });
const DETAIL_MAT = new THREE.MeshToonMaterial({ map: detailTex });
const METAL_MAT = new THREE.MeshStandardMaterial({ color: METAL_COLOR, metalness: 0.8, roughness: 0.2 });
const VEST_MAT = new THREE.MeshToonMaterial({ color: TACTICAL_GREEN });
const PANTS_MAT = new THREE.MeshToonMaterial({ color: '#3a3a3a' }); // Dark grey/black pants
const DARK_GREEN = '#556b2f'; // Darker olive for trim/details
const TRIM_MAT = new THREE.MeshToonMaterial({ color: DARK_GREEN });
const DARK_GREY = '#333333';
const CLOAK_MAT = new THREE.MeshToonMaterial({ color: DARK_GREY, side: THREE.DoubleSide });
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

export function attachCloak(parts) {
    const cloakGroup = new THREE.Group();
    // Position it at shoulder height - Raised to sit on top of shoulders
    cloakGroup.position.set(0, 0.66 * SCALE_FACTOR, -0.05);
    parts.torsoContainer.add(cloakGroup);

    // 1. MAIN CAPE BODY (Back) - Using Cloth Simulator
    const capeWidth = 0.9, capeHeight = 1.3; // Made slightly narrower and longer
    // Performance optimization: Reduced resolution from 10x12 to 6x8
    const simulator = new ClothSimulator(capeWidth, capeHeight, 6, 8, Math.PI * 0.5);
    const cape = simulator.createMesh(CLOAK_MAT);
    // Position it at shoulder height - Raised to sit on top of shoulders
    // The cape mesh is translated by -height/2 in createMesh, so we align its top at the group's origin.
    // Move it behind the player. Torso radius is ~0.3, so -0.35 to -0.4 is safe.
    cape.position.set(0, 0, -0.35);
    cloakGroup.add(cape);
    cloakGroup.userData.clothSimulator = simulator;
    cloakGroup.userData.cloakMesh = cape;

    // 2. SHOULDER WRAPS
    const wrapWidth = 0.45, wrapHeight = 0.12, wrapDepth = 0.55;
    const wrapGeo = new THREE.BoxGeometry(wrapWidth, wrapHeight, wrapDepth);
    
    const wrapR = new THREE.Mesh(wrapGeo, CLOAK_MAT);
    wrapR.position.set(0.35, 0.05, -0.1);
    wrapR.rotation.z = -0.2;
    cloakGroup.add(wrapR);

    const wrapL = new THREE.Mesh(wrapGeo, CLOAK_MAT);
    wrapL.position.set(-0.35, 0.05, -0.1);
    wrapL.rotation.z = 0.2;
    cloakGroup.add(wrapL);

    // 3. COLLAR/NECK PIECE
    const collarGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16, 1, true);
    const collar = new THREE.Mesh(collarGeo, CLOAK_MAT);
    collar.position.y = 0.1;
    cloakGroup.add(collar);

    // Outlines
    [wrapR, wrapL, collar].forEach(mesh => {
        const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
        o.scale.setScalar(1.05);
        mesh.add(o);
    });

    return cloakGroup;
}

export function attachVest(parts) {
    // Match torso contour and sit slightly above the shirt
    const torsoRadiusTop = 0.315;
    const torsoRadiusBottom = 0.275;
    const vestLen = 0.38;
    
    const vestGroup = new THREE.Group();
    // Shirt is at 0.41 * SCALE_FACTOR, we align vest to it
    vestGroup.position.y = 0.41 * SCALE_FACTOR;
    vestGroup.position.z = 0.02;
    vestGroup.scale.set(1, 1, 0.65);
    parts.torsoContainer.add(vestGroup);

    // 1. MAIN BODY (Split Front)
    const bodyGeoR = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, vestLen, 16, 1, false, Math.PI * 0.52, Math.PI * 0.95);
    const bodyR = new THREE.Mesh(bodyGeoR, VEST_MAT);
    bodyR.castShadow = true;
    vestGroup.add(bodyR);

    const bodyGeoL = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, vestLen, 16, 1, false, Math.PI * 1.53, Math.PI * 0.95);
    const bodyL = new THREE.Mesh(bodyGeoL, VEST_MAT);
    bodyL.castShadow = true;
    vestGroup.add(bodyL);

    // Outlines for body
    [bodyGeoR, bodyGeoL].forEach(geo => {
        const o = new THREE.Mesh(geo, OUTLINE_MAT);
        o.scale.setScalar(1.05);
        vestGroup.add(o);
    });

    // 2. HIGH COLLAR
    const collarRadius = torsoRadiusTop * 1.05;
    const collarHeight = 0.12;
    // Split collar to match the front opening
    const collarGeoR = new THREE.CylinderGeometry(collarRadius, collarRadius, collarHeight, 16, 1, false, Math.PI * 0.55, Math.PI * 0.9);
    const collarR = new THREE.Mesh(collarGeoR, VEST_MAT);
    collarR.position.y = vestLen / 2 + collarHeight / 2;
    vestGroup.add(collarR);

    const collarGeoL = new THREE.CylinderGeometry(collarRadius, collarRadius, collarHeight, 16, 1, false, Math.PI * 1.55, Math.PI * 0.9);
    const collarL = new THREE.Mesh(collarGeoL, VEST_MAT);
    collarL.position.y = vestLen / 2 + collarHeight / 2;
    vestGroup.add(collarL);

    // Collar trim (thicker look)
    const collarTrimGeo = new THREE.TorusGeometry(collarRadius, 0.02, 8, 16, Math.PI * 1.8);
    const collarTrim = new THREE.Mesh(collarTrimGeo, TRIM_MAT);
    collarTrim.rotation.x = Math.PI / 2;
    collarTrim.rotation.z = Math.PI * 0.1;
    collarTrim.position.y = vestLen / 2 + collarHeight;
    vestGroup.add(collarTrim);

    // 3. SHOULDER PADS
    const padWidth = 0.15, padHeight = 0.05, padDepth = 0.25;
    const padGeo = new THREE.BoxGeometry(padWidth, padHeight, padDepth);
    
    const padR = new THREE.Mesh(padGeo, VEST_MAT);
    padR.position.set(0.25, vestLen / 2, 0);
    padR.rotation.z = -0.2;
    vestGroup.add(padR);

    const padL = new THREE.Mesh(padGeo, VEST_MAT);
    padL.position.set(-0.25, vestLen / 2, 0);
    padL.rotation.z = 0.2;
    vestGroup.add(padL);

    // Small buttons on pads
    const buttonGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const buttonMat = new THREE.MeshToonMaterial({ color: '#cccccc' });
    [padR, padL].forEach(p => {
        const b = new THREE.Mesh(buttonGeo, buttonMat);
        b.position.set(0, padHeight/2, 0.08);
        p.add(b);
        const o = new THREE.Mesh(padGeo, OUTLINE_MAT);
        o.scale.setScalar(1.1);
        p.add(o);
    });

    // 4. UTILITY POUCHES (Triple pocket style from image)
    const pouchWidth = 0.05, pouchHeight = 0.12, pouchDepth = 0.06;
    const pouchGeo = new THREE.BoxGeometry(pouchWidth, pouchHeight, pouchDepth);
    const flapGeo = new THREE.BoxGeometry(pouchWidth + 0.01, 0.03, pouchDepth + 0.01);
    
    for (let side = -1; side <= 1; side += 2) {
        for (let p = -1; p <= 1; p++) {
            const pouch = new THREE.Mesh(pouchGeo, VEST_MAT);
            // Position 3 pouches side-by-side
            pouch.position.set((0.15 + p * 0.06) * side, -0.05, 0.28);
            pouch.rotation.y = 0.1 * side;
            vestGroup.add(pouch);

            // Pouch flap (darker)
            const flap = new THREE.Mesh(flapGeo, TRIM_MAT);
            flap.position.y = pouchHeight / 2;
            pouch.add(flap);

            const o = new THREE.Mesh(pouchGeo, OUTLINE_MAT);
            o.scale.setScalar(1.1);
            pouch.add(o);
        }
    }

    // 5. CENTER ZIPPER LINE
    const zipperGeo = new THREE.PlaneGeometry(0.015, vestLen);
    const zipperMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const zipper = new THREE.Mesh(zipperGeo, zipperMat);
    zipper.position.set(0, 0, 0.305);
    vestGroup.add(zipper);

    // 6. THICK BOTTOM TRIM
    const bottomTrimRadius = torsoRadiusBottom + 0.03;
    const bottomTrimHeight = 0.08;
    const bottomTrimGeo = new THREE.CylinderGeometry(bottomTrimRadius, bottomTrimRadius, bottomTrimHeight, 16);
    const bottomTrim = new THREE.Mesh(bottomTrimGeo, TRIM_MAT);
    bottomTrim.position.y = -vestLen / 2;
    vestGroup.add(bottomTrim);

    const bottomTrimO = new THREE.Mesh(bottomTrimGeo, OUTLINE_MAT);
    bottomTrimO.scale.setScalar(1.05);
    bottomTrim.add(bottomTrimO);

    return vestGroup;
}

export function attachLeatherArmor(parts) {
    const armorGroup = new THREE.Group();
    // Base armor is slightly higher to cover chest
    armorGroup.position.y = 0.38 * SCALE_FACTOR;
    parts.torsoContainer.add(armorGroup);

    const torsoRadiusTop = 0.32, torsoRadiusBottom = 0.28;
    
    // 1. LAYERED CUIRASS (3 overlapping bands)
    const bandHeight = 0.16;
    const cuirassRadiusTop = 0.29; // Narrowed from 0.32 to fit torso better
    const cuirassRadiusBottom = 0.26; // Narrowed from 0.28
    
    for (let i = 0; i < 3; i++) {
        const radiusT = cuirassRadiusTop - (i * 0.005);
        const radiusB = cuirassRadiusBottom + (0.01 - i * 0.005);
        const bandGeo = new THREE.CylinderGeometry(radiusT, radiusB, bandHeight, 16);
        const band = new THREE.Mesh(bandGeo, LEATHER_MAT);
        band.position.y = 0.16 - (i * 0.12); // Moved up (0.1 -> 0.16) to connect with chest plate
        band.rotation.y = i * 0.1; 
        armorGroup.add(band);

        const bandO = new THREE.Mesh(bandGeo, OUTLINE_MAT);
        bandO.scale.setScalar(1.05);
        band.add(bandO);

        // Vertical stitching detail on bands
        for (let s = 0; s < 8; s++) {
            const stitchGeo = new THREE.BoxGeometry(0.01, bandHeight * 0.8, 0.02);
            const stitch = new THREE.Mesh(stitchGeo, DETAIL_MAT);
            const angle = (s / 8) * Math.PI * 2;
            stitch.position.set(Math.cos(angle) * radiusT, 0, Math.sin(angle) * radiusT);
            stitch.rotation.y = -angle;
            band.add(stitch);
        }
    }

    // 2. CHEST PLATE (Gorget/Breastplate top)
    const chestGeo = new THREE.SphereGeometry(cuirassRadiusTop * 1.02, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const chestPlate = new THREE.Mesh(chestGeo, LEATHER_MAT);
    chestPlate.position.y = 0.22; // Aligned with the top of the cuirass
    chestPlate.scale.set(1.05, 0.45, 1.15); // Much more subtle, realistic curve
    armorGroup.add(chestPlate);

    const chestO = new THREE.Mesh(chestGeo, OUTLINE_MAT);
    chestO.scale.setScalar(1.05);
    chestPlate.add(chestO);

    // 3. COLLAR (High protective collar)
    const collarGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 16, 1, true);
    const collar = new THREE.Mesh(collarGeo, DETAIL_MAT);
    collar.position.y = 0.32;
    armorGroup.add(collar);

    const collarO = new THREE.Mesh(collarGeo, OUTLINE_MAT);
    collarO.scale.setScalar(1.05);
    collar.add(collarO);

    // 4. SHOULDER STRAPS WITH BUCKLES
    for (let side of [-1, 1]) {
        const strapGeo = new THREE.BoxGeometry(0.14, 0.04, 0.45);
        const strap = new THREE.Mesh(strapGeo, DETAIL_MAT);
        strap.position.set(side * 0.22, 0.28, 0);
        strap.rotation.z = side * 0.15;
        armorGroup.add(strap);

        // Buckle on front of strap
        const buckleGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
        const buckle = new THREE.Mesh(buckleGeo, METAL_MAT);
        buckle.position.set(0, 0.02, 0.18);
        strap.add(buckle);

        const strapO = new THREE.Mesh(strapGeo, OUTLINE_MAT);
        strapO.scale.setScalar(1.1);
        strap.add(strapO);
    }

    // 5. PAULDRONS (Multi-layered shoulder armor)
    const attachPauldron = (armPart, isLeft) => {
        const pauldronGroup = new THREE.Group();
        armPart.add(pauldronGroup);

        const pRadius = 0.22;
        // 3 overlapping plates per shoulder
        for (let i = 0; i < 3; i++) {
            const plateGeo = new THREE.SphereGeometry(pRadius - (i * 0.01), 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
            const plate = new THREE.Mesh(plateGeo, LEATHER_MAT);
            plate.position.y = 0.12 - (i * 0.06);
            // Angled down (reversed signs/values from previous)
            plate.rotation.z = (isLeft ? -1 : 1) * (0.4 + i * 0.1); 
            plate.scale.set(1.1, 0.8, 1.2);
            pauldronGroup.add(plate);

            const plateO = new THREE.Mesh(plateGeo, OUTLINE_MAT);
            plateO.scale.setScalar(1.05);
            plate.add(plateO);

            // Metal stud detail
            const studGeo = new THREE.SphereGeometry(0.02, 8, 8);
            const stud = new THREE.Mesh(studGeo, METAL_MAT);
            stud.position.set(0, 0, pRadius * 0.8);
            plate.add(stud);
        }
        return pauldronGroup;
    };

    const rightPad = attachPauldron(parts.rightArm, false);
    const leftPad = attachPauldron(parts.leftArm, true);

    // 6. FRONT BELT/CENTER STRAP
    const centerStrapGeo = new THREE.BoxGeometry(0.08, 0.4, 0.04);
    const centerStrap = new THREE.Mesh(centerStrapGeo, DETAIL_MAT);
    centerStrap.position.set(0, 0, 0.32);
    armorGroup.add(centerStrap);

    const beltBuckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.06);
    const beltBuckle = new THREE.Mesh(beltBuckleGeo, METAL_MAT);
    beltBuckle.position.set(0, -0.1, 0.34);
    armorGroup.add(beltBuckle);

    return { armorGroup, rightPad, leftPad };
}

export function attachHeadband(parts) {
    const headRadius = 0.21;
    const headbandMat = new THREE.MeshToonMaterial({ color: '#000000' });
    const headbandGeo = new THREE.CylinderGeometry(headRadius * 1.06, headRadius * 1.06, 0.08, 16, 1, true);
    const headband = new THREE.Mesh(headbandGeo, headbandMat);
    headband.position.y = 0.05;
    parts.head.add(headband);

    // Metal Plate
    const plateGeo = new THREE.BoxGeometry(0.12, 0.06, 0.02);
    const plateMat = new THREE.MeshToonMaterial({ color: '#aaaaaa' });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0, headRadius * 1.06);
    headband.add(plate);

    const plateO = new THREE.Mesh(plateGeo, OUTLINE_MAT);
    plateO.scale.setScalar(1.1);
    plate.add(plateO);

    const headbandO = new THREE.Mesh(headbandGeo, OUTLINE_MAT);
    headbandO.scale.setScalar(1.05);
    headband.add(headbandO);

    return headband;
}

export function attachHood(parts) {
    const headRadius = 0.21;
    const hoodMat = new THREE.MeshToonMaterial({ color: '#2b2b2b' }); // Darker charcoal grey
    
    const hoodGroup = new THREE.Group();
    parts.head.add(hoodGroup);

    // 1. MAIN HOOD DOME (Back and Top)
    const domeGeo = new THREE.SphereGeometry(headRadius * 1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.85);
    const dome = new THREE.Mesh(domeGeo, hoodMat);
    dome.scale.set(1.1, 1.05, 1.25); // Slightly taller and deeper
    dome.position.set(0, 0, -0.08); // Adjusted to center better on head
    dome.rotation.x = 0.25; 
    hoodGroup.add(dome);

    // 2. THE DRAPE (Neck and Shoulders)
    const drapeGeo = new THREE.CylinderGeometry(headRadius * 1.3, headRadius * 2.0, 0.45, 16, 1, true);
    const drape = new THREE.Mesh(drapeGeo, hoodMat);
    drape.position.set(0, -0.28, -0.05);
    hoodGroup.add(drape);

    // 3. FACE MASK (Lower half covering)
    const maskGeo = new THREE.SphereGeometry(headRadius * 1.1, 16, 12, 0, Math.PI, Math.PI * 0.45, Math.PI * 0.5);
    const mask = new THREE.Mesh(maskGeo, hoodMat);
    mask.position.set(0, -0.02, 0.05); // Pulled forward slightly
    hoodGroup.add(mask);

    // 4. FRONT PEAK/OPENING TRIM (The rounded edge around the face)
    const peakGeo = new THREE.TorusGeometry(headRadius * 1.25, 0.045, 8, 16, Math.PI * 1.2);
    const peak = new THREE.Mesh(peakGeo, hoodMat);
    peak.position.set(0, 0.08, 0.18);
    peak.rotation.x = -0.55;
    peak.rotation.z = Math.PI * 0.9;
    hoodGroup.add(peak);

    // 5. POINTED FRONT LOWER (Deep V-shape from image)
    const vPointGeo = new THREE.ConeGeometry(headRadius * 1.2, 0.55, 3);
    const vPoint = new THREE.Mesh(vPointGeo, hoodMat);
    vPoint.position.set(0, -0.5, 0.25);
    vPoint.rotation.x = 0.3;
    vPoint.scale.set(1.8, 1, 0.1);
    hoodGroup.add(vPoint);

    // Outlines
    [dome, drape, mask, peak, vPoint].forEach(mesh => {
        const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
        o.scale.copy(mesh.scale).multiplyScalar(1.05);
        if (mesh === peak) o.scale.setScalar(1.1);
        mesh.add(o);
    });

    return hoodGroup;
}

export function attachLeatherGloves(parts) {
    const gloveRadius = 0.085, gloveLen = 0.18;
    const cuffGeo = new THREE.CylinderGeometry(gloveRadius, gloveRadius, gloveLen, 12);
    
    // Palm and Finger dimensions to match player_mesh.js
    const pR = 0.056, pL = 0.045; // Slightly larger than hand
    const palmGeo = new THREE.CapsuleGeometry(pR, pL, 4, 8);
    const fR = 0.022, fL = 0.055; // Slightly larger than fingers
    const fingerGeo = new THREE.CapsuleGeometry(fR, fL, 4, 8);

    const attachGlove = (foreArmPart, handPart, isLeft) => {
        const gloveGroup = new THREE.Group();
        foreArmPart.add(gloveGroup);

        // 1. Cuff (on forearm)
        const cuff = new THREE.Mesh(cuffGeo, LEATHER_MAT);
        cuff.position.y = -0.15;
        gloveGroup.add(cuff);
        
        const cuffO = new THREE.Mesh(cuffGeo, OUTLINE_MAT);
        cuffO.scale.setScalar(1.1);
        cuff.add(cuffO);

        // 2. Palm (on hand)
        const palm = new THREE.Mesh(palmGeo, LEATHER_MAT);
        palm.rotation.z = Math.PI / 2;
        palm.scale.set(1.5, 1, 1); 
        palm.position.y = -0.06;
        handPart.add(palm);

        const palmO = new THREE.Mesh(palmGeo, OUTLINE_MAT);
        palmO.scale.setScalar(1.1);
        palm.add(palmO);

        // 3. Fingers
        for(let i=0; i<4; i++) {
            const finger = new THREE.Mesh(fingerGeo, LEATHER_MAT);
            finger.position.set((i-1.5)*0.032, -0.14, 0.025); 
            handPart.add(finger);

            const fingerO = new THREE.Mesh(fingerGeo, OUTLINE_MAT);
            fingerO.scale.setScalar(1.1);
            finger.add(fingerO);
        }

        // 4. Thumb (Visualizing from image, usually at an angle)
        const thumb = new THREE.Mesh(fingerGeo, LEATHER_MAT);
        thumb.position.set(isLeft ? -0.07 : 0.07, -0.08, 0.045);
        thumb.rotation.z = isLeft ? 2.5 : -2.5;
        thumb.scale.setScalar(1.1); // Ensure it fully covers the thumb
        handPart.add(thumb);

        const thumbO = new THREE.Mesh(fingerGeo, OUTLINE_MAT);
        thumbO.scale.setScalar(1.2);
        thumb.add(thumbO);

        return gloveGroup;
    };

    const rightGlove = attachGlove(parts.rightForeArm, parts.rightHand, false);
    const leftGlove = attachGlove(parts.leftForeArm, parts.leftHand, true);

    return { rightGlove, leftGlove };
}

export function attachLeatherHuntersCap(parts) {
    const headRadius = 0.21;
    const hunterGreenMat = new THREE.MeshToonMaterial({ color: '#2e7d32' }); // Forest/Hunter Green
    
    const capGroup = new THREE.Group();
    capGroup.position.y = 0.09; // Lowered from 0.12 to fit better
    capGroup.rotation.x = -0.15; // Tilt the whole cap back slightly
    parts.head.add(capGroup);

    // 1. Base Cap (Fits the head better)
    const baseGeo = new THREE.SphereGeometry(headRadius * 1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const base = new THREE.Mesh(baseGeo, hunterGreenMat);
    base.scale.set(1.1, 0.8, 1.2); 
    capGroup.add(base);

    // 2. The Pointed Top
    const topGeo = new THREE.CylinderGeometry(0.01, headRadius * 0.9, 0.3, 4);
    const top = new THREE.Mesh(topGeo, hunterGreenMat);
    top.position.set(0, 0.15, -0.05); 
    top.rotation.x = -0.4; 
    top.rotation.y = Math.PI / 4;
    capGroup.add(top);

    // 3. The Folded Brim
    const brimGeo = new THREE.CylinderGeometry(headRadius * 1.15, headRadius * 1.1, 0.15, 16, 1, true);
    const brim = new THREE.Mesh(brimGeo, hunterGreenMat);
    brim.position.y = 0.02;
    brim.scale.set(1.05, 1, 1.1);
    brim.rotation.x = 0.05; // Reduced forward tilt to clear eyes
    capGroup.add(brim);

    // 4. Feather
    const featherGroup = new THREE.Group();
    featherGroup.position.set(0.18, 0.1, 0);
    featherGroup.rotation.z = 0.4;
    featherGroup.rotation.y = 0.2;
    capGroup.add(featherGroup);

    const featherMat = new THREE.MeshToonMaterial({ color: '#d7ccc8' });
    const featherGeo = new THREE.CapsuleGeometry(0.01, 0.15, 2, 8);
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.scale.set(1, 1, 0.3);
    featherGroup.add(feather);

    const bandMat = new THREE.MeshToonMaterial({ color: '#5d4037' });
    for(let i=0; i<3; i++) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), bandMat);
        band.position.y = 0.02 + (i * 0.04);
        feather.add(band);
    }

    // Outlines
    [base, top, brim].forEach(mesh => {
        const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
        o.scale.copy(mesh.scale).multiplyScalar(1.05);
        if (mesh === top) o.scale.setScalar(1.1);
        mesh.add(o);
    });

    return capGroup;
}

export function attachAssassinsCap(parts) {
    const headRadius = 0.21;
    const greyMat = new THREE.MeshToonMaterial({ color: '#4a4a4a' }); // Assassin Grey
    
    const capGroup = new THREE.Group();
    capGroup.position.y = 0.08; // Lowered from 0.12
    capGroup.rotation.x = -0.1; // Reduced tilt slightly
    parts.head.add(capGroup);

    // 1. Base Cap
    const baseGeo = new THREE.SphereGeometry(headRadius * 1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const base = new THREE.Mesh(baseGeo, greyMat);
    base.scale.set(1.1, 0.8, 1.2); 
    capGroup.add(base);

    // 2. The Pointed Top
    const topGeo = new THREE.CylinderGeometry(0.01, headRadius * 0.9, 0.3, 4);
    const top = new THREE.Mesh(topGeo, greyMat);
    top.position.set(0, 0.15, -0.05); 
    top.rotation.x = -0.4; 
    top.rotation.y = Math.PI / 4;
    capGroup.add(top);

    // 3. The Folded Brim
    const brimGeo = new THREE.CylinderGeometry(headRadius * 1.15, headRadius * 1.1, 0.15, 16, 1, true);
    const brim = new THREE.Mesh(brimGeo, greyMat);
    brim.position.y = 0.02;
    brim.scale.set(1.05, 1, 1.1);
    brim.rotation.x = 0.05; 
    capGroup.add(brim);

    // 3b. The Veil (Covers sides and back down to shoulders)
    // Front is angle 0 in this game (based on common character orientation).
    // Opening should be centered at Front (angle 0).
    // Coverage (270 deg / 1.5 * PI) should start at PI/4 and go to 1.75 * PI.
    const veilGeo = new THREE.CylinderGeometry(headRadius * 1.1, headRadius * 1.4, 0.5, 16, 1, true, Math.PI * 0.25, Math.PI * 1.5);
    const veil = new THREE.Mesh(veilGeo, greyMat);
    veil.position.y = -0.15; 
    capGroup.add(veil);

    const veilO = new THREE.Mesh(veilGeo, OUTLINE_MAT);
    veilO.scale.setScalar(1.05);
    veil.add(veilO);

    // 4. Feather
    const featherGroup = new THREE.Group();
    featherGroup.position.set(0.18, 0.1, 0);
    featherGroup.rotation.z = 0.4;
    featherGroup.rotation.y = 0.2;
    capGroup.add(featherGroup);

    const featherMat = new THREE.MeshToonMaterial({ color: '#d7ccc8' });
    const featherGeo = new THREE.CapsuleGeometry(0.01, 0.15, 2, 8);
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.scale.set(1, 1, 0.3);
    featherGroup.add(feather);

    const bandMat = new THREE.MeshToonMaterial({ color: '#333333' }); // Darker band for grey cap
    for(let i=0; i<3; i++) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), bandMat);
        band.position.y = 0.02 + (i * 0.04);
        feather.add(band);
    }

    // Outlines
    [base, top, brim].forEach(mesh => {
        const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
        o.scale.copy(mesh.scale).multiplyScalar(1.05);
        if (mesh === top) o.scale.setScalar(1.1);
        mesh.add(o);
    });

    return capGroup;
}

export function attachLeatherBoots(parts, model = null) {
    // Use model arrays if available, otherwise try to use parts directly for backward compatibility
    const heelGroups = model ? model.heelGroups : (parts.heelGroups || []);
    const forefootGroups = model ? model.forefootGroups : (parts.forefootGroups || []);
    
    const SOLE_MAT = new THREE.MeshToonMaterial({ color: '#1a1a1a' }); // Black sole

    const attachBoot = (shinPart, heelGroup, forefootGroup) => {
        if (!shinPart) return null;
        
        const bootGroup = new THREE.Group();
        shinPart.add(bootGroup);

        // 1. Cuff (on lower shin)
        const cuffRadius = 0.13, cuffLen = 0.3;
        const cuffGeo = new THREE.CylinderGeometry(cuffRadius, cuffRadius * 0.95, cuffLen, 12);
        const cuff = new THREE.Mesh(cuffGeo, LEATHER_MAT);
        cuff.position.y = -0.32;
        bootGroup.add(cuff);

        // Handle case where heelGroup or forefootGroup are missing (e.g. legacy or malformed model)
        if (!heelGroup || !forefootGroup) {
            console.warn("attachBoot: Missing heelGroup or forefootGroup, skipping foot part visuals.");
            return bootGroup;
        }

        // 2. Heel/Back of Boot - Moved forward a touch
        const heelCoverRadius = 0.13; 
        const heelCoverGeo = new THREE.SphereGeometry(heelCoverRadius, 12, 12);
        const heelCover = new THREE.Mesh(heelCoverGeo, LEATHER_MAT);
        heelCover.position.set(0, -0.04, 0.07); // Moved forward from 0.05
        heelGroup.add(heelCover);

        // 3. Boot Upper/Toe - 10% wider (X-scale 1.08 -> 1.19) and moved down a touch
        const toeRadius = 0.1, toeLen = 0.15; 
        const toeGeo = new THREE.CapsuleGeometry(toeRadius, toeLen, 4, 12);
        const toeCover = new THREE.Mesh(toeGeo, LEATHER_MAT);
        toeCover.rotation.x = Math.PI / 2;
        // Moved down from 0.01 to -0.01
        toeCover.position.set(0, -0.01, 0.14); 
        toeCover.scale.set(1.19, 1, 1); // Widened from 1.08
        forefootGroup.add(toeCover);

        // 4. Bridge/Instep - Slightly widened to match toe
        const bridgeGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.22, 12);
        const bridge = new THREE.Mesh(bridgeGeo, LEATHER_MAT);
        bridge.rotation.x = -Math.PI / 3.2; 
        bridge.position.set(0, 0.04, 0.04);
        bridge.scale.set(1.0, 1, 1); // Widened from 0.9
        forefootGroup.add(bridge);

        // 4b. Back Ankle Bridge - Moved forward
        const backBridgeGeo = new THREE.CylinderGeometry(0.125, 0.115, 0.2, 12);
        const backBridge = new THREE.Mesh(backBridgeGeo, LEATHER_MAT);
        backBridge.position.set(0, -0.04, -0.01); // Moved forward from -0.03
        heelGroup.add(backBridge);

        // 4c. Heel Vertical Wrap - Moved forward
        const heelWrapGeo = new THREE.BoxGeometry(0.18, 0.18, 0.05);
        const heelWrap = new THREE.Mesh(heelWrapGeo, LEATHER_MAT);
        heelWrap.position.set(0, -0.05, -0.07); // Moved forward from -0.09
        heelGroup.add(heelWrap);

        // 5. Sole - Slightly wider for toe box
        const soleWidth = 0.22, soleHeight = 0.04, soleDepth = 0.38;
        const soleGeo = new THREE.BoxGeometry(soleWidth, soleHeight, soleDepth);
        const sole = new THREE.Mesh(soleGeo, SOLE_MAT);
        sole.position.set(0, -0.12, 0.07);
        forefootGroup.add(sole);

        // 5b. Heel block for sole - Narrower and moved forward
        const heelBlockGeo = new THREE.BoxGeometry(soleWidth - 0.02, 0.06, 0.14);
        const heelBlock = new THREE.Mesh(heelBlockGeo, SOLE_MAT);
        heelBlock.position.set(0, -0.12, -0.01); // Moved forward from -0.03
        forefootGroup.add(heelBlock);

        // 6. Tongue/Front detail
        const tongueGeo = new THREE.BoxGeometry(0.08, 0.18, 0.03);
        const tongue = new THREE.Mesh(tongueGeo, LEATHER_MAT);
        tongue.position.set(0, 0.13, 0.1);
        tongue.rotation.x = -0.3;
        forefootGroup.add(tongue);

        // Outlines
        [cuff, heelCover, toeCover, bridge, backBridge, heelWrap, sole, tongue, heelBlock].forEach(mesh => {
            const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
            o.scale.copy(mesh.scale || new THREE.Vector3(1,1,1)).multiplyScalar(1.08);
            if (mesh === sole || mesh === heelBlock) o.scale.set(1.05, 1.1, 1.05);
            mesh.add(o);
        });

        return bootGroup;
    };

    const findPart = (root, name) => {
        if (!root) return null;
        if (root.name === name) return root;
        return root.getObjectByName(name);
    };

    const rAnchor = findPart(parts.rightShin, 'right_foot_anchor');
    const rH = findPart(rAnchor, 'right_heel');
    const rF = findPart(rAnchor, 'right_forefoot');
    
    const lAnchor = findPart(parts.leftShin, 'left_foot_anchor');
    const lH = findPart(lAnchor, 'left_heel');
    const lF = findPart(lAnchor, 'left_forefoot');

    // Robustness check to prevent crashes if groups aren't found
    if (!rH || !rF || !lH || !lF) {
        console.warn("attachLeatherBoots: Could not find all foot parts. Parts found:", { rH:!!rH, rF:!!rF, lH:!!lH, lF:!!lF });
        return { rightBoot: new THREE.Group(), leftBoot: new THREE.Group() };
    }

    const rightBoot = attachBoot(parts.rightShin, rH, rF);
    const leftBoot = attachBoot(parts.leftShin, lH, lF);

    return { rightBoot, leftBoot };
}

export function attachPants(parts, config = {}) {
    const limbRadius = 0.1, thighLen = 0.4, shinLen = 0.4;
    const pantsRadius = limbRadius * 1.15; // Slightly wider for a "pant" look
    
    // 1. WAISTBAND (Covering the lower torso)
    const isFemale = config.bodyType === 'female';
    const torsoRadiusBottom = isFemale ? 0.27 : 0.22;
    const waistLen = isFemale ? 0.18 : 0.24;
    const waistRadiusTop = isFemale ? torsoRadiusBottom * 1.04 : torsoRadiusBottom * 1.08;
    const waistRadiusBottom = isFemale ? torsoRadiusBottom * 1.02 : torsoRadiusBottom * 1.06;
    
    const waistGeo = new THREE.CylinderGeometry(waistRadiusTop, waistRadiusBottom, waistLen, 16);
    const waist = new THREE.Mesh(waistGeo, PANTS_MAT);
    const yOffset = isFemale ? 0.04 : 0.06;
    waist.position.y = (yOffset + waistLen/2) * SCALE_FACTOR;
    waist.castShadow = true;
    parts.torsoContainer.add(waist);

    const waistOutline = new THREE.Mesh(waistGeo, OUTLINE_MAT);
    waistOutline.scale.setScalar(1.05);
    waist.add(waistOutline);

    // 2. CROTCH/BOTTOM (To bridge the legs)
    const crotchGeo = new THREE.SphereGeometry(waistRadiusBottom, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const crotch = new THREE.Mesh(crotchGeo, PANTS_MAT);
    crotch.position.y = -waistLen / 2;
    waist.add(crotch);

    const crotchOutline = new THREE.Mesh(crotchGeo, OUTLINE_MAT);
    crotchOutline.scale.setScalar(1.05);
    crotchOutline.position.y = -waistLen / 2;
    waist.add(crotchOutline);

    const attachPantsToLeg = (thighPart, shinPart, isLeft) => {
        // 3. HIP JOINT (Extra coverage at the leg attachment)
        const hipGeo = new THREE.SphereGeometry(pantsRadius * 1.1, 12, 12);
        const hipPants = new THREE.Mesh(hipGeo, PANTS_MAT);
        hipPants.position.set(isLeft ? -0.02 : 0.02, 0.05, 0);
        thighPart.add(hipPants);

        const hipO = new THREE.Mesh(hipGeo, OUTLINE_MAT);
        hipO.scale.setScalar(1.1);
        hipPants.add(hipO);

        // 4. THIGH (Cylinder)
        const thighGeo = new THREE.CylinderGeometry(pantsRadius, pantsRadius, thighLen, 12);
        const thighPants = new THREE.Mesh(thighGeo, PANTS_MAT);
        thighPants.position.y = -thighLen / 2;
        thighPart.add(thighPants);
        
        const thighO = new THREE.Mesh(thighGeo, OUTLINE_MAT);
        thighO.scale.setScalar(1.05);
        thighPants.add(thighO);

        // 3. KNEE JOINT
        const kneeGeo = new THREE.SphereGeometry(pantsRadius, 12, 12);
        const kneePants = new THREE.Mesh(kneeGeo, PANTS_MAT);
        kneePants.position.y = -thighLen;
        thighPart.add(kneePants);

        const kneeO = new THREE.Mesh(kneeGeo, OUTLINE_MAT);
        kneeO.scale.setScalar(1.1);
        kneePants.add(kneeO);

        // 4. SHIN (Cylinder)
        const shinGeo = new THREE.CylinderGeometry(pantsRadius, pantsRadius * 0.95, shinLen, 12);
        const shinPants = new THREE.Mesh(shinGeo, PANTS_MAT);
        shinPants.position.y = -shinLen / 2;
        shinPart.add(shinPants);

        const shinO = new THREE.Mesh(shinGeo, OUTLINE_MAT);
        shinO.scale.setScalar(1.05);
        shinPants.add(shinO);

        return { hipPants, thighPants, kneePants, shinPants };
    };

    const rightPants = attachPantsToLeg(parts.rightThigh, parts.rightShin, false);
    const leftPants = attachPantsToLeg(parts.leftThigh, parts.leftShin, true);

    return { rightPants, leftPants };
}
