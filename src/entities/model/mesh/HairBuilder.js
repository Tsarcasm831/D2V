import * as THREE from 'three';

export class HairBuilder {
    static build(parts, config, material) {
        const head = parts.head;
        const existing = head.getObjectByName('HairInstanced');
        if (existing) {
            head.remove(existing);
            existing.geometry.dispose();
        }

        if (config.hairStyle === 'bald') return;

        const hairCapGroup = head.getObjectByName('HairCap');
        if (!hairCapGroup) return;

        const emitters = [];
        hairCapGroup.traverse((c) => {
            if (c.isMesh) emitters.push(c);
        });

        if (emitters.length === 0) return;

        const HAIR_COUNT = 10000; // Reduced from 100k for performance in browser
        const hairLen = 0.05; 
        const hairThick = 0.0035; 

        const hairGeo = new THREE.CylinderGeometry(0.0001, hairThick, hairLen, 3, 1, false);
        hairGeo.translate(0, hairLen / 2, 0);

        const hairMat = material.clone();
        const uInertia = { value: new THREE.Vector3(0, 0, 0) };

        hairMat.onBeforeCompile = (shader) => {
            shader.uniforms.uHairInertia = uInertia;
            shader.vertexShader = `
                uniform vec3 uHairInertia;
                ${shader.vertexShader}
            `;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                float heightFactor = smoothstep(0.0, ${hairLen.toFixed(4)}, transformed.y);
                transformed += uHairInertia * (heightFactor * heightFactor * 1.5);
                `
            );
        };

        const instancedMesh = new THREE.InstancedMesh(hairGeo, hairMat, HAIR_COUNT);
        instancedMesh.name = 'HairInstanced';
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const _position = new THREE.Vector3();
        const _normal = new THREE.Vector3();
        const _target = new THREE.Vector3();

        let totalArea = 0;
        const emitterData = [];

        emitters.forEach(mesh => {
            const geo = mesh.geometry;
            const pos = geo.attributes.position;
            const idx = geo.index;
            const count = idx ? idx.count : pos.count;

            let area = 0;
            const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
            const tempPos = new THREE.Vector3();
            const tempNorm = new THREE.Vector3();
            
            for (let i = 0; i < count; i += 3) {
                if (idx) {
                    a.fromBufferAttribute(pos, idx.getX(i));
                    b.fromBufferAttribute(pos, idx.getX(i+1));
                    c.fromBufferAttribute(pos, idx.getX(i+2));
                } else {
                    a.fromBufferAttribute(pos, i);
                    b.fromBufferAttribute(pos, i+1);
                    c.fromBufferAttribute(pos, i+2);
                }
                tempPos.subVectors(b, a);
                tempNorm.subVectors(c, a);
                tempPos.cross(tempNorm);
                area += 0.5 * tempPos.length();
            }
            
            totalArea += area;
            emitterData.push({ mesh, area }); 
        });

        let seed = 1234;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        let hairsGenerated = 0;
        emitterData.forEach(data => {
            if (totalArea === 0) return;
            const count = Math.floor((data.area / totalArea) * HAIR_COUNT);
            const geo = data.mesh.geometry;
            const pos = geo.attributes.position;
            const norm = geo.attributes.normal;
            const idx = geo.index;
            const vertexCount = idx ? idx.count : pos.count;
            const triangleCount = vertexCount / 3;

            for (let k = 0; k < count; k++) {
                const triIndex = Math.floor(random() * triangleCount) * 3;
                let iA, iB, iC;
                if (idx) {
                    iA = idx.getX(triIndex); iB = idx.getX(triIndex+1); iC = idx.getX(triIndex+2);
                } else {
                    iA = triIndex; iB = triIndex+1; iC = triIndex+2;
                }

                let r1 = random(), r2 = random();
                if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
                const r3 = 1 - r1 - r2;

                _position.set(0,0,0);
                _position.addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, iA), r1);
                _position.addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, iB), r2);
                _position.addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, iC), r3);

                _normal.set(0,0,0);
                _normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(norm, iA), r1);
                _normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(norm, iB), r2);
                _normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(norm, iC), r3);
                _normal.normalize();

                dummy.position.copy(_position);
                _target.copy(_position).add(_normal);
                dummy.lookAt(_target);
                dummy.rotateX(Math.PI / 2);
                dummy.rotateX((random() - 0.5) * 0.3);
                dummy.rotateZ((random() - 0.5) * 0.3);
                
                const s = 0.8 + random() * 0.4;
                dummy.scale.set(s, s * (0.9 + random() * 0.2), s);

                dummy.updateMatrix();
                instancedMesh.setMatrixAt(hairsGenerated, dummy.matrix);
                hairsGenerated++;
            }
        });

        head.add(instancedMesh);
        instancedMesh.userData.uInertia = uInertia;
    }
}
