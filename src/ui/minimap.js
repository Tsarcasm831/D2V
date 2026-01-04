import * as THREE from 'three';
import { SHARD_SIZE, WORLD_SHARD_LIMIT } from '../world/world_bounds.js';

export class Minimap {
    constructor(player, worldManager) {
        this.player = player;
        this.worldManager = worldManager;
        this.container = document.getElementById('minimap-container');
        this.biomeDisplay = document.getElementById('minimap-biome-display');
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.visible = true;
        
        // Ensure DOM matches state
        if (this.container) this.container.style.display = 'block';
        if (this.biomeDisplay) this.biomeDisplay.style.display = 'block';
        
        // Internal resolution
        this.size = 320; 
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        this.scale = 1.2; // pixels per unit
        this.lastUpdate = 0;
        this.updateInterval = 1000 / 15; // 15 FPS target for minimap (Reduced from 30)
        
        // Reusable objects for drawing to minimize GC
        this._tempBatches = {
            res: {},
            ent: {}
        };
    }

    getBiomeNoise(x, z) {
        if (this.worldManager && this.worldManager.getBiomeNoise) {
            return this.worldManager.getBiomeNoise(x, z);
        }
        // Fallback noise logic (matching WorldManager.js exactly)
        const scale = 0.02;
        const nx = x * scale, nz = z * scale;
        const v1 = Math.sin(nx) + Math.sin(nz);
        const v2 = Math.sin(nx * 2.1 + nz * 0.5) * 0.5;
        const v3 = Math.cos(nx * 0.7 - nz * 1.3) * 0.25;
        const v4 = Math.sin(Math.sqrt(nx*nx + nz*nz) * 0.5) * 0.5;
        const combined = (v1 + v2 + v3 + v4 + 2) / 4;
        return THREE.MathUtils.clamp(combined, 0, 1);
    }

    getBiomeName(h) {
        const config = (this.worldManager && this.worldManager.worldMask) ? this.worldManager.worldMask.config : {};
        const biomes = config.biomes || {
            0.15: 'Murky Swamp',
            0.3: 'Dirt Plains',
            0.45: 'Forest Edge',
            0.6: 'Grassy Steppes',
            1.0: 'Frozen Peaks'
        };

        const thresholds = Object.keys(biomes).map(Number).sort((a, b) => a - b);
        for (const t of thresholds) {
            if (h < t) return biomes[t];
        }
        return biomes[thresholds[thresholds.length - 1]] || 'Unknown Region';
    }

    toggle() {
        this.visible = !this.visible;
        if (this.container) {
            this.container.style.display = this.visible ? 'block' : 'none';
        }
        if (this.biomeDisplay) {
            this.biomeDisplay.style.display = this.visible ? 'block' : 'none';
        }
    }

