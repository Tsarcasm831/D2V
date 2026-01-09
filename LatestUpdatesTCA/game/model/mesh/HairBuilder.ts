
import * as THREE from 'three';
import { PlayerConfig } from '../../../types';

export class HairBuilder {
    static build(parts: any, config: PlayerConfig, material: THREE.Material) {
        // 1. Cleanup old hair
        const head = parts.head;
        const existing = head.getObjectByName('HairInstanced');
        if (existing) {
            head.remove(existing);
            (existing as THREE.InstancedMesh).geometry.dispose();
            // We don't dispose material here as we might reuse the base, 
            // but we clone it below, so we should clean up the clone if we tracked it.
        }

        // Only build if we have a hair style
        if (config.hairStyle === 'bald') return;

        // 2. Locate Hair Caps (The surfaces to grow hair from)
        const hairCapGroup = head.getObjectByName('HairCap');
        if (!hairCapGroup) return;

        const emitters: THREE.Mesh[] = [];
        hairCapGroup.traverse((c: any) => {
            if (c.isMesh) emitters.push(c);
        });

        if (emitters.length === 0) return;

        // 3. Configuration
        const HAIR_COUNT = 100000;
        const hairLen = 0.05; // Short hair
        const hairThick = 0.0025; // Slightly thinner for softer look

        // 4. Geometry (Increased segments for bending)
        // RadiusTop (tip), RadiusBottom (root), Height, Segments
        const hairGeo = new THREE.CylinderGeometry(0.0001, hairThick, hairLen, 3, 5, false);
        // Pivot at the bottom (root)
        hairGeo.translate(0, hairLen / 2, 0);

        // 5. Custom Shader Material for Physics
        // We clone the base toon material and inject vertex shader code for "wiggle" and "gravity"
        const hairMat = material.clone();
        
        // These uniforms will be updated by PlayerModel every frame
        const uInertia = { value: new THREE.Vector3(0, 0, 0) };
        const uGravity = { value: new THREE.Vector3(0, -1, 0) };

        hairMat.onBeforeCompile = (shader) => {
            shader.uniforms.uHairInertia = uInertia;
            shader.uniforms.uGravity = uGravity;

            shader.vertexShader = `
                uniform vec3 uHairInertia;
                uniform vec3 uGravity;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                
                // Calculate normalized height along the hair strand (0 at root, 1 at tip)
                float h = transformed.y / ${hairLen.toFixed(4)};
                
                // Quadratic falloff: Roots are stiff (0 movement), tips move most (1.0)
                float bendFactor = h * h;
                
                // Combine Inertia (Drag) and Gravity (Sag)
                // We assume uGravity is already in Local Space of the Head/Hair container
                vec3 totalBend = (uHairInertia + uGravity) * bendFactor;
                
                transformed += totalBend;
                `
            );
        };

        // 6. Surface Sampling & Instance Generation
        const instancedMesh = new THREE.InstancedMesh(hairGeo, hairMat, HAIR_COUNT);
        instancedMesh.name = 'HairInstanced';
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const _position = new THREE.Vector3();
        const _normal = new THREE.Vector3();
        const _target = new THREE.Vector3();

        // Pre-calculate total area for weighted sampling
        let totalArea = 0;
        const emitterData: { mesh: THREE.Mesh, area: number, startIdx: number }[] = [];

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
                
                // Triangle area: 0.5 * length(cross(b-a, c-a))
                tempPos.subVectors(b, a);
                tempNorm.subVectors(c, a);
                tempPos.cross(tempNorm);
                area += 0.5 * tempPos.length();
            }
            
            totalArea += area;
            emitterData.push({ mesh, area, startIdx: 0 }); 
        });

        // Generate Instances
        let seed = 1234;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        let hairsGenerated = 0;
        
        // Distribute hair counts based on area
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
                // Pick random triangle
                const triIndex = Math.floor(random() * triangleCount) * 3;
                let iA, iB, iC;
                
                if (idx) {
                    iA = idx.getX(triIndex);
                    iB = idx.getX(triIndex+1);
                    iC = idx.getX(triIndex+2);
                } else {
                    iA = triIndex;
                    iB = triIndex+1;
                    iC = triIndex+2;
                }

                // Random Barycentric Coordinates
                let r1 = random();
                let r2 = random();
                if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
                const r3 = 1 - r1 - r2;

                // Interpolate Position
                _position.set(0,0,0);
                _position.addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, iA), r1);
                _position.addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, iB), r2);
                _position.addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, iC), r3);

                // Interpolate Normal
                _normal.set(0,0,0);
                _normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(norm, iA), r1);
                _normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(norm, iB), r2);
                _normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(norm, iC), r3);
                _normal.normalize();

                // Setup Dummy Matrix
                dummy.position.copy(_position);
                
                // Rotate to align +Y (hair up) with Surface Normal
                _target.copy(_position).add(_normal);
                dummy.lookAt(_target);
                // Fix orientation: lookAt aligns +Z to target. We want +Y to target.
                // Rotate X by 90 deg
                dummy.rotateX(Math.PI / 2);
                
                // Add some random messiness
                dummy.rotateX((random() - 0.5) * 0.5); // Increased messiness
                dummy.rotateZ((random() - 0.5) * 0.5);
                
                // Scale variation
                const s = 0.8 + random() * 0.4;
                dummy.scale.set(s, s * (0.9 + random() * 0.2), s);

                dummy.updateMatrix();
                instancedMesh.setMatrixAt(hairsGenerated, dummy.matrix);
                hairsGenerated++;
            }
        });

        head.add(instancedMesh);
        
        // Attach the uniform reference to the mesh userData so PlayerModel can find it
        instancedMesh.userData.uInertia = uInertia;
        instancedMesh.userData.uGravity = uGravity;
    }
}
