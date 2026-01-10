import * as THREE from 'three';
import { SCALE_FACTOR, SHARD_SIZE } from '../../world/world_bounds.js';
import { FireballProjectile } from '../../systems/fireball_projectile.js';
import { IceboltProjectile } from '../../systems/icebolt_projectile.js';
import { Owl } from '../owl.js';
import { HitIndicator } from './hit_indicator.js';
import { PlayerCombat } from '../player/PlayerCombat.js';
import { PlayerInteraction } from '../player/PlayerInteraction.js';

export class PlayerActions {
    constructor(player) {
        this.player = player;
        
        this.isCombat = false;
        this.isInvulnerable = false;
        this.isSummoning = false;
        this.summoningTime = 0;
        this.summoningCircle = null;
        this.particles = [];
        
        this.selectedSkill = { id: 'fireball', name: 'Fireball', icon: 'assets/vfx/fireball.png', cost: 20 };
        this.mountedHorse = null;
        this.hitIndicator = new HitIndicator(player);
    }

    update(delta) {
        const game = (this.player.worldManager && this.player.worldManager.game) || this.player.game || null;
        if (!game || !game.inputManager) return;

        const input = game.inputManager.input;
        const obstacles = this.player.worldManager ? this.player.worldManager.getNearbyResources(this.player.mesh.position, 10 * SCALE_FACTOR).map(r => r.group).filter(g => g) : [];
        const particleManager = game.particleManager;

        // Delegate to modular systems
        PlayerInteraction.update(this.player, delta, input, obstacles);
        PlayerCombat.update(this.player, delta, input, obstacles, particleManager);

        // Update indicators and effects
        if (this.hitIndicator) {
            this.hitIndicator.update();
            this.hitIndicator.mesh.visible = true;
        }

        this.updateParticles(delta);

        if (this.isSummoning) {
            this.updateSummoning(delta);
        }
    }

    updateSummoning(delta) {
        this.summoningTime -= delta;
        
        if (this.summoningCircle) {
            this.summoningCircle.rotation.z += delta * 2;
            
            const totalTime = 3.0;
            const elapsed = totalTime - this.summoningTime;
            
            let targetScale = 6;
            if (elapsed < 0.5) {
                targetScale = (elapsed / 0.5) * 6;
            } else {
                targetScale = 6 + Math.sin(elapsed * 5) * 0.2;
            }
            const aspect = this.summoningCircle.userData.aspect || 1;
            this.summoningCircle.scale.set(targetScale * aspect, targetScale, 1);

            const fadeTime = 0.5;
            if (this.summoningTime < fadeTime) {
                this.summoningCircle.material.opacity = this.summoningTime / fadeTime;
            } else {
                this.summoningCircle.material.opacity = 1;
            }
        }

        if (this.summoningTime <= 0) {
            this.isSummoning = false;
            this.summoningTime = 0;
            if (this.summoningCircle) {
                this.summoningCircle.visible = false;
            }
        }
    }

    performAttack(target = null) {
        if (this.player.config && this.player.config.selectedItem) {
            PlayerCombat.playAxeSwing(this.player);
        } else {
            PlayerCombat.playPunch(this.player);
        }
    }