    update() {
        if (!this.visible || !this.player || !this.player.mesh) return;

        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = now;

        const ctx = this.ctx;
        const size = this.size;
        const center = size / 2;
        const px = this.player.mesh.position.x;
        const pz = this.player.mesh.position.z;

        // Update Biome Display (Throttle if needed, but minimap is smaller)
        const curShardX = Math.floor((px + SHARD_SIZE / 2) / SHARD_SIZE);
        const curShardZ = Math.floor((pz + SHARD_SIZE / 2) / SHARD_SIZE);
        const noise = this.getBiomeNoise(curShardX * SHARD_SIZE, curShardZ * SHARD_SIZE);
        if (this.biomeDisplay) {
            this.biomeDisplay.textContent = this.getBiomeName(noise);
        }
        
        ctx.clearRect(0, 0, size, size);

        // Get Camera Angle
        const camTheta = this.player.game ? this.player.game.cameraRotation.theta : 0;

        // Draw radar background
        ctx.fillStyle = 'rgba(5, 10, 20, 0.8)';
        ctx.beginPath();
        ctx.arc(center, center, center, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        // Clip everything to the circular bounds
        ctx.beginPath();
        ctx.arc(center, center, center, 0, Math.PI * 2);
        ctx.clip();

        // Rotate map context based on camera
        ctx.translate(center, center);
        ctx.rotate(camTheta);
        ctx.translate(-center, -center);

        // Shard grid lines - Draw expanded to cover rotation
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const shardStep = SHARD_SIZE * this.scale;
        const startX = (((-px + SHARD_SIZE / 2) % SHARD_SIZE + SHARD_SIZE) % SHARD_SIZE) * this.scale + center - shardStep;
        const startZ = (((-pz + SHARD_SIZE / 2) % SHARD_SIZE + SHARD_SIZE) % SHARD_SIZE) * this.scale + center - shardStep;
        const gridExt = size * 1.2; 

        // Batch grid lines into a single path
        ctx.beginPath();
        for(let x = startX - gridExt; x < size + gridExt; x += shardStep) {
            if (x < -gridExt || x > size + gridExt) continue;
            ctx.moveTo(x, -gridExt); 
            ctx.lineTo(x, size + gridExt);
        }
        for(let z = startZ - gridExt; z < size + gridExt; z += shardStep) {
            if (z < -gridExt || z > size + gridExt) continue;
            ctx.moveTo(-gridExt, z); 
            ctx.lineTo(size + gridExt, z);
        }
        ctx.stroke();

        const cullDist = size * 0.7; // Tighter culling for circular minimap

        // Draw Resources - Batched by color
        const mapRadius = (center / this.scale) * 1.5; // Fetch slightly more than visible
        const resources = this.worldManager.getNearbyResources(this.player.mesh.position, mapRadius);
        const resBatches = {};

        resources.forEach(res => {
            if (res.isDead) return;
            const rx = (res.group.position.x - px) * this.scale + center;
            const rz = (res.group.position.z - pz) * this.scale + center;
            
            const distSq = (rx - center)**2 + (rz - center)**2;
            if (distSq < (center * 1.2)**2) {
                let color;
                if (res.type === 'tree') color = '#2d5a27';
                else if (res.type === 'berry_bush') color = '#e91e63';
                else color = '#546e7a';
                
                if (!resBatches[color]) resBatches[color] = [];
                resBatches[color].push(rx, rz);
            }
        });

        for (const color in resBatches) {
            ctx.fillStyle = color;
            ctx.beginPath();
            const batch = resBatches[color];
            for (let i = 0; i < batch.length; i += 2) {
                ctx.rect(batch[i] - 1.5, batch[i+1] - 1.5, 3, 3);
            }
            ctx.fill();
        }

        // Draw NPCs and Fauna - Batched by color
        const entities = [
            ...this.worldManager.getNearbyNPCs(this.player.mesh.position, mapRadius),
            ...this.worldManager.getNearbyFauna(this.player.mesh.position, mapRadius)
        ];
        const entBatches = {};

        entities.forEach(entity => {
            if (entity.isDead) return;
            const pos = entity.group ? entity.group.position : entity.mesh.position;
            const nx = (pos.x - px) * this.scale + center;
            const nz = (pos.z - pz) * this.scale + center;
            
            const distSq = (nx - center)**2 + (nz - center)**2;
            if (distSq < (center * 1.2)**2) {
                let color;
                if (entity.type === 'humanoid') color = '#9c27b0';
                else color = entity.isEnemy ? '#f44336' : '#2196f3';
                
                if (!entBatches[color]) entBatches[color] = [];
                entBatches[color].push(nx, nz);
            }
        });

        for (const color in entBatches) {
            ctx.fillStyle = color;
            ctx.beginPath();
            const batch = entBatches[color];
            for (let i = 0; i < batch.length; i += 2) {
                ctx.rect(batch[i] - 2.5, batch[i+1] - 2.5, 5, 5);
            }
            ctx.fill();
        }

        ctx.restore();

        // Draw Player indicator (stays at center)
        ctx.save();
        ctx.translate(center, center);
        
        const forwardVector = new THREE.Vector3();
        this.player.mesh.getWorldDirection(forwardVector);
        const playerAngle = Math.atan2(forwardVector.x, -forwardVector.z);
        
        ctx.rotate(playerAngle + camTheta);
        
        // Draw Field of View "Sweep"
        const fovGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 35);
        fovGradient.addColorStop(0, 'rgba(0, 170, 255, 0.3)');
        fovGradient.addColorStop(1, 'rgba(0, 170, 255, 0)');
        ctx.fillStyle = fovGradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 35, -Math.PI/2 - 0.5, -Math.PI/2 + 0.5);
        ctx.fill();

        // Player Triangle
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0, 150, 255, 1)';
        ctx.beginPath();
        ctx.moveTo(0, -9);  // Tip
        ctx.lineTo(-6, 5);  // Bottom Left
        ctx.lineTo(0, 2);   // Rear Notch
        ctx.lineTo(6, 5);   // Bottom Right
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Circular border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(center, center, center - 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}