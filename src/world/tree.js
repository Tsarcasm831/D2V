import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class Tree {
    constructor(scene, shard, pos, variant = 0) {
        this.scene = scene;
        this.shard = shard;
        this.type = 'tree';
        this.isDead = false;
        this.health = 3;
        this.variant = variant;
        this.regrowTimer = 0;
        this.regrowTime = 117; // seconds

        this.group = new THREE.Group();
        this.group.userData.entity = this; // Link back to entity for physics
        this.group.position.copy(pos);
        this.scene.add(this.group);

        this.radius = 0.3 * SCALE_FACTOR; // Tighter collision radius for trees (was 0.5)
        this.setupMesh();
    }

    resolveCollision(entityPos, entityRadius) {
        if (this.isDead) return null;
        
        // Simple circle collision
        const dx = entityPos.x - this.group.position.x;
        const dz = entityPos.z - this.group.position.z;
        const distSq = dx * dx + dz * dz;
        const minDist = entityRadius + this.radius;

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

    setupMesh() {
        const wm = this.shard.worldManager;
        const trunkMat = wm ? wm.getSharedMaterial('standard', { color: 0x3e2723 }) : new THREE.MeshStandardMaterial({ color: 0x3e2723 });
        const leafMat = wm ? wm.getSharedMaterial('standard', { color: 0x1b5e20 }) : new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
        const leafMatDark = wm ? wm.getSharedMaterial('standard', { color: 0x0d3b10 }) : new THREE.MeshStandardMaterial({ color: 0x0d3b10 });
        const oakLeafMat = wm ? wm.getSharedMaterial('standard', { color: 0x388e3c }) : new THREE.MeshStandardMaterial({ color: 0x388e3c });
        const oakTrunkMat = wm ? wm.getSharedMaterial('standard', { color: 0x5d4037 }) : new THREE.MeshStandardMaterial({ color: 0x5d4037 });

        // Stump is common to all
        const stumpHeight = 0.5 * SCALE_FACTOR;
        const stumpGeo = wm ? wm.getSharedGeometry('cylinder', 0.2 * SCALE_FACTOR, 0.3 * SCALE_FACTOR, stumpHeight, 8) : new THREE.CylinderGeometry(0.2 * SCALE_FACTOR, 0.3 * SCALE_FACTOR, stumpHeight, 8);
        this.stump = new THREE.Mesh(stumpGeo, trunkMat);
        this.stump.position.y = stumpHeight / 2;
        this.stump.castShadow = true;
        this.stump.layers.enable(1);
        this.group.add(this.stump);

        // Add an invisible large hitbox for easier raycasting
        const hitboxHeight = 6 * SCALE_FACTOR;
        const hitboxGeo = new THREE.CylinderGeometry(1.0 * SCALE_FACTOR, 1.0 * SCALE_FACTOR, hitboxHeight, 8);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitbox.position.y = hitboxHeight / 2;
        hitbox.layers.enable(1); // Ensure it's on the interactive layer
        this.group.add(hitbox);

        // Foliage group contains everything that disappears when cut
        this.foliage = new THREE.Group();
        this.foliage.layers.enable(1);
        this.group.add(this.foliage);

        const currentLeafMat = (this.variant === 2) ? leafMatDark : leafMat;
        
        if (this.variant === 0) {
            // Variant 0: Standard Pine
            const trunkHeight = 2.5 * SCALE_FACTOR;
            const trunkGeo = wm ? wm.getSharedGeometry('cylinder', 0.2 * SCALE_FACTOR, 0.2 * SCALE_FACTOR, trunkHeight, 8) : new THREE.CylinderGeometry(0.2 * SCALE_FACTOR, 0.2 * SCALE_FACTOR, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = stumpHeight + trunkHeight / 2;
            trunk.castShadow = true;
            trunk.layers.enable(1);
            this.foliage.add(trunk);

            const leavesGeo = wm ? wm.getSharedGeometry('cone', 1.5 * SCALE_FACTOR, 6 * SCALE_FACTOR, 8) : new THREE.ConeGeometry(1.5 * SCALE_FACTOR, 6 * SCALE_FACTOR, 8);
            const leaves = new THREE.Mesh(leavesGeo, leafMat);
            leaves.position.y = 5 * SCALE_FACTOR;
            leaves.castShadow = true;
            leaves.layers.enable(1);
            this.foliage.add(leaves);
        } else if (this.variant === 1) {
            // Variant 1: Tiered Pine
            const trunkHeight = 3.5 * SCALE_FACTOR;
            const trunkGeo = wm ? wm.getSharedGeometry('cylinder', 0.15 * SCALE_FACTOR, 0.2 * SCALE_FACTOR, trunkHeight, 8) : new THREE.CylinderGeometry(0.15 * SCALE_FACTOR, 0.2 * SCALE_FACTOR, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = stumpHeight + trunkHeight / 2;
            trunk.castShadow = true;
            trunk.layers.enable(1);
            this.foliage.add(trunk);

            for (let i = 0; i < 3; i++) {
                const size = (1.6 - i * 0.4) * SCALE_FACTOR;
                const leavesGeo = wm ? wm.getSharedGeometry('cone', size, 2.5 * SCALE_FACTOR, 8) : new THREE.ConeGeometry(size, 2.5 * SCALE_FACTOR, 8);
                const leaves = new THREE.Mesh(leavesGeo, leafMat);
                leaves.position.y = (3.2 + i * 1.8) * SCALE_FACTOR;
                leaves.castShadow = true;
                leaves.layers.enable(1);
                this.foliage.add(leaves);
            }
        } else if (this.variant === 3) {
            // Variant 3: Standard Oak (Broad)
            const trunkHeight = 2.0 * SCALE_FACTOR;
            const trunkGeo = wm ? wm.getSharedGeometry('cylinder', 0.4 * SCALE_FACTOR, 0.45 * SCALE_FACTOR, trunkHeight, 8) : new THREE.CylinderGeometry(0.4 * SCALE_FACTOR, 0.45 * SCALE_FACTOR, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, oakTrunkMat);
            trunk.position.y = stumpHeight + trunkHeight / 2;
            trunk.castShadow = true;
            trunk.layers.enable(1);
            this.foliage.add(trunk);

            const leavesGeo = wm ? wm.getSharedGeometry('sphere', 2.2 * SCALE_FACTOR, 8, 8) : new THREE.SphereGeometry(2.2 * SCALE_FACTOR, 8, 8);
            const leaves = new THREE.Mesh(leavesGeo, oakLeafMat);
            leaves.position.y = trunkHeight + 1.5 * SCALE_FACTOR;
            leaves.scale.y = 0.8;
            leaves.castShadow = true;
            leaves.layers.enable(1);
            this.foliage.add(leaves);
        } else if (this.variant === 4) {
            // Variant 4: Large Oak (Spread)
            const trunkHeight = 3.0 * SCALE_FACTOR;
            const trunkGeo = wm ? wm.getSharedGeometry('cylinder', 0.5 * SCALE_FACTOR, 0.6 * SCALE_FACTOR, trunkHeight, 8) : new THREE.CylinderGeometry(0.5 * SCALE_FACTOR, 0.6 * SCALE_FACTOR, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, oakTrunkMat);
            trunk.position.y = stumpHeight + trunkHeight / 2;
            trunk.castShadow = true;
            trunk.layers.enable(1);
            this.foliage.add(trunk);

            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const dist = 1.2 * SCALE_FACTOR;
                const leafSphere = new THREE.Mesh(
                    wm ? wm.getSharedGeometry('sphere', 1.5 * SCALE_FACTOR, 8, 8) : new THREE.SphereGeometry(1.5 * SCALE_FACTOR, 8, 8),
                    oakLeafMat
                );
                leafSphere.position.set(
                    Math.cos(angle) * dist,
                    trunkHeight + 1.0 * SCALE_FACTOR + (i % 2) * 0.5 * SCALE_FACTOR,
                    Math.sin(angle) * dist
                );
                leafSphere.castShadow = true;
                leafSphere.layers.enable(1);
                this.foliage.add(leafSphere);
            }
            const topLeaf = new THREE.Mesh(
                wm ? wm.getSharedGeometry('sphere', 1.8 * SCALE_FACTOR, 8, 8) : new THREE.SphereGeometry(1.8 * SCALE_FACTOR, 8, 8),
                oakLeafMat
            );
            topLeaf.position.y = trunkHeight + 2.5 * SCALE_FACTOR;
            topLeaf.castShadow = true;
            topLeaf.layers.enable(1);
            this.foliage.add(topLeaf);
        } else if (this.variant === 5) {
            // Variant 5: Tall Oak (Columnar)
            const trunkHeight = 4.0 * SCALE_FACTOR;
            const trunkGeo = wm ? wm.getSharedGeometry('cylinder', 0.35 * SCALE_FACTOR, 0.4 * SCALE_FACTOR, trunkHeight, 8) : new THREE.CylinderGeometry(0.35 * SCALE_FACTOR, 0.4 * SCALE_FACTOR, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, oakTrunkMat);
            trunk.position.y = stumpHeight + trunkHeight / 2;
            trunk.castShadow = true;
            trunk.layers.enable(1);
            this.foliage.add(trunk);

            const leavesGeo = wm ? wm.getSharedGeometry('sphere', 1.8 * SCALE_FACTOR, 8, 8) : new THREE.SphereGeometry(1.8 * SCALE_FACTOR, 8, 8);
            for (let i = 0; i < 3; i++) {
                const leaves = new THREE.Mesh(leavesGeo, oakLeafMat);
                leaves.position.y = trunkHeight + (i * 1.5) * SCALE_FACTOR;
                leaves.scale.set(1.1 - i * 0.2, 0.9, 1.1 - i * 0.2);
                leaves.castShadow = true;
                leaves.layers.enable(1);
                this.foliage.add(leaves);
            }
        } else {
            // Variant 2: Slim Tall Pine
            const trunkHeight = 4.5 * SCALE_FACTOR;
            const trunkGeo = wm ? wm.getSharedGeometry('cylinder', 0.12 * SCALE_FACTOR, 0.15 * SCALE_FACTOR, trunkHeight, 8) : new THREE.CylinderGeometry(0.12 * SCALE_FACTOR, 0.15 * SCALE_FACTOR, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = stumpHeight + trunkHeight / 2;
            trunk.castShadow = true;
            trunk.layers.enable(1);
            this.foliage.add(trunk);

            const leavesGeo = wm ? wm.getSharedGeometry('cone', 0.8 * SCALE_FACTOR, 9 * SCALE_FACTOR, 8) : new THREE.ConeGeometry(0.8 * SCALE_FACTOR, 9 * SCALE_FACTOR, 8);
            const leaves = new THREE.Mesh(leavesGeo, leafMatDark);
            leaves.position.y = 6.5 * SCALE_FACTOR;
            leaves.castShadow = true;
            leaves.layers.enable(1);
            this.foliage.add(leaves);
        }
        
        // Random slight rotation for organic look
        this.group.rotation.y = Math.random() * Math.PI * 2;
    }

    takeDamage(amount, player) {
        if (this.isDead) return;

        // Check for correct tool
        const tool = player?.inventory?.hotbar[player.inventory.selectedSlot];
        const isAxe = tool && (tool.type === 'axe' || tool.id?.toLowerCase().includes('axe'));

        if (!isAxe) {
            // Allow punching with open hand (no tool equipped)
            if (!tool) {
                // Punching a tree does 1 damage to the tree, but 5 damage to the player
                this.health -= 1;
                if (player && player.takeDamage) {
                    player.takeDamage(5);
                    if (player.ui) {
                        player.ui.showStatus("Punching trees hurts!", true);
                    }
                }
                
                // Visual feedback for tree
                const originalScale = this.group.scale.clone();
                this.group.scale.set(1.05, 1.05, 1.05);
                setTimeout(() => { if (this.group && !this.isDead) this.group.scale.copy(originalScale); }, 50);

                // Play punch sound
                import('../utils/audio_manager.js').then(({ audioManager }) => {
                    audioManager.play('hit-metallic', 0.3);
                });

                if (this.health <= 0) {
                    this.die();
                }
                return;
            }

            // If a tool is equipped but it's not an axe, block it
            if (player?.ui) {
                player.ui.showStatus("Requires an Axe!");
            }
            
            // Error sound for using wrong tool
            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('error-bad', 0.4);
            });

            // Minimal visual feedback
            const originalScale = this.group.scale.clone();
            this.group.scale.set(1.02, 1.02, 1.02);
            setTimeout(() => { if (this.group) this.group.scale.copy(originalScale); }, 50);
            return;
        }

        this.health -= amount;

        // Visual feedback
        const originalScale = this.group.scale.clone();
        this.group.scale.set(1.2, 1.2, 1.2);
        setTimeout(() => {
            if (!this.isDead) this.group.scale.copy(originalScale);
        }, 50);

        // Play chop sound
        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('chop', 0.5);
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.regrowTimer = 0;

        // Spawn 15 Wood Items
        if (this.shard && this.shard.spawnItem) {
            const logCount = 15;
            for (let i = 0; i < logCount; i++) {
                const dropPos = this.group.position.clone();
                dropPos.x += (Math.random() - 0.5) * 3.5 * SCALE_FACTOR;
                dropPos.z += (Math.random() - 0.5) * 3.5 * SCALE_FACTOR;
                this.shard.spawnItem('wood', dropPos, {
                    type: 'wood',
                    name: 'Wood Log',
                    icon: 'assets/icons/wood_log_icon.png',
                    count: 1,
                    stackLimit: 99
                });
            }
        }
        
        // Shrink foliage away
        const foliagePart = this.foliage;
        const interval = setInterval(() => {
            if (!foliagePart) {
                clearInterval(interval);
                return;
            }
            foliagePart.scale.multiplyScalar(0.8);
            if (foliagePart.scale.x < 0.1) {
                foliagePart.visible = false;
                clearInterval(interval);
            }
        }, 30);
    }

    regrow() {
        this.isDead = false;
        this.health = 3;
        this.foliage.visible = true;
        this.foliage.scale.set(0.1, 0.1, 0.1);
        
        // Grow back animation
        const interval = setInterval(() => {
            if (!this.foliage) {
                clearInterval(interval);
                return;
            }
            this.foliage.scale.multiplyScalar(1.1);
            if (this.foliage.scale.x >= 1.0) {
                this.foliage.scale.set(1, 1, 1);
                clearInterval(interval);
            }
        }, 30);
    }

    update(delta, player) {
        if (this.isDead) {
            this.regrowTimer += delta;
            
            if (this.regrowTimer >= this.regrowTime) {
                // If no player, safe to regrow
                if (!player || !player.mesh) {
                    this.regrow();
                    return;
                }

                // Check if player is in a different chunk
                const shardSize = 60; // SHARD_SIZE from world_bounds.js
                const playerShardX = Math.floor(player.mesh.position.x / shardSize);
                const playerShardZ = Math.floor(player.mesh.position.z / shardSize);
                
                if (playerShardX !== this.shard.gridX || playerShardZ !== this.shard.gridZ) {
                    this.regrow();
                }
            }
        }
    }
}