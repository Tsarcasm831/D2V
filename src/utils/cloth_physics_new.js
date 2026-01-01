import * as THREE from 'three';

class Point {
    constructor(x, y, z) {
        this.position = new THREE.Vector3(x, y, z);
        this.prevPosition = new THREE.Vector3(x, y, z);
        this.originalPosition = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3();
        this.pinned = false;
        this.pinPosition = new THREE.Vector3();
    }

    update(dt, gravity, inertia = 0.95) { // Slightly increased damping from 0.98 to 0.95
        if (this.pinned) {
            this.position.copy(this.pinPosition);
            return;
        }

        const velocity = this.position.clone().sub(this.prevPosition).multiplyScalar(inertia);
        this.prevPosition.copy(this.position);
        this.position.add(velocity);
        this.position.add(gravity.clone().multiplyScalar(dt * dt));
    }
}

class Constraint {
    constructor(a, b, distance) {
        this.a = a;
        this.b = b;
        this.distance = distance;
    }

    satisfy() {
        const diff = this.b.position.clone().sub(this.a.position);
        const currentDist = diff.length();
        if (currentDist === 0) return;
        const correction = diff.multiplyScalar((currentDist - this.distance) / currentDist * 0.5);
        
        if (!this.a.pinned && !this.b.pinned) {
            this.a.position.add(correction);
            this.b.position.sub(correction);
        } else if (!this.a.pinned) {
            this.a.position.add(correction.multiplyScalar(2));
        } else if (!this.b.pinned) {
            this.b.position.sub(correction.multiplyScalar(2));
        }
    }
}

export class ClothSimulator {
    constructor(width = 1.0, height = 1.2, cols = 10, rows = 12, bendAngle = 0) {
        this.width = width;
        this.height = height;
        this.cols = cols;
        this.rows = rows;
        this.bendAngle = bendAngle;
        this.points = [];
        this.constraints = [];
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        this.wind = new THREE.Vector3(0, 0, -5.0); // Constant backward force
        
        this.init();
    }

    init() {
        const dy = this.height / (this.rows - 1);
        const radius = this.bendAngle > 0.01 ? this.width / this.bendAngle : 0;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let x, z;
                if (this.bendAngle > 0.01) {
                    const theta = (c / (this.cols - 1) - 0.5) * this.bendAngle;
                    x = radius * Math.sin(theta);
                    z = -radius * (1 - Math.cos(theta)); // Curve backward (edges towards -Z)
                } else {
                    const dx = this.width / (this.cols - 1);
                    x = (c - (this.cols - 1) / 2) * dx;
                    z = 0;
                }

                const p = new Point(x, -r * dy, z);
                if (r === 0) {
                    p.pinned = true;
                }
                this.points.push(p);
            }
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const idx = r * this.cols + c;
                if (c < this.cols - 1) {
                    const p1 = this.points[idx];
                    const p2 = this.points[idx + 1];
                    // Use actual distance for rest length to support curvature
                    const dist = p1.position.distanceTo(p2.position);
                    this.constraints.push(new Constraint(p1, p2, dist));
                }
                if (r < this.rows - 1) {
                    this.constraints.push(new Constraint(this.points[idx], this.points[idx + this.cols], dy));
                }
            }
        }
    }

    update(dt, anchorTransform, collisionSpheres = [], anchorVelocity = null) {
        // Initialize points to world space on first run
        if (!this.isInitialized) {
            for (const p of this.points) {
                // p.position is currently Local (from constructor)
                p.position.applyMatrix4(anchorTransform); // Convert to World
                p.prevPosition.copy(p.position);          // Reset momentum
                // We keep p.originalPosition as Local for pinning calculations
            }
            this.isInitialized = true;
        }

        const subSteps = 8;
        const sdt = dt / subSteps;

        // Update pins based on anchor
        const anchorRotation = new THREE.Quaternion();
        anchorTransform.decompose(new THREE.Vector3(), anchorRotation, new THREE.Vector3());
        
        // Calculate world wind based on anchor rotation
        const localWind = new THREE.Vector3(0, 0, -5.0);
        const worldWind = localWind.applyQuaternion(anchorRotation);

        // Add movement drag: push cloak opposite to movement direction
        if (anchorVelocity) {
            const dragStrength = 2.5; // Tunable multiplier
            const movementDrag = anchorVelocity.clone().multiplyScalar(-dragStrength);
            // Cap the drag force to prevent extreme behavior
            if (movementDrag.length() > 15) movementDrag.normalize().multiplyScalar(15);
            worldWind.add(movementDrag);
        }
        
        for (let c = 0; c < this.cols; c++) {
            const p = this.points[c];
            if (p.pinned) {
                p.pinPosition.copy(p.originalPosition).applyMatrix4(anchorTransform);
            }
        }

        const resolveCollisions = (p) => {
            if (p.pinned) return;
            for (const sphere of collisionSpheres) {
                const distSq = p.position.distanceToSquared(sphere.center);
                const minDist = sphere.radius + 0.02; // Add small padding
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    const push = p.position.clone().sub(sphere.center).normalize().multiplyScalar(minDist - dist);
                    p.position.add(push);
                }
            }
        };

        for (let i = 0; i < subSteps; i++) {
            for (const p of this.points) {
                // Combine gravity (world space) and dynamic world wind
                const totalForce = this.gravity.clone().add(worldWind);
                p.update(sdt, totalForce);
                resolveCollisions(p);
            }
            for (const c of this.constraints) c.satisfy();
        }
    }

    createMesh(material) {
        const geometry = new THREE.PlaneGeometry(this.width, this.height, this.cols - 1, this.rows - 1);
        // Align geometry so top edge is at origin (0,0,0) and it hangs down
        geometry.translate(0, -this.height / 2, 0);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        this.mesh = mesh;
        return mesh;
    }

    updateMesh() {
        if (!this.mesh) return;
        const posAttr = this.mesh.geometry.attributes.position;
        const vertex = new THREE.Vector3();
        const inverseModelMatrix = new THREE.Matrix4().copy(this.mesh.matrixWorld).invert();

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i].position;
            // Convert World Space physics position to Mesh Local Space
            vertex.copy(p).applyMatrix4(inverseModelMatrix);
            posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        posAttr.needsUpdate = true;
        this.mesh.geometry.computeVertexNormals();
    }
}
