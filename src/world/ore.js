import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

const ORE_CONFIG = {
    rock: { health: 3, tier: 0, color: 0x757575 },
    coal: { health: 2, tier: 0, color: 0x212121 },
    copper: { health: 5, tier: 0, color: 0xd35400 },
    iron: { health: 6, tier: 1, color: 0x455a64 },
    sulfur: { health: 4, tier: 1, color: 0xf1c40f },
    silver: { health: 8, tier: 2, color: 0xbdc3c7 },
    gold: { health: 10, tier: 2, color: 0xffd700 }
};

export class Ore {
    constructor(scene, shard, type, pos) {
        this.scene = scene;
        this.shard = shard; 
        this.type = type;
        this.isDead = false;
        
        const config = ORE_CONFIG[type] || ORE_CONFIG.rock;
        this.maxHealth = config.health;
        this.tierRequired = config.tier;
        this.health = this.maxHealth;

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        // Visual Configuration
        this.radius = 0.8 * SCALE_FACTOR;
        this.shardCount = 60; // Reduced from 150
        this.shardsArray = []; 
        this.dummy = new THREE.Object3D(); 
        
        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._explosionStartTime = 0;

        this.setupMesh();
    }

    setupMesh() {
        const wm = this.shard.worldManager;
        const config = ORE_CONFIG[this.type] || ORE_CONFIG.rock;
        const geometry = wm ? wm.getSharedGeometry('tetrahedron', 1, 0) : new THREE.TetrahedronGeometry(1, 0); 
        const material = wm ? wm.getSharedMaterial('standard', { 
            color: config.color, 
            flatShading: true,
            metalness: (this.type === 'iron' || this.type === 'silver' || this.type === 'gold') ? 0.6 : 0,
            roughness: 0.4
        }) : new THREE.MeshStandardMaterial({ 
            color: config.color, 
            flatShading: true,
            metalness: (this.type === 'iron' || this.type === 'silver' || this.type === 'gold') ? 0.6 : 0,
            roughness: 0.4
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, this.shardCount);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // --- DENSE CLUSTER GENERATION ---
        for (let i = 0; i < this.shardCount; i++) {
            this.initShard(i);
        }

        // Sort shards by distance from center (descending)
        // This ensures we mine the outer shell first
        this.shardsArray.sort((a, b) => b.dist - a.dist);

        this.group.add(this.mesh);
    }

    initShard(i) {
        // 1. Random Position in a "Squashed Sphere" (Potato shape)
        // We use Math.pow(r, 1/3) to ensure uniform density throughout the volume
        const r = this.radius * Math.pow(Math.random(), 1/3); 
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        // Squash the bottom slightly to make it sit on the ground
        y *= 0.8;
        y += 0.3 * SCALE_FACTOR; // Lift center

        this.dummy.position.set(x, y, z);

        // 2. Rotation: Random
        this.dummy.rotation.set(
            Math.random() * Math.PI, 
            Math.random() * Math.PI, 
            Math.random() * Math.PI
        );
        
        // 3. Scale: BIGGER chunks that vary in size
        // Size needs to be large enough to overlap neighbors
        const baseSize = 0.35 * SCALE_FACTOR; // Increased from 0.25 since count is lower
        const s = baseSize + (Math.random() * 0.2 * SCALE_FACTOR);
        
        // Randomize aspect ratio slightly (make some flatter, some longer)
        const scaleX = s * (0.8 + Math.random() * 0.4);
        const scaleY = s * (0.8 + Math.random() * 0.4);
        const scaleZ = s * (0.8 + Math.random() * 0.4);
        this.dummy.scale.set(scaleX, scaleY, scaleZ);

        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);

        // 4. Store Data
        // Calculate distance for the "Peeling" effect later
        const dist = Math.sqrt(x*x + y*y + z*z);
        
        // Velocity: Explode away from center
        const velocity = new THREE.Vector3(x, y, z).normalize().multiplyScalar(0.1 + Math.random() * 0.2);

        this.shardsArray.push({
            id: i, // NOTE: id corresponds to the index in InstancedMesh
            isActive: true,
            dist: dist,
            velocity: velocity,
            position: new THREE.Vector3(x, y, z),
            rotation: new THREE.Vector3(Math.random()*0.2, Math.random()*0.2, Math.random()*0.2),
            initialScale: new THREE.Vector3(scaleX, scaleY, scaleZ)
        });
    }

