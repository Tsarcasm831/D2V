import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

// --- Types ---
const weaponConfig = {
    type: 'Sword',
    handleLength: 0.25,
    handleRadius: 0.025,
    guardWidth: 0.25,
    bladeLength: 0.8,
    bladeWidth: 0.08,
    bladeThickness: 0.02,
    pommelSize: 0.035,
    handleColor: '#3e2723',
    metalColor: '#90a4ae',
    guardColor: '#ffd54f',
    roughness: 0.2,
    metalness: 0.8,
    handleTexture: 'Leather',
    bladeTexture: 'None',
    effect: 'None',
    effectColor: '#ff6b00',
    variant: 'standard'
};

// --- Geometry Utilities ---
const makeTaperedBox = (width, height, depth, material, taperFactorX = 0.02, taperFactorZ = 0.02) => {
    const geo = new THREE.BoxGeometry(width, height, depth, 4, 4, 1);
    const pos = geo.attributes.position;
    const arr = pos.array;
    const halfH = height / 2;
    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        if (Math.abs(x) > width * 0.35) {
            arr[i + 2] *= 0.1;
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

const makeDoubleEdgedBlade = (width, height, depth, material) => {
    const geo = new THREE.BoxGeometry(width, height, depth, 4, 4, 1);
    const pos = geo.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
        if (Math.abs(arr[i]) > width * 0.35) {
            arr[i + 2] *= 0.05;
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
};

const generateTexture = (style, colorStr) => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const baseColor = new THREE.Color(colorStr);
    const getHex = (c) => '#' + c.getHexString();
    ctx.fillStyle = getHex(baseColor);
    ctx.fillRect(0, 0, size, size);

    if (style === 'None') {
        return new THREE.Texture();
    }

    const darken = (c, amt) => {
        const h = c.clone().offsetHSL(0, 0, -amt);
        return getHex(h);
    };
    const lighten = (c, amt) => {
        const h = c.clone().offsetHSL(0, 0, amt);
        return getHex(h);
    };

    if (style === 'Leather') {
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 4000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 3 + 1;
            ctx.fillStyle = darken(baseColor, 0.15);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 150; i++) {
            ctx.strokeStyle = lighten(baseColor, 0.1);
            ctx.lineWidth = 1;
            ctx.beginPath();
            const x = Math.random() * size;
            const y = Math.random() * size;
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
            ctx.stroke();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
};

const getMaterials = (cfg) => {
    const handleTex = generateTexture(cfg.handleTexture || 'None', cfg.handleColor);
    const bladeTex = generateTexture(cfg.bladeTexture || 'None', cfg.metalColor);
    const matProps = (tex, baseColor, r, m) => {
        const hasTex = tex.image && tex.image.width > 1;
        return {
            color: new THREE.Color(baseColor),
            map: hasTex ? tex : null,
            bumpMap: hasTex ? tex : null,
            bumpScale: 0.02,
            roughnessMap: hasTex ? tex : null,
            roughness: r,
            metalness: m
        };
    };
    return {
        handleMat: new THREE.MeshStandardMaterial(matProps(handleTex, cfg.handleColor, 0.8, 0.1)),
        metalMat: new THREE.MeshStandardMaterial(matProps(bladeTex, cfg.metalColor, cfg.roughness, cfg.metalness)),
        guardMat: new THREE.MeshStandardMaterial({
            color: new THREE.Color(cfg.guardColor),
            metalness: cfg.metalness * 0.9,
            roughness: cfg.roughness * 1.2
        })
    };
};

export function createSword() {
    const group = new THREE.Group();
    const cfg = weaponConfig;
    const mats = getMaterials(cfg);
    const s = SCALE_FACTOR;

    const handleH = cfg.handleLength * s;
    const handleR = cfg.handleRadius * s;
    const guardW = cfg.guardWidth * s;
    const bladeL = cfg.bladeLength * s;
    const bladeW = cfg.bladeWidth * s;
    const bladeT = cfg.bladeThickness * s;
    const pommelR = cfg.pommelSize * s;

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR, handleR, handleH, 16), mats.handleMat);
    handle.position.y = handleH / 2;
    group.add(handle);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(pommelR, 16, 16), mats.guardMat);
    pommel.position.y = -pommelR * 0.5;
    group.add(pommel);

    const connectionY = handleH;
    const guardH = 0.04 * s;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(guardW, guardH, 0.06 * s), mats.guardMat);
    guard.position.y = connectionY;
    group.add(guard);

    const bladeStartY = connectionY + 0.02 * s;
    const bladeMainH = bladeL * 0.8;
    const blade = makeDoubleEdgedBlade(bladeW, bladeMainH, bladeT, mats.metalMat);
    blade.position.y = bladeStartY + bladeMainH / 2;
    blade.name = 'damagePart';
    group.add(blade);

    const tipH = bladeL * 0.2;
    const tip = makeTaperedBox(bladeW, tipH, bladeT, mats.metalMat);
    tip.position.y = bladeStartY + bladeMainH + tipH / 2;
    group.add(tip);

    return group;
}
