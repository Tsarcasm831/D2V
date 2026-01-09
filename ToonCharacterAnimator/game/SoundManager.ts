import { Player } from './Player';

export class SoundManager {
    ctx: AudioContext | null = null;
    
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
            }
        }
    }

    private ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    /**
     * Observes the player state and triggers sounds on transitions
     */
    update(player: Player, dt: number) {
        if (!this.ctx) return;

        // Detect Death
        if (player.isDead && !this.prevIsDead) {
            this.playDeath();
        }

        // Detect Jump
        if (player.isJumping && !this.prevIsJumping) {
            this.playJump();
        }

        // Detect Landing
        const isGrounded = player.mesh.position.y <= 0.001;
        if (isGrounded && !this.prevIsGrounded) {
            this.playLand();
        }

        // Detect Pickup
        if (player.isPickingUp && !this.prevIsPickingUp) {
            this.playPickup();
        }

        // Update previous states
        this.prevIsDead = player.isDead;
        this.prevIsJumping = player.isJumping;
        this.prevIsPickingUp = player.isPickingUp;
        this.prevIsGrounded = isGrounded;
    }

    playJump() {
        if (!this.ctx) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.15);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        osc.start();
        osc.stop(t + 0.15);
    }

    playLand() {
        if (!this.ctx) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        
        osc.start();
        osc.stop(t + 0.15);
    }

    playPickup() {
        if (!this.ctx) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
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
        if (!this.ctx) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.8);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.8);
        
        osc.start();
        osc.stop(t + 0.8);
    }
}