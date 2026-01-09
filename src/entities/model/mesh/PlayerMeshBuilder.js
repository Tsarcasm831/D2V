import * as THREE from 'three';
import { TorsoBuilder } from './TorsoBuilder.js';
import { HeadBuilder } from './HeadBuilder.js';
import { HandBuilder } from './HandBuilder.js';
import { FootBuilder } from './FootBuilder.js';
import { createSegment } from './MeshUtils.js';

export class PlayerMeshBuilder {
    static build(materials, config) { // Added config param if needed, though not strictly used yet in base build
        const group = new THREE.Group();
        group.castShadow = true;
        
        const arrays = {
            forefootGroups: [],
            heelGroups: [],
            toeUnits: [],
            irises: [],
            pupils: [],
            eyes: [],
            eyelids: [],
            rightFingers: [],
            rightThumb: null,
            leftFingers: [],
            leftThumb: null,
            buttockCheeks: [],
            thenars: []
        };

        // 1. Torso & Hips
        const torsoParts = TorsoBuilder.build(materials, arrays);
        group.add(torsoParts.hips);
        
        // 2. Head
        const headParts = HeadBuilder.build(materials, arrays);
        torsoParts.neck.add(headParts.head);

        // 3. Limbs (Legs)
        const thighLen = 0.4;
        const shinLen = 0.42;
        const legSpacing = 0.15;

        const rightThigh = createSegment(0.11, thighLen, materials.pants, 0.085);
        rightThigh.position.set(-legSpacing, 0, 0); 
        torsoParts.hips.add(rightThigh);

        const leftThigh = createSegment(0.11, thighLen, materials.pants, 0.085);
        leftThigh.position.set(legSpacing, 0, 0); 
        torsoParts.hips.add(leftThigh);

        const rightShin = createSegment(0.095, shinLen, materials.pants, 0.065);
        rightShin.position.y = -thighLen; 
        rightThigh.add(rightShin);

        const leftShin = createSegment(0.095, shinLen, materials.pants, 0.065);
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
        
        // Use FootBuilder for initial feet (bare). ShoeBuilder swaps these if needed later.
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
            
            // 1. Deltoid (Shoulder Joint) - Reduced size by ~2x per request
            const deltRadius = 0.065; 
            const deltGeo = new THREE.SphereGeometry(deltRadius, 16, 16);
            deltGeo.scale(1.0, 1.0, 0.95); 
            const delt = new THREE.Mesh(deltGeo, materials.shirt);
            delt.position.y = 0.0; 
            delt.castShadow = true;
            armGroup.add(delt);

            // 2. Upper Arm - Scaled down top to match new shoulder size
            const upperTopR = 0.065; 
            const upperBotR = 0.055; 
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

            // 3. Elbow Joint - Matches connection width
            const elbowRadius = 0.055; 
            const elbowGeo = new THREE.SphereGeometry(elbowRadius, 16, 16);
            const elbow = new THREE.Mesh(elbowGeo, materials.shirt);
            elbow.castShadow = true;
            foreArmGroup.add(elbow);

            // 4. Forearm - Tapered from elbow width to small wrist
            const lowerTopR = 0.055; 
            const lowerBotR = 0.035; 
            const lowerGeo = new THREE.CylinderGeometry(lowerTopR, lowerBotR, lowerArmLen, 12);
            lowerGeo.translate(0, -lowerArmLen/2, 0);
            const lowerMesh = new THREE.Mesh(lowerGeo, materials.shirt);
            lowerMesh.castShadow = true;
            lowerMesh.scale.set(1.0, 1, 0.85); 
            foreArmGroup.add(lowerMesh);

            // 5. Wrist Joint
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

        // 7. Mounts
        const rightHandMount = new THREE.Group();
        // Position: center width, slightly below knuckles, slight forward into palm
        // Matches mesh/PlayerMeshBuilder hand mount to keep weapons in palm
        rightHandMount.position.set(0, -0.08, 0.04);
        rightHandMount.rotation.set(0, 0, 0); 
        rightHand.add(rightHandMount);

        const rightShoulderMount = new THREE.Group(); rightShoulderMount.position.y = 0.05; rightArm.add(rightShoulderMount);
        const leftShoulderMount = new THREE.Group(); leftShoulderMount.position.y = 0.05; leftArm.add(leftShoulderMount);
        const leftShieldMount = new THREE.Group(); leftShieldMount.position.set(0.06, -0.09, 0); leftShieldMount.rotation.y = Math.PI/2; leftForeArm.add(leftShieldMount);

        // We need to construct the 'parts' object expected by the rest of the system
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

        return { group, parts, arrays };
    }
}
