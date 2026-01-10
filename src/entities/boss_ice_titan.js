import * as THREE from 'three';
import { BossEnemy } from './boss_enemy.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class IceTitan extends BossEnemy {
    constructor(scene, shard, pos) {
        super(scene, shard, pos, 'ice_titan');
        this.maxHealth = 2500;
        this.health = this.maxHealth;
        this.attackRange = 8 * SCALE_FACTOR;
        this.detectRange = 30 * SCALE_FACTOR;
        this.chaseSpeed = 5 * SCALE_FACTOR;
        this.collisionRadius = 4.0 * SCALE_FACTOR; // Larger radius for Titan
    }

    setupMesh() {
        const iceMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.8,
            metalness: 0.5,
            roughness: 0.1,
            emissive: 0x004444
        });
        
        // Huge Bulky Body
        const torsoGeo = new THREE.BoxGeometry(3, 4, 2).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const torso = new THREE.Mesh(torsoGeo, iceMat);
        torso.position.y = 2 * SCALE_FACTOR;
        torso.castShadow = true;
        this.group.add(torso);

        // Head with single glowing eye
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 4.5 * SCALE_FACTOR, 0.5 * SCALE_FACTOR);
        this.group.add(this.headGroup);

        const headGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const head = new THREE.Mesh(headGeo, iceMat);
        this.headGroup.add(head);

        const eyeGeo = new THREE.SphereGeometry(0.3).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 5 });
        this.eye = new THREE.Mesh(eyeGeo, eyeMat);
        this.eye.position.set(0, 0, 0.7 * SCALE_FACTOR);
        this.headGroup.add(this.eye);

        // Arms
        this.leftArm = this.createLimb(iceMat, true);
        this.leftArm.position.set(2 * SCALE_FACTOR, 3.5 * SCALE_FACTOR, 0);
        this.group.add(this.leftArm);

        this.rightArm = this.createLimb(iceMat, true);
        this.rightArm.position.set(-2 * SCALE_FACTOR, 3.5 * SCALE_FACTOR, 0);
        this.group.add(this.rightArm);

        // Legs
        this.leftLeg = this.createLimb(iceMat, false);
        this.leftLeg.position.set(1 * SCALE_FACTOR, 0, 0);
        this.group.add(this.leftLeg);

        this.rightLeg = this.createLimb(iceMat, false);
        this.rightLeg.position.set(-1 * SCALE_FACTOR, 0, 0);
        this.group.add(this.rightLeg);
    }

    createLimb(material, isArm) {
        const group = new THREE.Group();
        const size = isArm ? [0.8, 3, 0.8] : [1, 2.5, 1];
        const geo = new THREE.BoxGeometry(...size).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.y = isArm ? -1.5 * SCALE_FACTOR : 1.25 * SCALE_FACTOR;
        mesh.castShadow = true;
        group.add(mesh);
        return group;
    }

    update(delta, player) {
        if (this.isDead) return;

        const distToPlayer = player ? this.group.position.distanceTo(player.mesh.position) : 999;
        this.timer -= delta;

        if (distToPlayer < this.attackRange && this.state !== 'attack') {
            this.startAttack(player);
        } else if (distToPlayer < this.detectRange) {
            this.chasePlayer(delta, player);
        } else {
            this.state = 'idle';
        }

        this.animate(delta);
    }

    startAttack(player) {
        this.state = 'attack';
        this.timer = 2.0;
        this.attackType = Math.random() < 0.5 ? 'slam' : 'breath';
    }

    chasePlayer(delta, player) {
        this.state = 'chase';
        const targetRot = Math.atan2(player.mesh.position.x - this.group.position.x, player.mesh.position.z - this.group.position.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 2 * delta);
        
        const moveVec = new THREE.Vector3(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y));
        this.group.position.addScaledVector(moveVec, this.chaseSpeed * delta);
    }

    animate(delta) {
        const t = performance.now() * 0.002;
        if (this.state === 'chase') {
            this.leftLeg.rotation.x = Math.sin(t * 5) * 0.5;
            this.rightLeg.rotation.x = Math.cos(t * 5) * 0.5;
            this.leftArm.rotation.x = Math.cos(t * 5) * 0.4;
            this.rightArm.rotation.x = Math.sin(t * 5) * 0.4;
        } else if (this.state === 'attack') {
            if (this.attackType === 'slam') {
                const p = 1.0 - (this.timer / 2.0);
                if (p < 0.5) {
                    this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -Math.PI, 5 * delta);
                } else {
                    this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0.5, 15 * delta);
                    // Impact effect at p ~ 0.6
                }
            }
        }
    }
}
