
import * as THREE from 'three';

export class TerrainTextureFactory {
    static getTexture(type: string): THREE.Texture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Texture();

        // Helpers
        const noise = (amount: number, scale: number = 1) => {
            for (let i = 0; i < amount; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                const s = Math.random() * scale;
                ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
            }
        };

        const fill = (color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, size, size);
        };

        switch (type) {
            case 'Grass':
                fill('#4caf50');
                noise(10000, 2);
                ctx.fillStyle = '#388e3c';
                for(let i=0; i<1000; i++) ctx.fillRect(Math.random()*size, Math.random()*size, 2, 6); // Blades
                break;

            case 'Sand':
                fill('#fdd835'); // Bright sand
                noise(8000, 2);
                // Dunes/Waves
                ctx.strokeStyle = '#fbc02d';
                ctx.lineWidth = 10;
                ctx.globalAlpha = 0.3;
                for(let i=0; i<size; i+=40) {
                    ctx.beginPath();
                    ctx.moveTo(0, i);
                    ctx.bezierCurveTo(size/3, i+30, size*2/3, i-30, size, i);
                    ctx.stroke();
                }
                break;

            case 'Stone':
                fill('#9e9e9e');
                noise(15000, 3);
                // Cracks
                ctx.strokeStyle = '#616161';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8;
                for(let i=0; i<20; i++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.random()*size, Math.random()*size);
                    ctx.lineTo(Math.random()*size, Math.random()*size);
                    ctx.stroke();
                }
                break;

            case 'Wood':
                fill('#795548');
                // Planks
                ctx.strokeStyle = '#3e2723';
                ctx.lineWidth = 4;
                for(let i=0; i<size; i+=64) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
                    // Wood grain
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    for(let j=0; j<20; j++) ctx.fillRect(i + Math.random()*60, Math.random()*size, 2, 40);
                }
                // Nail holes
                ctx.fillStyle = '#212121';
                for(let i=0; i<size; i+=64) {
                    ctx.beginPath(); ctx.arc(i+10, 20, 3, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(i+54, 20, 3, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(i+10, size-20, 3, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(i+54, size-20, 3, 0, Math.PI*2); ctx.fill();
                }
                break;

            case 'Snow':
                fill('#e3f2fd'); // Slightly blueish white
                noise(5000, 2); // Subtle noise
                break;

            case 'Gravel':
                fill('#757575');
                // Large pebbles
                for(let i=0; i<1000; i++) {
                    ctx.fillStyle = Math.random()>0.5 ? '#424242' : '#bdbdbd';
                    const s = 4 + Math.random() * 6;
                    ctx.beginPath(); ctx.arc(Math.random()*size, Math.random()*size, s, 0, Math.PI*2); ctx.fill();
                }
                break;

            case 'Dirt':
                fill('#5d4037');
                noise(12000, 3);
                break;

            case 'Metal':
                fill('#607d8b');
                // Rivets and Plates
                ctx.strokeStyle = '#37474f';
                ctx.lineWidth = 4;
                ctx.strokeRect(10, 10, size-20, size-20);
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(size,size); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(size,0); ctx.lineTo(0,size); ctx.stroke();
                break;
                
            case 'Leaves':
                fill('#33691e'); // Dark green base
                // Draw leaves
                const colors = ['#558b2f', '#689f38', '#8bc34a', '#aed581'];
                for(let i=0; i<500; i++) {
                    ctx.fillStyle = colors[Math.floor(Math.random()*colors.length)];
                    const x = Math.random()*size;
                    const y = Math.random()*size;
                    ctx.beginPath();
                    ctx.ellipse(x, y, 10, 5, Math.random()*Math.PI, 0, Math.PI*2);
                    ctx.fill();
                }
                break;
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 10); // Repeat often for large ground planes
        if (type === 'Wood' || type === 'Metal') tex.repeat.set(5, 5); // Larger patterns
        
        return tex;
    }
}
