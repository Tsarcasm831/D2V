import * as THREE from 'three';

// ==========================================
// CONSTANTS & TYPES
// ==========================================

export const DEFAULT_CONFIG = {
    bodyType: 'male',
    bodyVariant: 'average',
    outfit: 'naked',
    equipment: {
        helm: false,
        shoulders: false,
        shield: false,
        shirt: false,
    },
    selectedItem: null,
    weaponStance: 'side',

    skinColor: '#ffdbac',
    eyeColor: '#333333',
    scleraColor: '#ffffff',
    pupilColor: '#000000',
    lipColor: '#e0b094',
    shirtColor: '#cc0000',
    hairColor: '#3e2723',
    hairStyle: 'crew',

    headScale: 1.0,
    neckHeight: 0.6,
    neckThickness: 0.7,
    torsoWidth: 1.0,
    torsoHeight: 1.0,
    armScale: 1.0,
    legScale: 1.0,
    buttScale: 1.0,
    heelScale: 1.218,
    heelHeight: 1.0,
    toeScale: 1.0,
    footLength: 1.0,
    footWidth: 1.0,
    toeSpread: 1.0,
    chinSize: 0.7,
    chinLength: 1.0,
    chinForward: 0.03,
    chinHeight: -0.04,
    irisScale: 1.0,
    pupilScale: 1.0,
};

// ==========================================
// UTILS
// ==========================================

class AnimationUtils {
    static playerModelResetFeet(parts, damp) {
        const lerp = THREE.MathUtils.lerp;
        [parts.leftShin, parts.rightShin].forEach(shin => {
            shin.children.forEach((c) => {
                if (c.name.includes('heel') || c.name.includes('forefoot')) {
                    c.rotation.x = lerp(c.rotation.x, 0, damp);
                }
            });
        });
    }
}

class MeshUtils {
    static createSegment(radiusTop, length, segMaterial, radiusBottom) {
        const rBot = radiusBottom !== undefined ? radiusBottom : radiusTop;

        const container = new THREE.Group();

        // Top Joint (Knee/Shoulder)
        const topJointGeo = new THREE.SphereGeometry(radiusTop, 12, 12);
        const topJoint = new THREE.Mesh(topJointGeo, segMaterial);
        topJoint.castShadow = true;
        container.add(topJoint);

        // Main Bone Segment
        const geo = new THREE.CylinderGeometry(radiusTop, rBot, length, 12, 1);
        const mesh = new THREE.Mesh(geo, segMaterial);
        mesh.position.y = -length / 2;
        mesh.castShadow = true;
        container.add(mesh);

        // Bottom Joint
        const botJointGeo = new THREE.SphereGeometry(rBot, 12, 12);
        const botJoint = new THREE.Mesh(botJointGeo, segMaterial);
        botJoint.position.y = -length;
        botJoint.castShadow = true;
        container.add(botJoint);

        return container;
    }
}

// ==========================================
// MATERIALS
// ==========================================

export class PlayerMaterials {
    constructor(config) {
        this.skin = new THREE.MeshToonMaterial({ color: config.skinColor });
        this.shirt = new THREE.MeshToonMaterial({ color: 0x888888 });
        this.pants = new THREE.MeshToonMaterial({ color: 0x444444 });
        this.boots = new THREE.MeshToonMaterial({ color: 0x222222 });
        this.lip = new THREE.MeshToonMaterial({ color: config.lipColor });
        this.sclera = new THREE.MeshToonMaterial({ color: config.scleraColor });
        this.iris = new THREE.MeshToonMaterial({ color: config.eyeColor });
        this.pupil = new THREE.MeshToonMaterial({ color: config.pupilColor });
        this.underwear = new THREE.MeshToonMaterial({ color: 0xeaeaea });
        this.hair = new THREE.MeshToonMaterial({ color: config.hairColor });
    }

    sync(config) {
        this.skin.color.set(config.skinColor);
        this.sclera.color.set(config.scleraColor);
        this.iris.color.set(config.eyeColor);
        this.pupil.color.set(config.pupilColor);
        this.lip.color.set(config.lipColor);
        this.hair.color.set(config.hairColor);
    }

    applyOutfit(outfit, skinColor) {
        // Defaults to naked/skin color if no outfit is desired
        let sc = 0x888888, pc = 0x444444, bc = 0x222222;
        if (outfit === 'peasant') { sc = 0x8d6e63; pc = 0x5d4037; bc = 0x3e2723; }
        else if (outfit === 'warrior') { sc = 0x607d8b; pc = 0x37474f; bc = 0x263238; }
        else if (outfit === 'noble') { sc = 0x3f51b5; pc = 0x1a237e; bc = 0x111111; }
        else if (outfit === 'naked' || outfit === 'nude') { sc = pc = bc = new THREE.Color(skinColor).getHex(); }
        
        this.shirt.color.setHex(sc);
        this.pants.color.setHex(pc);
        this.boots.color.setHex(bc);
    }
}

// ==========================================
// MESH BUILDERS
// ==========================================

class FootBuilder {
    static create(materials, isLeft, arrays) {
        const footMat = materials.boots;
        const footWidth = 0.095;
        const footHeight = 0.055;
        const totalLength = 0.24; 
        const rearLen = 0.15;
        
        const footGroup = new THREE.Group();
        footGroup.name = (isLeft ? 'left' : 'right') + '_foot_anchor';

        const heelGroup = new THREE.Group();
        heelGroup.name = (isLeft ? 'left' : 'right') + '_heel';
        footGroup.add(heelGroup);
        
        // Main Foot Body
        const mainGeo = new THREE.BoxGeometry(footWidth, footHeight, rearLen, 4, 4, 5);
        const pos = mainGeo.attributes.position;
        const vec = new THREE.Vector3();

        for(let i=0; i<pos.count; i++) {
            vec.fromBufferAttribute(pos, i);
            const zNorm = (vec.z + rearLen/2) / rearLen;

            if (zNorm < 0.2) {
                const roundFactor = 1 - (zNorm / 0.2);
                if (vec.y < 0) vec.x *= (1 - roundFactor * 0.3);
                if (vec.y < 0) vec.y += roundFactor * 0.02;
            }

            const isMedial = (isLeft && vec.x < 0) || (!isLeft && vec.x > 0);
            if (isMedial && vec.y < 0 && zNorm > 0.3 && zNorm < 0.8) {
                const archAlpha = (zNorm - 0.3) / 0.5; 
                const archHeight = Math.sin(archAlpha * Math.PI) * 0.025;
                vec.y += archHeight;
                vec.x *= 0.9;
            }

            if (vec.y > 0) vec.y -= zNorm * 0.03;
            if (zNorm > 0.7) {
                const widen = (zNorm - 0.7) / 0.3;
                vec.x *= (1 + widen * 0.15);
            }
            pos.setXYZ(i, vec.x, vec.y, vec.z);
        }
        mainGeo.computeVertexNormals();
        
        const mainMesh = new THREE.Mesh(mainGeo, footMat);
        mainMesh.position.set(0, -0.05, 0.03); 
        mainMesh.castShadow = true;
        heelGroup.add(mainMesh);
        arrays.heelGroups.push(heelGroup);

        // Toes
        const forefootGroup = new THREE.Group();
        forefootGroup.name = (isLeft ? 'left' : 'right') + '_forefoot';
        forefootGroup.position.set(0, -0.065, 0.098); 
        footGroup.add(forefootGroup);

        const toeCount = 5;
        const tLengths = [0.06, 0.052, 0.048, 0.044, 0.04];
        const tWidths  = [0.034, 0.026, 0.024, 0.022, 0.021];
        const tHeights = [0.030, 0.026, 0.024, 0.022, 0.021];
        
        let currentCenter = isLeft ? -0.030 : 0.030;
        let stepDir = isLeft ? 1 : -1;
        const splayDir = isLeft ? 1 : -1;

        for(let i=0; i<toeCount; i++) {
            const tLen = tLengths[i];
            const tW = tWidths[i];
            const tH = tHeights[i];
            
            const toeGeo = new THREE.BoxGeometry(tW, tH, tLen, 2, 2, 2);
            const tPos = toeGeo.attributes.position;
            for(let k=0; k<tPos.count; k++) {
                const tz = tPos.getZ(k);
                if (tz > 0) {
                    tPos.setY(k, tPos.getY(k) * 0.6);
                    tPos.setX(k, tPos.getX(k) * 0.8);
                }
            }
            toeGeo.computeVertexNormals();
            toeGeo.translate(0, 0, tLen/2);

            const toeUnit = new THREE.Group();
            const spacing = 0.002;
            
            if (i > 0) {
                 const prevW = tWidths[i-1];
                 const shift = (prevW/2 + spacing + tW/2);
                 currentCenter += shift * stepDir;
            }

            const zOffset = -Math.pow(i, 1.5) * 0.004;
            toeUnit.position.set(currentCenter, 0.0, zOffset);
            toeUnit.userData = { initialX: currentCenter };
            
            const toeMesh = new THREE.Mesh(toeGeo, footMat);
            toeMesh.castShadow = true;
            toeMesh.rotation.y = i * 0.05 * splayDir;

            toeUnit.add(toeMesh);
            forefootGroup.add(toeUnit);
            arrays.toeUnits.push(toeUnit);
        }

        arrays.forefootGroups.push(forefootGroup);
        return { heelGroup: footGroup, forefootGroup: new THREE.Group() }; 
    }
}

