
import * as THREE from 'three';
import { Player } from './Player';
import { PlayerUtils } from './player/PlayerUtils';

export class SoundManager {
    ctx: AudioContext | null = null;
    masterGain: GainNode | null = null;
    
    // State tracking for edge detection
    private prevIsDead = false;
    private prevIsJumping = false;
    private prevIsPickingUp = false;
    private prevIsGrounded = true;

    constructor() {
        if (typeof window !== 'undefined') {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = 0.5; // Default volume
            }
        }
    }

    private ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setVolume(volume: number) {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
        }
    }

    update(player: Player, dt: number) {
        if (!this.ctx) return;

        const isDead = player.status.isDead;

        // Detect Death
        if (isDead && !this.prevIsDead) {
            this.playDeath();
        }

        // Detect Jump
        if (player.isJumping && !this.prevIsJumping) {
            this.playJump();
        }

        // Detect Landing
        const isGrounded = !player.isJumping && Math.abs(player.jumpVelocity) < 0.1;
        if (isGrounded && !this.prevIsGrounded) {
            this.playLand();
        }

        // Detect Pickup
        if (player.isPickingUp && !this.prevIsPickingUp) {
            this.playPickup();
        }

        // Detect Footsteps (Locomotion)
        if (player.didStep && !player.isJumping && isGrounded && !isDead) {
            const speed = player.velocity.length();
            const vol = speed > 8 ? 0.35 : 0.15;
            
            // Determine Terrain
            const terrain = this.getTerrainAt(player.mesh.position);
            
            this.playFootstep(vol, terrain);
            player.didStep = false;
        }

        // Update previous states
        this.prevIsDead = isDead;
        this.prevIsJumping = player.isJumping;
        this.prevIsPickingUp = player.isPickingUp;
        this.prevIsGrounded = isGrounded;
    }

    private getTerrainAt(pos: THREE.Vector3): string {
        // 1. Check Water (Pond)
        const pondDepth = PlayerUtils.getTerrainHeight(pos.x, pos.z);
        if (pondDepth < -0.1) return 'Water';

        // 2. Check Grid Tile
        const patchSize = 40;
        const ix = Math.round(pos.x / patchSize);
        const iz = Math.round(pos.z / patchSize);
        
        const key = `${ix},${iz}`;
        
        const terrainMap: Record<string, string> = {
            '0,0': 'Grass',
            '1,0': 'Sand',
            '1,1': 'Gravel',
            '0,1': 'Dirt',
            '-1,1': 'Wood',
            '-1,0': 'Stone',
            '-1,-1': 'Metal',
            '0,-1': 'Snow',
            '1,-1': 'Leaves'
        };

        return terrainMap[key] || 'Grass';
    }

    playFootstep(volume: number, terrain: string) {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        
        // Setup Base Noise
        const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 2;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        // --- Synthesis Parameters per Terrain ---
        
        switch (terrain) {
            case 'Water':
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.setValueAtTime(400, t);
                noiseFilter.frequency.linearRampToValueAtTime(800, t + 0.1); // Splash sweep
                noiseGain.gain.setValueAtTime(volume * 1.5, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                break;

            case 'Wood':
                // Hollow thud
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(300, t);
                noiseGain.gain.setValueAtTime(volume * 1.2, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                // Add resonant sine for "hollow" feel
                const osc = this.ctx.createOscillator();
                osc.type = 'square'; // Woody harmonic
                osc.frequency.setValueAtTime(150, t);
                const oscGain = this.ctx.createGain();
                oscGain.gain.setValueAtTime(volume * 0.3, t);
                oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.connect(oscGain).connect(this.masterGain);
                osc.start(t);
                osc.stop(t+0.1);
                break;

            case 'Stone':
                // Sharp click
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.setValueAtTime(1000, t);
                noiseGain.gain.setValueAtTime(volume * 1.2, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04); // Very short
                break;

            case 'Metal':
                // Clank
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.setValueAtTime(2000, t);
                noiseGain.gain.setValueAtTime(volume, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                // Ringing
                const ring = this.ctx.createOscillator();
                ring.type = 'triangle';
                ring.frequency.setValueAtTime(800, t);
                const ringGain = this.ctx.createGain();
                ringGain.gain.setValueAtTime(volume * 0.4, t);
                ringGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                ring.connect(ringGain).connect(this.masterGain);
                ring.start(t);
                ring.stop(t+0.4);
                break;

            case 'Snow':
                // Squeaky crunch
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.setValueAtTime(1200, t);
                noiseGain.gain.setValueAtTime(volume * 0.8, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                break;

            case 'Gravel':
                // Gritty
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.setValueAtTime(600, t);
                noiseGain.gain.setValueAtTime(volume * 1.0, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                break;

            case 'Sand':
                // Soft slide
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(600, t);
                noiseGain.gain.setValueAtTime(volume * 0.7, t);
                noiseGain.gain.linearRampToValueAtTime(0.01, t + 0.18); // Longer decay
                break;
            
            case 'Leaves':
                // Rustle (High freq, messy)
                noiseFilter.type = 'peaking';
                noiseFilter.frequency.setValueAtTime(2500, t);
                noiseGain.gain.setValueAtTime(volume * 0.9, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                break;

            case 'Dirt':
            default:
                // Standard thud + crunch
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(400, t);
                noiseGain.gain.setValueAtTime(volume, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                
                // Bass thud
                const thud = this.ctx.createOscillator();
                thud.frequency.setValueAtTime(80, t);
                thud.frequency.exponentialRampToValueAtTime(40, t+0.1);
                const thudGain = this.ctx.createGain();
                thudGain.gain.setValueAtTime(volume * 0.5, t);
                thudGain.gain.exponentialRampToValueAtTime(0.01, t+0.1);
                thud.connect(thudGain).connect(this.masterGain);
                thud.start(t);
                thud.stop(t+0.1);
                break;
        }

        noise.start(t);
        noise.stop(t + 0.3);
    }

    playJump() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.15);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        osc.start();
        osc.stop(t + 0.15);
    }

    playLand() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        
        osc.start();
        osc.stop(t + 0.15);
    }

    playPickup() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.setValueAtTime(1800, t + 0.08);
        
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.setValueAtTime(0.15, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        
        osc.start();
        osc.stop(t + 0.3);
    }

    playDeath() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.8);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.8);
        
        osc.start();
        osc.stop(t + 0.8);
    }
}
