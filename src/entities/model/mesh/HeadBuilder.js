import * as THREE from 'three';

export class HeadBuilder {
    static build(materials, arrays) {
        const headRadius = 0.21;
        const headGeo = new THREE.SphereGeometry(headRadius, 64, 64);
        const posAttribute = headGeo.attributes.position;
        const vertex = new THREE.Vector3();
        
        const sculptLeftCenter = new THREE.Vector3(0.068, -0.015, headRadius * 0.92);
        const sculptRightCenter = new THREE.Vector3(-0.068, -0.015, headRadius * 0.92);

        // === SCULPTING HEAD ===
        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            
            const x = vertex.x;
            const y = vertex.y;
            const z = vertex.z;
            
            if (Math.abs(x) > headRadius * 0.65) {
                const factor = (Math.abs(x) - headRadius * 0.65) / (headRadius * 0.35);
                vertex.x *= (1.0 - factor * 0.15); 
            }

            if (z < 0) {
                vertex.z *= 1.08;
            }

            if (y < -0.05 && z > 0 && Math.abs(x) > 0.1) {
                vertex.x *= 0.92;
            }

            if (y > 0.02 && y < 0.12 && z > 0.1) {
                vertex.z *= 1.03; 
            }

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
        jaw.position.set(0, -0.05, 0.02); 
        head.add(jaw);
        
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

            if (y > 0) {
                jVec.y *= 0.4; 
                jVec.x *= 0.92; 
                jVec.z *= 0.9;
            }

            if (z < 0) {
                jVec.x *= 1.1; 
                jVec.y *= 0.8; 
            }

            if (z > 0) {
                const taper = 1.0 - (zRel * 0.45);
                jVec.x *= taper;
                
                if (y < 0.02) {
                    const zFactor = Math.max(0, zRel - 0.2);
                    jVec.z += zFactor * 0.025;
                }
            }

            if (y < -jawRadius * 0.5) {
                const diff = (-jawRadius * 0.5) - y;
                jVec.y += diff * 0.5;
            }
            
            if (y < 0 && Math.abs(x) > jawRadius * 0.5) {
                jVec.y += 0.01;
            }

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
