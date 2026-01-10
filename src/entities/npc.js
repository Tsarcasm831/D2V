import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class NPC {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;
        this.worldManager = shard ? shard.worldManager : null;
        this.group = new THREE.Group();
        this.group.userData.entity = this;
        this.group.position.copy(pos);
        this.scene.add(this.group);
        
        this.isDead = false;
        this.isEnemy = false;
        this.name = "NPC";
        
        if (this.shard && this.shard.npcs) {
            if (!this.shard.npcs.includes(this)) {
                this.shard.npcs.push(this);
                if (this.worldManager) this.worldManager.invalidateCache();
            }
        } else {
            console.warn(`NPC: No shard or npcs list for ${this.name} at ${pos.x}, ${pos.z}`);
        }

        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const material = new THREE.MeshStandardMaterial({ color: 0x2e4053 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(pos);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        
        this.velocity = new THREE.Vector3();
        this.maxHealth = 2;
        this.health = this.maxHealth;

        // AI Collision avoidance state
        this.isColliding = false;
        this.pauseTimer = 0;
        this.avoidanceAngle = 0;

        this.name = "Villager";
        this.portrait = "assets/gear/assassins_cowl.png";
        this.dialogue = "Welcome, traveler. What can I do for you today?";
        this.dialogueOptions = [
            { text: "Tell me about this place", dialogue: "This is a land of adventure and danger. Be careful out there!" },
            { text: "Have you seen anything strange?", dialogue: "I've heard rumors of strange creatures in the forest to the north." }
        ];

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._collisionTimer = 0;
    }

    resolveCollision(entityPos, entityRadius) {
        if (this.isDead) return null;
        
        const myPos = (this.group || this.mesh).position;
        const dx = entityPos.x - myPos.x;
        const dz = entityPos.z - myPos.z;
        const distSq = dx * dx + dz * dz;
        const myRadius = 0.5 * SCALE_FACTOR;
        const minDist = entityRadius + myRadius;

        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            if (dist < 0.01) return null;

            const overlap = (minDist - dist);
            const nx = dx / dist;
            const nz = dz / dist;

            entityPos.x += nx * overlap;
            entityPos.z += nz * overlap;
            return { nx, nz };
        }
        return null;
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
        const myPos = (this.group || this.mesh).position;
        if (player && player.mesh) {
            const pPos = player.mesh.position;
            const distSqToPlayer = myPos.distanceToSquared(pPos);
            if (distSqToPlayer > 2500) return; // Skip if > 50m from player
        }

        const PLATEAU_X = 4800; // 80 * 60
        const PLATEAU_Z = -6480; // -108 * 60
        const dx = myPos.x - PLATEAU_X;
        const dz = myPos.z - PLATEAU_Z;
        const distSq = dx * dx + dz * dz;

        // Block all enemies from the plateau radius
        if (this.isEnemy) {
            const plateauRadiusSq = 6561.0; // (60 * 1.35)^2
            
            if (distSq < plateauRadiusSq) {
                const dist = Math.sqrt(distSq);
                const pushDist = (81.0 - dist) + 1.0;
                myPos.x += (dx / dist) * pushDist;
                myPos.z += (dz / dist) * pushDist;
                if (this.state === 'chase') this.state = 'idle';
                return;
            }
        }

        // Specific additional check for the bowl (No assassins in bowl)
        if (this.type === 'assassin' || this.isEnemy) {
            const bowlRadiusSq = 5184.0; // 72^2
            if (distSq < bowlRadiusSq) {
                const dist = Math.sqrt(distSq);
                const pushDist = (72.0 - dist) + 1.0;
                myPos.x += (dx / dist) * pushDist;
                myPos.z += (dz / dist) * pushDist;
                if (this.state === 'chase') this.state = 'idle';
                return;
            }
        }

        const myRadius = 0.5 * SCALE_FACTOR;
        let collisionDetected = false;

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
                collisionDetected = true;
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
                collisionDetected = true;
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
                    collisionDetected = true;
                }
            }
        }

        // Handle collision avoidance AI
        if (collisionDetected && !this.isColliding) {
            this.isColliding = true;
            this.pauseTimer = 0.5 + Math.random() * 0.5; // Pause for 0.5-1s
            // New random angle to turn towards
            this.avoidanceAngle = Math.random() * Math.PI * 2;
        } else if (!collisionDetected) {
            this.isColliding = false;
        }
    }

    update(delta, player) {
        if (!this.isDead) {
            if (this.pauseTimer > 0) {
                this.pauseTimer -= delta;
            }

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