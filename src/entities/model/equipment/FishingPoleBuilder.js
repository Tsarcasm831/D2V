import * as THREE from 'three';

// --- Configuration ---
export const weaponConfig = {
  "type": "Fishing Pole",
  "handleLength": 0.4,
  "handleRadius": 0.025,
  "guardWidth": 0.08,
  "bladeLength": 1.8,
  "bladeWidth": 0.6,
  "bladeThickness": 0.005,
  "pommelSize": 0.04,
  "handleColor": "#d7ccc8",
  "metalColor": "#263238",
  "guardColor": "#d32f2f",
  "roughness": 0.6,
  "metalness": 0.4,
  "effect": "None",
  "effectColor": "#ffffff",
  "handleTexture": "Wood",
  "bladeTexture": "None"
};

// --- Texture Generation ---
const generateTexture = (style, colorStr) => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const baseColor = new THREE.Color(colorStr);
    const getHex = (c) => '#' + c.getHexString();
    
    // Fill Background
    ctx.fillStyle = getHex(baseColor);
    ctx.fillRect(0, 0, size, size);

    if (style === 'None') {
        return new THREE.Texture(); 
    }

    const darken = (c, amt) => {
        const h = c.clone().offsetHSL(0, 0, -amt);
        return getHex(h);
    }
    const lighten = (c, amt) => {
        const h = c.clone().offsetHSL(0, 0, amt);
        return getHex(h);
    }

    if (style === 'Wood') {
        ctx.globalAlpha = 0.2;
        for (let x = 0; x < size; x+=2) {
            const noise = (Math.sin(x * 0.05) + Math.sin(x*0.13)) * 20;
            ctx.strokeStyle = (x % 10 < 2) ? darken(baseColor, 0.2) : lighten(baseColor, 0.05);
            ctx.beginPath();
            ctx.moveTo(x + noise, 0); ctx.lineTo(x + noise, size); ctx.stroke();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
};

const getMaterials = (cfg) => {
    const handleStyle = cfg.handleTexture || 'None';
    const bladeStyle = cfg.bladeTexture || 'None';

    const handleTex = generateTexture(handleStyle, cfg.handleColor);
    if (handleStyle === 'Wood') {
         handleTex.repeat.set(1, Math.max(1, cfg.handleLength * 3));
    }

    const matProps = (tex, baseColor, r, m) => {
        const hasTex = tex.image && tex.image.width > 1; 
        return {
            color: new THREE.Color(baseColor),
            map: hasTex ? tex : null,
            bumpMap: hasTex ? tex : null,
            bumpScale: 0.02,
            roughnessMap: hasTex ? tex : null,
            roughness: r,
            metalness: m,
            emissive: cfg.effect !== 'None' ? new THREE.Color(cfg.effectColor) : new THREE.Color(0x000000),
            emissiveIntensity: cfg.effect !== 'None' ? 0.2 : 0
        };
    };

    return {
        handleMat: new THREE.MeshStandardMaterial(matProps(handleTex, cfg.handleColor, 0.8, 0.1)),
        metalMat: new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(cfg.metalColor), 
            metalness: cfg.metalness, 
            roughness: cfg.roughness
        }),
        guardMat: new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(cfg.guardColor), 
            metalness: cfg.metalness * 0.9, 
            roughness: cfg.roughness * 1.2 
        }),
    };
};

// --- Effect System ---
const applyEffectToMesh = (type, colorStr, targetMesh, isRing) => {
    targetMesh.geometry.computeBoundingBox();
    const box = targetMesh.geometry.boundingBox;
    const size = new THREE.Vector3(); box.getSize(size);
    const color = new THREE.Color(colorStr);

    const getRandomPosition = (vec) => {
         vec.set((Math.random()-0.5)*size.x, (Math.random()-0.5)*size.y, (Math.random()-0.5)*size.z);
    };

    if (type === 'Fire' || type === 'Poison' || type === 'Frost') {
        const particleCount = 100;
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
        
        const mat = new THREE.PointsMaterial({ color: color, size: 0.1, transparent: true, blending: THREE.AdditiveBlending });
        const points = new THREE.Points(geo, mat);
        targetMesh.add(points);
        return (dt) => { 
            // Simple animation
            points.rotation.y += dt;
        };
    }
    return null;
};

