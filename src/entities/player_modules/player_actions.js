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
        this.particles = [];
        
        this.selectedSkill = { id: 'fireball', name: 'Fireball', icon: 'assets/vfx/fireball.png', cost: 20 };
        this.mountedHorse = null;
    }

    updateCombat(delta) {
        // Handle Action (Click/Tap)
        // Access game and inputManager safely
        const game = this.player.worldManager ? this.player.worldManager.game : (this.player.game || null);
        if (!game || !game.inputManager) return;
        
        const input = game.inputManager.input;
        if (input.action && !this.prevActionPressed) {
            console.log("PlayerActions: action triggered (mousedown)");
            this.performAttack();
        }
        this.prevActionPressed = !!input.action;
    }

    performAttack(target = null) {
        console.log("PlayerActions: performAttack called", target ? "with target" : "searching target");
        if (this.player.isDead) {
            console.log("PlayerActions: cannot attack, player is dead");
            return;
        }

        const tool = this.player.inventory.hotbar[this.player.inventory.selectedSlot];
        const isPickaxe = tool && (tool.type === 'pickaxe' || tool.id === 'pickaxe');
        const isAxe = tool && (tool.type === 'axe' || tool.id === 'axe');

        console.log("PlayerActions: equipped tool:", tool ? tool.type || tool.id : "none");

        // Play animation
        if (isAxe || isPickaxe) {
            console.log("PlayerActions: playing axe swing animation");
            this.player.animator.playAxeSwing();
        } else {
            console.log("PlayerActions: playing punch animation");
            this.player.animator.playPunch();
        }

        const range = 7.5 * SCALE_FACTOR; 
        const playerPos = this.player.mesh.position;
        let hitSomething = false;

        // 1. Raycast to find what was actually clicked if no target provided
        const game = this.player.worldManager ? this.player.worldManager.game : (this.player.game || null);
        const im = game ? game.inputManager : null;
        if (!target && im && im.raycaster && game.camera) {
            // Ensure raycaster is up to date
            im.raycaster.setFromCamera(im.mouse, game.camera);
            
            const raycaster = im.raycaster;
            // Get all interactive objects: NPCs, Fauna, Resources
            const interactiveObjects = [];
            const nearbyResources = this.player.worldManager.getNearbyResources(playerPos, range * 2);
            const nearbyNPCs = this.player.worldManager.getNearbyNPCs(playerPos, range * 2);
            const nearbyFauna = this.player.worldManager.getNearbyFauna(playerPos, range * 2);

            nearbyResources.forEach(r => { if (r.group) interactiveObjects.push(r.group); });
            nearbyNPCs.forEach(n => { if (n.group || n.mesh) interactiveObjects.push(n.group || n.mesh); });
            nearbyFauna.forEach(f => { if (f.group || f.mesh) interactiveObjects.push(f.group || f.mesh); });

            console.log(`PlayerActions: Raycasting against ${interactiveObjects.length} objects`);
            const intersects = raycaster.intersectObjects(interactiveObjects, true);
            if (intersects.length > 0) {
                // Find which logic object owns this mesh
                const hitMesh = intersects[0].object;
                let hitObj = null;

                // Search through our nearby lists for the owner
                hitObj = nearbyResources.find(r => r.group && (r.group === hitMesh || r.group.contains(hitMesh)));
                if (!hitObj) hitObj = nearbyNPCs.find(n => (n.group || n.mesh) && ((n.group || n.mesh) === hitMesh || (n.group || n.mesh).contains(hitMesh)));
                if (!hitObj) hitObj = nearbyFauna.find(f => (f.group || f.mesh) && ((f.group || f.mesh) === hitMesh || (f.group || f.mesh).contains(hitMesh)));

                if (hitObj) {
                    const dist = playerPos.distanceTo(intersects[0].point);
                    if (dist <= range) {
                        target = hitObj;
                        console.log("PlayerActions: Raycast found target", target.type);
                    } else {
                        console.log("PlayerActions: Target found but out of range", dist);
                    }
                }
            }
        }

        // 2. Handle the target (either from raycast or proximity fallback)
        if (target) {
            if (target.takeDamage) {
                const damage = (target.isEnemy) ? (5 + (this.player.stats.strength || 0)) : 1;
                console.log(`PlayerActions: Hitting target type ${target.type} for ${damage} damage`);
                target.takeDamage(damage, playerPos, this.player);
                hitSomething = true;
            }
        } 
        
        // 3. Proximity Fallback (If raycast missed or found nothing)
        if (!hitSomething) {
            console.log("PlayerActions: Falling back to proximity search");
            const enemies = [...this.player.worldManager.getNearbyNPCs(playerPos, range), 
                             ...this.player.worldManager.getNearbyFauna(playerPos, range)];
            
            for (const enemy of enemies) {
                if (enemy.isDead || !enemy.isEnemy) continue;
                if (enemy.takeDamage) {
                    console.log(`PlayerActions: Proximity damage to ${enemy.type}`);
                    enemy.takeDamage(5 + (this.player.stats.strength || 0), playerPos, this.player);
                    hitSomething = true;
                    break;
                }
            }

            if (!hitSomething) {
                const resources = this.player.worldManager.getNearbyResources(playerPos, range);
                for (const res of resources) {
                    if (res.isDead) continue;
                    if (res.takeDamage) {
                        console.log(`PlayerActions: Proximity hit to resource ${res.type}`);
                        res.takeDamage(1, this.player);
                        hitSomething = true;
                        break;
                    }
                }
            }
        }

        if (!hitSomething) {
            console.log("PlayerActions: nothing hit, playing whoosh");
            import('../../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('whoosh', 0.5);
            });
        }
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
            const geo = new THREE.PlaneGeometry(1, 1);
            const tex = new THREE.TextureLoader().load('assets/vfx/summoning_circle.png');
            const mat = new THREE.MeshBasicMaterial({ 
                map: tex, 
                transparent: true, 
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                opacity: 0,
                depthWrite: false
            });
            this.summoningCircle = new THREE.Mesh(geo, mat);
            this.summoningCircle.rotation.x = -Math.PI / 2;
            this.summoningCircle.scale.set(6, 6, 6);
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
        this.summoningCircle.scale.set(0.001, 0.001, 0.001);
        this.summoningCircle.rotation.z = 0; // Reset rotation for new animation

        import('../../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('whoosh', 0.8, 0.5);
            audioManager.play('hit-metallic', 0.4, 0.2);
            audioManager.play('owl_hoot', 0.5);
        });

        this.player.animator.playInteract();

        // Create particles
        this.spawnSummoningParticles(worldPos);

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

    spawnSummoningParticles(pos) {
        if (!this.particles) this.particles = [];
        
        // 1. Dust clouds around the base
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 3;
            const pPos = pos.clone();
            pPos.x += Math.cos(angle) * radius;
            pPos.z += Math.sin(angle) * radius;
            pPos.y += 0.2;

            const geo = new THREE.SphereGeometry(0.5, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0xcccccc, 
                transparent: true, 
                opacity: 0.4,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pPos);
            this.player.scene.add(mesh);
            
            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3(Math.cos(angle) * 0.5, 1.5 + Math.random(), Math.sin(angle) * 0.5),
                life: 1.5 + Math.random() * 1.0,
                maxLife: 2.5,
                type: 'dust'
            });
        }

        // 2. Rising sparks/energy
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 3;
            const pPos = pos.clone();
            pPos.x += Math.cos(angle) * radius;
            pPos.z += Math.sin(angle) * radius;
            pPos.y += 0.1;

            const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff, 
                transparent: true, 
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pPos);
            this.player.scene.add(mesh);

            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.2, 2.0 + Math.random() * 2, (Math.random() - 0.5) * 0.2),
                life: 1.0 + Math.random() * 1.5,
                maxLife: 2.5,
                type: 'spark'
            });
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

            // Move
            p.mesh.position.addScaledVector(p.velocity, delta);
            
            // Slow down
            p.velocity.multiplyScalar(0.98);

            // Visual changes
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
        const game = this.player.worldManager ? this.player.worldManager.game : (this.player.game || null);
        if (game && game.inputManager) {
            const startPos = this.player.mesh.position.clone();
            startPos.y += 1.2;
            const targetPos = game.inputManager.input.mouseWorldPos;

            if (targetPos) {
                let projectile = null;
                if (this.selectedSkill.id === 'fireball') {
                    projectile = new FireballProjectile(this.player.scene, startPos, targetPos, this.player);
                } else if (this.selectedSkill.id === 'icebolt') {
                    projectile = new IceboltProjectile(this.player.scene, startPos, targetPos, this.player);
                }

                if (projectile) {
                    game.projectiles.push(projectile);
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
            return true;
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
        this.player.playerPhysics.position.addScaledVector(side, 1.5 * SCALE_FACTOR);
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
