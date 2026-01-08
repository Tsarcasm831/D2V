import * as THREE from 'three';

class AudioManager {
    constructor() {
        this.context = null;
        this.buffers = new Map();
        this.pendingBuffers = new Map();
        this.enabled = true;
        this._unlocked = false;
        
        // Volume controls
        this.masterVolume = parseFloat(localStorage.getItem('masterVolume')) || 0.8;
        this.musicVolume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;
        
        this.masterGain = null;
    }

    _ensureContext() {
        if (this.context) return;
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.context.destination);
        this._decodePending();
    }

    async _decodePending() {
        if (!this.context || this.pendingBuffers.size === 0) return;
        const pending = Array.from(this.pendingBuffers.entries());
        this.pendingBuffers.clear();
        await Promise.all(pending.map(async ([name, buffer]) => {
            try {
                const audioBuffer = await this.context.decodeAudioData(buffer);
                this.buffers.set(name, audioBuffer);
            } catch (e) {
                console.error(`Failed to decode audio: ${name}`, e);
            }
        }));
    }

    unlock() {
        if (this._unlocked) {
            if (this.context && this.context.state === 'suspended') {
                this.context.resume();
            }
            return;
        }
        this._unlocked = true;
        this._ensureContext();
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    setMasterVolume(value) {
        this.masterVolume = value;
        if (this.masterGain && this.context) {
            this.masterGain.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
        }
        localStorage.setItem('masterVolume', value);
    }

    setMusicVolume(value) {
        this.musicVolume = value;
        localStorage.setItem('musicVolume', value);
        // If there's a music node, update its volume here
    }

    async load(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            if (!this.context) {
                this.pendingBuffers.set(name, arrayBuffer);
                return;
            }
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch (e) {
            console.error(`Failed to load audio: ${url}`, e);
        }
    }

    play(name, volume = 0.5, pitch = 1.0) {
        if (!this.enabled || !this._unlocked) return;
        if (!this.context) this._ensureContext();
        const buffer = this.buffers.get(name);
        if (!buffer) return;

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;
        
        // Randomize pitch slightly for variety if pitch is 1.0
        const p = pitch === 1.0 ? 0.95 + Math.random() * 0.1 : pitch;
        source.playbackRate.value = p;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start(0);
    }
}

export const audioManager = new AudioManager();

// Ensure AudioContext is resumed after first user interaction to fix autoplay errors
window.addEventListener('mousedown', () => {
    audioManager.unlock();
}, { once: true, capture: true });

window.addEventListener('touchstart', () => {
    audioManager.unlock();
}, { once: true, capture: true });

window.addEventListener('keydown', () => {
    audioManager.unlock();
}, { once: true, capture: true });
