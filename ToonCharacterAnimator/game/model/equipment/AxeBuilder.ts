
import * as THREE from 'three';

// --- Types ---
export interface WeaponConfig {
  type: string;
  handleLength: number;
  handleRadius: number;
  guardWidth: number;
  bladeLength: number;
  bladeWidth: number;
  bladeThickness: number;
  pommelSize: number;
  handleColor: string;
  metalColor: string;
  guardColor: string;
  roughness: number;
  metalness: number;
  effect: string;
  effectColor: string;
  variant?: string;
}

interface WeaponMaterials {
    handleMat: THREE.MeshStandardMaterial;
    metalMat: THREE.MeshStandardMaterial;
    guardMat: THREE.MeshStandardMaterial;
}

// --- Configuration ---
export const weaponConfig: WeaponConfig = {
  "type": "Axe",
  "handleLength": 0.4,
  "handleRadius": 0.025,
  "guardWidth": 0.05,
  "bladeLength": 0.2,
  "bladeWidth": 0.2,
  "bladeThickness": 0.02,
  "pommelSize": 0.03,
  "handleColor": "#8d6e63",
  "metalColor": "#b0bec5",
  "guardColor": "#5d4037",
  "roughness": 0.5,
  "metalness": 0.6,
  "effect": "None",
  "effectColor": "#ffffff"
};

// --- Geometry Utilities ---
const sharpenGeometry = (mesh: THREE.Mesh): void => {
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const bbox = geo.boundingBox!;
    const width = bbox.max.x - bbox.min.x;
    const pos = geo.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const relativeX = (x - bbox.min.x) / width;
        if (relativeX > 0.5) {
            const t = (relativeX - 0.5) / 0.5;
            arr[i+2] *= (1 - t * 0.95);
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
};

const createGripTexture = (length: number): THREE.Texture => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Background
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(0, 0, size, size);

    // Noise
    ctx.globalAlpha = 0.15;
    for(let i=0; i<30000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#ffffff';
        ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
    }

    // Diagonal Wraps
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 20;
    const numWraps = 4; 
    const step = size / numWraps;

    for (let i = -numWraps; i < numWraps * 2; i++) {
        const xOffset = i * step;
        
        ctx.beginPath();
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 8;
        ctx.moveTo(xOffset, 0);
        ctx.lineTo(xOffset + size, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.moveTo(xOffset + 6, 0);
        ctx.lineTo(xOffset + size + 6, size);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, Math.max(2, length * 5)); 
    return tex;
};

const getMaterials = (cfg: WeaponConfig): WeaponMaterials => {
    const gripTex = createGripTexture(cfg.handleLength);
    return {
        handleMat: new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(cfg.handleColor), 
            map: gripTex,
            bumpMap: gripTex,
            bumpScale: 0.05,
            roughnessMap: gripTex,
            roughness: 0.8,
            metalness: 0.1
        }),
        metalMat: new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(cfg.metalColor), 
            metalness: cfg.metalness, 
            roughness: cfg.roughness,
            emissive: cfg.effect !== 'None' ? new THREE.Color(cfg.effectColor) : new THREE.Color(0x000000),
            emissiveIntensity: cfg.effect !== 'None' ? 0.2 : 0
        }),
        guardMat: new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(cfg.guardColor), 
            metalness: cfg.metalness * 0.9, 
            roughness: cfg.roughness * 1.2 
        }),
    };
};