class HandBuilder {
    static create(materials, isLeft, arrays) {
        const hand = new THREE.Group();
        const handMat = materials.skin; // Default to skin for hands
        const sideMult = isLeft ? -1 : 1; 

        // Palm
        const palmW = 0.08, palmH = 0.09, palmD = 0.03;
        const palmGeo = new THREE.BoxGeometry(palmW, palmH, palmD);
        palmGeo.translate(0, -palmH/2 + 0.01, 0); 
        const palm = new THREE.Mesh(palmGeo, handMat);
        palm.castShadow = true;
        hand.add(palm);

        // Fingers
        const fLengths = [0.085, 0.095, 0.088, 0.07]; 
        const fWidth = 0.019, fDepth = 0.021;
        const knuckleY = -0.075;
        const startX = 0.032 * sideMult; 
        const spacing = 0.022 * sideMult; 

        for(let i=0; i<4; i++) {
            const fGroup = new THREE.Group();
            const xPos = startX - (i * spacing);
            const yOffset = Math.abs(i-1.5) * -0.002;
            fGroup.position.set(xPos, knuckleY + yOffset, 0); 

            // Proximal
            const pLen = fLengths[i] * 0.55;
            const pGeo = new THREE.BoxGeometry(fWidth, pLen, fDepth);
            pGeo.translate(0, -pLen/2, 0);
            const prox = new THREE.Mesh(pGeo, handMat);
            prox.castShadow = true;
            prox.name = 'proximal';
            prox.add(new THREE.Mesh(new THREE.SphereGeometry(fWidth*0.55, 8, 8), handMat));

            // Distal
            const dLen = fLengths[i] * 0.45;
            const dGeo = new THREE.BoxGeometry(fWidth*0.85, dLen, fDepth*0.85);
            dGeo.translate(0, -dLen/2, 0);
            const dist = new THREE.Mesh(dGeo, handMat);
            dist.position.y = -pLen;
            dist.castShadow = true;
            dist.name = 'distal';
            dist.add(new THREE.Mesh(new THREE.SphereGeometry(fWidth*0.5, 8, 8), handMat));

            prox.add(dist);
            fGroup.add(prox);
            hand.add(fGroup);

            if (!isLeft) arrays.rightFingers.push(fGroup);
            else arrays.leftFingers.push(fGroup);
        }

        // Thumb
        const thumbGroup = new THREE.Group();
        thumbGroup.position.set(0.045 * sideMult, -0.03, 0.015);
        const splayAngle = 0.6 * sideMult;
        const oppositionAngle = -0.5 * sideMult;
        thumbGroup.rotation.set(0.3, oppositionAngle, splayAngle);

        const tLen1 = 0.05;
        const tGeo1 = new THREE.BoxGeometry(0.024, tLen1, 0.024);
        tGeo1.translate(0, -tLen1/2, 0);
        const tProx = new THREE.Mesh(tGeo1, handMat);
        tProx.castShadow = true;
        tProx.name = 'proximal';
        tProx.add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), handMat));

        const tLen2 = 0.04;
        const tGeo2 = new THREE.BoxGeometry(0.02, tLen2, 0.02);
        tGeo2.translate(0, -tLen2/2, 0);
        const tDist = new THREE.Mesh(tGeo2, handMat);
        tDist.position.y = -tLen1;
        tDist.castShadow = true;
        tDist.name = 'distal';
        tDist.add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), handMat));

        tProx.add(tDist);
        thumbGroup.add(tProx);
        hand.add(thumbGroup);

        if (!isLeft) arrays.rightThumb = thumbGroup;
        else arrays.leftThumb = thumbGroup;

        // Thumb Muscle
        const muscle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), handMat);
        muscle.position.set(0.035 * sideMult, -0.05, 0.025);
        muscle.scale.set(0.8, 1.3, 0.7);
        muscle.rotation.z = 0.4 * sideMult;
        hand.add(muscle);

        return hand;
    }
}

class HeadBuilder {
    static build(materials, arrays) {
        const headRadius = 0.21;
        const headGeo = new THREE.SphereGeometry(headRadius, 64, 64);
        const posAttribute = headGeo.attributes.position;
        const vertex = new THREE.Vector3();
        
        const sculptLeftCenter = new THREE.Vector3(0.068, -0.015, headRadius * 0.92);
        const sculptRightCenter = new THREE.Vector3(-0.068, -0.015, headRadius * 0.92);

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            const x = vertex.x, y = vertex.y, z = vertex.z;
            
            if (Math.abs(x) > headRadius * 0.65) {
                const factor = (Math.abs(x) - headRadius * 0.65) / (headRadius * 0.35);
                vertex.x *= (1.0 - factor * 0.15); 
            }
            if (z < 0) vertex.z *= 1.08;
            if (z < -0.05 && y < -0.05) {
                 const taper = Math.min(1.0, (Math.abs(y) - 0.05) * 4.0);
                 vertex.z *= (1.0 - taper * 0.15);
                 vertex.x *= (1.0 - taper * 0.1); 
            }
            if (y < -0.05 && z > 0 && Math.abs(x) > 0.1) vertex.x *= 0.92;
            if (y > 0.02 && y < 0.12 && z > 0.1) vertex.z *= 1.03; 

            const distL = vertex.distanceTo(sculptLeftCenter);
            const distR = vertex.distanceTo(sculptRightCenter);
            const sRad = 0.09, sDepth = 0.05;

            if (distL < sRad && x > 0.02) {
                const f = Math.cos((distL / sRad) * Math.PI * 0.5); 
                vertex.z -= f * sDepth; 
                vertex.y += f * 0.005; 
            }
            if (distR < sRad && x < -0.02) {
                const f = Math.cos((distR / sRad) * Math.PI * 0.5);
                vertex.z -= f * sDepth; 
                vertex.y += f * 0.005;
            }

            if (Math.abs(x) < 0.035 && y > -0.08 && y < 0.05 && z > 0.15) {
                const yDist = Math.abs(y - (-0.03));
                const yFactor = Math.max(0, 1.0 - (yDist / 0.07));
                const xFactor = Math.max(0, 1.0 - (Math.abs(x) / 0.035));
                vertex.z += 0.02 * xFactor * yFactor * yFactor; 
            }
            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        headGeo.computeVertexNormals();
        
        const head = new THREE.Mesh(headGeo, materials.skin);
        head.position.y = 0.32;
        head.castShadow = true;
        
        const headMount = new THREE.Group();
        head.add(headMount);

        // Jaw
        const jaw = new THREE.Group();
        jaw.position.set(0, -0.05, 0.02); 
        head.add(jaw);
        
        const jawRadius = 0.135; 
        const jawGeo = new THREE.SphereGeometry(jawRadius, 48, 32);
        const jPos = jawGeo.attributes.position;
        const jVec = new THREE.Vector3();

        for(let i=0; i<jPos.count; i++) {
            jVec.fromBufferAttribute(jPos, i);
            const x = jVec.x, y = jVec.y, z = jVec.z;
            const zRel = z / jawRadius;

            if (y > 0) { jVec.y *= 0.4; jVec.x *= 0.92; jVec.z *= 0.9; }
            if (z < 0) { jVec.x *= 1.1; jVec.y *= 0.8; }
            if (z > 0) {
                const taper = 1.0 - (zRel * 0.45);
                jVec.x *= taper;
                if (y < 0.02) {
                    const zFactor = Math.max(0, zRel - 0.2);
                    jVec.z += zFactor * 0.025;
                }
            }
            if (y < -jawRadius * 0.5) { jVec.y += ((-jawRadius * 0.5) - y) * 0.5; }
            if (y < 0 && Math.abs(x) > jawRadius * 0.5) { jVec.y += 0.01; }
            jPos.setXYZ(i, jVec.x, jVec.y, jVec.z);
        }
        jawGeo.computeVertexNormals();
        jawGeo.scale(1, 1.5, 1); 

        const jawMesh = new THREE.Mesh(jawGeo, materials.skin);
        jawMesh.position.set(0, -0.06, 0.04); 
        jawMesh.rotation.x = 0.25;
        jawMesh.castShadow = true;
        jaw.add(jawMesh);

        const faceGroup = new THREE.Group();
        head.add(faceGroup);

        // Eyes & Eyelids
        const eyeRadius = 0.045;
        const eyelidRadius = eyeRadius * 1.02; 
        const lidGeo = new THREE.SphereGeometry(eyelidRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.53);

        for (let side of [1, -1]) {
            const eyeContainer = new THREE.Group();
            eyeContainer.position.set(side * 0.082, -0.02, 0.122);
            faceGroup.add(eyeContainer);

            const eyeball = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 32, 32), materials.sclera);
            eyeball.scale.set(1.0, 1.0, 0.85); 
            eyeContainer.add(eyeball);

