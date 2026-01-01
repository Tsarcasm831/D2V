import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class ItemDrop {
    constructor(scene, shard, type, pos, itemData) {
        this.scene = scene;
        this.shard = shard;
        this.type = type;
        this.pos = pos.clone();
        this.itemData = itemData; // { type, name, icon, count }
        this.isDead = false;

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        this.setupMesh();
        
        this.bobTime = Math.random() * Math.PI * 2;
    }

    setupMesh() {
        const wm = this.shard.worldManager;
        if (this.type === 'wood') {
            const mat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const log = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 0.4, 6).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR),
                mat
            );
            log.rotation.z = Math.PI / 2;
            log.castShadow = true;
            this.group.add(log);
        } else {
            // Default generic cube for unknown drops
            const mat = wm ? wm.getSharedMaterial('standard', { color: 0xaaaaaa }) : new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 0.2).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR),
                mat
            );
            this.group.add(box);
        }
    }

    update(delta) {
        if (this.isDead) return;
        this.bobTime += delta * 3;
        this.group.position.y = this.pos.y + 0.3 * SCALE_FACTOR + Math.sin(this.bobTime) * 0.1 * SCALE_FACTOR;
        this.group.rotation.y += delta;
    }

    collect(player) {
        if (this.isDead) return false;
        
        if (player.inventory.addItem(this.itemData)) {
            this.isDead = true;
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('harvest', 0.3);
            });
            
            // Collect animation
            const targetPos = player.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));
            const startPos = this.group.position.clone();
            let p = 0;
            const animate = () => {
                p += 0.15;
                if (p >= 1) {
                    this.scene.remove(this.group);
                    return;
                }
                this.group.position.lerpVectors(startPos, player.mesh.position, p);
                this.group.scale.setScalar(1 - p);
                requestAnimationFrame(animate);
            };
            animate();
            return true;
        }
        return false;
    }
}