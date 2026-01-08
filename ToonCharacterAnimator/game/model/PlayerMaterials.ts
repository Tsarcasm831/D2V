
import * as THREE from 'three';
import { PlayerConfig, OutfitType } from '../../types';

// Helper to generate brain fold texture
const createBrainTexture = () => {
    if (typeof document === 'undefined') return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background (Sulci - deep valleys)
    ctx.fillStyle = '#404040'; 
    ctx.fillRect(0, 0, size, size);

    // Draw Gyri (Ridges)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw many winding paths
    const drawWorms = (count: number, widthBase: number, alpha: number) => {
        for (let i = 0; i < count; i++) {
            ctx.beginPath();
            let x = Math.random() * size;
            let y = Math.random() * size;
            ctx.moveTo(x, y);
            
            const steps = 5 + Math.random() * 10;
            for (let j = 0; j < steps; j++) {
                // Smooth random walk
                const angle = Math.random() * Math.PI * 2;
                const dist = 20 + Math.random() * 30;
                x += Math.cos(angle) * dist;
                y += Math.sin(angle) * dist;
                // Wrap
                if (x < 0) x += size; if (x > size) x -= size;
                if (y < 0) y += size; if (y > size) y -= size;
                
                ctx.quadraticCurveTo(
                    x - Math.cos(angle)*10, y - Math.sin(angle)*10, 
                    x, y
                );
            }
            
            const val = 150 + Math.random() * 105;
            ctx.strokeStyle = `rgba(${val},${val},${val}, ${alpha})`;
            ctx.lineWidth = widthBase + Math.random() * (widthBase/2);
            ctx.stroke();
        }
    };

    drawWorms(200, 25, 0.8);
    drawWorms(300, 15, 0.5); // Details

    return new THREE.CanvasTexture(canvas);
};

export class PlayerMaterials {
    skin: THREE.MeshToonMaterial;
    shirt: THREE.MeshToonMaterial;
    pants: THREE.MeshToonMaterial;
    boots: THREE.MeshToonMaterial;
    sclera: THREE.MeshToonMaterial;
    iris: THREE.MeshToonMaterial;
    pupil: THREE.MeshToonMaterial;
    lip: THREE.MeshToonMaterial;
    underwear: THREE.MeshToonMaterial;
    hair: THREE.MeshToonMaterial;
    brain: THREE.MeshStandardMaterial;

    constructor(config: PlayerConfig) {
        this.skin = new THREE.MeshToonMaterial({ color: config.skinColor });
        this.shirt = new THREE.MeshToonMaterial({ color: 0x888888 });
        this.pants = new THREE.MeshToonMaterial({ color: 0x444444 });
        this.boots = new THREE.MeshToonMaterial({ color: 0x222222 });
        this.lip = new THREE.MeshToonMaterial({ color: config.lipColor });
        
        this.sclera = new THREE.MeshToonMaterial({ color: config.scleraColor });
        this.iris = new THREE.MeshToonMaterial({ color: config.eyeColor });
        this.pupil = new THREE.MeshToonMaterial({ color: config.pupilColor });
        
        this.underwear = new THREE.MeshToonMaterial({ color: 0xeaeaea });
        this.hair = new THREE.MeshToonMaterial({ color: config.hairColor, side: THREE.DoubleSide });
        
        // Brain Material setup
        const brainTex = createBrainTexture();
        this.brain = new THREE.MeshStandardMaterial({ 
            color: 0xeba8b5, // Pale fleshy pink
            roughness: 0.3,   // Wet/Shiny
            metalness: 0.0,
            bumpMap: brainTex || undefined,
            bumpScale: 0.015,
        });
    }

    sync(config: PlayerConfig) {
        this.skin.color.set(config.skinColor);
        this.sclera.color.set(config.scleraColor);
        this.iris.color.set(config.eyeColor);
        this.pupil.color.set(config.pupilColor);
        this.lip.color.set(config.lipColor);
        this.hair.color.set(config.hairColor);
    }

    applyOutfit(outfit: OutfitType, skinColor: string) {
        let sc = 0x888888, pc = 0x444444, bc = 0x222222;
        if(outfit === 'peasant') { sc = 0x8d6e63; pc = 0x5d4037; bc = 0x3e2723; }
        else if(outfit === 'warrior') { sc = 0x607d8b; pc = 0x37474f; bc = 0x263238; }
        else if(outfit === 'noble') { sc = 0x3f51b5; pc = 0x1a237e; bc = 0x111111; }
        else if(outfit === 'naked' || outfit === 'nude') { sc = pc = bc = new THREE.Color(skinColor).getHex(); }
        this.shirt.color.setHex(sc);
        this.pants.color.setHex(pc);
        this.boots.color.setHex(bc);
    }
}
