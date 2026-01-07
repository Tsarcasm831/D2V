import * as THREE from 'three';
import { TorsoBuilder } from './TorsoBuilder.js';
import { HeadBuilder } from './HeadBuilder.js';
import { HandBuilder } from './HandBuilder.js';
import { FootBuilder } from './FootBuilder.js';
import { createSegment } from './MeshUtils.js';

export class PlayerMeshBuilder {
    static build(materials, config = {}) {
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
            buttockCheeks: []
        };

        const isNude = config.outfit === 'nude' || config.outfit === 'naked';

        // 1. Torso & Hips
        const torsoParts = TorsoBuilder.build(materials, arrays, isNude);
        group.add(torsoParts.hips);
        
        // 2. Head
        const headParts = HeadBuilder.build(materials, arrays);
        torsoParts.neck.add(headParts.head);

        // 3. Limbs (Legs)
        const thighLen = 0.4;
        const shinLen = 0.42;
        const legSpacing = 0.15;
        const legMat = isNude ? materials.skin : materials.pants;

        const rightThigh = createSegment(0.11, thighLen, legMat, 0.085);
        rightThigh.position.set(-legSpacing, 0, 0); 
        torsoParts.hips.add(rightThigh);

        const leftThigh = createSegment(0.11, thighLen, legMat, 0.085);
        leftThigh.position.set(legSpacing, 0, 0); 
        torsoParts.hips.add(leftThigh);

        const rightShin = createSegment(0.095, shinLen, legMat, 0.065);
        rightShin.position.y = -thighLen; 
        rightThigh.add(rightShin);

        const leftShin = createSegment(0.095, shinLen, legMat, 0.065);
        leftShin.position.y = -thighLen; 
        leftThigh.add(leftShin);

        // 4. Feet & Ankles
        const footOffsetY = -shinLen; 
        const ankleRadius = 0.068;
        const ankleGeo = new THREE.SphereGeometry(ankleRadius, 16, 16);
        const ankleMat = isNude ? materials.skin : materials.boots;
        
        const rightAnkle = new THREE.Mesh(ankleGeo, ankleMat);
        rightAnkle.position.y = footOffsetY;
        rightAnkle.castShadow = true;
        rightShin.add(rightAnkle);

        const leftAnkle = new THREE.Mesh(ankleGeo, ankleMat);
        leftAnkle.position.y = footOffsetY;
        leftAnkle.castShadow = true;
        leftShin.add(leftAnkle);
        
        const rFoot = FootBuilder.create(materials, false, arrays, isNude);
        rFoot.heelGroup.position.y = footOffsetY; 
        rightShin.add(rFoot.heelGroup); 

        const lFoot = FootBuilder.create(materials, true, arrays, isNude);
        lFoot.heelGroup.position.y = footOffsetY;
        leftShin.add(lFoot.heelGroup); 

        // 5. Limbs (Arms)
        const upperArmLen = 0.32;
        const lowerArmLen = 0.30;

        const buildArm = () => {
            const armGroup = new THREE.Group();
            const deltRadius = 0.105;
            const deltGeo = new THREE.SphereGeometry(deltRadius, 16, 16);
            deltGeo.scale(0.85, 0.82, 0.75); 
            const armMat = isNude ? materials.skin : materials.shirt;
            const delt = new THREE.Mesh(deltGeo, armMat);
            delt.position.y = 0.02; 
            delt.castShadow = true;
            armGroup.add(delt);

            const upperTopR = 0.095;
            const upperBotR = 0.07; 
            const upperGeo = new THREE.CylinderGeometry(upperTopR, upperBotR, upperArmLen, 12);
            upperGeo.translate(0, -upperArmLen/2, 0);
            const upperMesh = new THREE.Mesh(upperGeo, armMat);
            upperMesh.position.y = 0.03; 
            upperMesh.castShadow = true;
            armGroup.add(upperMesh);

            const elbowPosY = -upperArmLen + 0.03; 
            const elbowRadius = 0.07; 
            const foreArmGroup = new THREE.Group();
            foreArmGroup.position.y = elbowPosY;
            armGroup.add(foreArmGroup);

            const elbowGeo = new THREE.SphereGeometry(elbowRadius, 16, 16);
            elbowGeo.scale(1, 1, 0.95);
            const elbow = new THREE.Mesh(elbowGeo, armMat);
            elbow.castShadow = true;
            foreArmGroup.add(elbow);

            const lowerTopR = 0.07; 
            const lowerBotR = 0.055; 
            const lowerGeo = new THREE.CylinderGeometry(lowerTopR, lowerBotR, lowerArmLen, 12);
            lowerGeo.translate(0, -lowerArmLen/2, 0);
            const lowerMesh = new THREE.Mesh(lowerGeo, armMat);
            lowerMesh.castShadow = true;
            lowerMesh.scale.set(1.1, 1, 0.95); 
            foreArmGroup.add(lowerMesh);

            const wristGeo = new THREE.SphereGeometry(lowerBotR, 12, 12);
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

        // 6. Hands
        const rightHand = HandBuilder.create(materials, false, arrays);
        rightHand.position.y = rArmBuild.wristPosY; 
        rightHand.rotation.y = -Math.PI / 2; 
        rightForeArm.add(rightHand);
        
        const leftHand = HandBuilder.create(materials, true, arrays);
        leftHand.position.y = lArmBuild.wristPosY; 
        leftHand.rotation.y = Math.PI / 2; 
        leftForeArm.add(leftHand);

        // 7. Mounts
        const rightHandMount = new THREE.Group();
        rightHandMount.position.set(0, -0.07, -0.04);
        rightHandMount.rotation.set(-Math.PI / 2, 0, 0);
        rightHand.add(rightHandMount);

        const rightShoulderMount = new THREE.Group(); rightShoulderMount.position.y = 0.05; rightArm.add(rightShoulderMount);
        const leftShoulderMount = new THREE.Group(); leftShoulderMount.position.y = 0.05; leftArm.add(leftShoulderMount);
        const leftShieldMount = new THREE.Group(); leftShieldMount.position.set(0.06, -0.09, 0); leftShieldMount.rotation.y = Math.PI/2; leftForeArm.add(leftShieldMount);

        const parts = {
            ...torsoParts,
            ...headParts,
            rightThigh, rightShin,
            leftThigh, leftShin,
            rightAnkle, leftAnkle,
            rightArm, rightForeArm,
            leftArm, leftForeArm,
            rightHand, leftHand,
            rightHandMount,
            rightShoulderMount, leftShoulderMount, leftShieldMount
        };

        return {
            group,
            parts,
            arrays
        };
    }
}
