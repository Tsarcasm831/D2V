import { audioManager } from '../utils/audio_manager.js';

export class AssetLoader {
    constructor() {
        this.images = [
            'assets/icons/the_frozen_steppes_icon.png', 'assets/icons/firepit_icon.png', 'assets/icons/floor_icon.png', 'assets/icons/axe_icon.png',
            'assets/gear/shirt.png', 'assets/icons/pelt_icon.png', 'assets/icons/meat_icon.png', 'assets/icons/combat_icon.png',
            'assets/icons/crafting_icon.png', 'assets/icons/wood_log_icon.png', 'assets/icons/attack_icon.png', 'assets/textures/snow_texture.png',
            'assets/textures/grass_texture.png', 'assets/textures/dirt_texture.png', 'assets/textures/forest_ground_texture.png', 'assets/textures/swamp_ground_texture.png',
            'assets/icons/pickaxe_icon.png', 'assets/icons/club_icon.png', 'assets/icons/berry_icon.png', 'assets/icons/wall_icon.png', 'assets/icons/doorway_icon.png',
            'assets/vfx/summoning_circle.png'
        ];
        this.sounds = {
            'error-bad': 'assets/sounds/error-bad.mp3',
            'chop': 'assets/sounds/chop.mp3',
            'whoosh': 'assets/sounds/whoosh.mp3',
            'bear_growl': 'assets/sounds/bear_growl.mp3',
            'splash': 'assets/sounds/asset_name.mp3',
            'footstep_snow': 'assets/sounds/footstep_snow.mp3',
            'enemy_hit': 'assets/sounds/enemy_hit.mp3',
            'harvest': 'assets/sounds/harvest.mp3',
            'wolf_howl': 'assets/sounds/wolf_howl.mp3',
            'hit-metallic': 'assets/sounds/hit-metallic.mp3'
        };
        this.total = this.images.length + Object.keys(this.sounds).length;
        this.loaded = 0;
    }

    async loadAll(onProgress) {
        // Automatically add gear images to the list to ensure they are preloaded
        const gearImages = [
            'assets/gear/vest.png', 'assets/gear/leather_armor.png', 'assets/gear/assassins_cloak.png',
            'assets/gear/ninja_headband.png', 'assets/gear/hunters_cap.png', 'assets/gear/assassins_cowl.png',
            'assets/gear/leather_gloves.png', 'assets/gear/leather_boots.png', 'assets/gear/black_pants.png'
        ];
        
        const allImages = [...this.images, ...gearImages];
        this.total = allImages.length + Object.keys(this.sounds).length;

        const imagePromises = allImages.map(src => {
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