    interact() {
        this.player.isInteracting = true;
        this.player.interactTimer = 0;
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
        this.summoningTime = 3.0; 
        this.player.ui.showStatus("Summoning Jutsu!", false);
        this.player.ui.updateHud();

        if (!this.summoningCircle) {
            const geo = new THREE.PlaneGeometry(1, 1);
            const tex = new THREE.TextureLoader().load(
                'assets/vfx/summoning_circle.png',
                (loadedTex) => {
                    if (!this.summoningCircle) return;
                    const aspect = loadedTex.image.width / loadedTex.image.height;
                    this.summoningCircle.userData.aspect = aspect;
                    const currentScale = this.summoningCircle.scale.y || 1;
                    this.summoningCircle.scale.set(currentScale * aspect, currentScale, 1);
                }
            );
            const mat = new THREE.MeshBasicMaterial({ 
                map: tex, 
                transparent: true, 
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                opacity: 0,
                depthWrite: false
            });
            this.summoningCircle = new THREE.Mesh(geo, mat);
            this.summoningCircle.userData.aspect = 1;
            this.summoningCircle.rotation.x = -Math.PI / 2;
            this.summoningCircle.scale.set(6, 6, 1);
            this.summoningCircle.matrixAutoUpdate = true;
            this.player.scene.add(this.summoningCircle);
        }

        const worldPos = new THREE.Vector3();
        this.player.mesh.getWorldPosition(worldPos);

        this.summoningCircle.position.x = worldPos.x;
        this.summoningCircle.position.z = worldPos.z;
        const groundHeight = this.player.worldManager.getTerrainHeight(worldPos.x, worldPos.z);
        this.summoningCircle.position.y = groundHeight + 0.15;
        this.summoningCircle.material.opacity = 1;
        this.summoningCircle.visible = true;
        const aspect = this.summoningCircle.userData.aspect || 1;
        this.summoningCircle.scale.set(0.001 * aspect, 0.001, 1);
        this.summoningCircle.rotation.z = 0; 

        import('../../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('whoosh', 0.8, 0.5);
            audioManager.play('hit-metallic', 0.4, 0.2);
            audioManager.play('owl_hoot', 0.5);
        });

        this.player.isInteracting = true;
        this.player.interactTimer = 0;

        this.spawnSummoningParticles(worldPos);

        const owlPos = worldPos.clone();
        owlPos.x += 2 * SCALE_FACTOR;
        owlPos.z += 2 * SCALE_FACTOR;
        owlPos.y = this.player.worldManager.getTerrainHeight(owlPos.x, owlPos.z);

