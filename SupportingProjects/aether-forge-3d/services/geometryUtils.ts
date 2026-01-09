import * as THREE from 'three';
import { WeaponConfig, TextureStyle } from '../types';

export interface WeaponMaterials {
    handleMat: THREE.MeshStandardMaterial;
    metalMat: THREE.MeshStandardMaterial;
    guardMat: THREE.MeshStandardMaterial;
}

const generateTexture = (style: TextureStyle, colorStr: string) => {
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

    if (style === TextureStyle.NONE) {
        return new THREE.Texture(); // Plain color handled by material .color
    }

    const darken = (c: THREE.Color, amt: number) => {
        const h = c.clone().offsetHSL(0, 0, -amt);
        return getHex(h);
    }
    const lighten = (c: THREE.Color, amt: number) => {
        const h = c.clone().offsetHSL(0, 0, amt);
        return getHex(h);
    }

    if (style === TextureStyle.CLOTH) {
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
            ctx.strokeStyle = darken(baseColor, 0.2);
            ctx.lineWidth = 8;
            ctx.moveTo(xOffset, 0); ctx.lineTo(xOffset + size, size); ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = lighten(baseColor, 0.1);
            ctx.lineWidth = 2;
            ctx.moveTo(xOffset + 6, 0); ctx.lineTo(xOffset + size + 6, size); ctx.stroke();
        }
    }
    else if (style === TextureStyle.LEATHER) {
        // Leather noise pattern
        ctx.globalAlpha = 0.3;
        for(let i=0; i<5000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 3 + 1;
            ctx.fillStyle = darken(baseColor, 0.15);
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 0.1;
        // Scratches
        for(let i=0; i<200; i++) {
            ctx.strokeStyle = lighten(baseColor, 0.1);
            ctx.lineWidth = 1;
            ctx.beginPath();
            const x = Math.random() * size; const y = Math.random() * size;
            ctx.moveTo(x,y); ctx.lineTo(x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*20);
            ctx.stroke();
        }
    }
    else if (style === TextureStyle.WOOD) {
        // Wood grain
        ctx.globalAlpha = 0.2;
        for (let x = 0; x < size; x+=2) {
            const noise = (Math.sin(x * 0.05) + Math.sin(x*0.13)) * 20;
            ctx.strokeStyle = (x % 10 < 2) ? darken(baseColor, 0.2) : lighten(baseColor, 0.05);
            ctx.beginPath();
            ctx.moveTo(x + noise, 0);
            ctx.lineTo(x + noise, size);
            ctx.stroke();
        }
    }
    else if (style === TextureStyle.DAMASCUS) {
        // Wavy metal pattern
        ctx.fillStyle = getHex(baseColor);
        ctx.fillRect(0,0,size,size);
        ctx.globalAlpha = 0.3;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x+=4) {
                const val = Math.sin(x * 0.02 + Math.sin(y * 0.05) * 5.0) * 0.5 + 0.5;
                if (val > 0.6) {
                   ctx.fillStyle = lighten(baseColor, 0.2);
                   ctx.fillRect(x, y, 4, 1);
                } else if (val < 0.4) {
                   ctx.fillStyle = darken(baseColor, 0.2);
                   ctx.fillRect(x, y, 4, 1);
                }
            }
        }
    }
    else if (style === TextureStyle.SCALES) {
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
                 ctx.beginPath();
                 ctx.arc(cx, cy, scaleSize/2, 0, Math.PI, false); // Bottom half circle?
                 ctx.quadraticCurveTo(cx, cy + scaleSize, cx + scaleSize/2, cy); // Pointy bottom?
                 // Simple overlapping circles
                 ctx.beginPath();
                 ctx.arc(cx, cy, scaleSize/2, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.stroke();
                 
                 // Highlight
                 ctx.fillStyle = lighten(baseColor, 0.3);
                 ctx.beginPath();
                 ctx.arc(cx, cy - scaleSize*0.1, scaleSize*0.3, 0, Math.PI * 2);
                 ctx.fill();
             }
         }
    }
    else if (style === TextureStyle.RUST) {
        ctx.fillStyle = getHex(baseColor);
        ctx.fillRect(0,0,size,size);
        // Heavy noise
        for(let i=0; i<40000; i++) {
            ctx.fillStyle = Math.random() > 0.6 ? '#5d4037' : (Math.random() > 0.5 ? '#bf360c' : getHex(baseColor));
            ctx.globalAlpha = Math.random() * 0.5;
            ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
        }
    }
    else if (style === TextureStyle.COSMIC) {
        // Dark background
        ctx.fillStyle = '#0a001a';
        ctx.fillRect(0,0,size,size);
        // Nebula
        for(let i=0; i<5; i++) {
             const x = Math.random()*size; const y=Math.random()*size; const r=Math.random()*200+100;
             const grad = ctx.createRadialGradient(x,y,0,x,y,r);
             grad.addColorStop(0, i%2==0 ? 'rgba(75,0,130,0.4)' : 'rgba(0,0,139,0.4)');
             grad.addColorStop(1, 'rgba(0,0,0,0)');
             ctx.fillStyle = grad;
             ctx.fillRect(0,0,size,size);
        }
        // Stars
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
    // For specific patterns, repeat logic might vary
    if (style === TextureStyle.CLOTH || style === TextureStyle.WOOD || style === TextureStyle.DAMASCUS) {
         tex.repeat.set(1, 1);
    } else {
         tex.repeat.set(2, 2);
    }
    
    return tex;
};

