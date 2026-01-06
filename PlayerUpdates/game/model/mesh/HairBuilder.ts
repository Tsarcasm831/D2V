import * as THREE from 'three';
import { PlayerConfig } from '../../../types';

export class HairBuilder {
    static build(parts: any, config: PlayerConfig, material: THREE.Material) {
        // Clean up old hair
        const head = parts.head;
        const existing = head.children.find((c: any) => c.name === 'HairGroup');
        if (existing) head.remove(existing);

        if (config.hairStyle === 'bald') return;

        const hairGroup = new THREE.Group();
        hairGroup.name = 'HairGroup';
        head.add(hairGroup);

        const headRadius = 0.21; // Match HeadBuilder base radius

        if (config.hairStyle === 'crew') {
            // === CREW CUT ===
            
            // 1. Main Top Volume (Sphere Segment)
            // Starts slightly above mid-ear
            const capGeo = new THREE.SphereGeometry(headRadius * 1.025, 32, 16, 0, Math.PI*2, 0, Math.PI * 0.35);
            const pos = capGeo.attributes.position;
            const vec = new THREE.Vector3();
            
            for(let i=0; i<pos.count; i++) {
                vec.fromBufferAttribute(pos, i);
                
                // Flatten Top for the "Cut" look
                // The higher the vertex, the more we clamp it down
                if (vec.y > 0.17) {
                    // Soft clamp
                    vec.y = 0.17 + (vec.y - 0.17) * 0.3;
                }
                
                // Square off sides slightly (Boxy military look)
                if (Math.abs(vec.x) > 0.12) {
                    vec.x *= 0.96;
                }

                // Noise for texture/irregularity
                const noise = (Math.random() - 0.5) * 0.003;
                vec.multiplyScalar(1.0 + noise);

                pos.setXYZ(i, vec.x, vec.y, vec.z);
            }
            capGeo.computeVertexNormals();
            
            const cap = new THREE.Mesh(capGeo, material);
            // Tilt back slightly to match natural hairline angle
            cap.rotation.x = -0.25; 
            cap.position.y = 0.01;
            cap.castShadow = true;
            hairGroup.add(cap);

            // 2. Side Fades / Back (Band)
            // A lower ring that tapers in, simulating shorter hair on sides
            const fadeGeo = new THREE.SphereGeometry(headRadius * 1.005, 32, 8, 0, Math.PI*2, Math.PI * 0.28, Math.PI * 0.22);
            const fade = new THREE.Mesh(fadeGeo, material);
            fade.rotation.x = -0.15;
            hairGroup.add(fade);

            // 3. Sideburns
            const sbGeo = new THREE.BoxGeometry(0.02, 0.08, 0.035);
            // Sculpt sideburns to conform to head curvature
            sbGeo.translate(0, -0.04, 0); // Pivot top

            const createSideburn = (isLeft: boolean) => {
                const sb = new THREE.Mesh(sbGeo, material);
                const side = isLeft ? 1 : -1;
                // Position in front of where ears would be
                sb.position.set(side * 0.185, 0.02, 0.08); 
                sb.rotation.y = side * 0.1; // Face forward
                sb.rotation.z = side * -0.15; // Hug head
                sb.rotation.x = -0.1;
                return sb;
            };

            hairGroup.add(createSideburn(true));
            hairGroup.add(createSideburn(false));
            
            // 4. Front Hairline Detail (Tiny jagged edge)
            // Optional: Adds a little bit of noise mesh at the front hairline
        }
    }
}