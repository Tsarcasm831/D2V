import { audioManager } from './audio_manager.js';

export class AssetLoader {
    constructor() {
        this.images = [
            'the_frozen_steppes_icon.png', 'firepit_icon.png', 'floor_icon.png', 'axe_icon.png',
            'shirt_icon.png', 'pelt_icon.png', 'meat_icon.png', 'combat_icon.png',
            'crafting_icon.png', 'wood_log_icon.png', 'attack_icon.png', 'snow_texture.png',
            'grass_texture.png', 'dirt_texture.png', 'forest_ground_texture.png', 'swamp_ground_texture.png',
            'pickaxe_icon.png', 'club_icon.png', 'berry_icon.png', 'wall_icon.png', 'doorway_icon.png',
            'summoning_circle.png'
        ];
        this.sounds = {
            'error-bad': 'error-bad.mp3',
            'chop': 'chop.mp3',
            'whoosh': 'whoosh.mp3',
            'bear_growl': 'bear_growl.mp3',
            'splash': 'asset_name.mp3',
            'footstep_snow': 'footstep_snow.mp3',
            'enemy_hit': 'enemy_hit.mp3',
            'harvest': 'harvest.mp3',
            'wolf_howl': 'wolf_howl.mp3',
            'hit-metallic': 'hit-metallic.mp3'
        };
        this.total = this.images.length + Object.keys(this.sounds).length;
        this.loaded = 0;
    }

    async loadAll(onProgress) {
        const imagePromises = this.images.map(src => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.loaded++;
                    if (onProgress) onProgress(this.loaded / this.total);
                    resolve();
                };
                img.onerror = () => {
                    this.loaded++;
                    if (onProgress) onProgress(this.loaded / this.total);
                    resolve(); // Continue anyway
                };
                img.src = src;
            });
        });

        const soundPromises = Object.entries(this.sounds).map(async ([name, url]) => {
            await audioManager.load(name, url);
            this.loaded++;
            if (onProgress) onProgress(this.loaded / this.total);
        });

        await Promise.all([...imagePromises, ...soundPromises]);
    }
}