export const getMaterials = (config: WeaponConfig): WeaponMaterials => {
    // Generate textures
    const handleStyle = config.handleTexture || TextureStyle.NONE;
    const bladeStyle = config.bladeTexture || TextureStyle.NONE;

    const handleTex = generateTexture(handleStyle, config.handleColor);
    const bladeTex = generateTexture(bladeStyle, config.metalColor);

    // Dynamic vertical repeating for handle wraps
    if (handleStyle === TextureStyle.CLOTH || handleStyle === TextureStyle.WOOD) {
         handleTex.repeat.set(1, Math.max(1, config.handleLength * 3));
    }
    
    // Blade texture repeat
    if (bladeStyle === TextureStyle.DAMASCUS || bladeStyle === TextureStyle.WOOD) {
         bladeTex.repeat.set(1, Math.max(1, config.bladeLength * 2));
    }

    const matProps = (tex: THREE.Texture, baseColor: string, r: number, m: number) => {
        const hasTex = tex.image && (tex.image as any).width > 1; // Check if valid texture
        return {
            color: new THREE.Color(baseColor),
            map: hasTex ? tex : null,
            bumpMap: hasTex ? tex : null,
            bumpScale: 0.02,
            roughnessMap: hasTex ? tex : null,
            roughness: r,
            metalness: m,
            emissive: config.effect !== 'None' ? new THREE.Color(config.effectColor) : new THREE.Color(0x000000),
            emissiveIntensity: config.effect !== 'None' ? 0.2 : 0
        };
    };

    return {
        handleMat: new THREE.MeshStandardMaterial(matProps(handleTex, config.handleColor, 0.8, 0.1)),
        metalMat: new THREE.MeshStandardMaterial(matProps(bladeTex, config.metalColor, config.roughness, config.metalness)),
        guardMat: new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(config.guardColor), 
            metalness: config.metalness * 0.9, 
            roughness: config.roughness * 1.2 
        }),
    };
};

export const makeDoubleEdgedBlade = (width: number, height: number, depth: number, material: THREE.Material) => {
    // 4 width segments allow for a hexagonal cross-section (flat spine, sharp edges)
    // Vertices will be at x ratios: -0.5, -0.25, 0, 0.25, 0.5
    const geo = new THREE.BoxGeometry(width, height, depth, 4, 4, 1);
    const pos = geo.attributes.position;
    const arr = pos.array;
    
    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        // If x is near the edge (outer 25% on each side), flatten Z to make it sharp
        // Inner 50% remains full thickness for the spine
        if (Math.abs(x) > width * 0.35) {
            arr[i+2] *= 0.05; // Sharp honed edge
        }
    }
    
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