// --- Effect System ---
const applyEffectToMesh = (type: string, colorStr: string, targetMesh: THREE.Mesh, isRing?: boolean): ((dt: number) => void) | null => {
    targetMesh.geometry.computeBoundingBox();
    const box = targetMesh.geometry.boundingBox!;
    const size = new THREE.Vector3(); box.getSize(size);
    const color = new THREE.Color(colorStr);

    const getRandomPosition = (vec: THREE.Vector3) => {
        if (isRing) {
             const angle = Math.random() * Math.PI * 2;
             const r = (size.x / 2) * (0.85 + Math.random() * 0.15); 
             vec.set(Math.cos(angle) * r, Math.sin(angle) * r, (Math.random()-0.5) * size.z);
        } else {
             vec.set((Math.random()-0.5)*size.x, (Math.random()-0.5)*size.y, (Math.random()-0.5)*size.z);
        }
    };

    if (type === 'Fire' || type === 'Poison' || type === 'Frost') {
        const count = 150;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const offsets = new Float32Array(count);
        for(let i=0; i<count; i++) {
            const v = new THREE.Vector3();
            getRandomPosition(v);
            pos[i*3]=v.x; pos[i*3+1]=v.y; pos[i*3+2]=v.z;
            sizes[i]=Math.random(); offsets[i]=Math.random()*100;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const mat = new THREE.PointsMaterial({ color: color, size: 0.1, transparent: true, blending: THREE.AdditiveBlending });
        const points = new THREE.Points(geo, mat);
        if (isRing && type === 'Fire') {
            const glowGeo = targetMesh.geometry.clone();
            const glowMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.scale.multiplyScalar(1.05);
            points.add(glow);
        }
        targetMesh.add(points);
        return (dt: number) => { 
            // Simplified animation for export
            mat.opacity = 0.5 + Math.sin(Date.now() * 0.005) * 0.5; 
        };
    }
    return null;
};

const applyEffects = (group: THREE.Group, cfg: WeaponConfig, mats: WeaponMaterials) => {
    if (!cfg.effect || cfg.effect === 'None') return;
    const updates: ((dt: number) => void)[] = [];
    const addEff = (target: THREE.Object3D | undefined) => {
        if (!target || !(target instanceof THREE.Mesh)) return;
        const isRing = target.userData && target.userData.isRing;
        const up = applyEffectToMesh(cfg.effect, cfg.effectColor, target, isRing);
        if (up) updates.push(up);
    };

    let target: THREE.Object3D | undefined = group.getObjectByName('damagePart');
    if (!target) {
        group.traverse((c) => { if(c instanceof THREE.Mesh && c.material === mats.metalMat) target = c; });
    }
    addEff(target);
    
    if (updates.length > 0) {
        group.userData.updateEffect = (dt: number) => updates.forEach(u => u(dt));
    }
};

// --- Builder Function ---
function createWeapon(): THREE.Group {
    const group = new THREE.Group();
    const cfg = weaponConfig;
    const mats = getMaterials(cfg);
    // Adjusted scale factor to match game character size (approx 0.6-0.7m length)
    // Original snippet used 5.0 which resulted in 2m axe. 
    // 0.4 * 1.6 = 0.64m
    const s = 1.6; 

    // Dimensions
    const handleH = cfg.handleLength * s;
    const handleR = cfg.handleRadius * s;
    const bladeL = cfg.bladeLength * s;
    const bladeW = cfg.bladeWidth * s;
    const bladeT = cfg.bladeThickness * s;
    const pommelR = cfg.pommelSize * s;

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 16), mats.handleMat);
    handle.position.y = handleH / 2;
    group.add(handle);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(pommelR, 16, 16), mats.guardMat);
    pommel.position.y = -pommelR * 0.5;
    group.add(pommel);
    const capH = 0.1 * s;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(handleR*1.1, handleR, capH), mats.guardMat);
    cap.position.y = handleH;
    group.add(cap);
    
    // Axe Head
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(bladeW, bladeL / 2);
    shape.quadraticCurveTo(bladeW * 0.8, 0, bladeW, -bladeL / 2);
    shape.lineTo(0, -bladeL * 0.2);
    const axeGeo = new THREE.ExtrudeGeometry(shape, { steps: 4, depth: bladeT, bevelEnabled: false });
    axeGeo.translate(0, 0, -bladeT/2);
    const axeHead = new THREE.Mesh(axeGeo, mats.metalMat);
    axeHead.position.set(handleR * 0.5, handleH - (bladeL * 0.1), 0);
    sharpenGeometry(axeHead);
    axeHead.name = 'damagePart';
    group.add(axeHead);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(bladeT, bladeW * 0.4, 8), mats.guardMat);
    spike.rotation.z = Math.PI/2;
    spike.position.set(-handleR, handleH - (bladeL * 0.1), 0);
    group.add(spike);
      
    // Apply Effects
    applyEffects(group, cfg, mats);

    return group;
}

export class AxeBuilder {
    static build(woodMat: THREE.Material, metalMat: THREE.Material): THREE.Group {
        const group = createWeapon();
        
        // Align to game coordinate system (Hand holds X-axis, provided axe is Y-axis)
        group.rotation.z = -Math.PI / 2;
        
        return group;
    }
}