            const iris = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius * 0.65, 16), materials.iris);
            iris.position.z = eyeRadius * 0.95; 
            eyeball.add(iris); 
            arrays.irises.push(iris);

            const pupil = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius * 0.25, 16), materials.pupil);
            pupil.position.z = 0.002; 
            iris.add(pupil); 
            arrays.pupils.push(pupil);

            const topLid = new THREE.Group();
            const topLidMesh = new THREE.Mesh(lidGeo, materials.skin);
            topLid.add(topLidMesh);
            
            const botLid = new THREE.Group();
            const botLidMesh = new THREE.Mesh(lidGeo, materials.skin);
            botLidMesh.rotation.x = Math.PI;
            botLid.add(botLidMesh);

            topLid.rotation.x = -0.7; 
            botLid.rotation.x = 0.7;  

            eyeContainer.add(topLid);
            eyeContainer.add(botLid);
            arrays.eyelids.push(topLid); 
            arrays.eyelids.push(botLid);
        }

        // Nose
        const nose = new THREE.Group();
        nose.position.set(0, -0.06, 0.198); faceGroup.add(nose);
        const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.06, 8), materials.skin);
        bridge.rotation.x = -0.4; bridge.position.y = 0.02; nose.add(bridge);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), materials.skin);
        tip.position.set(0, -0.01, 0.02); nose.add(tip);
        [-1, 1].forEach(s => {
            const ala = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), materials.skin);
            ala.position.set(s * 0.02, -0.015, 0.01); ala.scale.set(1.2, 0.8, 1); nose.add(ala);
        });

        // Mouth
        const mouth = new THREE.Group(); mouth.position.set(0, -0.105, 0.182); faceGroup.add(mouth);
        const lipC = (pts, r) => {
            const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, r, 8, false), materials.lip);
            tube.scale.set(1, 1, 0.5); tube.rotation.x = -0.2; tube.castShadow = true; return tube;
        };
        mouth.add(lipC([new THREE.Vector3(-0.035, -0.002, 0), new THREE.Vector3(0, 0.004, 0.005), new THREE.Vector3(0.035, -0.002, 0)], 0.006));
        mouth.add(lipC([new THREE.Vector3(-0.035, 0, 0), new THREE.Vector3(0, -0.01, 0.008), new THREE.Vector3(0.035, 0, 0)], 0.007));

        return { head, headMount, jaw, jawMesh, faceGroup };
    }
}

class TorsoBuilder {
    static build(materials, arrays) {
        const hips = new THREE.Group();
        hips.position.y = 1.0;

        const torsoLen = 0.56;
        const torsoContainer = new THREE.Group();
        hips.add(torsoContainer);

        const torsoRadiusTop = 0.28, torsoRadiusBottom = 0.22;
        
        // Torso Body
        const torsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoLen, 16);
        torsoGeo.scale(1, 1, 0.65); 
        const torso = new THREE.Mesh(torsoGeo, materials.shirt); // Uses shirt material (or skin if naked)
        torso.position.y = torsoLen / 2 + 0.1; 
        torso.castShadow = true;
        torsoContainer.add(torso);

        // Shoulders
        const shoulderGeo = new THREE.SphereGeometry(torsoRadiusTop * 1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        shoulderGeo.scale(1, 0.5, 0.65); 
        const topCap = new THREE.Mesh(shoulderGeo, materials.shirt);
        topCap.position.y = torsoLen / 2;
        torso.add(topCap);

        // Neck Base
        const neckBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.08, 12), materials.skin);
        neckBase.position.y = torsoLen/2 + 0.06;
        neckBase.scale.set(1, 1, 0.8);
        torso.add(neckBase);

        // Traps
        const trapHeight = 0.18;
        const trapGeo = new THREE.CylinderGeometry(0.06, 0.12, trapHeight, 8);
        trapGeo.translate(0, -trapHeight/2, 0); 
        
        const createTrap = (isLeft) => {
            const side = isLeft ? 1 : -1;
            const trap = new THREE.Mesh(trapGeo, materials.skin);
            trap.position.set(side * 0.06, torsoLen/2 + 0.08, 0.02); 
            trap.rotation.z = side * -1.1; 
            trap.rotation.x = 0.1; 
            trap.scale.set(1, 1, 0.7);
            return trap;
        };
        torso.add(createTrap(true));
        torso.add(createTrap(false));

        // Pelvis
        const pelvis = new THREE.Group();
        pelvis.position.y = -torsoLen / 2;
        torso.add(pelvis);
        
        const pelvisHeight = 0.14;
        const pelvisGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 0.95, torsoRadiusBottom * 0.55, pelvisHeight, 16);
        pelvisGeo.scale(1, 1, 0.7);
        const pelvisMesh = new THREE.Mesh(pelvisGeo, materials.pants);
        pelvisMesh.position.y = -pelvisHeight / 2;
        pelvis.add(pelvisMesh);

        const crotchGeo = new THREE.SphereGeometry(torsoRadiusBottom * 0.55, 16, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2);
        crotchGeo.scale(1, 0.7, 0.7);
        const crotchMesh = new THREE.Mesh(crotchGeo, materials.pants);
        crotchMesh.position.y = -pelvisHeight;
        pelvis.add(crotchMesh);
        
        // Underwear (Detailed separately to allow toggling)
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

        // Buttocks
        const buttocks = new THREE.Group();
        pelvis.add(buttocks);
        const buttRadius = 0.125;
        const buttGeo = new THREE.SphereGeometry(buttRadius, 16, 16);
        const undieGeo = new THREE.SphereGeometry(buttRadius * 1.04, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);

        [-1, 1].forEach(side => {
            const cheekGroup = new THREE.Group();
            cheekGroup.position.set(side * 0.075, -0.06, -0.11); 
            cheekGroup.rotation.x = 0.2; 
            cheekGroup.rotation.y = side * 0.25; 
            buttocks.add(cheekGroup);

            const cheek = new THREE.Mesh(buttGeo, materials.skin);
            cheek.scale.set(1, 0.95, 0.85);
            cheekGroup.add(cheek);
            arrays.buttockCheeks.push(cheek);

            const undie = new THREE.Mesh(undieGeo, materials.underwear);
            undie.name = 'undie';
            undie.scale.set(1, 0.95, 0.85);
            undie.rotation.z = side * 0.7; 
            undie.rotation.x = 0.2; 
            cheekGroup.add(undie);
        });

        // Female Chest
        const chest = new THREE.Group();
        chest.visible = false; 
        chest.position.set(0, 0.15, 0.12);
        torso.add(chest);
        const breastGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const nippleGeoFem = new THREE.CircleGeometry(0.012, 8);
        const braCups = [];

        [-0.11, 0.11].forEach(x => {
            const b = new THREE.Mesh(breastGeo, materials.shirt);
            b.position.x = x; 
            b.scale.set(1, 0.9, 0.6); 
            b.rotation.y = (x > 0 ? 1 : -1) * 0.15; 
            b.castShadow = true;
            
            const cup = new THREE.Mesh(breastGeo, materials.underwear);
            cup.scale.set(1.03, 1.03, 1.03);
            b.add(cup);
            braCups.push(cup);

            const n = new THREE.Mesh(nippleGeoFem, materials.lip);
            n.position.set(0, 0, 0.13); 
            b.add(n);
            chest.add(b);
        });

        const strapGeo = new THREE.CylinderGeometry(0.27, 0.26, 0.05, 16);
        strapGeo.scale(1, 1, 0.65);
        const braStrap = new THREE.Mesh(strapGeo, materials.underwear);
        braStrap.position.y = 0.15;
        braStrap.scale.set(1.02, 1, 1.02);
        torso.add(braStrap);

        // Male Chest
        const maleChest = new THREE.Group();
        maleChest.visible = true;
        torso.add(maleChest);
        const nippleGeo = new THREE.CircleGeometry(0.012, 8);
        [-1, 1].forEach(side => {
            const n = new THREE.Mesh(nippleGeo, materials.lip);
            n.position.set(side * 0.12, 0.17, 0.16); 
            n.rotation.y = side * 0.4;
            n.rotation.x = -0.05; 
            maleChest.add(n);
        });

        const abGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const abRows = [{ y: 0.02, z: 0.160 }, { y: -0.07, z: 0.151 }, { y: -0.16, z: 0.144 }];
        abRows.forEach((row) => {
             for(let side of [-1, 1]) {
                const ab = new THREE.Mesh(abGeo, materials.skin);
                ab.scale.set(1.2, 0.8, 0.3);
                ab.position.set(side * 0.055, row.y, row.z);
                ab.rotation.y = side * 0.15; 
                ab.rotation.x = -0.05;
                maleChest.add(ab);
            }
        });

        const neckRadius = 0.11;
        const neckHeight = 0.24;
        const neck = new THREE.Mesh(new THREE.CapsuleGeometry(neckRadius, neckHeight, 4, 8), materials.skin);
        neck.position.y = torsoLen + 0.24;
        neck.castShadow = true;
        torsoContainer.add(neck);

        return { hips, torsoContainer, torso, topCap, neckBase, pelvis, underwearBottom, buttocks, chest, braCups, braStrap, maleChest, neck };
    }
}

