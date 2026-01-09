
import * as THREE from 'three';
import { PlayerModel } from '../PlayerModel';

const CHAKRA_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vColor;
uniform float uTime;

void main() {
    vUv = uv;
    vNormal = normal;
    vColor = instanceColor; 
    
    vec3 pos = position;
    
    // --- FLUIDITY ---
    float angle = pos.y * 8.0 - uTime * 3.0;
    float pulse = sin(angle) * 0.15; // Increased pulse relative to radius
    
    // --- ELECTRICITY ---
    float jitterSpeed = uTime * 20.0;
    float jitterVal = sin(pos.y * 10.0 + jitterSpeed) * cos(pos.y * 5.0 - jitterSpeed);
    float jitterAmt = 0.05; // Relative to unit size
    
    // Apply effects
    vec3 noise = normal * (pulse * 0.2 + jitterVal * jitterAmt);
    pos += noise;

    // Instance Matrix handles placement, rotation, and scaling (Length & Thickness)
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const CHAKRA_FRAGMENT_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vColor;
uniform float uTime;
uniform vec3 uCoreColor;

void main() {
    // Flowing Energy Pattern
    float flow = vUv.y * 3.0 - uTime * 4.0;
    
    float noise1 = sin(vUv.x * 12.0 + flow);
    float noise2 = cos(vUv.x * 20.0 - flow * 1.5);
    float plasma = abs(noise1 + noise2) * 0.5;
    
    // Fade at ends
    float endFade = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
    
    // Mix Base Color (Dark Blue) with Core Color (Light Blue) based on plasma intensity
    vec3 finalColor = mix(vColor, uCoreColor, plasma * 0.7);
    float alpha = (0.3 + plasma * 0.7) * endFade;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

const ORB_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vColor;
uniform float uTime;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vUv = uv;
    vNormal = normal;
    vColor = instanceColor;

    vec3 pos = position;
    
    // Pulsing size
    float pulse = sin(uTime * 3.0) * 0.1;
    pos *= (1.0 + pulse);
    
    // Spikey Jitter
    float spike = random(vec2(uTime, pos.x)) * 0.1;
    pos += normal * spike;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const ORB_FRAGMENT_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vColor;
uniform float uTime;
uniform vec3 uCoreColor;

void main() {
    float noise = sin(vUv.y * 20.0 + uTime * 5.0) * cos(vUv.x * 20.0 - uTime * 2.0);
    float plasma = abs(noise);
    
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
    
    // Mix Dark Blue Base with Light Blue Core/Fresnel
    vec3 finalColor = mix(vColor, uCoreColor, plasma * 0.5 + fresnel * 0.5);
    float alpha = 0.6 + plasma * 0.4;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

// --- Types ---

interface LinkData {
    start: THREE.Object3D;
    end: THREE.Object3D;
    color: THREE.Color;
}

interface OrbData {
    target: THREE.Object3D;
    color: THREE.Color;
}

// --- Main Class ---

export class ChakraNetwork {
    private scene: THREE.Scene;
    private initialized = false;

    // Instanced Meshes
    private beamMesh: THREE.InstancedMesh | null = null;
    private orbMesh: THREE.InstancedMesh | null = null;

    // Data for updates
    private links: LinkData[] = [];
    private orbs: OrbData[] = [];
    private addedOrbs = new Set<string>(); // Prevent duplicate orbs at joints

    // Helper math objects
    private _dummy = new THREE.Object3D();
    private _posA = new THREE.Vector3();
    private _posB = new THREE.Vector3();
    private _scale = new THREE.Vector3();
    private _color = new THREE.Color();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    private initInstancedMeshes(maxLinks: number, maxOrbs: number) {
        // --- Beams ---
        const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
        beamGeo.rotateX(Math.PI / 2); // Align to Z axis. Now Length is Z.
        
        const beamMat = new THREE.ShaderMaterial({
            vertexShader: CHAKRA_VERTEX_SHADER,
            fragmentShader: CHAKRA_FRAGMENT_SHADER,
            uniforms: {
                uTime: { value: 0 },
                uCoreColor: { value: new THREE.Color(0x44aaff) } // Light Blue Core
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.beamMesh = new THREE.InstancedMesh(beamGeo, beamMat, maxLinks);
        this.beamMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.beamMesh.frustumCulled = false; 
        this.beamMesh.visible = false; // Hidden by default
        this.scene.add(this.beamMesh);

        // --- Orbs ---
        const orbGeo = new THREE.SphereGeometry(1, 16, 16);
        const orbMat = new THREE.ShaderMaterial({
            vertexShader: ORB_VERTEX_SHADER,
            fragmentShader: ORB_FRAGMENT_SHADER,
            uniforms: {
                uTime: { value: 0 },
                uCoreColor: { value: new THREE.Color(0x44aaff) } // Light Blue Core
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.orbMesh = new THREE.InstancedMesh(orbGeo, orbMat, maxOrbs);
        this.orbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.orbMesh.frustumCulled = false;
        this.orbMesh.visible = false; // Hidden by default
        this.scene.add(this.orbMesh);
    }

    private addChain(chain: THREE.Object3D[], colorHex: number, withOrbs: boolean = true) {
        const color = new THREE.Color(colorHex);
        for (let i = 0; i < chain.length - 1; i++) {
            const start = chain[i];
            const end = chain[i+1];
            if (!start || !end) continue;

            this.links.push({ start, end, color });
            
            if (withOrbs) {
                // Add orb at start node if it's the first connection or unique
                this.addOrb(start, color);
                if (i === chain.length - 2) this.addOrb(end, color);
            }
        }
    }

    private addOrb(target: THREE.Object3D, color: THREE.Color) {
        if (this.addedOrbs.has(target.uuid)) return;
        this.addedOrbs.add(target.uuid);
        this.orbs.push({ target, color });
    }

    // Helper to get joints from finger group
    private getFingerJoints(fingerGroup: THREE.Group, wrist: THREE.Object3D): THREE.Object3D[] {
        const joints: THREE.Object3D[] = [wrist];
        const prox = fingerGroup.children.find(c => c.name === 'proximal');
        if (prox) {
            joints.push(prox);
            const dist = prox.children.find(c => c.name === 'distal');
            if (dist) {
                joints.push(dist);
                const tip = dist.children.find(c => c.type === 'Mesh' && c.position.y < -0.001);
                if (tip) joints.push(tip);
            }
        }
        return joints;
    }

    // Helper to traverse foot hierarchy (Ankle -> Anchor -> Heel/Forefoot -> Toes)
    private traverseFoot(shin: THREE.Object3D, ankle: THREE.Object3D, prefix: string, color: number) {
        const anchor = shin.children.find(c => c.name === `${prefix}_foot_anchor`);
        if (!anchor) return;

        // Link Ankle Joint to Foot Block
        this.addChain([ankle, anchor], color, true);

        // Link Anchor to Heel
        const heel = anchor.children.find(c => c.name === `${prefix}_heel`);
        if (heel) {
            this.addChain([anchor, heel], color, true);
        }

        // Link Anchor to Forefoot
        const forefoot = anchor.children.find(c => c.name === `${prefix}_forefoot`);
        if (forefoot) {
            this.addChain([anchor, forefoot], color, true);
            
            // Link Forefoot to each Toe Unit (No Orbs to reduce clutter)
            forefoot.children.forEach(c => {
                if (c.type === 'Group') { // toeUnit is a Group
                    this.addChain([forefoot, c], color, false);
                }
            });
        }
    }

    init(model: PlayerModel) {
        this.links = [];
        this.orbs = [];
        this.addedOrbs.clear();

        const parts = model.parts;
        
        // --- 1. Define Colors (Monochromatic Blue) ---
        const C_BASE_BLUE = 0x000088; // Dark Blue
        
        // --- 2. Build Connections ---
        
        // Spine
        if (parts.hips && parts.torsoContainer && parts.neck && parts.head) {
            this.addChain([parts.hips, parts.torsoContainer, parts.neck, parts.head], C_BASE_BLUE, true);
        }

        // Arms - Connecting from Shoulder Base (topCap)
        if (parts.leftArm && parts.leftForeArm && parts.leftHand) {
            const startNode = parts.topCap || parts.neck; 
            this.addChain([startNode, parts.leftArm, parts.leftForeArm, parts.leftHand], C_BASE_BLUE, true);
        }
        if (parts.rightArm && parts.rightForeArm && parts.rightHand) {
            const startNode = parts.topCap || parts.neck; 
            this.addChain([startNode, parts.rightArm, parts.rightForeArm, parts.rightHand], C_BASE_BLUE, true);
        }

        // Legs & Feet
        if (parts.leftThigh && parts.leftShin && parts.leftAnkle) {
            this.addChain([parts.hips, parts.leftThigh, parts.leftShin, parts.leftAnkle], C_BASE_BLUE, true);
            this.traverseFoot(parts.leftShin, parts.leftAnkle, 'left', C_BASE_BLUE);
        }
        if (parts.rightThigh && parts.rightShin && parts.rightAnkle) {
            this.addChain([parts.hips, parts.rightThigh, parts.rightShin, parts.rightAnkle], C_BASE_BLUE, true);
            this.traverseFoot(parts.rightShin, parts.rightAnkle, 'right', C_BASE_BLUE);
        }

        // Hands (Detailed, but NO Orbs for fingers)
        if (model.rightFingers && parts.rightHand) {
            if (model.rightThumb) {
                this.addChain(this.getFingerJoints(model.rightThumb, parts.rightHand), C_BASE_BLUE, false);
            }
            model.rightFingers.forEach((f, i) => {
                this.addChain(this.getFingerJoints(f, parts.rightHand), C_BASE_BLUE, false);
            });
        }

        if (model.leftFingers && parts.leftHand) {
            if (model.leftThumb) {
                this.addChain(this.getFingerJoints(model.leftThumb, parts.leftHand), C_BASE_BLUE, false);
            }
            model.leftFingers.forEach((f, i) => {
                this.addChain(this.getFingerJoints(f, parts.leftHand), C_BASE_BLUE, false);
            });
        }

        // --- 3. Initialize GPU Resources ---
        const maxLinks = this.links.length;
        const maxOrbs = this.orbs.length;
        
        this.initInstancedMeshes(maxLinks, maxOrbs);

        // --- 4. Set Static Colors ---
        // Beams
        if (this.beamMesh) {
            for (let i = 0; i < maxLinks; i++) {
                this.beamMesh.setColorAt(i, this.links[i].color);
            }
            if (this.beamMesh.instanceColor) this.beamMesh.instanceColor.needsUpdate = true;
        }
        // Orbs
        if (this.orbMesh) {
            for (let i = 0; i < maxOrbs; i++) {
                this.orbMesh.setColorAt(i, this.orbs[i].color);
            }
            if (this.orbMesh.instanceColor) this.orbMesh.instanceColor.needsUpdate = true;
        }

        this.initialized = true;
    }

    setVisible(visible: boolean) {
        if (this.beamMesh) this.beamMesh.visible = visible;
        if (this.orbMesh) this.orbMesh.visible = visible;
    }

    update(dt: number, model: PlayerModel) {
        if (!this.initialized) {
            if (model.parts.head) this.init(model);
            return;
        }

        const uTime = performance.now() * 0.001;

        // --- Update Beams ---
        if (this.beamMesh && this.beamMesh.visible) {
            (this.beamMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = uTime;
            
            for (let i = 0; i < this.links.length; i++) {
                const link = this.links[i];
                
                // Get World Positions
                link.start.getWorldPosition(this._posA);
                link.end.getWorldPosition(this._posB);
                
                const dist = this._posA.distanceTo(this._posB);
                if (dist < 0.001) {
                    this._dummy.scale.set(0,0,0);
                } else {
                    // Position at midpoint
                    this._dummy.position.lerpVectors(this._posA, this._posB, 0.5);
                    this._dummy.lookAt(this._posB); // Z points to target
                    
                    // Scale: Z = Length. X/Y = Thickness based on Length.
                    // Formula: thickness = constrained fraction of length
                    const thickness = Math.min(0.025, Math.max(0.002, dist * 0.15));
                    
                    this._dummy.scale.set(thickness, thickness, dist);
                }
                
                this._dummy.updateMatrix();
                this.beamMesh.setMatrixAt(i, this._dummy.matrix);
            }
            this.beamMesh.instanceMatrix.needsUpdate = true;
        }

        // --- Update Orbs ---
        if (this.orbMesh && this.orbMesh.visible) {
            (this.orbMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = uTime;

            for (let i = 0; i < this.orbs.length; i++) {
                const orb = this.orbs[i];
                orb.target.getWorldPosition(this._posA);
                
                this._dummy.position.copy(this._posA);
                this._dummy.rotation.set(0,0,0);
                
                this._dummy.scale.setScalar(0.025); 
                
                this._dummy.updateMatrix();
                this.orbMesh.setMatrixAt(i, this._dummy.matrix);
            }
            this.orbMesh.instanceMatrix.needsUpdate = true;
        }
    }

    dispose() {
        if (this.beamMesh) {
            this.scene.remove(this.beamMesh);
            this.beamMesh.dispose();
        }
        if (this.orbMesh) {
            this.scene.remove(this.orbMesh);
            this.orbMesh.dispose();
        }
        this.initialized = false;
        this.links = [];
        this.orbs = [];
        this.addedOrbs.clear();
    }
}
