import * as THREE from 'three';

export class HairBuilder {
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
                
                if (vec.y > 0.17) {
                    vec.y = 0.17 + (vec.y - 0.17) * 0.3;
                }
                
                if (Math.abs(vec.x) > 0.12) {
                    vec.x *= 0.96;
                }

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