class HairBuilder {
    static build(parts, config, material) {
        const head = parts.head;
        const existing = head.children.find((c) => c.name === 'HairGroup');
        if (existing) head.remove(existing);
        if (config.hairStyle === 'bald') return;

        const hairGroup = new THREE.Group();
        hairGroup.name = 'HairGroup';
        head.add(hairGroup);
        const headRadius = 0.21;

        if (config.hairStyle === 'crew') {
            const capGeo = new THREE.SphereGeometry(headRadius * 1.025, 32, 16, 0, Math.PI*2, 0, Math.PI * 0.35);
            const pos = capGeo.attributes.position;
            const vec = new THREE.Vector3();
            for(let i=0; i<pos.count; i++) {
                vec.fromBufferAttribute(pos, i);
                if (vec.y > 0.17) vec.y = 0.17 + (vec.y - 0.17) * 0.3;
                if (Math.abs(vec.x) > 0.12) vec.x *= 0.96;
                const noise = (Math.random() - 0.5) * 0.003;
                vec.multiplyScalar(1.0 + noise);
                pos.setXYZ(i, vec.x, vec.y, vec.z);
            }
            capGeo.computeVertexNormals();
            
            const cap = new THREE.Mesh(capGeo, material);
            cap.rotation.x = -0.25; 
            cap.position.y = 0.01;
            cap.castShadow = true;
            hairGroup.add(cap);

            const fadeGeo = new THREE.SphereGeometry(headRadius * 1.005, 32, 8, 0, Math.PI*2, Math.PI * 0.28, Math.PI * 0.22);
            const fade = new THREE.Mesh(fadeGeo, material);
            fade.rotation.x = -0.15;
            hairGroup.add(fade);

            const sbGeo = new THREE.BoxGeometry(0.02, 0.08, 0.035);
            sbGeo.translate(0, -0.04, 0); 

            const createSideburn = (isLeft) => {
                const sb = new THREE.Mesh(sbGeo, material);
                const side = isLeft ? 1 : -1;
                sb.position.set(side * 0.185, 0.02, 0.08); 
                sb.rotation.y = side * 0.1; 
                sb.rotation.z = side * -0.15;
                sb.rotation.x = -0.1;
                return sb;
            };
            hairGroup.add(createSideburn(true));
            hairGroup.add(createSideburn(false));
        }
    }
}

