import * as THREE from 'three';
import { WeaponConfig, TextureStyle } from '../../types';
import { SCALE_FACTOR } from '../../constants';

// Based on the provided ShirtBuilder logic
export const generateShirt = (group: THREE.Group, config: WeaponConfig) => {
    const s = SCALE_FACTOR; // Used to scale the shirt to "world" size

    // Map Config to Shirt Properties
    const mainColor = config.handleColor; // Base fabric color
    const stripeColor = config.metalColor; // Detail/Stripe color
    const isLeather = config.handleTexture === TextureStyle.LEATHER;

    // --- Procedural Texture Generation ---
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        if (isLeather) {
            // Leather color sync
            ctx.fillStyle = mainColor;
            ctx.fillRect(0, 0, 512, 512);
            
            // Add some leather-like grain
            for (let i = 0; i < 2000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.01)';
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
            }
            
            // Simple stitching lines
            ctx.strokeStyle = stripeColor; // Use metalColor for stitches
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([10, 8]);
            ctx.strokeRect(10, 10, 492, 492);
            ctx.strokeRect(128, 0, 256, 512); // Central panel
            ctx.globalAlpha = 1.0;
            ctx.setLineDash([]);
        } else {
            // Plaid Pattern
            ctx.fillStyle = mainColor;
            ctx.fillRect(0, 0, 512, 512);
            
            const detailColor = stripeColor;

            // Plaid Stripes
            ctx.fillStyle = detailColor;
            ctx.globalAlpha = 0.4;
            // Vertical
            ctx.fillRect(100, 0, 60, 512);
            ctx.fillRect(350, 0, 60, 512);
            // Horizontal
            ctx.fillRect(0, 150, 512, 60);
            ctx.fillRect(0, 350, 512, 60);
            
            // Crosshatch areas darker
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
        roughness: config.roughness,
        metalness: config.metalness * 0.1 // Cloth isn't usually metallic
    });

    // --- Geometry Construction ---
    // Use config dimensions for parametric control, but default to realistic proportions if not provided
    
    // config.handleLength -> Torso Length
    const torsoLen = config.handleLength * s;
    // config.handleRadius -> Torso Radius
    const torsoRadius = config.handleRadius * s; 
    
    // 1. Torso
    const torsoGeo = new THREE.CylinderGeometry(torsoRadius, torsoRadius * 0.85, torsoLen, 16);
    torsoGeo.scale(1, 1, 0.7); // Flatten for body shape
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = torsoLen / 2;
    torso.castShadow = true;
    torso.name = 'damagePart'; // Allow effects
    group.add(torso);

    // 2. Shoulders
    const shoulderRadius = torsoRadius * 1.05;
    const shoulderGeo = new THREE.SphereGeometry(shoulderRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    shoulderGeo.scale(1, 0.45, 0.7); 
    const shoulderCap = new THREE.Mesh(shoulderGeo, shirtMat);
    shoulderCap.position.y = torsoLen / 2;
    torso.add(shoulderCap);

    // 3. Sleeves
    // config.guardWidth -> Sleeve Radius
    // config.bladeLength -> Sleeve Length
    const sleeveRadius = config.guardWidth * s;
    const sleeveLen = config.bladeLength * s;

    // Right Sleeve
    const rSleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius * 0.8, sleeveLen, 12);
    const rSleeve = new THREE.Mesh(rSleeveGeo, shirtMat);
    rSleeve.rotation.z = -Math.PI / 4;
    rSleeve.position.set(torsoRadius, torsoLen * 0.4, 0);
    rSleeve.position.x += sleeveLen * 0.3; 
    rSleeve.castShadow = true;
    group.add(rSleeve);

    // Left Sleeve
    const lSleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius * 0.8, sleeveLen, 12);
    const lSleeve = new THREE.Mesh(lSleeveGeo, shirtMat);
    lSleeve.rotation.z = Math.PI / 4;
    lSleeve.position.set(-torsoRadius, torsoLen * 0.4, 0);
    lSleeve.position.x -= sleeveLen * 0.3;
    lSleeve.castShadow = true;
    group.add(lSleeve);

    // Center the group
    group.position.y = -torsoLen / 2;
};