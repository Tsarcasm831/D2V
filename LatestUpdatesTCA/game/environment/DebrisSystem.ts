
import * as THREE from 'three';
import { FallingObject, Debris } from './EnvironmentTypes';
import { ObjectFactory } from './ObjectFactory';

export class DebrisSystem {
    private scene: THREE.Scene;
    private fallingObjects: FallingObject[] = [];
    private rockDebris: Debris[] = [];
    private onLogsSpawned: (logs: THREE.Mesh[]) => void;

    constructor(scene: THREE.Scene, onLogsSpawned: (logs: THREE.Mesh[]) => void) {
        this.scene = scene;
        this.onLogsSpawned = onLogsSpawned;
    }

    addFallingTree(mesh: THREE.Group) {
        const angle = Math.random() * Math.PI * 2;
        const axis = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();

        this.fallingObjects.push({
            mesh,
            velocity: 0,
            axis: axis,
            angle: 0
        });
        this.scene.add(mesh);
    }

    spawnRockDebris(origin: THREE.Vector3, material: THREE.Material) {
        const chunks = 8;
        for (let i = 0; i < chunks; i++) {
            const chunk = ObjectFactory.createDebrisChunk(origin, material);
            this.scene.add(chunk);

            this.rockDebris.push({
                mesh: chunk,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 8 + 2, // Explode up
                    (Math.random() - 0.5) * 8
                ),
                rotVelocity: new THREE.Vector3(
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                ),
                life: 3.0 + Math.random() // Stay for 3-4 seconds
            });
        }
    }

    update(dt: number) {
        // Animate falling trees
        for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
            const obj = this.fallingObjects[i];
            
            // Gravity acceleration for rotation
            obj.velocity += dt * 5.0; 
            const angleDelta = obj.velocity * dt;
            obj.angle += angleDelta;
            
            // Rotate around the pivot (bottom of trunk)
            obj.mesh.rotateOnWorldAxis(obj.axis, angleDelta);

            // Hit ground at 90 degrees (PI/2)
            if (obj.angle >= Math.PI / 2) {
                const logs = ObjectFactory.createLogs(obj.mesh.position, obj.mesh.quaternion);
                logs.forEach(log => this.scene.add(log));
                this.onLogsSpawned(logs);
                
                this.scene.remove(obj.mesh);
                this.fallingObjects.splice(i, 1);
            }
        }

        // Animate Rock Debris
        const gravity = new THREE.Vector3(0, -25, 0);
        for (let i = this.rockDebris.length - 1; i >= 0; i--) {
            const deb = this.rockDebris[i];
            deb.life -= dt;
            
            if (deb.life <= 0) {
                // Shrink then remove
                deb.mesh.scale.multiplyScalar(0.9);
                if (deb.mesh.scale.x < 0.05) {
                    this.scene.remove(deb.mesh);
                    this.rockDebris.splice(i, 1);
                }
            } else {
                deb.velocity.addScaledVector(gravity, dt);
                deb.mesh.position.addScaledVector(deb.velocity, dt);
                deb.mesh.rotation.x += deb.rotVelocity.x * dt;
                deb.mesh.rotation.y += deb.rotVelocity.y * dt;
                deb.mesh.rotation.z += deb.rotVelocity.z * dt;

                // Floor collision (approximate)
                if (deb.mesh.position.y < 0.2) {
                    deb.mesh.position.y = 0.2;
                    deb.velocity.y *= -0.5; // Bounce
                    deb.velocity.x *= 0.8; // Friction
                    deb.velocity.z *= 0.8;
                }
            }
        }
    }
}