    takeDamage(amount, player) {
        if (this.isDead) return;

        // Check if player has correct tool and tier
        const tool = player.inventory.hotbar[player.inventory.selectedSlot];
        const isPickaxe = tool && tool.type === 'pickaxe';
        const toolTier = (tool && tool.tier) || 0;

        if (!isPickaxe || toolTier < this.tierRequired) {
            if (player.ui) {
                if (!isPickaxe) {
                    player.ui.showStatus("Requires a Pickaxe!");
                } else {
                    player.ui.showStatus(`Mining Tier too low! (Need Tier ${this.tierRequired})`);
                }
            }

            // Error sound for using wrong tool or insufficient tier
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('error-bad', 0.4);
            });
            
            // Minimal visual feedback to show it's too hard
            const originalScale = this.group.scale.clone();
            this.group.scale.set(1.02, 1.02, 1.02);
            setTimeout(() => { if (this.group) this.group.scale.copy(originalScale); }, 50);
            return;
        }

        this.health -= amount;

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('hit-metallic', 0.5);
        });

        // Shake animation
        const originalScale = this.group.scale.clone();
        this.group.scale.set(1.1, 1.1, 1.1);
        setTimeout(() => {
            if (!this.isDead && this.group) this.group.scale.copy(originalScale);
        }, 50);

        if (this.health <= 0) {
            this.die(); 
        } else {
            this.crumble(); 
        }
    }

    // "Peeling" Effect: Remove outer layers first
    crumble() {
        const shardsToRemove = Math.floor(this.shardCount / this.maxHealth);
        let removedCount = 0;

        // Iterate through our sorted array (outermost first)
        for (let shard of this.shardsArray) {
            if (removedCount >= shardsToRemove) break;

            if (shard.isActive) {
                shard.isActive = false;
                
                // Scale to 0 to hide
                this.mesh.getMatrixAt(shard.id, this.dummy.matrix);
                this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);
                this.dummy.scale.set(0, 0, 0);
                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(shard.id, this.dummy.matrix);
                
                removedCount++;
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    die() {
        this.isDead = true;
        this._explosionStartTime = performance.now();
        
        // Use the shard's update loop for the explosion instead of a separate RAF loop
        this.update = (delta) => {
            if (!this.group) return; 

            const elapsed = (performance.now() - this._explosionStartTime) / 1000; 

            for (let i = 0; i < this.shardsArray.length; i++) {
                const shard = this.shardsArray[i];
                if (shard.isActive) {
                    shard.velocity.y -= 0.5 * delta; // Gravity
                    shard.position.addScaledVector(shard.velocity, delta * 60);
                    
                    this.dummy.position.copy(shard.position);
                    this.dummy.rotation.x += shard.rotation.x;
                    this.dummy.rotation.y += shard.rotation.y;
                    this.dummy.scale.copy(shard.initialScale); 

                    this.dummy.updateMatrix();
                    this.mesh.setMatrixAt(shard.id, this.dummy.matrix);
                }
            }

            this.mesh.instanceMatrix.needsUpdate = true;

            if (elapsed > 1.5) {
                this.cleanup();
            }
        };
    }

    cleanup() {
        if (this.group) {
            this.scene.remove(this.group);
            // Note: Shared geometries and materials should NOT be disposed here
            // Only non-shared resources would be disposed.
            this.group = null;
        }
    }
}