class PlayerMeshBuilder {
    static build(materials) {
        const group = new THREE.Group();
        group.castShadow = true;
        
        const arrays = {
            forefootGroups: [],
            heelGroups: [],
            toeUnits: [],
            irises: [],
            pupils: [],
            eyelids: [],
            rightFingers: [],
            rightThumb: null,
            leftFingers: [],
            leftThumb: null,
            buttockCheeks: []
        };

        const torsoParts = TorsoBuilder.build(materials, arrays);
        group.add(torsoParts.hips);
        const headParts = HeadBuilder.build(materials, arrays);
        torsoParts.neck.add(headParts.head);

        const thighLen = 0.4, shinLen = 0.42, legSpacing = 0.15;

        const rightThigh = MeshUtils.createSegment(0.11, thighLen, materials.pants, 0.085);
        rightThigh.position.set(-legSpacing, 0, 0); 
        torsoParts.hips.add(rightThigh);

        const leftThigh = MeshUtils.createSegment(0.11, thighLen, materials.pants, 0.085);
        leftThigh.position.set(legSpacing, 0, 0); 
        torsoParts.hips.add(leftThigh);

        const rightShin = MeshUtils.createSegment(0.095, shinLen, materials.pants, 0.065);
        rightShin.position.y = -thighLen; 
        rightThigh.add(rightShin);

        const leftShin = MeshUtils.createSegment(0.095, shinLen, materials.pants, 0.065);
        leftShin.position.y = -thighLen; 
        leftThigh.add(leftShin);

        const footOffsetY = -shinLen; 
        const ankleRadius = 0.068;
        const ankleGeo = new THREE.SphereGeometry(ankleRadius, 16, 16);
        
        const rightAnkle = new THREE.Mesh(ankleGeo, materials.boots);
        rightAnkle.position.y = footOffsetY;
        rightAnkle.castShadow = true;
        rightShin.add(rightAnkle);

        const leftAnkle = new THREE.Mesh(ankleGeo, materials.boots);
        leftAnkle.position.y = footOffsetY;
        leftAnkle.castShadow = true;
        leftShin.add(leftAnkle);
        
        const rFoot = FootBuilder.create(materials, false, arrays);
        rFoot.heelGroup.position.y = footOffsetY; 
        rightShin.add(rFoot.heelGroup); 

        const lFoot = FootBuilder.create(materials, true, arrays);
        lFoot.heelGroup.position.y = footOffsetY;
        leftShin.add(lFoot.heelGroup); 

        const upperArmLen = 0.32;
        const lowerArmLen = 0.30;

        const buildArm = () => {
            const armGroup = new THREE.Group();
            const deltRadius = 0.115; 
            const deltGeo = new THREE.SphereGeometry(deltRadius, 16, 16);
            deltGeo.scale(1.0, 1.0, 0.95); 
            const delt = new THREE.Mesh(deltGeo, materials.shirt);
            delt.position.y = 0.0; 
            delt.castShadow = true;
            armGroup.add(delt);

            const upperTopR = 0.085;
            const upperBotR = 0.065; 
            const upperGeo = new THREE.CylinderGeometry(upperTopR, upperBotR, upperArmLen, 12);
            upperGeo.translate(0, -upperArmLen/2, 0);
            const upperMesh = new THREE.Mesh(upperGeo, materials.shirt);
            upperMesh.position.y = 0.02; 
            upperMesh.castShadow = true;
            armGroup.add(upperMesh);

            const elbowPosY = -upperArmLen + 0.02; 
            const foreArmGroup = new THREE.Group();
            foreArmGroup.position.y = elbowPosY;
            armGroup.add(foreArmGroup);

            const elbowRadius = 0.065; 
            const elbowGeo = new THREE.SphereGeometry(elbowRadius, 16, 16);
            const elbow = new THREE.Mesh(elbowGeo, materials.shirt);
            elbow.castShadow = true;
            foreArmGroup.add(elbow);

            const lowerTopR = 0.065; 
            const lowerBotR = 0.028; 
            const lowerGeo = new THREE.CylinderGeometry(lowerTopR, lowerBotR, lowerArmLen, 12);
            lowerGeo.translate(0, -lowerArmLen/2, 0);
            const lowerMesh = new THREE.Mesh(lowerGeo, materials.shirt);
            lowerMesh.castShadow = true;
            lowerMesh.scale.set(1.0, 1, 0.85); 
            foreArmGroup.add(lowerMesh);

            const wristGeo = new THREE.SphereGeometry(lowerBotR, 12, 12);
            wristGeo.scale(1.0, 0.6, 0.8);
            const wrist = new THREE.Mesh(wristGeo, materials.skin);
            wrist.position.y = -lowerArmLen;
            wrist.castShadow = true;
            foreArmGroup.add(wrist);

            return { armGroup, foreArmGroup, wristPosY: -lowerArmLen };
        };

        const rArmBuild = buildArm();
        const rightArm = rArmBuild.armGroup;
        const rightForeArm = rArmBuild.foreArmGroup;
        rightArm.position.set(-0.34, 0.61, 0); 
        torsoParts.torsoContainer.add(rightArm);

        const lArmBuild = buildArm();
        const leftArm = lArmBuild.armGroup;
        const leftForeArm = lArmBuild.foreArmGroup;
        leftArm.position.set(0.34, 0.61, 0);
        torsoParts.torsoContainer.add(leftArm);

        const rightHand = HandBuilder.create(materials, false, arrays);
        rightHand.position.y = rArmBuild.wristPosY; 
        rightHand.rotation.y = -Math.PI / 2; 
        rightForeArm.add(rightHand);
        
        const leftHand = HandBuilder.create(materials, true, arrays);
        leftHand.position.y = lArmBuild.wristPosY; 
        leftHand.rotation.y = Math.PI / 2; 
        leftForeArm.add(leftHand);

        const rightHandMount = new THREE.Group();
        rightHandMount.position.set(0.04, -0.075, 0.035);
        rightHand.add(rightHandMount);

        const rightShoulderMount = new THREE.Group(); rightShoulderMount.position.y = 0.05; rightArm.add(rightShoulderMount);
        const leftShoulderMount = new THREE.Group(); leftShoulderMount.position.y = 0.05; leftArm.add(leftShoulderMount);
        const leftShieldMount = new THREE.Group(); leftShieldMount.position.set(0.06, -0.09, 0); leftShieldMount.rotation.y = Math.PI/2; leftForeArm.add(leftShieldMount);

        const parts = {
            ...torsoParts, ...headParts,
            rightThigh, rightShin, leftThigh, leftShin, rightAnkle, leftAnkle,
            rightArm, rightForeArm, leftArm, leftForeArm, rightHand, leftHand,
            rightHandMount, rightShoulderMount, leftShoulderMount, leftShieldMount
        };

        return { group, parts, arrays };
    }
}

// ==========================================
// ANIMATION
// ==========================================

class ActionAnimators {
    static climb(player, parts, dt, damp) {
        const lerp = THREE.MathUtils.lerp;
        const climbDuration = 0.8;
        const p = Math.min(player.ledgeGrabTime / climbDuration, 1.0);
        
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (p < 0.2) {
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp * 5);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp * 5);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.2, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.2, damp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, damp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.1, damp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.1, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.6, damp);
        } else if (p < 0.55) {
            const pullDamp = damp * 8; 
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.0, pullDamp); 
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -1.0, pullDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0.8, pullDamp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, -0.8, pullDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.2, pullDamp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -2.2, pullDamp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -2.2, pullDamp); 
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.0, pullDamp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.5, pullDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.5, pullDamp);
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.6, pullDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, pullDamp);
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, pullDamp);
        } else {
            const standDamp = damp * 5;
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.1, standDamp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.1, standDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, standDamp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.1, standDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.1, standDamp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.1, standDamp);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, standDamp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, standDamp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, standDamp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, standDamp);
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0, standDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0, standDamp);
        }
    }

    static pickup(player, parts, dt, damp) {
        const bend = Math.sin((player.pickUpTime / 1.2) * Math.PI);
        const lerp = THREE.MathUtils.lerp;
        const pickupDamp = damp * 2;
        const baseHeight = 0.89 * player.config.legScale;

        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - bend * 0.55, pickupDamp);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, bend * 0.4, pickupDamp);
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -bend * 1.2, pickupDamp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -bend * 1.3, pickupDamp);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, bend * 2.2, pickupDamp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, bend * 2.3, pickupDamp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, bend * 0.5, pickupDamp);
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -bend * 0.3, pickupDamp);
        parts.neck.rotation.x = lerp(parts.neck.rotation.x, -bend * 0.3, pickupDamp);
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -bend * 0.8, pickupDamp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -bend * 0.3, pickupDamp);
        parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, pickupDamp);
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -bend * 0.5, pickupDamp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, bend * 0.3, pickupDamp);
        AnimationUtils.playerModelResetFeet(parts, damp);
    }
    
    static interact(player, parts, dt, damp) {
        const p = Math.sin((player.interactTimer / 0.4) * Math.PI);
        const lerp = THREE.MathUtils.lerp;
        parts.head.rotation.x = lerp(parts.head.rotation.x, p * 0.5, damp * 3);
        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -p * 1.2, damp * 2);
    }

    static skinning(player, parts, dt, damp) {
        const t = player.skinningTimer;
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;
        const crouchHeight = baseHeight * 0.45;
        const crouchDamp = damp * 5;

        parts.hips.position.y = lerp(parts.hips.position.y, crouchHeight, crouchDamp);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.8, crouchDamp);
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -2.0, crouchDamp);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 2.2, crouchDamp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -2.0, crouchDamp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.2, crouchDamp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.2, crouchDamp);
        parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.6, crouchDamp);

        const speed = 15;
        const wave1 = Math.sin(t * speed);
        const wave2 = Math.cos(t * speed * 0.8);
        const armBaseX = -0.8;
        const armBaseZ = 0.3;

        parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armBaseX + wave1 * 0.15, crouchDamp);
        parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armBaseZ - 0.2, crouchDamp);
        parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -1.2 + wave2 * 0.2, crouchDamp);
        parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, wave2 * 0.5, crouchDamp);

        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armBaseX - 0.1, crouchDamp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armBaseZ, crouchDamp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.0 + wave1 * 0.05, crouchDamp);

        AnimationUtils.playerModelResetFeet(parts, damp);
    }
}

