import { WeaponConfig, WeaponType, WeaponEffect, TextureStyle } from '../types';

export const generateWeaponScript = (config: WeaponConfig): string => {
  const commonUtils = `
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
  handleTexture?: string;
  bladeTexture?: string;
}

interface WeaponMaterials {
    handleMat: THREE.MeshStandardMaterial;
    metalMat: THREE.MeshStandardMaterial;
    guardMat: THREE.MeshStandardMaterial;
}

// --- Geometry Utilities ---
const makeTaperedBox = (width: number, height: number, depth: number, material: THREE.Material, taperFactorX: number = 0.02, taperFactorZ: number = 0.02): THREE.Mesh => {
    // 4 width segments for diamond/hexagonal profile
    const geo = new THREE.BoxGeometry(width, height, depth, 4, 4, 1);
    const pos = geo.attributes.position;
    const arr = pos.array;
    const halfH = height / 2;
    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        
        // Sharpen Edges
        if (Math.abs(x) > width * 0.35) {
             arr[i+2] *= 0.1; 
        }

        if (y > -halfH + 0.001) {
            const t = Math.max(0, Math.min(1, (y + halfH) / height));
            const scale = 1.0 * (1 - t) + taperFactorX * t;
            const scaleZ = 1.0 * (1 - t) + taperFactorZ * t;
            arr[i] *= scale;
            arr[i + 2] *= scaleZ;
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

const makeDoubleEdgedBlade = (width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh => {
    // 4 segments for central spine
    const geo = new THREE.BoxGeometry(width, height, depth, 4, 4, 1);
    const pos = geo.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
        // Keep center thick (spine), sharpen outer edges
        if (Math.abs(arr[i]) > width * 0.35) {
            arr[i+2] *= 0.05;
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

const makeWavyBox = (width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh => {
    const segments = 32;
    const geo = new THREE.BoxGeometry(width, height, depth, 4, segments, 2);
    const pos = geo.attributes.position;
    const arr = pos.array;
    const frequency = 5;
    const amplitude = width * 0.25;

    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const normalizedY = (y + height/2) / height;

        if (Math.abs(x) > width * 0.35) {
             arr[i+2] *= 0.1;
        }

        const wave = Math.sin(normalizedY * Math.PI * frequency) * amplitude;
        arr[i] += wave;
        if (normalizedY > 0.7) {
             const t = (normalizedY - 0.7) / 0.3;
             const scale = 1 - t;
             const currentX = arr[i] - wave;
             arr[i] = wave + (currentX * scale);
             arr[i+2] *= scale;
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

const makeCurvedBox = (width: number, height: number, depth: number, material: THREE.Material, curveAmount: number): THREE.Mesh => {
    const segments = 24;
    const geo = new THREE.BoxGeometry(width, height, depth, 4, segments, 2);
    const pos = geo.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const normalizedY = (y + height/2) / height; 

        if (Math.abs(x) > width * 0.35) {
             arr[i+2] *= 0.1;
        }

        const curve = Math.pow(normalizedY, 2) * curveAmount;
        arr[i] += curve;
        if (normalizedY > 0.8) {
             const t = (normalizedY - 0.8) / 0.2;
             arr[i+2] *= (1 - t);
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

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
        // Sharpen last 25% for a defined bevel
        if (relativeX > 0.75) {
            const t = (relativeX - 0.75) / 0.25;
            arr[i+2] *= (1 - t * 0.95);
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
};

const generateTexture = (style: string, colorStr: string) => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const baseColor = new THREE.Color(colorStr);
    const getHex = (c: THREE.Color) => '#' + c.getHexString();
    
    // Fill Background
    ctx.fillStyle = getHex(baseColor);
    ctx.fillRect(0, 0, size, size);

    if (style === '${TextureStyle.NONE}') {
        return new THREE.Texture(); 
    }

    const darken = (c: THREE.Color, amt: number) => {
        const h = c.clone().offsetHSL(0, 0, -amt);
        return getHex(h);
    }
    const lighten = (c: THREE.Color, amt: number) => {
        const h = c.clone().offsetHSL(0, 0, amt);
        return getHex(h);
    }

    if (style === '${TextureStyle.CLOTH}') {
        ctx.globalAlpha = 0.15;
        for(let i=0; i<30000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#ffffff';
            ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
        }
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 20;
        const numWraps = 4; 
        const step = size / numWraps;
        for (let i = -numWraps; i < numWraps * 2; i++) {
            const xOffset = i * step;
            ctx.beginPath();
            ctx.strokeStyle = darken(baseColor, 0.2);
            ctx.lineWidth = 8;
            ctx.moveTo(xOffset, 0); ctx.lineTo(xOffset + size, size); ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = lighten(baseColor, 0.1);
            ctx.lineWidth = 2;
            ctx.moveTo(xOffset + 6, 0); ctx.lineTo(xOffset + size + 6, size); ctx.stroke();
        }
    }
    else if (style === '${TextureStyle.LEATHER}') {
        ctx.globalAlpha = 0.3;
        for(let i=0; i<5000; i++) {
            const x = Math.random() * size; const y = Math.random() * size;
            const r = Math.random() * 3 + 1;
            ctx.fillStyle = darken(baseColor, 0.15);
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 0.1;
        for(let i=0; i<200; i++) {
            ctx.strokeStyle = lighten(baseColor, 0.1);
            ctx.lineWidth = 1;
            ctx.beginPath();
            const x = Math.random() * size; const y = Math.random() * size;
            ctx.moveTo(x,y); ctx.lineTo(x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*20);
            ctx.stroke();
        }
    }
    else if (style === '${TextureStyle.WOOD}') {
        ctx.globalAlpha = 0.2;
        for (let x = 0; x < size; x+=2) {
            const noise = (Math.sin(x * 0.05) + Math.sin(x*0.13)) * 20;
            ctx.strokeStyle = (x % 10 < 2) ? darken(baseColor, 0.2) : lighten(baseColor, 0.05);
            ctx.beginPath();
            ctx.moveTo(x + noise, 0); ctx.lineTo(x + noise, size); ctx.stroke();
        }
    }
    else if (style === '${TextureStyle.DAMASCUS}') {
        ctx.fillStyle = getHex(baseColor);
        ctx.fillRect(0,0,size,size);
        ctx.globalAlpha = 0.3;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x+=4) {
                const val = Math.sin(x * 0.02 + Math.sin(y * 0.05) * 5.0) * 0.5 + 0.5;
                if (val > 0.6) { ctx.fillStyle = lighten(baseColor, 0.2); ctx.fillRect(x, y, 4, 1); } 
                else if (val < 0.4) { ctx.fillStyle = darken(baseColor, 0.2); ctx.fillRect(x, y, 4, 1); }
            }
        }
    }
    else if (style === '${TextureStyle.SCALES}') {
         ctx.fillStyle = darken(baseColor, 0.3);
         ctx.fillRect(0,0,size,size);
         const scaleSize = 40;
         const rows = size / scaleSize;
         const cols = size / scaleSize;
         ctx.globalAlpha = 1.0;
         for(let y=0; y<rows; y++) {
             for(let x=0; x<cols; x++) {
                 const cx = x * scaleSize + (y%2 ? scaleSize/2 : 0);
                 const cy = y * scaleSize * 0.8;
                 ctx.fillStyle = getHex(baseColor);
                 ctx.strokeStyle = darken(baseColor, 0.4);
                 ctx.beginPath(); ctx.arc(cx, cy, scaleSize/2, 0, Math.PI, false); 
                 ctx.quadraticCurveTo(cx, cy + scaleSize, cx + scaleSize/2, cy); 
                 ctx.beginPath(); ctx.arc(cx, cy, scaleSize/2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                 ctx.fillStyle = lighten(baseColor, 0.3);
                 ctx.beginPath(); ctx.arc(cx, cy - scaleSize*0.1, scaleSize*0.3, 0, Math.PI * 2); ctx.fill();
             }
         }
    }
    else if (style === '${TextureStyle.RUST}') {
        ctx.fillStyle = getHex(baseColor);
        ctx.fillRect(0,0,size,size);
        for(let i=0; i<40000; i++) {
            ctx.fillStyle = Math.random() > 0.6 ? '#5d4037' : (Math.random() > 0.5 ? '#bf360c' : getHex(baseColor));
            ctx.globalAlpha = Math.random() * 0.5;
            ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
        }
    }
    else if (style === '${TextureStyle.COSMIC}') {
        ctx.fillStyle = '#0a001a';
        ctx.fillRect(0,0,size,size);
        for(let i=0; i<5; i++) {
             const x = Math.random()*size; const y=Math.random()*size; const r=Math.random()*200+100;
             const grad = ctx.createRadialGradient(x,y,0,x,y,r);
             grad.addColorStop(0, i%2==0 ? 'rgba(75,0,130,0.4)' : 'rgba(0,0,139,0.4)');
             grad.addColorStop(1, 'rgba(0,0,0,0)');
             ctx.fillStyle = grad;
             ctx.fillRect(0,0,size,size);
        }
        ctx.fillStyle = '#ffffff';
        for(let i=0; i<300; i++) {
             ctx.globalAlpha = Math.random();
             const s = Math.random() > 0.95 ? 2 : 1;
             ctx.fillRect(Math.random()*size, Math.random()*size, s, s);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (style === '${TextureStyle.CLOTH}' || style === '${TextureStyle.WOOD}' || style === '${TextureStyle.DAMASCUS}') {
         tex.repeat.set(1, 1);
    } else {
         tex.repeat.set(2, 2);
    }
    return tex;
};

const getMaterials = (cfg: WeaponConfig): WeaponMaterials => {
    const handleStyle = cfg.handleTexture || '${TextureStyle.NONE}';
    const bladeStyle = cfg.bladeTexture || '${TextureStyle.NONE}';

    const handleTex = generateTexture(handleStyle, cfg.handleColor);
    const bladeTex = generateTexture(bladeStyle, cfg.metalColor);

    if (handleStyle === '${TextureStyle.CLOTH}' || handleStyle === '${TextureStyle.WOOD}') {
         handleTex.repeat.set(1, Math.max(1, cfg.handleLength * 3));
    }
    if (bladeStyle === '${TextureStyle.DAMASCUS}' || bladeStyle === '${TextureStyle.WOOD}') {
         bladeTex.repeat.set(1, Math.max(1, cfg.bladeLength * 2));
    }

    const matProps = (tex: THREE.Texture, baseColor: string, r: number, m: number) => {
        const hasTex = tex.image && (tex.image as any).width > 1; 
        return {
            color: new THREE.Color(baseColor),
            map: hasTex ? tex : null,
            bumpMap: hasTex ? tex : null,
            bumpScale: 0.02,
            roughnessMap: hasTex ? tex : null,
            roughness: r,
            metalness: m,
            emissive: cfg.effect !== '${WeaponEffect.NONE}' ? new THREE.Color(cfg.effectColor) : new THREE.Color(0x000000),
            emissiveIntensity: cfg.effect !== '${WeaponEffect.NONE}' ? 0.2 : 0
        };
    };

    return {
        handleMat: new THREE.MeshStandardMaterial(matProps(handleTex, cfg.handleColor, 0.8, 0.1)),
        metalMat: new THREE.MeshStandardMaterial(matProps(bladeTex, cfg.metalColor, cfg.roughness, cfg.metalness)),
        guardMat: new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(cfg.guardColor), 
            metalness: cfg.metalness * 0.9, 
            roughness: cfg.roughness * 1.2 
        }),
    };
};
`;

  const effectLogic = `
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

    if (type === '${WeaponEffect.FIRE}' || type === '${WeaponEffect.POISON}' || type === '${WeaponEffect.FROST}') {
        const particleCount = type === '${WeaponEffect.POISON}' ? 200 : 150;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const offsets = new Float32Array(particleCount);
        for(let i=0; i<particleCount; i++) {
            const v = new THREE.Vector3();
            getRandomPosition(v);
            pos[i*3]=v.x; pos[i*3+1]=v.y; pos[i*3+2]=v.z;
            sizes[i]=Math.random(); offsets[i]=Math.random()*100;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
        
        let vertexShader = '';
        if (type === '${WeaponEffect.POISON}') {
             vertexShader = \`
                attribute float size;
                attribute float offset;
                varying float vOpacity;
                uniform float time;
                uniform float speed;
                void main() {
                    vec3 pos = position;
                    float life = mod(time * speed + offset, 2.0);
                    // Gravity
                    pos.y -= life * 1.5;
                    // Minimal sway
                    pos.x += sin(time * 2.0 + offset) * 0.02;
                    pos.z += cos(time * 1.5 + offset) * 0.02;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * 120.0 / -mvPosition.z;
                    gl_Position = projectionMatrix * mvPosition;
                    vOpacity = 1.0 - smoothstep(1.5, 2.0, life);
                }
             \`;
        } else if (type === '${WeaponEffect.FIRE}') {
            vertexShader = \`
                attribute float size;
                attribute float offset;
                varying float vOpacity;
                uniform float time;
                uniform float speed;
                void main() {
                    vec3 pos = position;
                    float life = mod(time * speed + offset, 2.0);
                    \${isRing ? 'pos *= (1.0 + life * 0.2);' : 'pos.y -= life * 1.0;'}
                    pos.x += sin(time * 5.0 + offset) * 0.05;
                    pos.z += cos(time * 4.0 + offset) * 0.05;
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * 200.0 / -mvPosition.z;
                    gl_Position = projectionMatrix * mvPosition;
                    vOpacity = 1.0 - (life / 2.0);
                }
            \`;
        } else {
             vertexShader = \`
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
            \`;
        }

        const mat = new THREE.ShaderMaterial({
             uniforms: {
                color: { value: color },
                time: { value: 0 },
                speed: { value: type === '${WeaponEffect.POISON}' ? 1.5 : 2.0 }
             },
             vertexShader: vertexShader,
             fragmentShader: \`
                uniform vec3 color;
                varying float vOpacity;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float dist = length(coord);
                    if(dist > 0.5) discard;
                    float alpha = \${type === '${WeaponEffect.POISON}' ? 'smoothstep(0.5, 0.4, dist)' : '(0.5 - dist) * 2.0'} * vOpacity;
                    gl_FragColor = vec4(color, alpha);
                }
             \`,
             transparent: true,
             depthWrite: false,
             blending: type === '${WeaponEffect.POISON}' ? THREE.NormalBlending : THREE.AdditiveBlending
        });

        const points = new THREE.Points(geo, mat);
        if (isRing && type === '${WeaponEffect.FIRE}') {
            const glowGeo = targetMesh.geometry.clone();
            const glowMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.scale.multiplyScalar(1.05);
            points.add(glow);
        }
        targetMesh.add(points);
        return (dt: number) => { 
            mat.uniforms.time.value += dt;
        };
    }
    // ... Other effects (Placeholder for full implementation in viewer) ...
    return null;
};

const applyEffects = (group: THREE.Group, cfg: WeaponConfig, mats: WeaponMaterials) => {
    if (!cfg.effect || cfg.effect === '${WeaponEffect.NONE}') return;
    const updates: ((dt: number) => void)[] = [];
    const addEff = (target: THREE.Object3D | undefined) => {
        if (!target || !(target instanceof THREE.Mesh)) return;
        const isRing = target.userData && target.userData.isRing;
        const up = applyEffectToMesh(cfg.effect, cfg.effectColor, target, isRing);
        if (up) updates.push(up);
    };

    if (cfg.type === '${WeaponType.ARROW}') {
        const tip = group.getObjectByName('damagePart');
        const shaft = group.getObjectByName('shaftPart');
        if (cfg.effect === '${WeaponEffect.POISON}' || cfg.effect === '${WeaponEffect.MUD}') {
            addEff(tip);
        } else {
            addEff(tip);
            addEff(shaft);
        }
    } else {
        let target: THREE.Object3D | undefined = group.getObjectByName('damagePart');
        if (!target) {
            group.traverse((c) => { if(c instanceof THREE.Mesh && c.material === mats.metalMat) target = c; });
        }
        addEff(target);
    }
    if (updates.length > 0) {
        group.userData.updateEffect = (dt: number) => updates.forEach(u => u(dt));
    }
};
`;

  const generators: Record<string, string> = {
      [WeaponType.SHIRT]: `
        const s = 5.0; // SCALE_FACTOR
        // Map Config to Shirt Properties
        const mainColor = cfg.handleColor; // Base fabric color
        const stripeColor = cfg.metalColor; // Detail/Stripe color
        const isLeather = cfg.handleTexture === '${TextureStyle.LEATHER}';

        // --- Procedural Texture Generation ---
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if (isLeather) {
                ctx.fillStyle = mainColor;
                ctx.fillRect(0, 0, 512, 512);
                for (let i = 0; i < 2000; i++) {
                    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.01)';
                    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
                }
                ctx.strokeStyle = stripeColor; 
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.setLineDash([10, 8]);
                ctx.strokeRect(10, 10, 492, 492);
                ctx.strokeRect(128, 0, 256, 512); 
                ctx.globalAlpha = 1.0;
                ctx.setLineDash([]);
            } else {
                ctx.fillStyle = mainColor;
                ctx.fillRect(0, 0, 512, 512);
                const detailColor = stripeColor;
                ctx.fillStyle = detailColor;
                ctx.globalAlpha = 0.4;
                ctx.fillRect(100, 0, 60, 512);
                ctx.fillRect(350, 0, 60, 512);
                ctx.fillRect(0, 150, 512, 60);
                ctx.fillRect(0, 350, 512, 60);
                ctx.fillStyle = '#000000';
                ctx.globalAlpha = 0.1;
                ctx.fillRect(100, 150, 60, 60);
                ctx.fillRect(350, 350, 60, 60);
                ctx.fillRect(100, 350, 60, 60);
                ctx.fillRect(350, 150, 60, 60);
            }
        }
        const shirtTex = new THREE.CanvasTexture(canvas);
        shirtTex.wrapS = THREE.RepeatWrapping;
        shirtTex.wrapT = THREE.RepeatWrapping;
        shirtTex.repeat.set(2, 1); 

        const shirtMat = new THREE.MeshStandardMaterial({ 
            map: shirtTex,
            roughness: cfg.roughness,
            metalness: cfg.metalness * 0.1 
        });

        // Dimensions
        const torsoLen = cfg.handleLength * s;
        const torsoRadius = cfg.handleRadius * s; 
        
        // 1. Torso
        const torsoGeo = new THREE.CylinderGeometry(torsoRadius, torsoRadius * 0.85, torsoLen, 16);
        torsoGeo.scale(1, 1, 0.7); 
        const torso = new THREE.Mesh(torsoGeo, shirtMat);
        torso.position.y = torsoLen / 2;
        torso.name = 'damagePart';
        group.add(torso);

        // 2. Shoulders
        const shoulderRadius = torsoRadius * 1.05;
        const shoulderGeo = new THREE.SphereGeometry(shoulderRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        shoulderGeo.scale(1, 0.45, 0.7); 
        const shoulderCap = new THREE.Mesh(shoulderGeo, shirtMat);
        shoulderCap.position.y = torsoLen / 2;
        torso.add(shoulderCap);

        // 3. Sleeves
        const sleeveRadius = cfg.guardWidth * s;
        const sleeveLen = cfg.bladeLength * s;

        const rSleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius * 0.8, sleeveLen, 12);
        const rSleeve = new THREE.Mesh(rSleeveGeo, shirtMat);
        rSleeve.rotation.z = -Math.PI / 4;
        rSleeve.position.set(torsoRadius, torsoLen * 0.4, 0);
        rSleeve.position.x += sleeveLen * 0.3; 
        group.add(rSleeve);

        const lSleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius * 0.8, sleeveLen, 12);
        const lSleeve = new THREE.Mesh(lSleeveGeo, shirtMat);
        lSleeve.rotation.z = Math.PI / 4;
        lSleeve.position.set(-torsoRadius, torsoLen * 0.4, 0);
        lSleeve.position.x -= sleeveLen * 0.3;
        group.add(lSleeve);

        group.position.y = -torsoLen / 2;
      `,
      [WeaponType.FISHING_POLE]: `
        // Config mapping
        const handleH = cfg.handleLength * s; // Cork grip length
        const handleR = cfg.handleRadius * s; // Grip thickness
        const reelSize = cfg.guardWidth * s; // Reel scale
        const rodL = cfg.bladeLength * s; // Rod shaft length
        const lineL = cfg.bladeWidth * s; // Line length hanging down
        const lineThick = Math.max(0.005, cfg.bladeThickness * s); // Line thickness
        const bobberSize = cfg.pommelSize * s; // Bobber size

        // 1. Handle (Cork/Foam Grip)
        const handleGeo = new THREE.CylinderGeometry(handleR, handleR, handleH, 16);
        const handle = new THREE.Mesh(handleGeo, mats.handleMat);
        handle.position.y = handleH / 2;
        group.add(handle);

        // 2. Reel Seat & Mechanism
        const reelGroup = new THREE.Group();
        reelGroup.position.set(0, handleH * 0.8, handleR * 1.2);
        
        // Reel Stem
        const stem = new THREE.Mesh(new THREE.BoxGeometry(handleR, handleR, handleR*2), mats.metalMat);
        reelGroup.add(stem);
        
        // Reel Spool (Cylinder)
        const spool = new THREE.Mesh(new THREE.CylinderGeometry(reelSize, reelSize, reelSize * 0.8, 16), mats.metalMat);
        spool.rotation.z = Math.PI / 2;
        spool.position.z = handleR + reelSize * 0.4;
        reelGroup.add(spool);

        // Handle Crank
        const crank = new THREE.Mesh(new THREE.BoxGeometry(reelSize * 0.2, reelSize * 0.8, reelSize * 0.1), mats.guardMat);
        crank.position.set(reelSize * 0.5, 0, handleR + reelSize * 0.8);
        reelGroup.add(crank);
        
        group.add(reelGroup);

        // 3. Rod Shaft (Tapered)
        const rodGeo = new THREE.CylinderGeometry(handleR * 0.2, handleR * 0.8, rodL, 8);
        const rod = new THREE.Mesh(rodGeo, mats.metalMat);
        rod.position.y = handleH + rodL / 2;
        group.add(rod);

        // 4. Eyelets (Rings along the rod)
        const numEyes = 4;
        for(let i = 0; i < numEyes; i++) {
            const t = (i + 1) / (numEyes + 1);
            const yPos = handleH + rodL * t;
            const r = (handleR * 0.5) * (1 - t) + 0.02; 
            
            const eye = new THREE.Mesh(new THREE.TorusGeometry(r, r*0.2, 4, 12), mats.metalMat);
            eye.position.set(0, yPos, (handleR * 0.8 * (1-t) + handleR * 0.2 * t)); 
            eye.rotation.x = Math.PI / 2;
            group.add(eye);
        }

        // 5. Fishing Line
        const tipY = handleH + rodL;
        const tipOffsetZ = handleR * 0.2; 
        
        const lineGeo = new THREE.CylinderGeometry(lineThick, lineThick, lineL, 4);
        const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
        line.position.set(0, tipY - lineL/2, tipOffsetZ);
        group.add(line);

        // 6. Bobber
        const bobberGeo = new THREE.SphereGeometry(bobberSize, 16, 16);
        const bobber = new THREE.Mesh(bobberGeo, new THREE.MeshStandardMaterial({ color: cfg.guardColor, roughness: 0.2 }));
        bobber.position.set(0, tipY - lineL, tipOffsetZ);
        bobber.name = 'damagePart'; 
        group.add(bobber);
        
        group.position.y = -handleH / 2;
      `,
      [WeaponType.SWORD]: `
    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 16), mats.handleMat);
    handle.position.y = handleH / 2;
    group.add(handle);
    // Pommel
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(pommelR, 16, 16), mats.guardMat);
    pommel.position.y = -pommelR * 0.5;
    group.add(pommel);
    
    const connectionY = handleH;
    const variant = cfg.variant || 'standard';

    // Guard
    if (variant === 'rapier') {
        mats.guardMat.side = THREE.DoubleSide;
        const cupGeo = new THREE.SphereGeometry(guardW * 0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const guard = new THREE.Mesh(cupGeo, mats.guardMat);
        guard.rotation.x = Math.PI;
        guard.position.y = connectionY + (guardW * 0.2);
        group.add(guard);
    } else if (variant === 'katana') {
        const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(guardW * 0.5, guardW * 0.5, 0.02 * s, 16), mats.guardMat);
        tsuba.position.y = connectionY;
        group.add(tsuba);
    } else {
        const guardH = 0.05 * s;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(guardW, guardH, 0.06 * s), mats.guardMat);
        guard.position.y = connectionY;
        group.add(guard);
    }

    // Blade
    let blade: THREE.Mesh;
    const bladeStartY = connectionY + (variant === 'rapier' ? 0 : 0.02 * s);
    
    if (variant === 'wavy') {
        blade = makeWavyBox(bladeW, bladeL, bladeT, mats.metalMat);
        blade.position.y = bladeStartY + bladeL/2;
    } else if (variant === 'katana') {
        blade = makeCurvedBox(bladeW, bladeL, bladeT, mats.metalMat, -bladeL * 0.15);
        blade.position.y = bladeStartY + bladeL/2;
    } else if (variant === 'rapier') {
        blade = makeTaperedBox(bladeW, bladeL, bladeT, mats.metalMat, 0.1, 0.1);
        blade.position.y = bladeStartY + bladeL/2;
    } else {
        const bladeMainH = bladeL * 0.8; 
        blade = makeDoubleEdgedBlade(bladeW, bladeMainH, bladeT, mats.metalMat);
        blade.position.y = bladeStartY + (bladeMainH / 2);
        const tipH = bladeL * 0.2;
        const tip = makeTaperedBox(bladeW, tipH, bladeT, mats.metalMat);
        tip.position.y = bladeStartY + bladeMainH + (tipH/2);
        group.add(tip);
    }
    blade.name = 'damagePart';
    group.add(blade);
      `,
      [WeaponType.DAGGER]: `
    // Dagger uses Sword logic but typically smaller. 
    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 16), mats.handleMat);
    handle.position.y = handleH / 2;
    group.add(handle);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(pommelR, 16, 16), mats.guardMat);
    pommel.position.y = -pommelR * 0.5;
    group.add(pommel);
    const guardH = 0.05 * s;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(guardW, guardH, 0.06 * s), mats.guardMat);
    guard.position.y = handleH;
    group.add(guard);
    
    let blade: THREE.Mesh;
    if (cfg.variant === 'wavy') {
        blade = makeWavyBox(bladeW, bladeL, bladeT, mats.metalMat);
        blade.position.y = handleH + bladeL/2;
    } else {
        const bladeMainH = bladeL * 0.7; 
        blade = makeDoubleEdgedBlade(bladeW, bladeMainH, bladeT, mats.metalMat);
        blade.position.y = handleH + (bladeMainH / 2) + (guardH/2);
        const tipH = bladeL * 0.3;
        const tip = makeTaperedBox(bladeW, tipH, bladeT, mats.metalMat);
        tip.position.y = handleH + bladeMainH + (guardH/2) + (tipH/2);
        group.add(tip);
    }
    blade.name = 'damagePart';
    group.add(blade);
      `,
      [WeaponType.AXE]: `
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
      `,
      [WeaponType.SPEAR]: `
    // Shaft
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 16), mats.handleMat);
    handle.position.y = handleH / 2;
    group.add(handle);
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(handleR, 0, pommelR * 2, 8), mats.guardMat);
    pommel.position.y = -pommelR;
    group.add(pommel);
    const collarH = 0.1 * s;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(handleR * 1.2, handleR, collarH, 12), mats.guardMat);
    collar.position.y = handleH - collarH/2;
    group.add(collar);
    const tip = makeTaperedBox(bladeW, bladeL, bladeT, mats.metalMat, 0.01, 0.1);
    tip.position.y = handleH + bladeL/2;
    tip.name = 'damagePart';
    group.add(tip);
      `,
      [WeaponType.MACE]: `
    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 16), mats.handleMat);
    handle.position.y = handleH / 2;
    group.add(handle);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(pommelR, 16, 16), mats.guardMat);
    pommel.position.y = -pommelR * 0.5;
    group.add(pommel);
    const neckH = 0.1 * s;
    const headR = bladeL * 0.5;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(headR, 1), mats.metalMat);
    head.position.y = handleH + neckH + headR;
    head.name = 'damagePart';
    group.add(head);
    const posAttr = head.geometry.attributes.position;
    for(let i=0; i< posAttr.count; i+=3) { 
        if (i % 6 !== 0) continue;
        const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        const spike = makeTaperedBox(bladeT, bladeW * 0.5, bladeT, mats.metalMat, 0, 0);
        spike.position.copy(head.position.clone().add(v));
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), v.normalize());
        spike.translateY(bladeW * 0.25);
        group.add(spike);
    }
      `,
      [WeaponType.KUNAI]: `
    const ring = new THREE.Mesh(new THREE.TorusGeometry(pommelR, pommelR * 0.2, 8, 16), mats.metalMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.y = 0;
    group.add(ring);
    
    // Handle above
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 12), mats.handleMat);
    handle.position.y = pommelR + handleH/2;
    group.add(handle);
    
    // Blade above
    const bladeStart = pommelR + handleH;
    const segments = 12;
    const bladeGeo = new THREE.BoxGeometry(bladeW, bladeL, bladeT, 4, segments, 1);
    const pos = bladeGeo.attributes.position;
    const arr = pos.array;
    bladeGeo.translate(0, bladeL/2, 0);

    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const v = Math.max(0, Math.min(1, y / bladeL));
        
        const widestV = 0.25;
        let scaleX = 1.0;
        
        if (v < widestV) {
             const baseRatio = (handleR * 1.8) / bladeW; 
             scaleX = THREE.MathUtils.lerp(baseRatio, 1.0, v / widestV);
        } else {
             scaleX = THREE.MathUtils.lerp(1.0, 0.0, (v - widestV) / (1 - widestV));
        }
        arr[i] = x * scaleX;
        
        const originalRelativeX = Math.abs(x) / (bladeW / 2);
        if (originalRelativeX > 0.35) {
            arr[i + 2] *= 0.05;
        } else {
            const tipTaper = v > 0.9 ? (1.0 - ((v - 0.9)/0.1)) : 1.0;
            arr[i + 2] *= tipTaper;
        }
    }
    pos.needsUpdate = true;
    bladeGeo.computeVertexNormals();

    const blade = new THREE.Mesh(bladeGeo, mats.metalMat);
    blade.position.y = bladeStart;
    blade.name = 'damagePart';
    group.add(blade);
    group.position.y = -(pommelR + handleH + bladeL)/2;
      `,
      [WeaponType.CHAKRAM]: `
    const outerRadius = bladeL * 0.5; 
    const innerRadius = Math.max(0.01, outerRadius - (bladeW * 0.5));
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const ringGeo = new THREE.ExtrudeGeometry(shape, { steps: 2, depth: bladeT, bevelEnabled: true, bevelThickness: bladeT, bevelSize: bladeT, bevelSegments: 2 });
    ringGeo.translate(0, 0, -bladeT/2);
    const chakram = new THREE.Mesh(ringGeo, mats.metalMat);
    chakram.rotation.x = Math.PI / 2; 
    chakram.position.y = outerRadius;
    chakram.name = 'damagePart';
    chakram.userData.isRing = true;
    group.add(chakram);
      `,
      [WeaponType.ARROW]: `
    // Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 12), mats.handleMat);
    shaft.position.y = handleH / 2;
    shaft.name = 'shaftPart';
    group.add(shaft);
    // Fletch
    const fletchGeo = new THREE.PlaneGeometry(guardW, handleH * 0.25);
    for (let i = 0; i < 3; i++) {
        const fletch = new THREE.Mesh(fletchGeo, new THREE.MeshStandardMaterial({ color: cfg.guardColor, side: THREE.DoubleSide }));
        fletch.position.y = handleH * 0.15;
        fletch.rotation.y = (i / 3) * Math.PI * 2;
        fletch.translateZ(handleR);
        group.add(fletch);
    }
    // Tip
    const tip = makeTaperedBox(bladeW, bladeL, bladeT, mats.metalMat);
    tip.position.y = handleH + (bladeL / 2);
    tip.name = 'damagePart';
    group.add(tip);
      `
  };

  const selectedGenerator = generators[config.type] || generators[WeaponType.SWORD];

  return `import * as THREE from 'three';

// --- Configuration ---
export const weaponConfig: WeaponConfig = ${JSON.stringify(config, null, 2)};

${commonUtils}

${effectLogic}

// --- Builder Function ---
export function createWeapon(): THREE.Group {
    const group = new THREE.Group();
    const cfg = weaponConfig;
    const mats = getMaterials(cfg);
    const s = 5.0; // SCALE_FACTOR

    // Dimensions
    const handleH = cfg.handleLength * s;
    const handleR = cfg.handleRadius * s;
    const guardW = cfg.guardWidth * s;
    const bladeL = cfg.bladeLength * s;
    const bladeW = cfg.bladeWidth * s;
    const bladeT = cfg.bladeThickness * s;
    const pommelR = cfg.pommelSize * s;

    ${selectedGenerator}
    
    // Apply Effects
    applyEffects(group, cfg, mats);

    return group;
}
`;
};