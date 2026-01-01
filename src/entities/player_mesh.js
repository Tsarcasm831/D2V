import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createPlayerMesh(customConfig = {}) {
    const config = {
        bodyType: customConfig.bodyType || 'male',
        skinColor: customConfig.skinColor || '#ffdbac',
        eyeColor: customConfig.eyeColor || '#333333',
        shirtColor: customConfig.shirtColor || '#ffffff',
        shirtPattern: customConfig.shirtPattern || 'none',
        headScale: customConfig.headScale || 1.0,
        torsoWidth: customConfig.torsoWidth || 1.0,
        torsoHeight: customConfig.torsoHeight || 1.0,
        armScale: customConfig.armScale || 1.0,
        legScale: customConfig.legScale || 1.0,
        heelScale: 1.218,
        toeScale: 1.0,
        footLength: 1.0,
        footWidth: 1.0,
        toeSpread: 1.0,
    };

    const group = new THREE.Group();
    const parts = {
        heelGroups: [],
        forefootGroups: [],
        toeUnits: []
    };

    const skinMat = new THREE.MeshToonMaterial({ color: config.skinColor });
    
    // Create Shirt Material with Canvas Texture for Patterns
    const createShirtMaterial = (color, pattern) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Background color
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 512, 512);
        
        if (pattern !== 'none') {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 20;
            
            if (pattern === 'stripes') {
                for (let i = 0; i < 512; i += 64) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i, 512);
                    ctx.stroke();
                }
            } else if (pattern === 'dots') {
                const spacing = 128;
                for (let x = spacing/2; x < 512; x += spacing) {
                    for (let y = spacing/2; y < 512; y += spacing) {
                        ctx.beginPath();
                        ctx.arc(x, y, 24, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else if (pattern === 'checkered') {
                const size = 128;
                for (let x = 0; x < 512; x += size * 2) {
                    for (let y = 0; y < 512; y += size * 2) {
                        ctx.fillRect(x, y, size, size);
                        ctx.fillRect(x + size, y + size, size, size);
                    }
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        // Adjust repeat to compensate for cylinder aspect ratio
        // Circumference is ~1.5, height is ~0.45 -> ratio ~3.3
        texture.repeat.set(4, 1.2); 
        
        return new THREE.MeshToonMaterial({ map: texture });
    };

    // If the player is lordtsarcasm, the base mesh should be skin-colored 
    // because the plaid shirt will be attached as a separate layer later.
    const isLord = (customConfig.name?.toLowerCase() === 'lordtsarcasm');
    const baseShirtMat = isLord ? skinMat : createShirtMaterial(config.shirtColor, config.shirtPattern);
    
    // Adjust texture repeat based on torso scale to prevent stretching
    if (!isLord && baseShirtMat.map) {
        const baseCirc = 1.57; // Approx circumference (2 * PI * 0.25)
        const baseHeight = 0.45;
        const currentCirc = baseCirc * config.torsoWidth;
        const currentHeight = baseHeight * config.torsoHeight;
        
        // We want tiles to be roughly 0.2 units wide
        const xRepeat = Math.max(1, Math.round(currentCirc / 0.2));
        const yRepeat = xRepeat * (currentHeight / currentCirc);
        baseShirtMat.map.repeat.set(xRepeat, yRepeat);
        baseShirtMat.map.needsUpdate = true;
    }
    const shirtMat = baseShirtMat; // Use the same material for limbs/torso caps if applicable
    const shortsMat = new THREE.MeshToonMaterial({ color: 0x654321 }); // Brown
    const underwearMat = new THREE.MeshToonMaterial({ color: 0xeeeeee });
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    const createFootParts = (isLeftFoot) => {
        const footY = -0.06;
        const rBack = 0.08, len = 0.22;
        const heelZ = 0.08 - len/2;
        const heelPos = new THREE.Vector3(0, footY, heelZ);

        const heelGroup = new THREE.Group();
        heelGroup.position.copy(heelPos);
        heelGroup.position.y += 0.05; 
        
        const heelGeo = new THREE.CylinderGeometry(rBack * 0.7, rBack, rBack * 1.8, 6);
        const heelMesh = new THREE.Mesh(heelGeo, skinMat);
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

            const toe = new THREE.Mesh(toeGeo, skinMat);
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
            const bridge = new THREE.Mesh(bridgeGeo, skinMat);
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

    // Build Character
    const hips = new THREE.Group();
    hips.position.y = 1.0 * SCALE_FACTOR;
    group.add(hips);
    parts.hips = hips;

    const torsoRadiusTop = config.bodyType === 'female' ? 0.23 : 0.28;
    const torsoRadiusBottom = config.bodyType === 'female' ? 0.27 : 0.22;
    const torsoLen = 0.45;
    const torsoContainer = new THREE.Group();
    hips.add(torsoContainer);
    parts.torsoContainer = torsoContainer;

    const torsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoLen, 16);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = (torsoLen / 2 + 0.1) * SCALE_FACTOR;
    torso.scale.set(config.torsoWidth, config.torsoHeight, config.torsoWidth);
    torso.castShadow = true;
    torsoContainer.add(torso);
    parts.torso = torso;

    const topCapGeo = new THREE.SphereGeometry(torsoRadiusTop, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const topCap = new THREE.Mesh(topCapGeo, shirtMat);
    topCap.position.y = torsoLen / 2;
    torso.add(topCap);
    
    // Bottom cap of torso becomes the underwear
    const botCapGeo = new THREE.SphereGeometry(torsoRadiusBottom, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const botCap = new THREE.Mesh(botCapGeo, underwearMat);
    botCap.position.y = -torsoLen / 2;
    torso.add(botCap);

    // Chest (Female Feature)
    const chest = new THREE.Group();
    chest.visible = config.bodyType === 'female';
    chest.position.set(0, 0.15, 0.17);
    chest.scale.setScalar(1.05);
    torso.add(chest);
    parts.chest = chest;

    const chestRadius = 0.13;
    const chestGeo = new THREE.SphereGeometry(chestRadius, 16, 16);
    
    for (let side of [-1, 1]) {
        // Use shirtMat for breasts if not lordtsarcasm
        const breastMat = isLord ? skinMat : baseShirtMat;
        const breast = new THREE.Mesh(chestGeo, breastMat);
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

    const headRadius = 0.21;
    const headGeo = new THREE.SphereGeometry(headRadius, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = neck.position.y + (neckLen/2 + headRadius + 0.01) * SCALE_FACTOR;
    hips.add(head);
    parts.head = head;
    parts.head.scale.setScalar(config.headScale);
    const headO = new THREE.Mesh(headGeo, outlineMaterial);
    headO.position.copy(head.position);
    headO.scale.setScalar(1.05);
    hips.add(headO);

    const faceGroup = new THREE.Group();
    head.add(faceGroup);
    parts.faceGroup = faceGroup;

    const eyeRadius = 0.045;
    const eyeGeo = new THREE.SphereGeometry(eyeRadius, 32, 32);
    const eyeballMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const irisMat = new THREE.MeshToonMaterial({ color: config.eyeColor });
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x000000 });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let side of [-1, 1]) {
        const eyeContainer = new THREE.Group();
        eyeContainer.position.set(side * 0.09, -0.02, headRadius - 0.01);
        faceGroup.add(eyeContainer);
        const eyeball = new THREE.Mesh(eyeGeo, eyeballMat);
        eyeball.scale.set(1.1, 1, 0.8);
        eyeContainer.add(eyeball);
        const irisGeo = new THREE.CircleGeometry(eyeRadius * 0.65, 16);
        const iris = new THREE.Mesh(irisGeo, irisMat);
        iris.position.z = eyeRadius * 0.78;
        eyeball.add(iris);
        const pupilGeo = new THREE.CircleGeometry(eyeRadius * 0.35, 16);
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.z = 0.001; 
        iris.add(pupil);
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
    nose.position.set(0, -0.06, headRadius - 0.01);
    faceGroup.add(nose);
    const bridgeGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.06, 8);
    const bridge = new THREE.Mesh(bridgeGeo, skinMat);
    bridge.rotation.x = -0.4; bridge.position.y = 0.02;
    nose.add(bridge);
    const tipGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const tip = new THREE.Mesh(tipGeo, skinMat);
    tip.position.set(0, -0.01, 0.02);
    nose.add(tip);

    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.12, headRadius - 0.015);
    faceGroup.add(mouthGroup);
    parts.mouth = mouthGroup;

    const mouthGeo = new THREE.CapsuleGeometry(0.006, 0.04, 4, 8);
    const mouth = new THREE.Mesh(mouthGeo, outlineMaterial);
    mouth.rotation.z = Math.PI / 2;
    mouthGroup.add(mouth);

    const limbRadius = 0.1, thighLen = 0.4, shinLen = 0.4, armLen = 0.35;
    
    // Helper to create shorts segment (thigh with brown color)
    const createShortsSegment = (radius, length, mat) => {
        const container = new THREE.Group();
        // Top joint (tucked into underwear)
        const topJointGeo = new THREE.SphereGeometry(radius, 12, 12);
        const topJoint = new THREE.Mesh(topJointGeo, underwearMat);
        container.add(topJoint);
        const topOutline = new THREE.Mesh(topJointGeo, outlineMaterial);
        topOutline.scale.setScalar(1.1);
        container.add(topOutline);

        // Main thigh (shorts) - slightly wider than the joint to overlap
        const shortsRadius = radius * 1.08;
        const geo = new THREE.CylinderGeometry(shortsRadius, shortsRadius, length, 12, 1);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = -length / 2;
        container.add(mesh);
        const outline = new THREE.Mesh(geo, outlineMaterial);
        outline.position.copy(mesh.position);
        outline.scale.setScalar(1.1);
        container.add(outline);

        // Knee joint (skin)
        const botJointGeo = new THREE.SphereGeometry(radius, 12, 12);
        const botJoint = new THREE.Mesh(botJointGeo, skinMat);
        botJoint.position.y = -length;
        container.add(botJoint);
        const botOutline = new THREE.Mesh(botJointGeo, outlineMaterial);
        botOutline.position.copy(botJoint.position);
        botOutline.scale.setScalar(1.1);
        container.add(botOutline);
        return container;
    };

    parts.rightThigh = createShortsSegment(limbRadius, thighLen, shortsMat);
    parts.rightThigh.scale.setScalar(config.legScale);
    parts.rightThigh.position.set(-0.12 * config.torsoWidth, 0, 0);
    hips.add(parts.rightThigh);
    parts.rightShin = createSegment(limbRadius, shinLen);
    parts.rightShin.position.y = -thighLen;
    parts.rightThigh.add(parts.rightShin);

    parts.leftThigh = createShortsSegment(limbRadius, thighLen, shortsMat);
    parts.leftThigh.scale.setScalar(config.legScale);
    parts.leftThigh.position.set(0.12 * config.torsoWidth, 0, 0);
    hips.add(parts.leftThigh);
    parts.leftShin = createSegment(limbRadius, shinLen);
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
    parts.rightArm.scale.setScalar(config.armScale);
    parts.rightArm.position.set(-shoulderX, shoulderY, 0);
    hips.add(parts.rightArm);
    parts.rightForeArm = createSegment(0.08, armLen * 0.5, 0.05, skinMat);
    parts.rightForeArm.position.y = -armLen;
    parts.rightArm.add(parts.rightForeArm);

    parts.leftArm = createSegment(limbRadius, armLen, 0.08, shirtMat);
    parts.leftArm.scale.setScalar(config.armScale);
    parts.leftArm.position.set(shoulderX, shoulderY, 0);
    hips.add(parts.leftArm);
    parts.leftForeArm = createSegment(0.08, armLen * 0.5, 0.05, skinMat);
    parts.leftForeArm.position.y = -armLen;
    parts.leftArm.add(parts.leftForeArm);

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
        if (c.isMesh) {
            const isOutline = (c.material === outlineMaterial);
            c.castShadow = !isOutline;
            c.receiveShadow = false;
            // Clean up any potential circular refs or non-clonable bits if they existed
        }
    });
    return { mesh: group, parts };
}