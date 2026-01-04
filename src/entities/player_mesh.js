import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createPlayerMesh(customConfig = {}) {
    const config = {
        bodyType: customConfig.bodyType || 'male',
        bodyVariant: customConfig.bodyVariant || 'average',
        outfit: customConfig.outfit || 'naked',
        skinColor: customConfig.skinColor || '#ffdbac',
        eyeColor: customConfig.eyeColor || '#333333',
        scleraColor: customConfig.scleraColor || '#ffffff',
        pupilColor: customConfig.pupilColor || '#000000',
        lipColor: customConfig.lipColor || '#e0b094',
        headScale: customConfig.headScale || 1.0,
        torsoWidth: customConfig.torsoWidth || 1.0,
        torsoHeight: customConfig.torsoHeight || 1.0,
        armScale: customConfig.armScale || 1.0,
        legScale: customConfig.legScale || 1.0,
        heelScale: customConfig.heelScale || 1.218,
        heelHeight: customConfig.heelHeight || 1.0,
        toeScale: customConfig.toeScale || 1.0,
        footLength: customConfig.footLength || 1.0,
        footWidth: customConfig.footWidth || 1.0,
        toeSpread: customConfig.toeSpread || 1.0,
        chinSize: customConfig.chinSize || 0.7,
        chinLength: customConfig.chinLength || 1.0,
        chinForward: customConfig.chinForward || 0.03,
        chinHeight: customConfig.chinHeight || -0.04,
        irisScale: customConfig.irisScale || 1.0,
        pupilScale: customConfig.pupilScale || 1.0,
    };

    const group = new THREE.Group();
    const parts = {
        heelGroups: [],
        forefootGroups: [],
        toeUnits: []
    };

    // --- Materials ---
    const skinMat = new THREE.MeshToonMaterial({ color: config.skinColor });
    const shirtMat = new THREE.MeshToonMaterial({ color: 0x888888 }); 
    const pantsMat = new THREE.MeshToonMaterial({ color: 0x444444 });
    const bootsMat = new THREE.MeshToonMaterial({ color: 0x222222 });
    const lipMat = new THREE.MeshToonMaterial({ color: config.lipColor });
    const scleraMat = new THREE.MeshToonMaterial({ color: config.scleraColor });
    const irisMat = new THREE.MeshToonMaterial({ color: config.eyeColor });
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x000000 });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeballMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    parts.materials = {
        skin: skinMat,
        shirt: shirtMat,
        pants: pantsMat,
        boots: bootsMat,
        lip: lipMat,
        sclera: scleraMat,
        iris: irisMat,
        pupil: pupilMat
    };

    const createFootParts = (isLeftFoot) => {
        const footY = -0.06;
        const rBack = 0.08, len = 0.22;
        const heelZ = 0.08 - len/2;
        const heelPos = new THREE.Vector3(0, footY, heelZ);

        const heelGroup = new THREE.Group();
        heelGroup.position.copy(heelPos);
        heelGroup.position.y += 0.05; 
        
        const heelGeo = new THREE.CylinderGeometry(rBack * 0.7, rBack, rBack * 1.8, 6);
        const heelMesh = new THREE.Mesh(heelGeo, bootsMat);
        heelMesh.rotation.x = 0.1;
        heelMesh.castShadow = true;
        heelGroup.add(heelMesh);

        const heelOutline = new THREE.Mesh(heelGeo, outlineMaterial);
        heelOutline.rotation.copy(heelMesh.rotation);
        heelOutline.scale.setScalar(1.1);
        heelGroup.add(heelOutline);
        parts.heelGroups.push(heelGroup);

        const forefootGroup = new THREE.Group();
        forefootGroup.position.copy(heelPos);

        const toeR = 0.022, toeL = 0.05;
        const toeGeo = new THREE.CapsuleGeometry(toeR, toeL, 4, 8);
        const baseDepth = 0.08 + len/2;

        for (let i = 0; i < 5; i++) {
            const xPos = (i - 2) * 0.035; 
            const zCurve = -Math.abs(i - 2) * 0.012 + 0.03;
            const worldToePos = new THREE.Vector3(xPos, footY - 0.015, baseDepth + zCurve);
            const localToePos = new THREE.Vector3().subVectors(worldToePos, heelPos);
            
            const toeUnit = new THREE.Group();
            toeUnit.position.x = localToePos.x;
            forefootGroup.add(toeUnit);
            parts.toeUnits.push(toeUnit);

            const toe = new THREE.Mesh(toeGeo, bootsMat);
            toe.position.set(0, localToePos.y, localToePos.z);
            toe.rotation.x = Math.PI / 2 + 0.1;
            toe.rotation.y = (i - 2) * 0.12; 
            toe.castShadow = true;
            toeUnit.add(toe);

            const toeOutline = new THREE.Mesh(toeGeo, outlineMaterial);
            toeOutline.position.copy(toe.position);
            toeOutline.rotation.copy(toe.rotation);
            toeOutline.scale.setScalar(1.2);
            toeUnit.add(toeOutline);

            const bridgeStart = new THREE.Vector3(localToePos.x * 0.6, 0, 0); 
            const bridgeVec = new THREE.Vector3().subVectors(localToePos, bridgeStart);
            const bridgeLen = bridgeVec.length();
            
            const bridgeGeo = new THREE.CylinderGeometry(toeR * 1.1, rBack * 0.8, bridgeLen, 8);
            const bridge = new THREE.Mesh(bridgeGeo, bootsMat);
            const mid = new THREE.Vector3().addVectors(bridgeStart, localToePos).multiplyScalar(0.5);
            bridge.position.copy(mid);
            bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bridgeVec.clone().normalize());
            bridge.castShadow = true;
            forefootGroup.add(bridge);

            const bridgeOutline = new THREE.Mesh(bridgeGeo, outlineMaterial);
            bridgeOutline.position.copy(bridge.position);
            bridgeOutline.quaternion.copy(bridge.quaternion);
            bridgeOutline.scale.set(1.2, 1.0, 1.2);
            forefootGroup.add(bridgeOutline);
        }
        parts.forefootGroups.push(forefootGroup);
        return { heelGroup, forefootGroup };
    };

    const createSegment = (radius, length, radiusBottom = radius, material = skinMat) => {
        const container = new THREE.Group();
        const topJointGeo = new THREE.SphereGeometry(radius, 12, 12);
        const topJoint = new THREE.Mesh(topJointGeo, material);
        topJoint.castShadow = true;
        container.add(topJoint);
        const topOutline = new THREE.Mesh(topJointGeo, outlineMaterial);
        topOutline.scale.setScalar(1.1);
        container.add(topOutline);

        const geo = new THREE.CylinderGeometry(radius, radiusBottom, length, 12, 1);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.y = -length / 2;
        mesh.castShadow = true;
        container.add(mesh);
        const outline = new THREE.Mesh(geo, outlineMaterial);
        outline.position.copy(mesh.position);
        outline.scale.setScalar(1.1);
        container.add(outline);

        const botJointGeo = new THREE.SphereGeometry(radiusBottom, 12, 12);
        const botJoint = new THREE.Mesh(botJointGeo, material);
        botJoint.position.y = -length;
        botJoint.castShadow = true;
        container.add(botJoint);
        const botOutline = new THREE.Mesh(botJointGeo, outlineMaterial);
        botOutline.position.copy(botJoint.position);
        botOutline.scale.setScalar(1.1);
        container.add(botOutline);
        return container;
    };

    // --- Build character skeleton ---
    const hips = new THREE.Group();
    hips.position.y = 1.0 * SCALE_FACTOR;
    group.add(hips);
    parts.hips = hips;

    const torsoRadiusTop = 0.28;
    const torsoRadiusBottom = 0.22;
    const torsoLen = 0.45;
    const torsoContainer = new THREE.Group();
    hips.add(torsoContainer);
    parts.torsoContainer = torsoContainer;

    const torsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoLen, 16);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = (torsoLen / 2 + 0.1) * SCALE_FACTOR;
    torso.castShadow = true;
    torsoContainer.add(torso);
    parts.torso = torso;

    const topCapGeo = new THREE.SphereGeometry(torsoRadiusTop, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const topCap = new THREE.Mesh(topCapGeo, shirtMat);
    topCap.position.y = torsoLen / 2;
    torso.add(topCap);
    parts.topCap = topCap;
    
    const botCapGeo = new THREE.SphereGeometry(torsoRadiusBottom, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const botCap = new THREE.Mesh(botCapGeo, shirtMat);
    botCap.position.y = -torsoLen / 2;
    torso.add(botCap);
    parts.botCap = botCap;

    const chest = new THREE.Group();
    chest.visible = config.bodyType === 'female';
    chest.position.set(0, 0.1, 0.18);
    torso.add(chest);
    parts.chest = chest;

    const chestRadius = 0.13;
    const chestGeo = new THREE.SphereGeometry(chestRadius, 16, 16);
    
    for (let side of [-1, 1]) {
        const breast = new THREE.Mesh(chestGeo, shirtMat);
        breast.position.x = side * 0.11;
        breast.scale.set(1, 0.9, 0.8);
        breast.castShadow = true;
        chest.add(breast);
        
        const breastO = new THREE.Mesh(chestGeo, outlineMaterial);
        breastO.position.copy(breast.position);
        breastO.scale.copy(breast.scale).multiplyScalar(1.05);
        breastO.position.z -= 0.01;
        chest.add(breastO);
    }

    [torsoGeo, topCapGeo, botCapGeo].forEach(g => {
        const o = new THREE.Mesh(g, outlineMaterial);
        o.scale.setScalar(1.05);
        if (g === topCapGeo) o.position.y = torsoLen/2;
        if (g === botCapGeo) o.position.y = -torsoLen/2;
        torso.add(o);
    });

    const neckRadius = 0.08, neckLen = 0.2;
    const neckGeo = new THREE.CapsuleGeometry(neckRadius, neckLen, 4, 8);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = (torsoLen + 0.3) * SCALE_FACTOR;
    hips.add(neck);
    parts.neck = neck;
    const neckO = new THREE.Mesh(neckGeo, outlineMaterial);
    neckO.position.copy(neck.position);
    neckO.scale.setScalar(1.1);
    hips.add(neckO);

    // --- Head construction with socket geometry ---
    const headRadius = 0.21;
    const headGeo = new THREE.SphereGeometry(headRadius, 64, 64);
    const posAttribute = headGeo.attributes.position;
    const vertex = new THREE.Vector3();
    const leftEyeCenter = new THREE.Vector3(0.09, -0.015, headRadius * 0.92);
    const rightEyeCenter = new THREE.Vector3(-0.09, -0.015, headRadius * 0.92);
    const socketRad = 0.065;
    const socketDep = 0.025;

    for (let i = 0; i < posAttribute.count; i++) {
        vertex.fromBufferAttribute(posAttribute, i);
        if (vertex.z > 0 && Math.abs(vertex.x) < 0.18) vertex.z *= 0.94; 
        if (vertex.z > 0 && Math.abs(vertex.x) > 0.15) vertex.x *= 0.95; 
        if (vertex.y < -0.04 && vertex.z > 0) {
            vertex.x *= 0.88;
            if (vertex.y < -headRadius * 0.65) {
                 if (Math.abs(vertex.x) < 0.08) vertex.z += 0.008;
                 vertex.y *= 0.95;
            }
        }
        const distL = vertex.distanceTo(leftEyeCenter);
        const distR = vertex.distanceTo(rightEyeCenter);
        if (distL < socketRad) {
            const f = Math.cos((distL / socketRad) * Math.PI * 0.5); 
            vertex.z -= f * socketDep;
            vertex.y += f * 0.012; 
        }
        if (distR < socketRad) {
            const f = Math.cos((distR / socketRad) * Math.PI * 0.5);
            vertex.z -= f * socketDep;
            vertex.y += f * 0.012;
        }
        const browY = 0.045;
        if (Math.abs(vertex.y - browY) < 0.04 && vertex.z > 0.1) {
            if (Math.abs(vertex.x) > 0.03 && Math.abs(vertex.x) < 0.14) {
                 vertex.z += 0.005 * Math.cos(Math.abs(vertex.y - browY) * 20);
            }
        }
        posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    headGeo.computeVertexNormals();

    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = neck.position.y + (neckLen/2 + headRadius + 0.01) * SCALE_FACTOR;
    hips.add(head);
    parts.head = head;

    const headMount = new THREE.Group();
    head.add(headMount);
    parts.headMount = headMount;

    const headO = new THREE.Mesh(headGeo, outlineMaterial);
    headO.position.copy(head.position);
    headO.scale.setScalar(1.05);
    headO.position.z -= 0.002;
    hips.add(headO);

    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.05, 0.02);
    head.add(jawGroup);
    parts.jaw = jawGroup;

    const jawGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.scale.set(0.7, 0.45, 0.85);
    jawMesh.position.set(0, -0.105, 0.09);
    jawMesh.rotation.x = 0.15;
    jawMesh.castShadow = true;
    jawGroup.add(jawMesh);
    parts.jawMesh = jawMesh;

    const jawOutline = new THREE.Mesh(jawGeo, outlineMaterial);
    jawOutline.scale.copy(jawMesh.scale).multiplyScalar(1.05);
    jawOutline.position.copy(jawMesh.position);
    jawOutline.rotation.copy(jawMesh.rotation);
    jawGroup.add(jawOutline);
    parts.jawOutline = jawOutline;

    const faceGroup = new THREE.Group();
    head.add(faceGroup);
    parts.faceGroup = faceGroup;

    const eyeRadius = 0.045;
    const eyeGeo = new THREE.SphereGeometry(eyeRadius, 32, 32);
    const eyeZPos = 0.162;
    parts.irises = [];
    parts.pupils = [];

    for (let side of [-1, 1]) {
        const eyeContainer = new THREE.Group();
        eyeContainer.position.set(side * 0.09, -0.02, eyeZPos);
        faceGroup.add(eyeContainer);
        const eyeball = new THREE.Mesh(eyeGeo, scleraMat);
        eyeball.scale.set(1.1, 1, 0.8);
        eyeContainer.add(eyeball);
        const irisGeo = new THREE.CircleGeometry(eyeRadius * 0.65, 16);
        const iris = new THREE.Mesh(irisGeo, irisMat);
        iris.position.z = eyeRadius * 1.02;
        eyeball.add(iris);
        parts.irises.push(iris);
        const pupilGeo = new THREE.CircleGeometry(eyeRadius * 0.25, 16);
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.z = 0.002; 
        iris.add(pupil);
        parts.pupils.push(pupil);
        const highlightGeo = new THREE.SphereGeometry(eyeRadius * 0.15, 8, 8);
        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        highlight.position.set(eyeRadius * 0.2, eyeRadius * 0.2, 0.01);
        iris.add(highlight);
        const lidGeo = new THREE.TorusGeometry(eyeRadius * 1.05, 0.008, 8, 16, Math.PI * 0.8);
        const lid = new THREE.Mesh(lidGeo, outlineMaterial);
        lid.position.z = 0.01;
        lid.rotation.z = Math.PI * 0.1;
        eyeContainer.add(lid);
    }

    const nose = new THREE.Group();
    nose.position.set(0, -0.06, 0.198);
    faceGroup.add(nose);
    const bridgeGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.06, 8);
    const bridge = new THREE.Mesh(bridgeGeo, skinMat);
    bridge.rotation.x = -0.4; bridge.position.y = 0.02;
    nose.add(bridge);
    const bridgeO = new THREE.Mesh(bridgeGeo, outlineMaterial);
    bridgeO.scale.setScalar(1.2);
    bridge.add(bridgeO);

    const tipGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const tip = new THREE.Mesh(tipGeo, skinMat);
    tip.position.set(0, -0.01, 0.02);
    nose.add(tip);
    const tipO = new THREE.Mesh(tipGeo, outlineMaterial);
    tipO.scale.setScalar(1.15);
    tip.add(tipO);

    const alaGeo = new THREE.SphereGeometry(0.015, 8, 8);
    for (let side of [-1, 1]) {
        const ala = new THREE.Mesh(alaGeo, skinMat);
        ala.position.set(side * 0.02, -0.015, 0.01);
        ala.scale.set(1.2, 0.8, 1);
        nose.add(ala);
        const alaO = new THREE.Mesh(alaGeo, outlineMaterial);
        alaO.scale.setScalar(1.15);
        ala.add(alaO);
    }

    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.105, 0.19);
    faceGroup.add(mouthGroup);
    parts.mouthGroup = mouthGroup;

    // Upper Lip Path
    const upperCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.035, -0.002, 0),
        new THREE.Vector3(-0.015, 0.008, 0.005),
        new THREE.Vector3(0, 0.004, 0.005),
        new THREE.Vector3(0.015, 0.008, 0.005),
        new THREE.Vector3(0.035, -0.002, 0)
    ]);
    
    const upperLipGeo = new THREE.TubeGeometry(upperCurve, 20, 0.006, 8, false);
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.scale.set(1, 1, 0.5); 
    upperLip.rotation.x = -0.2; 
    upperLip.castShadow = true;
    mouthGroup.add(upperLip);

    // Lower Lip Path
    const lowerCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.035, 0, 0),
        new THREE.Vector3(-0.015, -0.008, 0.005),
        new THREE.Vector3(0, -0.01, 0.008),
        new THREE.Vector3(0.015, -0.008, 0.005),
        new THREE.Vector3(0.035, 0, 0)
    ]);
    
    const lowerLipGeo = new THREE.TubeGeometry(lowerCurve, 20, 0.007, 8, false);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.scale.set(1, 1, 0.5); 
    lowerLip.position.y = -0.005;
    lowerLip.castShadow = true;
    mouthGroup.add(lowerLip);

    const limbRadius = 0.1, thighLen = 0.4, shinLen = 0.4, armLen = 0.35;
    
    parts.rightThigh = createSegment(limbRadius, thighLen, limbRadius, pantsMat);
    parts.rightThigh.position.set(-0.12 * config.torsoWidth, 0, 0);
    hips.add(parts.rightThigh);
    parts.rightShin = createSegment(limbRadius, shinLen, limbRadius, pantsMat);
    parts.rightShin.position.y = -thighLen;
    parts.rightThigh.add(parts.rightShin);

    parts.leftThigh = createSegment(limbRadius, thighLen, limbRadius, pantsMat);
    parts.leftThigh.position.set(0.12 * config.torsoWidth, 0, 0);
    hips.add(parts.leftThigh);
    parts.leftShin = createSegment(limbRadius, shinLen, limbRadius, pantsMat);
    parts.leftShin.position.y = -thighLen;
    parts.leftThigh.add(parts.leftShin);

    const rF = createFootParts(false);
    const lF = createFootParts(true);
    const fOff = -shinLen - 0.05;
    rF.heelGroup.position.y += fOff; rF.forefootGroup.position.y += fOff;
    parts.rightShin.add(rF.heelGroup); parts.rightShin.add(rF.forefootGroup);
    lF.heelGroup.position.y += fOff; lF.forefootGroup.position.y += fOff;
    parts.leftShin.add(lF.heelGroup); parts.leftShin.add(lF.forefootGroup);

    const shoulderY = (torsoLen + 0.18) * SCALE_FACTOR;
    const defaultShoulderX = 0.35 * SCALE_FACTOR;
    const shoulderOffset = config.bodyType === 'female' ? 0.05 * SCALE_FACTOR : 0;
    const shoulderX = defaultShoulderX - shoulderOffset;

    parts.rightArm = createSegment(limbRadius, armLen, 0.08, shirtMat);
    parts.rightArm.position.set(-shoulderX, shoulderY, 0);
    hips.add(parts.rightArm);

    const rightShoulderMount = new THREE.Group();
    rightShoulderMount.position.y = 0.05;
    parts.rightArm.add(rightShoulderMount);
    parts.rightShoulderMount = rightShoulderMount;

    parts.rightForeArm = createSegment(0.08, armLen * 0.5, 0.05, shirtMat);
    parts.rightForeArm.position.y = -armLen;
    parts.rightArm.add(parts.rightForeArm);

    parts.leftArm = createSegment(limbRadius, armLen, 0.08, shirtMat);
    parts.leftArm.position.set(shoulderX, shoulderY, 0);
    hips.add(parts.leftArm);

    const leftShoulderMount = new THREE.Group();
    leftShoulderMount.position.y = 0.05;
    parts.leftArm.add(leftShoulderMount);
    parts.leftShoulderMount = leftShoulderMount;

    parts.leftForeArm = createSegment(0.08, armLen * 0.5, 0.05, shirtMat);
    parts.leftForeArm.position.y = -armLen;
    parts.leftArm.add(parts.leftForeArm);

    const leftShieldMount = new THREE.Group();
    leftShieldMount.position.y = -armLen * 0.25;
    leftShieldMount.rotation.y = Math.PI / 2;
    leftShieldMount.position.x = 0.06;
    parts.leftForeArm.add(leftShieldMount);
    parts.leftShieldMount = leftShieldMount;

    const createHand = (isLeft) => {
        const h = new THREE.Group();
        const pR = 0.055, pL = 0.04, pGeo = new THREE.CapsuleGeometry(pR, pL, 4, 8);
        const palm = new THREE.Mesh(pGeo, skinMat);
        palm.rotation.z = Math.PI / 2;
        palm.scale.set(1.5, 1, 1); palm.position.y = -0.06;
        h.add(palm);
        const fR = 0.02, fL = 0.05, fGeo = new THREE.CapsuleGeometry(fR, fL, 4, 8);
        for(let i=0; i<4; i++) {
            const f = new THREE.Mesh(fGeo, skinMat);
            f.position.set((i-1.5)*0.032, -0.14, 0.025); 
            f.castShadow = true;
            h.add(f);

            const fO = new THREE.Mesh(fGeo, outlineMaterial);
            fO.scale.setScalar(1.2);
            f.add(fO);
        }

        // Thumb
        const thumb = new THREE.Mesh(fGeo, skinMat);
        thumb.position.set(isLeft ? -0.07 : 0.07, -0.08, 0.045);
        thumb.rotation.z = isLeft ? 2.5 : -2.5;
        thumb.castShadow = true;
        h.add(thumb);

        const thumbO = new THREE.Mesh(fGeo, outlineMaterial);
        thumbO.scale.setScalar(1.2);
        thumb.add(thumbO);

        // Palm outline (adding here for consistency)
        const palmO = new THREE.Mesh(pGeo, outlineMaterial);
        palmO.scale.setScalar(1.1);
        palm.add(palmO);

        return h;
    };
    parts.rightHand = createHand(false);
    parts.rightHand.position.y = -armLen * 0.5;
    parts.rightHand.rotation.y = -Math.PI / 2;
    parts.rightForeArm.add(parts.rightHand);
    parts.leftHand = createHand(true);
    parts.leftHand.position.y = -armLen * 0.5;
    parts.leftHand.rotation.y = Math.PI / 2;
    parts.leftForeArm.add(parts.leftHand);

    group.traverse(c => {
        const isOutline = (c.isMesh && c.material === outlineMaterial);
        if (c.isMesh) {
            c.castShadow = !isOutline;
            c.receiveShadow = false;
            
            // Toon materials can sometimes ignore layer masks if lights are inside meshes
            // or if the material settings are sensitive to local lights.
            // We ensure it stays on Layer 0.
            c.layers.set(0);
        }
    });
    return { mesh: group, parts };
}
