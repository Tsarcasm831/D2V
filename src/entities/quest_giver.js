import * as THREE from 'three';
import { NPC } from './npc.js';
import { createPlayerMesh } from './player_mesh.js';
import { PlayerAnimator } from './player_animator.js';
import { attachUnderwear } from '../items/underwear.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class QuestGiver extends NPC {
    constructor(scene, shard, pos) {
        super(scene, shard, pos);
        
        // Remove the default box mesh if it exists
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }

        const { mesh, parts, model } = createPlayerMesh();
        this.group = mesh;
        this.parts = parts;
        this.model = model;
        this.group.position.copy(pos);
        this.scene.add(this.group);

        this.setupAppearance();
        this.animator = new PlayerAnimator(this.parts, this.model);
        
        this.name = "Quest Giver";
        this.portrait = "assets/icons/admin_shirt_icon.png";
        this.dialogue = "I have an important task for you, traveler.";
        this.dialogueOptions = [
            { text: "What do you need?", dialogue: "The local forest is overrun with bears. We need someone to thin their numbers." },
            { text: "Maybe later.", dialogue: "The offer remains if you change your mind." }
        ];
    }

    setupAppearance() {
        const config = {
            outfit: 'noble',
            shirtColor: '#8e44ad',
            bodyType: 'male',
            equipment: {
                shirt: true,
                pants: true
            }
        };
        this.model.sync(config);
    }

    update(delta, player) {
        super.update(delta, player);
        
        if (!this.isDead && this.animator) {
            this.animator.animate(
                delta,
                false, // isMoving
                false, // isRunning
                false, // isPickingUp
                this.isDead,
                false, // isJumping
                'none', 0, 0, false, 0, 0, false, 'hips', new THREE.Vector3(), 0, null
            );
        }

        // Look at player if close
        if (player && player.mesh && !this.isDead) {
            const distSq = this.group.position.distanceToSquared(player.mesh.position);
            if (distSq < (8 * SCALE_FACTOR) ** 2) {
                const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 3 * delta);
            }
        }
    }
}