class LocomotionAnimator {
    animateIdle(player, parts, damp, skipRightArm = false) {
        const t = Date.now() * 0.002;
        this.animateBreathing(player, parts, t, 1.0);

        if (player.isCombatStance) {
            this.animateCombatStance(player, parts, damp, t, skipRightArm);
            return;
        }

        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;
        
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, 0, damp);
        parts.hips.rotation.set(0, 0, 0);
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight + Math.sin(t)*0.005, damp);
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0, damp);
        parts.torsoContainer.rotation.z = lerp(parts.torsoContainer.rotation.z, 0, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, Math.sin(t) * 0.02, damp);
        parts.neck.rotation.x = -Math.sin(t) * 0.02;
        parts.head.rotation.x = 0.1 + Math.sin(t - 1) * 0.02;
        parts.leftThigh.rotation.set(0, 0, 0.12);
        parts.rightThigh.rotation.set(0, 0, -0.12);
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0, damp);
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0, damp);
        
        this.animateArmsIdle(player, parts, damp, t, skipRightArm);
        AnimationUtils.playerModelResetFeet(parts, damp);
    }

    animateCombatStance(player, parts, damp, t, skipRightArm) {
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;
        
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - 0.12, damp);
        parts.hips.position.x = lerp(parts.hips.position.x, 0, damp);
        parts.hips.position.z = lerp(parts.hips.position.z, -0.05, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, -0.7, damp);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.1, damp); 
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);
        parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.6, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.05, damp);
        parts.torsoContainer.rotation.z = lerp(parts.torsoContainer.rotation.z, 0, damp);
        parts.neck.rotation.y = lerp(parts.neck.rotation.y, 0.2, damp);
        parts.head.rotation.y = lerp(parts.head.rotation.y, 0, damp);
        parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -0.7, damp);
        parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, 0.2, damp); 
        parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.8, damp);
        parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0.35, damp);
        parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -0.2, damp); 
        parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.15, damp); 

        this.applyFootRot(parts.leftShin, -0.1); 
        this.applyFootRot(parts.rightShin, -0.5); 

        const breathing = Math.sin(t * 3) * 0.05; 
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.9 + breathing, damp);
        parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, -0.4, damp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, damp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.8, damp); 
        parts.leftHand.rotation.z = lerp(parts.leftHand.rotation.z, -0.2, damp);

        if (!skipRightArm) {
             parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.2 + breathing, damp);
             parts.rightArm.rotation.y = lerp(parts.rightArm.rotation.y, 0.4, damp);
             parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, damp);
             parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.1, damp); 
        }
    }

    animateArmsIdle(player, parts, damp, t, skipRightArm) {
        const lerp = THREE.MathUtils.lerp;
        parts.leftArm.rotation.set(Math.sin(t)*0.03, 0, 0.15);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.15, damp);
        parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI / 2, damp);
        parts.leftHand.rotation.z = lerp(parts.leftHand.rotation.z, 0, damp);

        if (!skipRightArm) {
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
            parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
            parts.rightArm.rotation.set(Math.sin(t + 1)*0.03, 0, -0.15);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.15, damp);
        }
    }

    animateMovement(player, parts, dt, damp, input, skipRightArm = false) {
        const isRunning = input.isRunning;
        const lerp = THREE.MathUtils.lerp;
        const speedMult = isRunning ? 15 : 9;
        player.walkTime += dt * speedMult;
        const t = player.walkTime;
        this.animateBreathing(player, parts, Date.now() * 0.002, isRunning ? 2.5 : 1.5);

        const forward = -input.y;
        const baseHeight = 0.89 * player.config.legScale;
        const bounceAmp = isRunning ? 0.08 : 0.03;
        const bouncePhase = Math.cos(2 * t);
        const yOffset = bouncePhase * bounceAmp;
        const runSquat = isRunning ? 0.05 : 0.0;
        
        parts.hips.position.y = lerp(parts.hips.position.y, baseHeight - runSquat + yOffset, damp * 2);
        const swayAmp = isRunning ? 0.04 : 0.06;
        parts.hips.position.x = lerp(parts.hips.position.x, -Math.sin(t) * swayAmp, damp);
        const twistAmp = isRunning ? 0.3 : 0.15;
        const twist = -Math.sin(t) * twistAmp * Math.sign(forward || 1);
        parts.hips.rotation.y = twist;
        parts.hips.rotation.z = Math.sin(t) * (isRunning ? 0.05 : 0.03);
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, (isRunning ? 0.35 : 0.1) + Math.abs(Math.cos(t)) * 0.05, damp);

        parts.torsoContainer.rotation.y = -twist * 0.8; 
        parts.torsoContainer.rotation.z = -parts.hips.rotation.z * 0.5;
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, isRunning ? 0.1 : 0.02, damp);
        parts.neck.rotation.y = -parts.torsoContainer.rotation.y * 0.5;
        parts.head.rotation.x = lerp(parts.head.rotation.x, 0.1 - Math.abs(Math.cos(t)) * 0.05, damp);

        const calcLeg = (offset) => {
            const phase = t + offset;
            const stride = Math.sin(phase);
            const cos = Math.cos(phase);
            const dirMult = forward >= -0.1 ? 1 : -1;
            const thighRange = isRunning ? 1.1 : 0.55;
            let thighRot = -stride * thighRange * dirMult;
            const isSwing = cos * dirMult > 0;
            let shinRot = 0;
            let footRot = 0;

            if (isSwing) {
                const swingBend = Math.max(0, cos * dirMult);
                shinRot = swingBend * (isRunning ? 2.4 : 1.4);
                thighRot -= swingBend * (isRunning ? 0.8 : 0.3);
                footRot = -0.3 * swingBend;
            } else {
                const loading = Math.max(0, Math.sin(phase - 0.5)); 
                if (!isRunning) shinRot = loading * 0.1;
                footRot = stride * (stride * dirMult > 0 ? -0.4 : -0.8);
            }
            return { thigh: thighRot, shin: shinRot, foot: footRot };
        };

        const left = calcLeg(0);
        const right = calcLeg(Math.PI);
        parts.leftThigh.rotation.x = left.thigh;
        parts.leftShin.rotation.x = left.shin;
        this.applyFootRot(parts.leftShin, left.foot);
        parts.rightThigh.rotation.x = right.thigh;
        parts.rightShin.rotation.x = right.shin;
        this.applyFootRot(parts.rightShin, right.foot);

        const armAmp = isRunning ? 1.4 : 0.6;
        parts.leftArm.rotation.x = Math.sin(t) * armAmp;
        parts.leftArm.rotation.z = 0.15;
        parts.leftForeArm.rotation.x = isRunning ? -2.0 : -0.3;
        parts.leftHand.rotation.y = lerp(parts.leftHand.rotation.y, Math.PI / 2, damp);

        if (!skipRightArm) {
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI / 2, damp);
            parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
            parts.rightArm.rotation.x = Math.sin(t + Math.PI) * armAmp;
            parts.rightArm.rotation.z = -0.15;
            parts.rightForeArm.rotation.x = isRunning ? -2.0 : -0.3;
        }
    }

    animateJump(player, parts, dt, damp, input, skipRightArm = false) {
        const lerp = THREE.MathUtils.lerp;
        const vel = player.jumpVelocity;
        const isMoving = Math.abs(input.x) > 0 || Math.abs(input.y) > 0;
        this.animateBreathing(player, parts, Date.now() * 0.002, 2.0);
        AnimationUtils.playerModelResetFeet(parts, damp);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, 0, damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, 0, damp);

        if (vel > 0) {
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.4, damp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -2.8, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.5, damp);

            if (!skipRightArm) {
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -2.8, damp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.2, damp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.5, damp);
            }

            if (isMoving) {
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.8, damp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.0, damp); 
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0.5, damp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.2, damp);
            } else {
                parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -1.5, damp);
                parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 2.2, damp);
                parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, -1.5, damp);
                parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 2.2, damp);
            }
        } else {
            parts.hips.rotation.x = lerp(parts.hips.rotation.x, 0.1, damp);
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.8, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.8, damp); 
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.2, damp);

            if (!skipRightArm) {
                parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, damp);
                parts.rightHand.rotation.z = lerp(parts.rightHand.rotation.z, 0, damp);
                parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.8, damp);
                parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.8, damp);
                parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, damp);
            }

            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, 0, damp);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp);
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, 0, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp);
        }
    }

    applyFootRot(shin, rot) {
        shin.children.forEach((c) => {
            if (c.name.includes('forefoot') || c.name.includes('heel') || c.name.includes('foot_anchor')) {
                c.rotation.x = rot;
            }
        });
    }

    animateBreathing(player, parts, t, intensity) {
        const breathPhase = Math.sin(t * 1.5);
        const chestExpansion = 1.0 + (breathPhase * 0.04 * intensity);
        if (parts.chest) parts.chest.scale.setScalar(chestExpansion);
        if (parts.maleChest) parts.maleChest.scale.set(chestExpansion, chestExpansion, 1.0 + (breathPhase * 0.06 * intensity));
        if (parts.topCap) {
             const shoulderBreath = 1.0 + (breathPhase * 0.015 * intensity);
             parts.topCap.scale.multiplyScalar(shoulderBreath);
             parts.topCap.position.y = 0.28 + (breathPhase * 0.005 * intensity);
        }
    }
}

