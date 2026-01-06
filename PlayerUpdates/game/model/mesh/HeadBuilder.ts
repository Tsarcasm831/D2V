import * as THREE from 'three';
import { PlayerMaterials } from '../PlayerMaterials';

export class HeadBuilder {
    static build(materials: PlayerMaterials, arrays: any) {
        const headRadius = 0.21;
        const headGeo = new THREE.SphereGeometry(headRadius, 64, 64);
        const posAttribute = headGeo.attributes.position;
        const vertex = new THREE.Vector3();
        
        // Sculpting centers moved inward slightly
        const sculptLeftCenter = new THREE.Vector3(0.068, -0.015, headRadius * 0.92);
        const sculptRightCenter = new THREE.Vector3(-0.068, -0.015, headRadius * 0.92);

        // === SCULPTING HEAD ===
        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            
            const x = vertex.x;
            const y = vertex.y;
            const z = vertex.z;
            
            // 1. Flatten Sides (Temporal Bone)
            if (Math.abs(x) > headRadius * 0.65) {
                const factor = (Math.abs(x) - headRadius * 0.65) / (headRadius * 0.35);
                vertex.x *= (1.0 - factor * 0.15); 
            }

            // 2. Elongate Back (Occipital)
            if (z < 0) {
                vertex.z *= 1.08;
            }

            // 3. Define Jaw/Cheek Area 
            if (y < -0.05 && z > 0 && Math.abs(x) > 0.1) {
                vertex.x *= 0.92;
            }

            // 4. Brow Ridge 
            if (y > 0.02 && y < 0.12 && z > 0.1) {
                vertex.z *= 1.03; 
            }

            // 5. Eye Sockets (Deepen)
            const distL = vertex.distanceTo(sculptLeftCenter);
            const distR = vertex.distanceTo(sculptRightCenter);
            
            const sRad = 0.09; 
            const sDepth = 0.05;

            if (distL < sRad) {
                const f = Math.cos((distL / sRad) * Math.PI * 0.5); 
                vertex.z -= f * sDepth; 
                vertex.y += f * 0.005; 
            }
            if (distR < sRad) {
                const f = Math.cos((distR / sRad) * Math.PI * 0.5);
                vertex.z -= f * sDepth; 
                vertex.y += f * 0.005;
            }

            // 6. Pinch Nose Bridge specifically
            if (Math.abs(x) < 0.04 && Math.abs(y + 0.02) < 0.04 && z > 0.15) {
                vertex.z -= 0.015;
            }

            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        headGeo.computeVertexNormals();
        
        const head = new THREE.Mesh(headGeo, materials.skin);
        head.position.y = 0.32;
        head.castShadow = true;
        
        const headMount = new THREE.Group();
        head.add(headMount);

        // === JAW / CHIN CONSTRUCTION ===
        const jaw = new THREE.Group();
        // Pivot near the ear/jaw connection point
        jaw.position.set(0, -0.05, 0.02); 
        head.add(jaw);
        
        // Sculpted Sphere for Organic Jawline
        const jawRadius = 0.135; 
        const jawGeo = new THREE.SphereGeometry(jawRadius, 48, 32);
        const jPos = jawGeo.attributes.position;
        const jVec = new THREE.Vector3();

        for(let i=0; i<jPos.count; i++) {
            jVec.fromBufferAttribute(jPos, i);
            
            const x = jVec.x;
            const y = jVec.y;
            const z = jVec.z;
            const yRel = y / jawRadius;
            const zRel = z / jawRadius;

            // 1. Flatten Top (Blend into head)
            if (y > 0) {
                jVec.y *= 0.4; // Strong flatten on top
                jVec.x *= 0.92; 
                jVec.z *= 0.9;
            }

            // 2. Shape Mandible (Sides & Back)
            if (z < 0) {
                jVec.x *= 1.1; // Widen angles of jaw
                jVec.y *= 0.8; // Reduce vertical height at back
            }

            // 3. Shape Chin (Front)
            if (z > 0) {
                // Taper width towards front (V-shape)
                const taper = 1.0 - (zRel * 0.45);
                jVec.x *= taper;
                
                // Define Chin Prominence
                if (y < 0.02) {
                    // Project chin forward at tip
                    // Peak projection around zRel=1.0, yRel=-0.5
                    const zFactor = Math.max(0, zRel - 0.2);
                    jVec.z += zFactor * 0.025;
                }
            }

            // 4. Flatten Bottom slightly for defined jawline
            if (y < -jawRadius * 0.5) {
                // Soft flatten
                const diff = (-jawRadius * 0.5) - y;
                jVec.y += diff * 0.5;
            }
            
            // 5. Sharpen Jawline Sides
            // If low and wide, pull up slightly to create "bone" definition
            if (y < 0 && Math.abs(x) > jawRadius * 0.5) {
                jVec.y += 0.01;
            }

            jPos.setXYZ(i, jVec.x, jVec.y, jVec.z);
        }
        
        jawGeo.computeVertexNormals();
        
        // Pre-stretch Y geometry so dynamic scaling in PlayerModel (0.45) results in correct proportion
        jawGeo.scale(1, 1.5, 1); 

        const jawMesh = new THREE.Mesh(jawGeo, materials.skin);
        // Positioned to blend into the bottom of head sphere
        jawMesh.position.set(0, -0.06, 0.04); 
        jawMesh.rotation.x = 0.25; // Tilt forward for chin definition
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
            // Move eyes back (Z: 0.132 -> 0.122) and inward (X: 0.085 -> 0.082)
            eyeContainer.position.set(side * 0.082, -0.02, 0.122);
            faceGroup.add(eyeContainer);

            const eyeball = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 32, 32), materials.sclera);
            // Reduced width scaling to prevent side protrusion (1.1 -> 1.0)
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

            // === EYELIDS ===
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
        const lipC = (pts: THREE.Vector3[], r: number) => {
            const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, r, 8, false), materials.lip);
            tube.scale.set(1, 1, 0.5); tube.rotation.x = -0.2; tube.castShadow = true; return tube;
        };
        mouth.add(lipC([new THREE.Vector3(-0.035, -0.002, 0), new THREE.Vector3(0, 0.004, 0.005), new THREE.Vector3(0.035, -0.002, 0)], 0.006));
        mouth.add(lipC([new THREE.Vector3(-0.035, 0, 0), new THREE.Vector3(0, -0.01, 0.008), new THREE.Vector3(0.035, 0, 0)], 0.007));

        return { head, headMount, jaw, jawMesh, faceGroup };
    }
}