export const makeTaperedBox = (width: number, height: number, depth: number, material: THREE.Material, taperFactorX = 0.02, taperFactorZ = 0.02) => {
    // 4 width segments for better profile control
    const geo = new THREE.BoxGeometry(width, height, depth, 4, 4, 1); 
    const pos = geo.attributes.position;
    const arr = pos.array;
    const halfH = height / 2;

    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];

        // 1. Sharpen Edges (Hexagonal/Diamond Profile)
        // Keep center thick, sharpen edges
        if (Math.abs(x) > width * 0.35) {
             arr[i+2] *= 0.1; 
        }

        // 2. Taper along Height (Tip)
        if (y > -halfH + 0.001) { 
            const t = THREE.MathUtils.clamp((y + halfH) / height, 0, 1);
            const scale = THREE.MathUtils.lerp(1, taperFactorX, t);
            const scaleZ = THREE.MathUtils.lerp(1, taperFactorZ, t);
            arr[i] *= scale;
            arr[i + 2] *= scaleZ;
        }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

export const makeWavyBox = (width: number, height: number, depth: number, material: THREE.Material) => {
    const segments = 32;
    // 4 width segments for sharp edges
    const geo = new THREE.BoxGeometry(width, height, depth, 4, segments, 2);
    const pos = geo.attributes.position;
    const arr = pos.array;
    
    const frequency = 5; 
    const amplitude = width * 0.25;

    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const normalizedY = (y + height/2) / height;

        // Sharpen edges, keep center thick
        if (Math.abs(x) > width * 0.35) {
             arr[i+2] *= 0.1;
        }

        // Apply wave to X
        const wave = Math.sin(normalizedY * Math.PI * frequency) * amplitude;
        arr[i] += wave;
        
        // Taper tip to a point
        if (normalizedY > 0.7) {
             const t = (normalizedY - 0.7) / 0.3; // 0 to 1
             const scale = 1 - t; // 1 to 0
             // Scale X relative to the wave center
             const currentX = arr[i] - wave;
             arr[i] = wave + (currentX * scale);
             arr[i+2] *= scale;
        }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

// Curve along the X axis (width) assuming flat side is Z
export const makeCurvedBox = (width: number, height: number, depth: number, material: THREE.Material, curveAmount: number) => {
    const segments = 24;
    // 4 width segments for spine
    const geo = new THREE.BoxGeometry(width, height, depth, 4, segments, 2);
    const pos = geo.attributes.position;
    const arr = pos.array;

    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const normalizedY = (y + height/2) / height; // 0 to 1

        // Sharpen edges
        if (Math.abs(x) > width * 0.35) {
             arr[i+2] *= 0.1;
        }
        
        // Curve X position based on Y^2
        const curve = Math.pow(normalizedY, 2) * curveAmount;
        arr[i] += curve;
        
        // Slight Z thickening at base, tapering at tip
        if (normalizedY > 0.8) {
             const t = (normalizedY - 0.8) / 0.2;
             arr[i+2] *= (1 - t);
        }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

// Helper to sharpen the edge of an axe (ExtrudeGeometry)
export const sharpenGeometry = (mesh: THREE.Mesh) => {
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const bbox = geo.boundingBox!;
    const width = bbox.max.x - bbox.min.x;
    
    const pos = geo.attributes.position;
    const arr = pos.array;
    
    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const relativeX = (x - bbox.min.x) / width;
        
        // Preserve thickness for the majority of the head (0 to 0.75)
        // Sharpen drastically in the last 25% to create a bevel
        if (relativeX > 0.75) {
            const t = (relativeX - 0.75) / 0.25; 
            const sharpenFactor = 1 - (t * 0.95);
            arr[i+2] *= sharpenFactor;
        }
    }
    
    pos.needsUpdate = true;
    geo.computeVertexNormals();
};