        const shardKey = `${Math.floor((worldPos.x + SHARD_SIZE / 2) / SHARD_SIZE)},${Math.floor((worldPos.z + SHARD_SIZE / 2) / SHARD_SIZE)}`;
        const currentShard = this.player.worldManager.activeShards.get(shardKey);
        if (currentShard) {
            const owl = new Owl(this.player.scene, currentShard, owlPos);
            owl.isSummoned = true;
            owl.owner = this.player;
            owl.followDistance = 5 * SCALE_FACTOR;
            currentShard.fauna.push(owl);
        }
    }

    spawnSummoningParticles(pos) {
        if (!this.particles) this.particles = [];
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 3;
            const pPos = pos.clone();
            pPos.x += Math.cos(angle) * radius;
            pPos.z += Math.sin(angle) * radius;
            pPos.y += 0.2;
            const geo = new THREE.SphereGeometry(0.5, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.4, depthWrite: false });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pPos);
            this.player.scene.add(mesh);
            this.particles.push({ mesh: mesh, velocity: new THREE.Vector3(Math.cos(angle) * 0.5, 1.5 + Math.random(), Math.sin(angle) * 0.5), life: 1.5 + Math.random() * 1.0, maxLife: 2.5, type: 'dust' });
        }
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 3;
            const pPos = pos.clone();
            pPos.x += Math.cos(angle) * radius;
            pPos.z += Math.sin(angle) * radius;
            pPos.y += 0.1;
            const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pPos);
            this.player.scene.add(mesh);
            this.particles.push({ mesh: mesh, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.2, 2.0 + Math.random() * 2, (Math.random() - 0.5) * 0.2), life: 1.0 + Math.random() * 1.5, maxLife: 2.5, type: 'spark' });
        }
    }

    updateParticles(delta) {
        if (!this.particles) return;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;
            if (p.life <= 0) {
                this.player.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }
            p.mesh.position.addScaledVector(p.velocity, delta);
            p.velocity.multiplyScalar(0.98);
            const lifeRatio = p.life / p.maxLife;
            if (p.type === 'dust') {
                p.mesh.scale.setScalar(1.0 + (1.0 - lifeRatio) * 2.0);
                p.mesh.material.opacity = lifeRatio * 0.4;
            } else {
                p.mesh.material.opacity = lifeRatio * 0.8;
                p.mesh.rotation.x += delta * 5;
                p.mesh.rotation.y += delta * 5;
            }
        }
    }

    castSkill() {
        const game = (this.player.worldManager && this.player.worldManager.game) || this.player.game || null;
        if (!game || !game.magicSystem) return;

        const targetPos = game.inputManager.input.mouseWorldPos;
        if (!targetPos) return;

        if (game.magicSystem.castSpell(this.selectedSkill.id, this.player, targetPos)) {
            if (this.player.ui) {
                this.player.ui.updateHud();
                this.player.ui.showStatus(`Casting ${this.selectedSkill.name}!`, false);
            }
            
            this.player.isInteracting = true;
            this.player.interactTimer = 0;
            
            import('../../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('whoosh', 0.8);
            });
        }
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
        if (!this.player.worldManager) return false;
        
        const range = 5.0 * SCALE_FACTOR; 
        const nearbyNPCs = this.player.worldManager.getNearbyNPCs(this.player.mesh.position, range);
        
        let closestNPC = null;
        let minDistSq = range * range;

        for (const npc of nearbyNPCs) {
            if (npc.isDead || npc.isEnemy) continue;
            
            const npcPos = (npc.group || npc.mesh).position;
            const distSq = this.player.mesh.position.distanceToSquared(npcPos);
            
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestNPC = npc;
            }
        }

        if (closestNPC) {
            if (this.player.conversation) {
                this.player.conversation.open(closestNPC);
                return true;
            }
        }
        return false;
    }

    tryMountHorse() {
        const range = 3.0 * SCALE_FACTOR;
        const fauna = this.player.worldManager.getNearbyFauna(this.player.mesh.position, range);
        
        let closestHorse = null;
        let minDistSq = range * range;

        for (const animal of fauna) {
            if (animal.type === 'horse' && !animal.isDead && !animal.mountedPlayer) {
                const distSq = this.player.mesh.position.distanceToSquared(animal.group.position);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestHorse = animal;
                }
            }
        }

        if (closestHorse) {
            this.mount(closestHorse);
            this.player.isInteracting = true;
            this.player.interactTimer = 0;
            return true;
        }
        return false;
    }

    tryHarvest() {
        if (!this.player.worldManager) return false;

        // If mounted, dismount
        if (this.mountedHorse) {
            this.dismount();
            return true;
        }

        const range = 3.0 * SCALE_FACTOR;
        const rangeSq = range * range;
        
        // Try to interact with Horse first
        if (this.tryMountHorse()) return true;

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
                }
                this.player.isInteracting = true;
                this.player.interactTimer = 0;
                return true;
            }
        }

        const resources = this.player.worldManager.getNearbyResources(this.player.mesh.position, range * 1.2);
        for (const res of resources) {
            // Well Interaction
            if (res.type === 'well') {
                const distSq = this.player.mesh.position.distanceToSquared(res.group.position);
                if (distSq < rangeSq) {
                    if (this.player.game && this.player.game.wellDialogue) {
                        this.player.game.wellDialogue.open();
                        this.player.isInteracting = true;
                        this.player.interactTimer = 0;
                        return true;
                    }
                }
            }

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
                        this.player.isInteracting = true;
                        this.player.interactTimer = 0;
                        return true;
                    }
                }
            }
        }
        return false;
    }

    mount(horse) {
        this.mountedHorse = horse;
        horse.state = 'mounted';
        horse.mountedPlayer = this.player;
        if (this.player.ui) this.player.ui.showStatus("Mounted Horse", false);
    }

    dismount() {
        if (!this.mountedHorse) return;
        const horse = this.mountedHorse;
        horse.state = 'idle';
        horse.mountedPlayer = null;
        horse.timer = 2.0;
        this.mountedHorse = null;
        if (this.player.ui) this.player.ui.showStatus("Dismounted Horse", false);
        const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.mesh.quaternion);
        this.player.mesh.position.addScaledVector(side, 1.5 * SCALE_FACTOR);
    }
}
