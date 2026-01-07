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
        attachUnderwear(this.parts);
        
        const purpleColor = 0x8e44ad;
        const goldColor = 0xf1c40f;
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

        // Purple Shirt
        const shirtMat = new THREE.MeshToonMaterial({ color: purpleColor });
        const torsoRadiusTop = 0.3, torsoRadiusBottomShirt = 0.26, shirtLen = 0.32;
        const shirtTorsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottomShirt, shirtLen, 16);
        const shirtTorso = new THREE.Mesh(shirtTorsoGeo, shirtMat);
        shirtTorso.position.y = 0.41 * SCALE_FACTOR;
        this.parts.torsoContainer.add(shirtTorso);

        const sleeveRadius = 0.12, sleeveLen = 0.25;
        const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLen, 12);
        const attachSleeve = (armPart) => {
            const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
            sleeve.position.y = -sleeveLen / 2;
            armPart.add(sleeve);
        };
        attachSleeve(this.parts.rightArm);
        attachSleeve(this.parts.leftArm);

        // Gold Pants/Legs
        const pantsMat = new THREE.MeshToonMaterial({ color: goldColor });
        const thighRadius = 0.1, legLen = 0.42;
        const legGeo = new THREE.CylinderGeometry(thighRadius * 1.35, thighRadius * 1.25, legLen, 12);
        const attachLeg = (thighPart) => {
            const leg = new THREE.Mesh(legGeo, pantsMat);
            leg.position.y = -legLen / 2 + 0.02; 
            thighPart.add(leg);
        };
        attachLeg(this.parts.rightThigh);
        attachLeg(this.parts.leftThigh);
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
