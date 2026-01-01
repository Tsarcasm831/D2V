import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class NPC {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.isEnemy = true;
        this.isDead = false;

        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const material = new THREE.MeshStandardMaterial({ color: 0x2e4053 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(pos);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        
        this.velocity = new THREE.Vector3();
        this.maxHealth = 2;
        this.health = this.maxHealth;

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._collisionTimer = 0;
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.die(fromPos, player);
        } else {
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('enemy_hit', 0.3);
            });
        }
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;
        
        const dir = this._tempVec1.subVectors(this.mesh.position, fromPos).normalize();
        this.velocity.set(dir.x * 15, 10, dir.z * 15);
        
        this.mesh.material.color.set(0x7b241c);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.5);
        });
    }

    checkCollisions(player) {
        if (!this.shard || this.isDead) return;
        
        // Skip collisions if player is too far (performance optimization)
        if (player && player.mesh) {
            const pPos = player.mesh.position;
            const distSqToPlayer = (this.group || this.mesh).position.distanceToSquared(pPos);
            if (distSqToPlayer > 2500) return; // Skip if > 50m from player
        }

        const myPos = (this.group || this.mesh).position;
        const myRadius = 0.5 * SCALE_FACTOR;

        const npcs = this.shard.npcs;
        for (let i = 0; i < npcs.length; i++) {
            const other = npcs[i];
            if (other === this || other.isDead) continue;
            const otherPos = (other.group || other.mesh).position;
            const dx = myPos.x - otherPos.x;
            const dz = myPos.z - otherPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq > 25) continue;
            
            const otherRadius = (other.type === 'bear' ? 1.0 : other.type === 'wolf' ? 0.6 : 0.5) * SCALE_FACTOR;
            const minDist = myRadius + otherRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        const fauna = this.shard.fauna;
        for (let i = 0; i < fauna.length; i++) {
            const other = fauna[i];
            if (other === this || other.isDead) continue;
            const otherPos = (other.group || other.mesh).position;
            const dx = myPos.x - otherPos.x;
            const dz = myPos.z - otherPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq > 25) continue;
            
            const otherRadius = (other.type === 'bear' ? 1.0 : other.type === 'wolf' ? 0.6 : 0.5) * SCALE_FACTOR;
            const minDist = myRadius + otherRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        if (player && player.mesh) {
            const pPos = player.mesh.position;
            const dx = myPos.x - pPos.x;
            const dz = myPos.z - pPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq < 25) {
                const pRadius = 0.5 * SCALE_FACTOR;
                const minDist = myRadius + pRadius;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist < 0.01) return;
                    const overlap = (minDist - dist) * 0.5;
                    myPos.x += (dx / dist) * overlap;
                    myPos.z += (dz / dist) * overlap;
                }
            }
        }
    }

    update(delta, player) {
        if (!this.isDead) {
            this._collisionTimer -= delta;
            if (this._collisionTimer <= 0) {
                this._collisionTimer = 0.05; // 20Hz collision update
                this.checkCollisions(player);
            }
        }

        if (this.isDead) {
            const floorY = this.shard.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
            if (this.mesh.position.y > floorY || this.velocity.y > 0) {
                const d = delta || 0.016;
                this.mesh.position.addScaledVector(this.velocity, d);
                this.velocity.y -= 40 * d;
                this.mesh.rotation.x += 8 * d;
                
                if (this.mesh.position.y < floorY) {
                    this.mesh.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.mesh.rotation.x = Math.PI / 2;
                }
            }
        }
    }
}