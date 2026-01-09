import * as THREE from 'three';
import { WeaponEffect } from '../types';

export interface EffectSystem {
    mesh: THREE.Object3D;
    update: (deltaTime: number) => void;
}

export const buildEffect = (type: WeaponEffect, color: string, targetMesh: THREE.Mesh): EffectSystem | null => {
    if (type === WeaponEffect.NONE) return null;

    // Force update bounding box
    targetMesh.geometry.computeBoundingBox();
    const box = targetMesh.geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const threeColor = new THREE.Color(color);
    const isRing = targetMesh.userData.isRing;

    // Helper to get random point based on geometry shape
    const getRandomPosition = (vec: THREE.Vector3) => {
        if (isRing) {
             const angle = Math.random() * Math.PI * 2;
             const r = (size.x / 2) * (0.85 + Math.random() * 0.15); 
             vec.set(Math.cos(angle) * r, Math.sin(angle) * r, (Math.random()-0.5) * size.z);
        } else {
             vec.set(
                (Math.random() - 0.5) * size.x,
                (Math.random() - 0.5) * size.y,
                (Math.random() - 0.5) * size.z
             );
        }
    };

    // --- POISON (Dripping Fluid) ---
    if (type === WeaponEffect.POISON) {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const offsets = new Float32Array(particleCount); 
        
        for (let i = 0; i < particleCount; i++) {
            const v = new THREE.Vector3();
            getRandomPosition(v);
            positions[i*3] = v.x;
            positions[i*3+1] = v.y;
            positions[i*3+2] = v.z;
            sizes[i] = Math.random();
            offsets[i] = Math.random() * 100;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: threeColor },
                time: { value: 0 },
                speed: { value: 1.5 }
            },
            vertexShader: `
                attribute float size;
                attribute float offset;
                varying float vOpacity;
                uniform float time;
                uniform float speed;
                void main() {
                    vec3 pos = position;
                    float life = mod(time * speed + offset, 2.0);
                    
                    // Gravity: Drip straight down
                    pos.y -= life * 1.5; 
                    
                    // Minimal sway (liquid viscosity)
                    pos.x += sin(time * 2.0 + offset) * 0.02;
                    pos.z += cos(time * 1.5 + offset) * 0.02;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * 120.0 / -mvPosition.z; // Smaller, denser drops
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Stay opaque longer, then fade quickly
                    vOpacity = 1.0 - smoothstep(1.5, 2.0, life);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying float vOpacity;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float dist = length(coord);
                    if(dist > 0.5) discard;
                    
                    // Harder edge for liquid droplet look
                    float alpha = smoothstep(0.5, 0.4, dist) * vOpacity;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending // Normal blending looks more like liquid than Additive
        });

        const points = new THREE.Points(geometry, material);
        return {
            mesh: points,
            update: (dt) => { material.uniforms.time.value += dt; }
        };
    }

    // --- FIRE & FROST ---
    if (type === WeaponEffect.FIRE || type === WeaponEffect.FROST) {
        const particleCount = 150;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const offsets = new Float32Array(particleCount); 
        
        for (let i = 0; i < particleCount; i++) {
            const v = new THREE.Vector3();
            getRandomPosition(v);
            positions[i*3] = v.x;
            positions[i*3+1] = v.y;
            positions[i*3+2] = v.z;
            sizes[i] = Math.random();
            offsets[i] = Math.random() * 100;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));

        let vertexShader = '';
        if (type === WeaponEffect.FIRE) {
            vertexShader = `
                attribute float size;
                attribute float offset;
                varying float vOpacity;
                uniform float time;
                uniform float speed;
                void main() {
                    vec3 pos = position;
                    float life = mod(time * speed + offset, 2.0);
                    
                    ${ isRing ? 'pos *= (1.0 + life * 0.2);' : 'pos.y -= life * 1.0;' }
                    
                    // Chaotic Fire Wiggle
                    pos.x += sin(time * 5.0 + offset) * 0.05;
                    pos.z += cos(time * 4.0 + offset) * 0.05;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * 200.0 / -mvPosition.z;
                    gl_Position = projectionMatrix * mvPosition;
                    
                    vOpacity = 1.0 - (life / 2.0);
                }
            `;
        } else if (type === WeaponEffect.FROST) {
            vertexShader = `
                attribute float size;
                attribute float offset;
                varying float vOpacity;
                uniform float time;
                void main() {
                    vec3 pos = position;
                    float life = mod(time + offset, 2.0);
                    pos.y -= life * 0.2; 
                    pos.x += sin(time + offset) * 0.1;
                    pos.z += cos(time + offset) * 0.1;
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * 100.0 / -mvPosition.z;
                    gl_Position = projectionMatrix * mvPosition;
                    vOpacity = 1.0 - (life / 2.0);
                }
            `;
        }

        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: threeColor },
                time: { value: 0 },
                speed: { value: 2.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: `
                uniform vec3 color;
                varying float vOpacity;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float dist = length(coord);
                    if(dist > 0.5) discard;
                    float alpha = (0.5 - dist) * 2.0 * vOpacity;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geometry, material);
        
        if (isRing && type === WeaponEffect.FIRE) {
            const glowGeo = targetMesh.geometry.clone();
            const glowMat = new THREE.MeshBasicMaterial({ 
                color: threeColor, 
                transparent: true, 
                opacity: 0.2, 
                blending: THREE.AdditiveBlending, 
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.scale.multiplyScalar(1.05);
            points.add(glow);
        }

        return {
            mesh: points,
            update: (dt) => { material.uniforms.time.value += dt; }
        };
    }
    
    if (type === WeaponEffect.MUD) {
         const particleCount = 40;
         const geometry = new THREE.BufferGeometry();
         const positions = new Float32Array(particleCount * 3);
         const offsets = new Float32Array(particleCount);
         
         for (let i = 0; i < particleCount; i++) {
            const v = new THREE.Vector3();
            getRandomPosition(v);
            positions[i*3] = v.x;
            positions[i*3+1] = v.y;
            positions[i*3+2] = v.z;
            offsets[i] = Math.random() * 10;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: threeColor },
                time: { value: 0 }
            },
            vertexShader: `
                attribute float offset;
                uniform float time;
                void main() {
                    vec3 pos = position;
                    float life = mod(time + offset, 3.0);
                    if (life < 1.0) {
                        float swell = sin(life * 3.14);
                        pos *= (0.8 + swell * 0.2); 
                    } else {
                        pos.y -= (life - 1.0) * (life - 1.0) * 2.0;
                    }
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = 80.0 / -mvPosition.z;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if(length(coord) > 0.5) discard;
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            transparent: false
        });
        const points = new THREE.Points(geometry, material);
        return {
            mesh: points,
            update: (dt) => { material.uniforms.time.value += dt; }
        };
    }

    if (type === WeaponEffect.LIGHTNING) {
        const segmentCount = 10;
        const lineGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(segmentCount * 3);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.LineBasicMaterial({ color: threeColor });
        const line = new THREE.Line(lineGeo, mat);
        
        return {
            mesh: line,
            update: (dt) => {
                const pos = lineGeo.attributes.position.array as Float32Array;
                for(let i=0; i<segmentCount; i++) {
                    const t = i / (segmentCount - 1);
                    if (isRing) {
                         const angle = t * Math.PI * 2;
                         const r = size.x / 2;
                         pos[i*3] = Math.cos(angle) * r + (Math.random()-0.5)*0.2;
                         pos[i*3+1] = Math.sin(angle) * r + (Math.random()-0.5)*0.2;
                         pos[i*3+2] = (Math.random()-0.5)*0.2;
                    } else {
                        pos[i*3] = (Math.random() - 0.5) * size.x * 2.0; 
                        pos[i*3+1] = (t - 0.5) * size.y; 
                        pos[i*3+2] = (Math.random() - 0.5) * size.z * 2.0; 
                    }
                }
                lineGeo.attributes.position.needsUpdate = true;
                line.visible = Math.random() > 0.1;
            }
        };
    }
    
    if (type === WeaponEffect.GLOW) {
        const glowGeo = targetMesh.geometry.clone();
        const positions = glowGeo.attributes.position;
        const normals = glowGeo.attributes.normal;
        for(let i=0; i<positions.count; i++){
             positions.setXYZ(i, 
                positions.getX(i) + normals.getX(i) * 0.05,
                positions.getY(i) + normals.getY(i) * 0.05,
                positions.getZ(i) + normals.getZ(i) * 0.05
             );
        }
        
        const mat = new THREE.MeshBasicMaterial({ 
            color: threeColor, 
            transparent: true, 
            opacity: 0.3, 
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(glowGeo, mat);
        
        return {
            mesh,
            update: (dt) => {
                mat.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
            }
        };
    }

    return null;
};