class StatusAnimator {
    constructor() {
        this._tempQuat = new THREE.Quaternion();
        this._localDown = new THREE.Vector3(0, -1, 0);
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
    }

    animateDeath(player, parts, dt, damp) {
        const dv = player.deathVariation;
        const lerp = THREE.MathUtils.lerp;
        const t = player.deathTime;
        const impactTime = 0.4;
        const isImpacted = t > impactTime;
        const settleTime = Math.max(0, t - impactTime);
        const settleAlpha = Math.min(settleTime / 0.8, 1.0); 
        const easeSettle = settleAlpha * (2 - settleAlpha); 
        
        const dropProgress = Math.min(t / impactTime, 1.0);
        const gravityCurve = dropProgress * dropProgress; 
        
        const baseHeight = 0.89 * player.config.legScale;
        const groundHeight = 0.22 * player.config.legScale;
        
        let targetY = lerp(baseHeight, groundHeight, gravityCurve);
        if (isImpacted) {
            targetY += Math.max(0, Math.sin((t - impactTime) * 15) * 0.05 * Math.exp(-(t - impactTime) * 5));
        }

        parts.hips.position.y = lerp(parts.hips.position.y, targetY, damp * 3.0);
        
        const fallDirection = dv.fallDir;
        const targetRotX = (Math.PI / 2.1) * fallDirection; 
        const rotSpeed = isImpacted ? damp * 2.0 : damp * 0.8 + (gravityCurve * 0.5); 
        parts.hips.rotation.x = lerp(parts.hips.rotation.x, targetRotX, rotSpeed);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, dv.stumbleDir * 0.5, rotSpeed);
        parts.hips.rotation.y = lerp(parts.hips.rotation.y, dv.twist, rotSpeed);
        parts.torsoContainer.rotation.set(0, 0, 0);

        this._tempQuat.setFromEuler(parts.hips.rotation);
        const invHipQ = this._tempQuat.invert();
        const localG = this._localDown.clone().applyQuaternion(invHipQ);
        const looseness = lerp(0.3, 1.0, easeSettle);
        const gravBiasSwing = -localG.z * looseness * 1.5; 
        const gravBiasSpread = localG.x * looseness * 1.5;

        if (fallDirection > 0) { 
            const legBend = lerp(0.2, 0.0, easeSettle); 
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legBend + gravBiasSwing, damp * 2);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, -legBend + gravBiasSwing, damp * 2);
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -gravBiasSpread + 0.1, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -gravBiasSpread - 0.1, damp);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, 0.1, damp * 2);
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, 0.1, damp * 2);
            
            const armLag = Math.max(0, 1.0 - dropProgress); 
            const armTargetX = lerp(-2.8, -3.0, easeSettle);
            const armTargetZ = lerp(0.8, 1.2, easeSettle); 

            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armTargetX + (armLag * 1.5) + gravBiasSwing, damp * 2);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armTargetX + (armLag * 1.5) + gravBiasSwing, damp * 2);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armTargetZ - gravBiasSpread, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armTargetZ - gravBiasSpread, damp);

            const headTarget = isImpacted ? -0.4 : 0.5; 
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, headTarget, damp * (isImpacted ? 4 : 1));
            parts.head.rotation.y = lerp(parts.head.rotation.y, dv.stumbleDir, damp);
            parts.head.rotation.z = lerp(parts.head.rotation.z, -localG.x * 0.5, damp);

        } else {
            const legKick = Math.max(0, Math.sin(dropProgress * Math.PI)) * 0.5;
            const legBase = lerp(-0.5, 0.1, easeSettle); 
            parts.leftThigh.rotation.x = lerp(parts.leftThigh.rotation.x, legBase - legKick + gravBiasSwing, damp * 2);
            parts.rightThigh.rotation.x = lerp(parts.rightThigh.rotation.x, legBase - legKick - 0.1 + gravBiasSwing, damp * 2);
            parts.leftThigh.rotation.z = lerp(parts.leftThigh.rotation.z, -gravBiasSpread + 0.1, damp);
            parts.rightThigh.rotation.z = lerp(parts.rightThigh.rotation.z, -gravBiasSpread - 0.1, damp);
            const shinTarget = lerp(1.5, 0.2, easeSettle);
            parts.leftShin.rotation.x = lerp(parts.leftShin.rotation.x, shinTarget, damp); 
            parts.rightShin.rotation.x = lerp(parts.rightShin.rotation.x, shinTarget * 0.3, damp); 

            const armTargetX = lerp(-0.5, -0.05, easeSettle);
            const armTargetZ = lerp(1.2, 1.5, easeSettle); 
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, armTargetX + gravBiasSwing, damp);
            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, armTargetX + gravBiasSwing, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, armTargetZ - gravBiasSpread, damp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -armTargetZ - gravBiasSpread, damp);
            
            const headTarget = isImpacted ? 0.6 : -0.4; 
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, headTarget, damp * (isImpacted ? 3 : 1));
            parts.head.rotation.z = lerp(parts.head.rotation.z, -localG.x * 0.5, damp);
        }
        AnimationUtils.playerModelResetFeet(parts, damp);
    }

    animateRagdoll(player, parts, dt) {
        const recoveryAlpha = player.isDragged ? 1.0 : (player.recoverTimer / 2.0);
        const dragVel = this._tempVec1.copy(player.dragVelocity);
        if (!player.isDragged) dragVel.multiplyScalar(recoveryAlpha);
        
        const invQuat = this._tempQuat.copy(player.mesh.quaternion).invert();
        const localDrag = dragVel.applyQuaternion(invQuat);
        const localDown = this._tempVec2.copy(this._localDown).applyQuaternion(invQuat);
        const gravStr = 1.2 * recoveryAlpha;
        const damp = 5 * dt;
        const lerp = THREE.MathUtils.lerp;
        const baseHeight = 0.89 * player.config.legScale;

        parts.hips.rotation.x = lerp(parts.hips.rotation.x, -localDrag.z * 1.5 + (localDown.z * gravStr * 0.5), damp);
        parts.hips.rotation.z = lerp(parts.hips.rotation.z, localDrag.x * 1.5 - (localDown.x * gravStr * 0.5), damp);
        
        const targetHipY = player.isDragged ? (player.draggedPartName === 'head' ? 0.5 : 0.9) : baseHeight;
        parts.hips.position.y = lerp(parts.hips.position.y, targetHipY, damp);
        parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -parts.hips.rotation.x * 0.5, damp);
        parts.neck.rotation.set(0,0,0);
    }
}

export class CharacterAnimator {
    constructor() {
        this.locomotion = new LocomotionAnimator();
        this.status = new StatusAnimator();
    }

    animate(player, dt, isMoving, input) {
        const parts = player.model.parts;
        const damp = 10 * dt;

        this.animateFace(player, dt);

        if (player.isDragged || player.recoverTimer > 0) {
            this.status.animateRagdoll(player, parts, dt);
            return;
        } 
        if (player.isDead) {
            this.status.animateDeath(player, parts, dt, damp);
            return;
        } 
        if (player.isLedgeGrabbing) {
            ActionAnimators.climb(player, parts, dt, damp);
            return;
        }
        if (player.isPickingUp) {
            ActionAnimators.pickup(player, parts, dt, damp);
            return;
        }
        if (player.isSkinning) {
            ActionAnimators.skinning(player, parts, dt, damp);
            return;
        }

        const isRightArmAction = player.isPunch || player.isAxeSwing || player.isInteracting;

        if (player.isJumping) {
            this.locomotion.animateJump(player, parts, dt, damp, input, isRightArmAction);
        } else if (isMoving) {
            this.locomotion.animateMovement(player, parts, dt, damp, input, isRightArmAction);
        } else {
            this.locomotion.animateIdle(player, parts, damp, isRightArmAction);
        }

        if (player.isInteracting) {
            ActionAnimators.interact(player, parts, dt, damp);
        }
    }

