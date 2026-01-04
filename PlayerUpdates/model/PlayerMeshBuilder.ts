import * as THREE from 'three';
import { PlayerMaterials } from './PlayerMaterials';

export class PlayerMeshBuilder {
    static build(materials: PlayerMaterials) {
        const group = new THREE.Group();
        group.castShadow = true;
        const parts: any = {};
        
        const forefootGroups: THREE.Group[] = [];
        const heelGroups: THREE.Group[] = [];
        const toeUnits: THREE.Group[] = [];
        const irises: THREE.Mesh[] = [];
        const pupils: THREE.Mesh[] = [];
        const rightFingers: THREE.Group[] = [];
        let rightThumb: THREE.Group | null = null;

        // Helpers
        const createSegment = (radius: number, length: number, segMaterial: THREE.Material, radiusBottom: number = radius) => {
            const container = new THREE.Group();
            const topJointGeo = new THREE.SphereGeometry(radius, 12, 12);
            const topJoint = new THREE.Mesh(topJointGeo, segMaterial);
            topJoint.castShadow = true;
            container.add(topJoint);

            const geo = new THREE.CylinderGeometry(radius, radiusBottom, length, 12, 1);
            const mesh = new THREE.Mesh(geo, segMaterial);
            mesh.position.y = -length / 2;
            mesh.castShadow = true;
            container.add(mesh);

            const botJointGeo = new THREE.SphereGeometry(radiusBottom, 12, 12);
            const botJoint = new THREE.Mesh(botJointGeo, segMaterial);
            botJoint.position.y = -length;
            botJoint.castShadow = true;
            container.add(botJoint);
            return container;
        };

        const createFootParts = (isLeftFoot: boolean) => {
            const footMat = materials.boots;
            const footY = -0.06;
            const rBack = 0.08, len = 0.22;
            const heelZ = 0.08 - len/2;
            const heelPos = new THREE.Vector3(0, footY, heelZ);

            const heelGroup = new THREE.Group();
            heelGroup.name = (isLeftFoot ? 'left' : 'right') + '_heel';
            heelGroup.position.copy(heelPos);
            heelGroup.position.y += 0.05; 
            const heelGeo = new THREE.CylinderGeometry(rBack * 0.7, rBack, rBack * 1.8, 6);
            const heelMesh = new THREE.Mesh(heelGeo, footMat);
            heelMesh.rotation.x = 0.1; 
            heelMesh.castShadow = true;
            heelGroup.add(heelMesh);
            heelGroups.push(heelGroup);

            const forefootGroup = new THREE.Group();
            forefootGroup.name = (isLeftFoot ? 'left' : 'right') + '_forefoot';
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
                toeUnits.push(toeUnit);
                
                const toe = new THREE.Mesh(toeGeo, footMat);
                toe.position.set(0, localToePos.y, localToePos.z);
                toe.rotation.x = Math.PI / 2 + 0.1;
                toe.rotation.y = (i - 2) * 0.12; 
                toe.castShadow = true;
                toeUnit.add(toe);

                const bridgeStart = new THREE.Vector3(localToePos.x * 0.6, 0, 0); 
                const bridgeVec = new THREE.Vector3().subVectors(localToePos, bridgeStart);
                const bridgeLen = bridgeVec.length();
                const bridgeGeo = new THREE.CylinderGeometry(toeR * 1.1, rBack * 0.8, bridgeLen, 8);
                const bridge = new THREE.Mesh(bridgeGeo, footMat);
                const mid = new THREE.Vector3().addVectors(bridgeStart, localToePos).multiplyScalar(0.5);
                bridge.position.copy(mid);
                bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bridgeVec.clone().normalize());
                bridge.castShadow = true;
                forefootGroup.add(bridge);
            }
            forefootGroups.push(forefootGroup);
            return { heelGroup, forefootGroup };
        };

        const createHand = (isLeftHand: boolean) => {
            const hand = new THREE.Group();
            const handMat = materials.skin;
            
            // Palm
            const pR = 0.055, pL = 0.04;
            const pGeo = new THREE.CapsuleGeometry(pR, pL, 4, 8);
            const palm = new THREE.Mesh(pGeo, handMat);
            palm.rotation.z = Math.PI / 2;
            palm.scale.set(1.5, 1, 1);
            palm.position.y = -0.06; 
            palm.castShadow = true;
            hand.add(palm);

            const fR = 0.02, fL = 0.05;
            const fGeo = new THREE.CapsuleGeometry(fR, fL, 4, 8);
            const knuckleY = -0.08; 

            // Fingers
            for(let i=0; i<4; i++) {
                const fingerGroup = new THREE.Group();
                fingerGroup.position.set((i-1.5)*0.032, knuckleY, 0);
                
                const f = new THREE.Mesh(fGeo, handMat);
                f.position.y = -fL/2;
                f.castShadow = true;
                fingerGroup.add(f);
                hand.add(fingerGroup);
                
                if (!isLeftHand) rightFingers.push(fingerGroup);
            }

            // Thumb
            const thumbGroup = new THREE.Group();
            const side = isLeftHand ? -1 : 1; 
            thumbGroup.position.set(0.06 * side, knuckleY + 0.02, 0);
            thumbGroup.rotation.z = -(Math.PI / 4) * side;

            const thumb = new THREE.Mesh(fGeo, handMat);
            thumb.position.y = -fL/2;
            thumb.castShadow = true;
            thumbGroup.add(thumb);
            hand.add(thumbGroup);

            if (!isLeftHand) rightThumb = thumbGroup;

            return hand;
        };

        // --- Build Hierarchy ---

        parts.hips = new THREE.Group();
        parts.hips.position.y = 1.0; 
        group.add(parts.hips);

        const torsoLen = 0.45;
        parts.torsoContainer = new THREE.Group();
        parts.hips.add(parts.torsoContainer);

        const torsoRadiusTop = 0.28, torsoRadiusBottom = 0.22;
        parts.torso = new THREE.Mesh(new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoLen, 16), materials.shirt); 
        parts.torso.position.y = torsoLen / 2 + 0.1; 
        parts.torso.castShadow = true;
        parts.torsoContainer.add(parts.torso);

        parts.topCap = new THREE.Mesh(new THREE.SphereGeometry(torsoRadiusTop, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.shirt);
        parts.topCap.position.y = torsoLen / 2;
        parts.torso.add(parts.topCap);

        parts.botCap = new THREE.Mesh(new THREE.SphereGeometry(torsoRadiusBottom, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), materials.shirt);
        parts.botCap.position.y = -torsoLen / 2;
        parts.torso.add(parts.botCap);

        parts.chest = new THREE.Group();
        parts.chest.visible = false; 
        parts.chest.position.set(0, 0.1, 0.18);
        parts.torso.add(parts.chest);
        const breastGeo = new THREE.SphereGeometry(0.13, 16, 16);
        [-0.11, 0.11].forEach(x => {
            const b = new THREE.Mesh(breastGeo, materials.shirt);
            b.position.x = x; b.scale.set(1, 0.9, 0.8); b.castShadow = true;
            parts.chest.add(b);
        });

        const neckRadius = 0.11;
        const neckHeight = 0.24;
        parts.neck = new THREE.Mesh(new THREE.CapsuleGeometry(neckRadius, neckHeight, 4, 8), materials.skin);
        parts.neck.position.y = torsoLen + 0.24;
        parts.neck.castShadow = true;
        parts.torsoContainer.add(parts.neck);
        
        const headRadius = 0.21;
        const headGeo = new THREE.SphereGeometry(headRadius, 64, 64);
        const posAttribute = headGeo.attributes.position;
        const vertex = new THREE.Vector3();
        const leftEyeCenter = new THREE.Vector3(0.09, -0.015, headRadius * 0.92);
        const rightEyeCenter = new THREE.Vector3(-0.09, -0.015, headRadius * 0.92);
        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            const distL = vertex.distanceTo(leftEyeCenter);
            const distR = vertex.distanceTo(rightEyeCenter);
            if (distL < 0.065) {
                const f = Math.cos((distL / 0.065) * Math.PI * 0.5); 
                vertex.z -= f * 0.025; vertex.y += f * 0.012; 
            }
            if (distR < 0.065) {
                const f = Math.cos((distR / 0.065) * Math.PI * 0.5);
                vertex.z -= f * 0.025; vertex.y += f * 0.012;
            }
            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        headGeo.computeVertexNormals();
        
        parts.head = new THREE.Mesh(headGeo, materials.skin);
        parts.head.position.y = 0.32;
        parts.head.castShadow = true;
        parts.neck.add(parts.head);
        
        parts.headMount = new THREE.Group();
        parts.head.add(parts.headMount);

        parts.jaw = new THREE.Group();
        parts.jaw.position.set(0, -0.05, 0.02); 
        parts.head.add(parts.jaw);
        parts.jawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), materials.skin);
        parts.jawMesh.scale.set(0.7, 0.45, 0.85);
        parts.jawMesh.position.set(0, -0.105, 0.09); 
        parts.jawMesh.rotation.x = 0.15;
        parts.jawMesh.castShadow = true;
        parts.jaw.add(parts.jawMesh);

        parts.faceGroup = new THREE.Group();
        parts.head.add(parts.faceGroup);

        const eyeRadius = 0.045;
        for (let side of [-1, 1]) {
            const eyeContainer = new THREE.Group();
            eyeContainer.position.set(side * 0.09, -0.02, 0.162);
            parts.faceGroup.add(eyeContainer);
            const eyeball = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 32, 32), materials.sclera);
            eyeball.scale.set(1.1, 1, 0.8); eyeContainer.add(eyeball);
            const iris = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius * 0.65, 16), materials.iris);
            iris.position.z = eyeRadius * 1.02; eyeball.add(iris); irises.push(iris);
            const pupil = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius * 0.25, 16), materials.pupil);
            pupil.position.z = 0.002; iris.add(pupil); pupils.push(pupil);
        }

        const nose = new THREE.Group();
        nose.position.set(0, -0.06, 0.198); parts.faceGroup.add(nose);
        const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.06, 8), materials.skin);
        bridge.rotation.x = -0.4; bridge.position.y = 0.02; nose.add(bridge);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), materials.skin);
        tip.position.set(0, -0.01, 0.02); nose.add(tip);
        [-1, 1].forEach(s => {
            const ala = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), materials.skin);
            ala.position.set(s * 0.02, -0.015, 0.01); ala.scale.set(1.2, 0.8, 1); nose.add(ala);
        });

        const mouth = new THREE.Group(); mouth.position.set(0, -0.105, 0.19); parts.faceGroup.add(mouth);
        const lipC = (pts: THREE.Vector3[], r: number) => {
            const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, r, 8, false), materials.lip);
            tube.scale.set(1, 1, 0.5); tube.rotation.x = -0.2; tube.castShadow = true; return tube;
        };
        mouth.add(lipC([new THREE.Vector3(-0.035, -0.002, 0), new THREE.Vector3(0, 0.004, 0.005), new THREE.Vector3(0.035, -0.002, 0)], 0.006));
        mouth.add(lipC([new THREE.Vector3(-0.035, 0, 0), new THREE.Vector3(0, -0.01, 0.008), new THREE.Vector3(0.035, 0, 0)], 0.007));

        const limbRadius = 0.1, thighLen = 0.4, shinLen = 0.4, armLen = 0.35;
        parts.rightThigh = createSegment(limbRadius, thighLen, materials.pants);
        parts.rightThigh.position.set(-0.12, 0, 0); parts.hips.add(parts.rightThigh);
        parts.rightShin = createSegment(limbRadius, shinLen, materials.pants);
        parts.rightShin.position.y = -thighLen; parts.rightThigh.add(parts.rightShin);

        parts.leftThigh = createSegment(limbRadius, thighLen, materials.pants);
        parts.leftThigh.position.set(0.12, 0, 0); parts.hips.add(parts.leftThigh);
        parts.leftShin = createSegment(limbRadius, shinLen, materials.pants);
        parts.leftShin.position.y = -thighLen; parts.leftThigh.add(parts.leftShin);

        const rFoot = createFootParts(false); const lFoot = createFootParts(true);
        const footOffsetY = -shinLen - 0.05;
        rFoot.heelGroup.position.y += footOffsetY; rFoot.forefootGroup.position.y += footOffsetY;
        parts.rightShin.add(rFoot.heelGroup); parts.rightShin.add(rFoot.forefootGroup);
        lFoot.heelGroup.position.y += footOffsetY; lFoot.forefootGroup.position.y += footOffsetY;
        parts.leftShin.add(lFoot.heelGroup); parts.leftShin.add(lFoot.forefootGroup);

        parts.rightArm = createSegment(limbRadius, armLen, materials.shirt, 0.08);
        parts.rightArm.position.set(-0.35, 0.63, 0); parts.torsoContainer.add(parts.rightArm);
        parts.rightForeArm = createSegment(0.08, armLen * 0.5, materials.shirt, 0.05);
        parts.rightForeArm.position.y = -armLen; parts.rightArm.add(parts.rightForeArm);

        parts.leftArm = createSegment(limbRadius, armLen, materials.shirt, 0.08);
        parts.leftArm.position.set(0.35, 0.63, 0); parts.torsoContainer.add(parts.leftArm);
        parts.leftForeArm = createSegment(0.08, armLen * 0.5, materials.shirt, 0.05);
        parts.leftForeArm.position.y = -armLen; parts.leftArm.add(parts.leftForeArm);

        parts.rightHand = createHand(false); parts.rightHand.position.y = -armLen * 0.5; parts.rightHand.rotation.y = -Math.PI / 2; parts.rightForeArm.add(parts.rightHand);
        parts.leftHand = createHand(true); parts.leftHand.position.y = -armLen * 0.5; parts.leftHand.rotation.y = Math.PI / 2; parts.leftForeArm.add(parts.leftHand);

        // Right Hand Mount for Tools - positioned to come out the front (knuckles)
        parts.rightHandMount = new THREE.Group();
        parts.rightHandMount.position.set(0, -0.08, 0);
        parts.rightHand.add(parts.rightHandMount);

        parts.rightShoulderMount = new THREE.Group(); parts.rightShoulderMount.position.y = 0.05; parts.rightArm.add(parts.rightShoulderMount);
        parts.leftShoulderMount = new THREE.Group(); parts.leftShoulderMount.position.y = 0.05; parts.leftArm.add(parts.leftShoulderMount);
        parts.leftShieldMount = new THREE.Group(); parts.leftShieldMount.position.set(0.06, -0.09, 0); parts.leftShieldMount.rotation.y = Math.PI/2; parts.leftForeArm.add(parts.leftShieldMount);

        return {
            group,
            parts,
            arrays: {
                forefootGroups,
                heelGroups,
                toeUnits,
                irises,
                pupils,
                rightFingers,
                rightThumb
            }
        };
    }
}