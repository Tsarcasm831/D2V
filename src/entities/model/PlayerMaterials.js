import * as THREE from 'three';

const DEFAULT_COLORS = {
    skinColor: '#ffdbac',
    lipColor: '#e0b094',
    scleraColor: '#ffffff',
    eyeColor: '#333333',
    pupilColor: '#000000',
    hairColor: '#3e2723'
};

const resolveColor = (value, fallback) => (
    value === undefined || value === null || value === '' ? fallback : value
);

export class PlayerMaterials {
    constructor(config = {}) {
        const skinColor = resolveColor(config.skinColor, DEFAULT_COLORS.skinColor);
        const lipColor = resolveColor(config.lipColor, DEFAULT_COLORS.lipColor);
        const scleraColor = resolveColor(config.scleraColor, DEFAULT_COLORS.scleraColor);
        const eyeColor = resolveColor(config.eyeColor, DEFAULT_COLORS.eyeColor);
        const pupilColor = resolveColor(config.pupilColor, DEFAULT_COLORS.pupilColor);
        const hairColor = resolveColor(config.hairColor, DEFAULT_COLORS.hairColor);
        const torsoColor = resolveColor(config.torsoColor, null);

        this.skin = new THREE.MeshToonMaterial({ color: skinColor });
        this.shirt = new THREE.MeshToonMaterial({ color: 0x888888 });
        this.torso = new THREE.MeshToonMaterial({ color: torsoColor || 0x888888 });
        this.pants = new THREE.MeshToonMaterial({ color: 0x444444 });
        this.boots = new THREE.MeshToonMaterial({ color: 0x222222 });
        this.lip = new THREE.MeshToonMaterial({ color: lipColor });
        this.sclera = new THREE.MeshToonMaterial({ color: scleraColor });
        this.iris = new THREE.MeshToonMaterial({ color: eyeColor });
        this.pupil = new THREE.MeshToonMaterial({ color: pupilColor });
        this.underwear = new THREE.MeshToonMaterial({ color: 0xeaeaea });
        this.hair = new THREE.MeshToonMaterial({ color: hairColor });
        this.torsoOverride = torsoColor;
    }

    sync(config) {
        this.skin.color.set(resolveColor(config.skinColor, DEFAULT_COLORS.skinColor));
        this.sclera.color.set(resolveColor(config.scleraColor, DEFAULT_COLORS.scleraColor));
        this.iris.color.set(resolveColor(config.eyeColor, DEFAULT_COLORS.eyeColor));
        this.pupil.color.set(resolveColor(config.pupilColor, DEFAULT_COLORS.pupilColor));
        this.lip.color.set(resolveColor(config.lipColor, DEFAULT_COLORS.lipColor));
        this.hair.color.set(resolveColor(config.hairColor, DEFAULT_COLORS.hairColor));

        const torsoColor = resolveColor(config.torsoColor, null);
        this.torsoOverride = torsoColor;
        if (torsoColor !== null) {
            this.torso.color.set(torsoColor);
        }
    }

    applyOutfit(outfit, skinColor) {
        let sc = 0x888888, pc = 0x444444, bc = 0x222222;
        if(outfit === 'peasant') { sc = 0x8d6e63; pc = 0x5d4037; bc = 0x3e2723; }
        else if(outfit === 'warrior') { sc = 0x607d8b; pc = 0x37474f; bc = 0x263238; }
        else if(outfit === 'noble') { sc = 0x3f51b5; pc = 0x1a237e; bc = 0x111111; }
        else if(outfit === 'naked' || outfit === 'nude') { sc = pc = bc = new THREE.Color(skinColor).getHex(); }
        this.shirt.color.setHex(sc);
        this.pants.color.setHex(pc);
        this.boots.color.setHex(bc);
        if (this.torsoOverride === null) {
            this.torso.color.setHex(sc);
        }
    }
}
