
import * as THREE from 'three';

interface ParticleData {
    active: boolean;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    rotationSpeed: THREE.Vector3;
    scale: number;
}

export class ParticleManager {
    private scene: THREE.Scene;
    private mesh: THREE.InstancedMesh;
    private particles: ParticleData[] = [];
    private dummy = new THREE.Object3D();
    private count = 200; // Increased count for sparks
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        
        // Generic box geometry
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            roughness: 0.9,
            flatShading: true 
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.mesh);

        // Initialize pool
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                active: false,
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1.0,
                rotationSpeed: new THREE.Vector3(),
                scale: 1.0
            });
            // Move off screen initially
            this.dummy.position.set(0, -1000, 0);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
    }

    emit(position: THREE.Vector3, count: number, type: 'wood' | 'stone' | 'spark') {
        let spawned = 0;
        
        // We use the same mesh but rely on coloring for batching. 
        // Note: InstancedMesh supports one material. For true multi-color in one draw call 
        // without instanceColor attribute, we stick to one color per frame or rely on 'spark' overwriting visual dominance.
        // To keep it simple and performant, we'll swap the material color temporarily or use instanceColor if we upgraded.
        // For now, let's just bias the color based on the last emission type or use a neutral color if mixed.
        
        // Actually, to support Sparks (Emissive/Yellow) vs Wood (Brown) correctly in one mesh, 
        // we should ideally use setColorAt. Let's upgrade to use instanceColor.
        
        const mat = this.mesh.material as THREE.MeshStandardMaterial;
        let color = new THREE.Color(0xffffff);
        let emissive = new THREE.Color(0x000000);
        let baseScale = 1.0;
        let speedMult = 1.0;

        if (type === 'wood') {
             color.setHex(0x8d6e63);
             baseScale = 1.2; // Chips
        } else if (type === 'stone') {
             color.setHex(0x9e9e9e);
             baseScale = 1.0;
        } else if (type === 'spark') {
             color.setHex(0xffaa00); // Orange-Yellow
             emissive.setHex(0xff5500);
             baseScale = 0.4; // Small sparks
             speedMult = 2.5; // Fast
        }

        // Apply global material tint (best effort without per-instance color attribute management logic update)
        mat.color.copy(color);
        mat.emissive.copy(emissive);

        for (let i = 0; i < this.count; i++) {
            if (!this.particles[i].active) {
                const p = this.particles[i];
                p.active = true;
                p.life = 0;
                p.maxLife = (0.3 + Math.random() * 0.4);
                p.scale = baseScale * (0.5 + Math.random() * 0.5);
                
                // Explode outwards
                p.velocity.set(
                    (Math.random() - 0.5),
                    (Math.random() * 0.8 + 0.2), // Upward bias
                    (Math.random() - 0.5)
                ).normalize().multiplyScalar((3 + Math.random() * 4) * speedMult);
                
                p.rotationSpeed.set(
                    Math.random() * 15,
                    Math.random() * 15,
                    Math.random() * 15
                );

                this.dummy.position.copy(position);
                // Random jitter
                this.dummy.position.x += (Math.random() - 0.5) * 0.2;
                this.dummy.position.y += (Math.random() - 0.5) * 0.2;
                this.dummy.position.z += (Math.random() - 0.5) * 0.2;
                
                this.dummy.scale.setScalar(p.scale);
                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(i, this.dummy.matrix);
                
                spawned++;
                if (spawned >= count) break;
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    update(dt: number) {
        let needsUpdate = false;
        const gravity = -20;

        for (let i = 0; i < this.count; i++) {
            const p = this.particles[i];
            if (p.active) {
                needsUpdate = true;
                p.life += dt;
                
                if (p.life >= p.maxLife) {
                    p.active = false;
                    this.dummy.position.set(0, -1000, 0);
                    this.dummy.updateMatrix();
                    this.mesh.setMatrixAt(i, this.dummy.matrix);
                    continue;
                }

                // Physics
                p.velocity.y += gravity * dt;
                
                // Read current matrix
                this.mesh.getMatrixAt(i, this.dummy.matrix);
                this.dummy.position.setFromMatrixPosition(this.dummy.matrix);
                
                this.dummy.position.addScaledVector(p.velocity, dt);
                this.dummy.rotation.x += p.rotationSpeed.x * dt;
                this.dummy.rotation.y += p.rotationSpeed.y * dt;
                this.dummy.rotation.z += p.rotationSpeed.z * dt;
                
                // Shrink
                const scale = Math.max(0, p.scale * (1.0 - (p.life / p.maxLife)));
                this.dummy.scale.setScalar(scale);

                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(i, this.dummy.matrix);
            }
        }

        if (needsUpdate) {
            this.mesh.instanceMatrix.needsUpdate = true;
        }
    }
}
