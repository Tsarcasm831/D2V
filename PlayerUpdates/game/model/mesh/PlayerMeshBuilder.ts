import * as THREE from 'three';
import { PlayerMaterials } from '../PlayerMaterials';
import { TorsoBuilder } from './mesh/TorsoBuilder';
import { HeadBuilder } from './mesh/HeadBuilder';
import { HandBuilder } from './mesh/HandBuilder';
import { FootBuilder } from './mesh/FootBuilder';
import { createSegment } from './mesh/MeshUtils';

export class PlayerMeshBuilder {
    static build(materials: PlayerMaterials) {
        const group = new THREE.Group();
        group.castShadow = true;
        
        const arrays = {
            forefootGroups: [] as THREE.Group[],
            heelGroups: [] as THREE.Group[],
            toeUnits: [] as THREE.Group[],
            irises: [] as THREE.Mesh[],
            pupils: [] as THREE.Mesh[],
            eyelids: [] as THREE.Group[],
            rightFingers: [] as THREE.Group[],
            rightThumb: null as THREE.Group | null,
            buttockCheeks: [] as THREE.Mesh[]
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
            const deltRadius = 0.13;
            const deltGeo = new THREE.SphereGeometry(deltRadius, 16, 16);
            deltGeo.scale(1.0, 0.85, 0.95); 
            const delt = new THREE.Mesh(deltGeo, materials.shirt);
            delt.position.y = 0.02; 
            delt.castShadow = true;
            armGroup.add(delt);

            const upperTopR = 0.095;
            const upperBotR = 0.07; 
            const upperGeo = new THREE.CylinderGeometry(upperTopR, upperBotR, upperArmLen, 12);
            upperGeo.translate(0, -upperArmLen/2, 0);
            const upperMesh = new THREE.Mesh(upperGeo, materials.shirt);
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
            const elbow = new THREE.Mesh(elbowGeo, materials.shirt);
            elbow.castShadow = true;
            foreArmGroup.add(elbow);

            const lowerTopR = 0.07; 
            const lowerBotR = 0.055; 
            const lowerGeo = new THREE.CylinderGeometry(lowerTopR, lowerBotR, lowerArmLen, 12);
            lowerGeo.translate(0, -lowerArmLen/2, 0);
            const lowerMesh = new THREE.Mesh(lowerGeo, materials.shirt);
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

        const rightHand = HandBuilder.create(materials, false, arrays);
        rightHand.position.y = rArmBuild.wristPosY; 
        // REVERTED to original palms-inward orientation
        rightHand.rotation.y = -Math.PI / 2; 
        rightForeArm.add(rightHand);
        
        const leftHand = HandBuilder.create(materials, true, arrays);
        leftHand.position.y = lArmBuild.wristPosY; 
        // REVERTED to original palms-inward orientation
        leftHand.rotation.y = Math.PI / 2; 
        leftForeArm.add(leftHand);

        // 7. Mounts
        const rightHandMount = new THREE.Group();
        // ADJUSTED FOR REVERTED WRIST:
        // X = 0.04: Move towards thumb (Medial in -PI/2 space).
        // Y = -0.08: Vertical palm center.
        // Z = 0.04: Deep in the finger curl.
        rightHandMount.position.set(0.04, -0.08, 0.04);
        rightHandMount.rotation.set(0, 0, 0); 
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

        return { group, parts, arrays };
    }
}