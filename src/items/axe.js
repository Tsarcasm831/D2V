import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

// --- Configuration ---
const weaponConfig = {
    type: 'Axe',
    handleLength: 0.95, // keep existing overall size for attachment compatibility
    handleRadius: 0.024,
    guardWidth: 0.05,
    bladeLength: 0.2,
    bladeWidth: 0.15,
    bladeThickness: 0.02,
    pommelSize: 0.03,
    handleColor: '#8d6e63',
    metalColor: '#b0bec5',
    guardColor: '#5d4037',
    roughness: 0.5,
    metalness: 0.6,
    effect: 'None',
    effectColor: '#ffffff',
    handleTexture: 'Wood',
    bladeTexture: 'None'
};

// --- Helpers ---
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

    if (style === 'Wood') {
        ctx.globalAlpha = 0.2;
        for (let x = 0; x < size; x += 2) {
            const noise = (Math.sin(x * 0.05) + Math.sin(x * 0.13)) * 20;
            ctx.strokeStyle = x % 10 < 2 ? darken(baseColor, 0.2) : lighten(baseColor, 0.05);
            ctx.beginPath();
            ctx.moveTo(x + noise, 0);
            ctx.lineTo(x + noise, size);
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

const sharpenGeometry = (mesh) => {
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const bbox = geo.boundingBox;
    if (!bbox) return;
    const width = bbox.max.x - bbox.min.x;
    const pos = geo.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const relativeX = (x - bbox.min.x) / width;
        if (relativeX > 0.75) {
            const t = (relativeX - 0.75) / 0.25;
            arr[i + 2] *= 1 - t * 0.95;
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
};

// --- Builder ---
export function createAxe() {
    const group = new THREE.Group();
    const cfg = weaponConfig;
    const mats = getMaterials(cfg);
    const s = SCALE_FACTOR;

    const handleH = cfg.handleLength * s;
    const handleR = cfg.handleRadius * s;
    const bladeL = cfg.bladeLength * s;
    const bladeW = cfg.bladeWidth * s;
    const bladeT = cfg.bladeThickness * s;
    const pommelR = cfg.pommelSize * s;

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleR * 0.8, handleR, handleH, 14), mats.handleMat);
    handle.position.y = handleH / 2;
    group.add(handle);

    // Grip wrap
    const wrapH = 0.12 * s;
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(handleR * 0.85, handleR * 0.85, wrapH, 12), mats.guardMat);
    wrap.position.y = wrapH / 2 + handleH * 0.18;
    group.add(wrap);

    // Collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(handleR * 1.1, handleR * 1.3, 0.08 * s, 14), mats.metalMat);
    collar.position.y = handleH - 0.04 * s;
    group.add(collar);

    // Pommel
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(pommelR, 12, 12), mats.guardMat);
    pommel.position.y = -pommelR * 0.3;
    group.add(pommel);

    // Axe head
    const shape = new THREE.Shape();
    shape.moveTo(0, bladeL * 0.2);
    shape.lineTo(bladeW, bladeL * 0.5);
    shape.quadraticCurveTo(bladeW * 1.1, 0, bladeW, -bladeL * 0.5);
    shape.lineTo(0, -bladeL * 0.2);
    shape.lineTo(0, bladeL * 0.2);

    const axeGeo = new THREE.ExtrudeGeometry(shape, {
        steps: 4,
        depth: bladeT,
        bevelEnabled: true,
        bevelThickness: bladeT * 0.2,
        bevelSize: bladeT * 0.5,
        bevelSegments: 2
    });
    axeGeo.translate(0, 0, -bladeT / 2);
    const axeHead = new THREE.Mesh(axeGeo, mats.metalMat);
    axeHead.position.set(handleR * 0.5, handleH - bladeL * 0.35, 0);
    axeHead.rotation.y = Math.PI / 2;
    sharpenGeometry(axeHead);
    axeHead.name = 'damagePart';
    group.add(axeHead);

    // Rear spike/poll
    const spike = new THREE.Mesh(new THREE.ConeGeometry(bladeT * 1.1, bladeW * 0.4, 8), mats.guardMat);
    spike.rotation.z = Math.PI / 2;
    spike.position.set(-handleR * 0.8, handleH - bladeL * 0.35, 0);
    group.add(spike);

    return group;
}