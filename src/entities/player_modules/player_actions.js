import * as THREE from 'three';
import { SCALE_FACTOR, SHARD_SIZE } from '../../world/world_bounds.js';
import { FireballProjectile } from '../../systems/fireball_projectile.js';
import { IceboltProjectile } from '../../systems/icebolt_projectile.js';
import { Owl } from '../owl.js';

export class PlayerActions {
    constructor(player) {
        this.player = player;
        
        this.isCombat = false;
        this.isInvulnerable = true;
        this.isSummoning = false;
        this.summoningTime = 0;
        this.summoningCircle = null;
        
        this.selectedSkill = { id: 'fireball', name: 'Fireball', icon: 'assets/vfx/fireball.png', cost: 20 };
    }

    interact() {
        this.player.animator.playInteract();
    }

    toggleCombat() {
        this.isCombat = !this.isCombat;
        if (this.player.ui) this.player.ui.updateHotbar();
    }

    toggleInvulnerability() {
        this.isInvulnerable = !this.isInvulnerable;
        if (this.player.ui) {
            this.player.ui.showStatus(`God mode: ${this.isInvulnerable ? 'Enabled' : 'Disabled'}`, !this.isInvulnerable);
        }
        return this.isInvulnerable;
    }

    summon() {
        if (this.player.isDead || this.isSummoning) return;
        if (this.player.stats.chakra < 40) {
            this.player.ui.showStatus("Not enough Chakra for Summoning!", true);
            return;
        }

        this.player.stats.chakra -= 40;
        this.isSummoning = true;
        this.summoningTime = 3.0; // 3 seconds effect
        this.player.ui.showStatus("Summoning Jutsu!", false);
        this.player.ui.updateHud();

        if (!this.summoningCircle) {
            const geo = new THREE.PlaneGeometry(6, 6);
            const tex = new THREE.TextureLoader().load('assets/vfx/summoning_circle.png');
            const mat = new THREE.MeshBasicMaterial({ 
                map: tex, 
                transparent: true, 
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                opacity: 0
            });
            this.summoningCircle = new THREE.Mesh(geo, mat);
            this.summoningCircle.rotation.x = -Math.PI / 2;
            this.summoningCircle.matrixAutoUpdate = true;
            this.player.scene.add(this.summoningCircle);
        }

        const worldPos = new THREE.Vector3();
        this.player.mesh.getWorldPosition(worldPos);

        this.summoningCircle.position.x = worldPos.x;
        this.summoningCircle.position.z = worldPos.z;
        const groundHeight = this.player.worldManager.getTerrainHeight(worldPos.x, worldPos.z);
        this.summoningCircle.position.y = groundHeight + 0.1;
        this.summoningCircle.material.opacity = 1;
        this.summoningCircle.scale.set(1, 1, 1);

        import('../../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('whoosh', 0.8, 0.5);
            audioManager.play('hit-metallic', 0.4, 0.2);
            audioManager.play('owl_hoot', 0.5);
        });

        this.player.animator.playInteract();

        // Spawn friendly Owl
        const owlPos = worldPos.clone();
        owlPos.x += 2 * SCALE_FACTOR;
        owlPos.z += 2 * SCALE_FACTOR;
        owlPos.y = this.player.worldManager.getTerrainHeight(owlPos.x, owlPos.z);

