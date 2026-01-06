import * as THREE from 'three';
import { PlayerConfig, OutfitType } from '../../types';

export class PlayerMaterials {
    skin: THREE.MeshToonMaterial;
    shirt: THREE.MeshToonMaterial;
    pants: THREE.MeshToonMaterial;
    boots: THREE.MeshToonMaterial;
    iris: THREE.MeshToonMaterial;
    sclera: THREE.MeshToonMaterial;
    pupil: THREE.MeshToonMaterial;
    lip: THREE.MeshToonMaterial;
    underwear: THREE.MeshToonMaterial;

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
    }

    sync(config: PlayerConfig) {
        this.skin.color.set(config.skinColor);
        this.sclera.color.set(config.scleraColor);
        this.iris.color.set(config.eyeColor);
        this.pupil.color.set(config.pupilColor);
        this.lip.color.set(config.lipColor);
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