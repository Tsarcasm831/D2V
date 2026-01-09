
import * as THREE from 'three';

export class PlayerStatusHandler {
    isDead: boolean = false;
    deathTime: number = 0;
    deathVariation = { side: 1, twist: 0, fallDir: 1, stumbleDir: 0 };
    recoverTimer: number = 0;

    update(dt: number) {
        if (this.isDead) {
            this.deathTime += dt;
        } else {
            if (this.recoverTimer > 0) this.recoverTimer -= dt;
        }
    }

    toggleDeath(mesh: THREE.Group) {
        this.isDead = !this.isDead;
        this.deathTime = 0;
        if (this.isDead) {
            this.deathVariation = {
                side: Math.random() > 0.5 ? 1 : -1,
                twist: (Math.random() - 0.5) * 0.5,
                fallDir: Math.random() > 0.5 ? 1 : -1,
                stumbleDir: (Math.random() - 0.5) * 0.5
            };
        } else {
            this.recoverTimer = 0.5;
            // Reset rotation to upright (keep Y rotation)
            mesh.rotation.set(0, mesh.rotation.y, 0);
        }
    }
}