        const currentShard = this.player.worldManager.activeShards.get(`${Math.floor((worldPos.x + SHARD_SIZE / 2) / SHARD_SIZE)},${Math.floor((worldPos.z + SHARD_SIZE / 2) / SHARD_SIZE)}`);
        if (currentShard) {
            const owl = new Owl(this.player.scene, currentShard, owlPos);
            owl.isSummoned = true;
            owl.owner = this.player;
            owl.followDistance = 5 * SCALE_FACTOR;
            currentShard.fauna.push(owl);
        }
    }

    castSkill() {
        if (this.player.isDead || !this.selectedSkill) return;
        if (this.player.stats.chakra < this.selectedSkill.cost) {
            if (this.player.ui) this.player.ui.showStatus("Not enough Chakra!", true);
            return;
        }

        this.player.stats.chakra -= this.selectedSkill.cost;
        if (this.player.ui) {
            this.player.ui.updateHud();
            this.player.ui.showStatus(`Casting ${this.selectedSkill.name}!`, false);
        }

        // Projectile spawning
        if (this.player.game) {
            const startPos = this.player.mesh.position.clone();
            startPos.y += 1.2;
            const targetPos = this.player.game.inputManager.input.mouseWorldPos;

            if (targetPos) {
                let projectile = null;
                if (this.selectedSkill.id === 'fireball') {
                    projectile = new FireballProjectile(this.player.scene, startPos, targetPos, this.player);
                } else if (this.selectedSkill.id === 'icebolt') {
                    projectile = new IceboltProjectile(this.player.scene, startPos, targetPos, this.player);
                }

                if (projectile) {
                    this.player.game.projectiles.push(projectile);
                }
            }
        }

        this.player.animator.playInteract();
        import('../../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('whoosh', 0.8);
        });
    }

    tryInteractPlot(isRightClick = false) {
        if (!this.player.worldManager) return false;
        const range = 3.0 * SCALE_FACTOR;
        const rangeSq = range * range;
        
        const nearbyResources = this.player.worldManager.getNearbyResources(this.player.mesh.position, range * 1.5);
        for (const res of nearbyResources) {
            if (res.isCropPlot) {
                const distSq = this.player.mesh.position.distanceToSquared(res.group.position);
                if (distSq < rangeSq) {
                    if (isRightClick) {
                        if (!res.plantedCrop) {
                            if (this.player.ui) this.player.ui.openPlantingUI(res);
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    tryInteractNPC() {
        console.log("Checking for nearby NPCs...");
        if (!this.player.worldManager) {
            console.log("No worldManager found on player");
            return false;
        }
        const range = 2.0 * SCALE_FACTOR;
        const nearbyNPCs = this.player.worldManager.getNearbyNPCs(this.player.mesh.position, range);
        console.log(`Found ${nearbyNPCs.length} NPCs nearby`);
        
        let closestNPC = null;
        let minDistSq = range * range;

        for (const npc of nearbyNPCs) {
            console.log(`Checking NPC: ${npc.name}, isDead: ${npc.isDead}, isEnemy: ${npc.isEnemy}`);
            if (npc.isDead || npc.isEnemy) continue;
            const distSq = this.player.mesh.position.distanceToSquared((npc.group || npc.mesh).position);
            console.log(`Distance squared: ${distSq}, max range squared: ${minDistSq}`);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestNPC = npc;
            }
        }

        if (closestNPC) {
            console.log(`Interacting with ${closestNPC.name}`);
            if (this.player.conversation) {
                this.player.conversation.open(closestNPC);
                return true;
            } else {
                console.log("No conversation module found on player");
            }
        }
        return false;
    }

    tryHarvest() {
        console.log("tryHarvest called. Key 'F' detected.");
        if (!this.player.worldManager) {
            console.log("No worldManager found on player in tryHarvest");
            return;
        }
        const range = 3.0 * SCALE_FACTOR;
        const rangeSq = range * range;
        
        // Try to interact with NPC first
        if (this.tryInteractNPC()) return true;

        if (this.tryInteractPlot(false)) return true;

        const items = this.player.worldManager.getNearbyItems(this.player.mesh.position, range * 1.2);
        let closestItem = null;
        let minDistSq = rangeSq;

        for (const item of items) {
            if (item.isDead) continue;
            const distSq = this.player.mesh.position.distanceToSquared(item.group.position);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestItem = item;
            }
        }

        if (closestItem) {
            if (closestItem.collect(this.player)) {
                if (this.player.ui) {
                    this.player.ui.updateHotbar();
                    this.player.ui.renderInventory();
                }
                this.player.animator.playPickup();
                return true;
            }
        }

        const resources = this.player.worldManager.getNearbyResources(this.player.mesh.position, range * 1.2);
        for (const res of resources) {
            if (res.type === 'berry_bush' && !res.isHarvested && !res.isDead) {
                const distSq = this.player.mesh.position.distanceToSquared(res.group.position);
                if (distSq < rangeSq) {
                    if (res.harvest()) {
                        const berryItem = { 
                            type: 'berry', 
                            name: 'Winter Berries', 
                            icon: 'assets/icons/berry_icon.png',
                            count: 1,
                            stackLimit: 99
                        };
                        this.player.inventory.addItem(berryItem, 7);
                        if (this.player.ui) this.player.ui.updateHotbar();
                        this.player.animator.playPickup();
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
