import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class BossEnemy {
    constructor(scene, shard, pos, type) {
        this.scene = scene;
        this.shard = shard;
        this.type = type;
        this.isEnemy = true;
        this.isBoss = true;
        this.isDead = false;
        
        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        this.level = 50;
        this.phase = 1;
        this.maxHealth = 1000;
        this.health = this.maxHealth;
        
        this.velocity = new THREE.Vector3();
        this.state = 'idle';
        this.timer = 0;
        
        this.setupMesh();
        this.addBossUI();
    }

    setupMesh() {
        // Base implementation - override in subclasses
    }

    addBossUI() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, 512, 64);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type.toUpperCase(), 256, 45);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 5 * SCALE_FACTOR;
        this.label.scale.set(8, 1, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player, isWeakPoint = false) {
        if (this.isDead) return;
        
        let finalDamage = amount;
        if (isWeakPoint) {
            this.showDamageNumber(finalDamage, true);
        }
        
        this.health -= finalDamage;
        this.updatePhase();

        if (this.health <= 0) {
            this.die(fromPos, player);
        }
    }

    updatePhase() {
        const hpPercent = this.health / this.maxHealth;
        if (hpPercent < 0.3) this.phase = 3;
        else if (hpPercent < 0.6) this.phase = 2;
    }

    showDamageNumber(amount, isCrit) {
        // Implementation from Bear/Wolf
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        player?.game?.achievementManager?.unlock('boss_slayer');
        // Death animation and loot
    }

    update(delta, player) {
        // AI Logic
    }
}