const applyEffects = (group, cfg, mats) => {
    if (!cfg.effect || cfg.effect === 'None') return;
    const updates = [];
    const addEff = (target) => {
        if (!target || !(target instanceof THREE.Mesh)) return;
        const up = applyEffectToMesh(cfg.effect, cfg.effectColor, target);
        if (up) updates.push(up);
    };

    let target = group.getObjectByName('damagePart');
    addEff(target);
    
    if (updates.length > 0) {
        group.userData.updateEffect = (dt) => updates.forEach(u => u(dt));
    }
};

function createWeapon() {
    const group = new THREE.Group();
    const cfg = weaponConfig;
    const mats = getMaterials(cfg);
    // Adjusted scale factor to match game character size.
    // 1.8m rod length * 1.0 = 1.8m (Realistic). 5.0 would be 9m.
    const s = 1.0; 

    // Config mapping
    const handleH = cfg.handleLength * s; // Cork grip length
    const handleR = cfg.handleRadius * s; // Grip thickness
    const reelSize = cfg.guardWidth * s; // Reel scale
    const rodL = cfg.bladeLength * s; // Rod shaft length
    const lineL = cfg.bladeWidth * s; // Default Line length
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
        eye.rotation.y = Math.PI / 2;
        group.add(eye);
    }

    // --- Dynamic Parts for Animation ---
    const tipY = handleH + rodL;
    const tipOffsetZ = handleR * 0.2; 
    const tipPosition = new THREE.Vector3(0, tipY, tipOffsetZ);
    group.userData.tipPosition = tipPosition;

    // 5. Fishing Line (Reconstructed for Animation)
    // Cylinder pivot at start (0,0,0) and points along +Z local axis for easy LookAt/Scaling
    const lineGeo = new THREE.CylinderGeometry(lineThick, lineThick, 1, 4);
    lineGeo.rotateX(-Math.PI / 2); // Align cylinder axis (Y) to Z
    lineGeo.translate(0, 0, 0.5); // Shift so origin is at Z=0
    
    const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    line.name = 'fishingLine';
    line.position.copy(tipPosition);
    line.scale.set(1, 1, lineL); // Initial length
    line.lookAt(0, tipY - lineL, tipOffsetZ); // Point down initially
    group.add(line);

    // 6. Bobber
    const bobberGeo = new THREE.SphereGeometry(bobberSize, 16, 16);
    const bobber = new THREE.Mesh(bobberGeo, new THREE.MeshStandardMaterial({ color: cfg.guardColor, roughness: 0.2 }));
    bobber.name = 'bobber'; 
    bobber.userData.isRing = false;
    // Initial position hanging down
    bobber.position.set(0, tipY - lineL, tipOffsetZ);
    
    // Add "damagePart" name to a sub-object or handling if needed for effects, 
    // but effects system looks for 'damagePart'. Let's add a dummy or alias.
    // For now, we can just let bobber be the effect target.
    bobber.userData.effectTarget = true; 
    
    group.add(bobber);
    
    // Pass bobber as damage part for effects logic
    const dummyDamage = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial({visible:false}));
    dummyDamage.name = 'damagePart';
    bobber.add(dummyDamage);
    
    applyEffects(group, cfg, mats);

    return group;
}

export class FishingPoleBuilder {
    static build(woodMat, metalMat) {
        const group = createWeapon();
        
        // Align to hand coordinate system (Hand holds X-axis)
        group.rotation.z = -Math.PI / 2;
        
        return group;
    }
}
