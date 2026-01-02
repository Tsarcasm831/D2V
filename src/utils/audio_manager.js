import * as THREE from 'three';

class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = new Map();
        this.enabled = true;
        
        // Volume controls
        this.masterVolume = parseFloat(localStorage.getItem('masterVolume')) || 0.8;
        this.musicVolume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;
        
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.context.destination);
    }

    setMasterVolume(value) {
        this.masterVolume = value;
        this.masterGain.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
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
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch (e) {
            console.error(`Failed to load audio: ${url}`, e);
        }
    }

    play(name, volume = 0.5, pitch = 1.0) {
        if (!this.enabled) return;
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
    if (audioManager.context.state === 'suspended') {
        audioManager.context.resume();
    }
}, { once: true });

window.addEventListener('touchstart', () => {
    if (audioManager.context.state === 'suspended') {
        audioManager.context.resume();
    }
}, { once: true });

window.addEventListener('keydown', () => {
    if (audioManager.context.state === 'suspended') {
        audioManager.context.resume();
    }
}, { once: true });