    animateFace(player, dt) {
        player.blinkTimer += dt;
        const blinkInterval = 6.0;
        const blinkDur = 0.15;
        if (player.blinkTimer > blinkInterval) player.isBlinking = true;
        if (player.isBlinking) {
            if (player.blinkTimer - blinkInterval > blinkDur) {
                player.isBlinking = false;
                player.blinkTimer = 0;
            }
        }
        const lerp = THREE.MathUtils.lerp;
        let blinkAlpha = 0;
        if (player.isBlinking) {
            const progress = (player.blinkTimer - blinkInterval) / blinkDur;
            blinkAlpha = Math.sin(progress * Math.PI); 
        }
        const eyelids = player.model.eyelids; 
        if (eyelids && eyelids.length === 4) {
            eyelids[0].rotation.x = lerp(-0.8, -0.1, blinkAlpha);
            eyelids[1].rotation.x = lerp(0.8, 0.1, blinkAlpha);
            eyelids[2].rotation.x = lerp(-0.8, -0.1, blinkAlpha);
            eyelids[3].rotation.x = lerp(0.8, 0.1, blinkAlpha);
        }
    }
}

// ==========================================
// MAIN MODEL CLASS
// ==========================================

export class CharacterModel {
    constructor(config) {
        this.group = new THREE.Group();
        this.parts = {};
        this.materials = new PlayerMaterials(config);
        
        const build = PlayerMeshBuilder.build(this.materials);
        this.group = build.group;
        this.parts = build.parts;
        
        // Expose array lists for easy external access
        this.forefootGroups = build.arrays.forefootGroups;
        this.heelGroups = build.arrays.heelGroups;
        this.toeUnits = build.arrays.toeUnits;
        this.irises = build.arrays.irises;
        this.pupils = build.arrays.pupils;
        this.eyelids = build.arrays.eyelids;
        this.rightFingers = build.arrays.rightFingers;
        this.rightThumb = build.arrays.rightThumb;
        this.leftFingers = build.arrays.leftFingers;
        this.leftThumb = build.arrays.leftThumb;
        this.buttockCheeks = build.arrays.buttockCheeks;

        // Initialize hair
        this.lastHairHash = '';
        this.updateHair(config);
    }

    applyOutfit(outfit, skinColor) {
        this.materials.applyOutfit(outfit, skinColor);
    }

    updateHair(config) {
        const hash = `${config.hairStyle}_${config.headScale}`; 
        if (hash === this.lastHairHash) return;
        this.lastHairHash = hash;
        HairBuilder.build(this.parts, config, this.materials.hair);
    }

    sync(config, isCombatStance = false) {
        const lerp = THREE.MathUtils.lerp;
        const damp = 0.15; 

        this.materials.sync(config);
        this.applyOutfit(config.outfit, config.skinColor);
        
        const isFemale = config.bodyType === 'female';
        const isNaked = config.outfit === 'naked';
        const isNude = config.outfit === 'nude';
        const isClothed = !isNaked && !isNude;

        // Body Proportions
        const tW = config.torsoWidth;
        const tH = config.torsoHeight;
        this.parts.torsoContainer.scale.set(tW, tH, tW);

        let hipScale = 1.0, shoulderScale = 1.0, baseLegSpacing = 0.12;

        if (isFemale) {
            shoulderScale = 0.85; hipScale = 1.15; baseLegSpacing = 0.14; 
            if (this.parts.buttocks) {
                this.parts.buttocks.visible = true;
                this.parts.buttocks.scale.setScalar(config.buttScale);
            }
            this.parts.chest.visible = true;
            this.parts.maleChest.visible = false;
        } else {
            shoulderScale = 1.0; hipScale = 1.0; baseLegSpacing = 0.12;
            if (this.parts.buttocks) this.parts.buttocks.visible = false; 
            this.parts.chest.visible = false;
            this.parts.maleChest.visible = true;
        }

        this.parts.topCap.scale.set(shoulderScale, 0.8, shoulderScale);
        this.parts.pelvis.scale.set(hipScale, 1, hipScale);

        const legX = baseLegSpacing * tW; 
        this.parts.leftThigh.position.x = legX;
        this.parts.rightThigh.position.x = -legX;

        const aS = config.armScale;
        this.parts.rightArm.scale.set(aS/tW, aS/tH, aS/tW);
        this.parts.leftArm.scale.set(aS/tW, aS/tH, aS/tW);

        const lS = config.legScale;
        this.parts.rightThigh.scale.setScalar(lS);
        this.parts.leftThigh.scale.setScalar(lS);

        const nT = config.neckThickness;
        const nH = config.neckHeight;
        if (this.parts.neck) {
            this.parts.neck.scale.set(nT, nH, nT);
            this.parts.neck.position.y = 0.70 + (0.12 * nH);
        }
        if (this.parts.neckBase) this.parts.neckBase.scale.set(nT, 1, nT);

        const hS = config.headScale;
        this.parts.head.scale.set(hS / (tW*nT || 1), hS / (tH*nH || 1), hS / (tW*nT || 1));

        if (this.parts.buttocks && this.buttockCheeks.length > 0) {
            this.parts.buttocks.children.forEach((container, i) => {
                const cheek = this.buttockCheeks[i];
                const undie = container.children.find(c => c.name === 'undie');
                if (isClothed) {
                    cheek.material = this.materials.pants;
                    if (undie) undie.visible = false;
                } else {
                    cheek.material = this.materials.skin;
                    if (undie) undie.visible = isNaked; 
                }
            });
        }
        
        if (this.parts.underwearBottom) this.parts.underwearBottom.visible = isNaked;
        const showBra = isNaked && isFemale;
        if (this.parts.braStrap) this.parts.braStrap.visible = showBra;
        if (this.parts.braCups) this.parts.braCups.forEach(c => c.visible = showBra);

        this.parts.jaw.scale.setScalar(config.chinSize);
        this.parts.jaw.position.y = -0.05 + config.chinHeight;
        this.parts.jawMesh.scale.y = 0.45 * config.chinLength;
        this.parts.jawMesh.position.z = 0.09 + config.chinForward;
        
        this.irises.forEach(i => i.scale.setScalar(config.irisScale));
        this.pupils.forEach(p => p.scale.setScalar(config.pupilScale));
        this.heelGroups.forEach(hg => { hg.scale.setScalar(config.heelScale); hg.scale.y *= config.heelHeight; });
        this.forefootGroups.forEach(fg => fg.scale.set(config.footWidth, 1, config.footLength));
        this.toeUnits.forEach(u => {
            if (u.userData.initialX !== undefined) {
                u.position.x = u.userData.initialX * config.toeSpread;
            }
        });

        const isHolding = !!config.selectedItem;
        const updateHand = (fingers, thumb, isLeft) => {
            const shouldFist = isLeft ? isCombatStance : (isHolding || isCombatStance);
            const baseCurl = shouldFist ? 1.6 : 0.1;
            fingers.forEach((fGroup, i) => {
                 const curl = baseCurl + (shouldFist ? i * 0.1 : i * 0.05);
                 const prox = fGroup.children.find(c => c.name === 'proximal');
                 if (prox) {
                     prox.rotation.x = lerp(prox.rotation.x, curl, damp);
                     const dist = prox.children.find(c => c.name === 'distal');
                     if (dist) dist.rotation.x = lerp(dist.rotation.x, curl * 1.1, damp);
                 }
            });
            if (thumb) {
                const prox = thumb.children.find(c => c.name === 'proximal');
                if (prox) {
                     prox.rotation.x = lerp(prox.rotation.x, shouldFist ? 0.6 : 0.1, damp);
                     const tZBase = shouldFist ? -0.2 : 0;
                     prox.rotation.z = lerp(prox.rotation.z, isLeft ? -tZBase : tZBase, damp); 
                     const dist = prox.children.find(c => c.name === 'distal');
                     if (dist) dist.rotation.x = lerp(dist.rotation.x, shouldFist ? 1.2 : 0.1, damp);
                }
            }
        };

        updateHand(this.rightFingers, this.rightThumb, false);
        updateHand(this.leftFingers, this.leftThumb, true);

        this.updateHair(config);
    }
}