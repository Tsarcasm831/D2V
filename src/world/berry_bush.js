import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class BerryBush {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.type = 'berry_bush';
        this.isDead = false;
        this.health = 2;

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        this.radius = 0.5 * SCALE_FACTOR;
        this.setupMesh();
    }

    setupMesh() {
        const wm = this.shard.worldManager;
        const bushMat = wm ? wm.getSharedMaterial('standard', { color: 0x1b5e20, roughness: 0.8 }) : new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.8 });
        
        let berryColor = 0xc62828;
        if (this.type === 'fire_flower') berryColor = 0xff4400;
        if (this.type === 'mana_flower') berryColor = 0x00ffff;
        
        const berryMat = wm ? wm.getSharedMaterial('standard', { color: berryColor, emissive: berryColor, emissiveIntensity: 0.5 }) : new THREE.MeshStandardMaterial({ color: berryColor, emissive: 0x330000 });

        this.berryGroup = new THREE.Group();
        this.group.add(this.berryGroup);
        this.isHarvested = false;
        this.respawnTime = 3600 * 1000; // 1 hour in ms
        this.harvestTimestamp = 0;

        // Main bush volume
        const bushParts = this.type === 'berry_bush' ? 3 : 1;
        for (let i = 0; i < bushParts; i++) {
            const size = (this.type === 'berry_bush' ? (0.4 + Math.random() * 0.2) : (0.2 + Math.random() * 0.1)) * SCALE_FACTOR;
            const geo = wm ? wm.getSharedGeometry('sphere', size, 8, 8) : new THREE.SphereGeometry(size, 8, 8);
            const part = new THREE.Mesh(geo, bushMat);
            part.position.set(
                (Math.random() - 0.5) * 0.4 * SCALE_FACTOR,
                (0.3 + Math.random() * 0.2) * SCALE_FACTOR,
                (Math.random() - 0.5) * 0.4 * SCALE_FACTOR
            );
            part.castShadow = true;
            part.layers.enable(1);
            this.group.add(part);
            
            // Add berries/flowers to each part
            const count = this.type === 'berry_bush' ? 4 : 1;
            for (let j = 0; j < count; j++) {
                const berry = new THREE.Mesh(
                    wm ? wm.getSharedGeometry('sphere', 0.06 * SCALE_FACTOR, 4, 4) : new THREE.SphereGeometry(0.06 * SCALE_FACTOR, 4, 4),
                    berryMat
                );
                const angle = Math.random() * Math.PI * 2;
                const dist = size * 0.95;
                berry.position.set(
                    part.position.x + Math.cos(angle) * dist,
                    part.position.y + Math.random() * size * 0.5,
                    part.position.z + Math.sin(angle) * dist
                );
                berry.layers.enable(1);
                this.berryGroup.add(berry);
            }
        }
    }

    harvest() {
        if (this.isHarvested || this.isDead) return false;
        
        // Trap effect for Fire Flowers
        if (this.type === 'fire_flower' && Math.random() < 0.3) {
            if (this.shard?.worldManager?.game?.player) {
                this.shard.worldManager.game.player.takeDamage(10);
                if (this.shard.worldManager.game.ui) {
                    this.shard.worldManager.game.ui.showStatus("BOOM! Fire Flower detonated!", true);
                }
            }
        }

        this.isHarvested = true;
        this.harvestTimestamp = Date.now();
        this.berryGroup.visible = false;
        
        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('harvest', 0.4);
        });
        
        return true;
    }

    update(delta) {
        if (this.isHarvested && !this.isDead) {
            if (Date.now() - this.harvestTimestamp > this.respawnTime) {
                this.isHarvested = false;
                this.berryGroup.visible = true;
            }
        }
    }

    takeDamage(amount, player) {
        if (this.isDead) return;

        // Check tool requirements
        const tool = player.inventory.hotbar[player.inventory.selectedSlot];
        const isPickaxe = tool && tool.type === 'pickaxe';

        if (isPickaxe) {
            if (player.ui) {
                player.ui.showStatus("Bushes cannot be mined with a Pickaxe!");
            }
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('error-bad', 0.4);
            });
            return;
        }

        this.health -= amount;

        // Visual pop
        const originalScale = this.group.scale.clone();
        this.group.scale.set(1.2, 1.2, 1.2);
        setTimeout(() => {
            if (!this.isDead && this.group) this.group.scale.copy(originalScale);
        }, 50);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('harvest', 0.3);
        });

        if (this.health <= 0) {
            this.die(player);
        }
    }

    die(player) {
        this.isDead = true;

        // Drop 2 physical wood logs
        if (this.shard && this.shard.spawnItem) {
            for (let i = 0; i < 2; i++) {
                const dropPos = this.group.position.clone();
                dropPos.x += (Math.random() - 0.5) * 1.5 * SCALE_FACTOR;
                dropPos.z += (Math.random() - 0.5) * 1.5 * SCALE_FACTOR;
                this.shard.spawnItem('wood', dropPos, {
                    type: 'wood',
                    name: 'Wood Log',
                    icon: 'assets/icons/wood_log_icon.png',
                    count: 1,
                    stackLimit: 99
                });
            }
        }
        
        // Shrink away
        const interval = setInterval(() => {
            if (!this.group) {
                clearInterval(interval);
                return;
            }
            this.group.scale.multiplyScalar(0.8);
            if (this.group.scale.x < 0.1) {
                this.scene.remove(this.group);
                this.group = null;
                clearInterval(interval);
            }
        }, 30);
    }
}