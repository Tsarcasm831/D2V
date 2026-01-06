import * as THREE from 'three';

interface ParticleData {
    active: boolean;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    rotationSpeed: THREE.Vector3;
}

export class ParticleManager {
    private scene: THREE.Scene;
    private mesh: THREE.InstancedMesh;
    private particles: ParticleData[] = [];
    private dummy = new THREE.Object3D();
    private count = 100;
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        
        // Wood chip geometry
        const geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8d6e63, 
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
                rotationSpeed: new THREE.Vector3()
            });
            // Move off screen initially
            this.dummy.position.set(0, -1000, 0);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
    }

    emit(position: THREE.Vector3, count: number, type: 'wood' | 'stone') {
        let spawned = 0;
        
        // Update color based on type (simple approach, ideally use logic or separate meshes)
        if (type === 'wood') {
             (this.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x8d6e63);
        } else {
             (this.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x9e9e9e);
        }

        for (let i = 0; i < this.count; i++) {
            if (!this.particles[i].active) {
                const p = this.particles[i];
                p.active = true;
                p.life = 0;
                p.maxLife = 0.5 + Math.random() * 0.5;
                
                // Explode outwards and up
                p.velocity.set(
                    (Math.random() - 0.5) * 4,
                    2 + Math.random() * 3,
                    (Math.random() - 0.5) * 4
                );
                
                p.rotationSpeed.set(
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                );

                this.dummy.position.copy(position);
                // Random offset
                this.dummy.position.x += (Math.random() - 0.5) * 0.3;
                this.dummy.position.y += (Math.random() - 0.5) * 0.3;
                this.dummy.position.z += (Math.random() - 0.5) * 0.3;
                
                this.dummy.scale.setScalar(0.5 + Math.random() * 0.5);
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
        const gravity = -15;

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
                
                // Scale down near end
                const scale = Math.max(0, 1.0 - (p.life / p.maxLife));
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