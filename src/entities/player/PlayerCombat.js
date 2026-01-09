import * as THREE from 'three';
import { PlayerPhysics } from './PlayerPhysics.js';

export class PlayerCombat {
    static update(player, dt, input, obstacles, particleManager) {
        const attack1Triggered = input.attack1 && !player.wasAttack1Pressed;
        const attack2Triggered = input.attack2 && !player.wasAttack2Pressed;

        // Handle Heavy Attack Charging
        const isWeaponEquipped = !!player.config.selectedItem;
        if (isWeaponEquipped && input.attack1) {
            player.heavyAttackTimer = (player.heavyAttackTimer || 0) + dt;
            if (player.heavyAttackTimer >= 1.0) {
                player.isHeavyAttackCharging = true;
            }
        } else {
            if (player.isHeavyAttackCharging) {
                this.performHeavyAttack(player);
            }
            player.isHeavyAttackCharging = false;
            player.heavyAttackTimer = 0;
        }

        // Handle Blocking
        const isShieldEquipped = player.inventory?.equipment?.WEAPON_OFF?.type === 'shield';
        if (isShieldEquipped && input.attack2) {
            player.isBlocking = true;
            player.blockTimer = (player.blockTimer || 0) + dt;
            
            // Stamina drain while blocking
            if (player.stats) {
                player.stats.stamina -= 5 * dt;
                if (player.stats.stamina <= 0) {
                    player.stats.stamina = 0;
                    player.isBlocking = false;
                }
            }
        } else {
            player.isBlocking = false;
            player.blockTimer = 0;
        }

        // Update Combo Timer
        if (player.comboTimer > 0) {
            player.comboTimer -= dt;
            if (player.comboTimer <= 0) {
                player.comboChain = 0;
                player.comboTimer = 0;
            }
        }

        // 2. Handle Inputs
        if (player.config.selectedItem === 'Fishing Pole') {
            if (attack1Triggered || attack2Triggered) {
                this.handleFishingInput(player);
            }
        } else {
            if (attack1Triggered) { // Use triggered to avoid restarting every frame
                if (player.config.selectedItem) {
                    this.playAxeSwing(player);
                } else {
                    this.playPunch(player);
                }
            }
            if (attack2Triggered) {
                if (player.config.selectedItem) {
                    this.playAxeSwing(player);
                }
            }
        }

        // Update Input History
        player.wasAttack1Pressed = !!input.attack1;
        player.wasAttack2Pressed = !!input.attack2;

        // Update Timers & Logic
        this.updateAxeSwing(player, dt, obstacles, particleManager);
        this.updateFishing(player, dt);
        this.updatePunchCombo(player, dt, input, obstacles);
    }

    static performHeavyAttack(player) {
        if (!player.isAxeSwing) {
            player.isHeavyAttack = true;
            this.playAxeSwing(player);
            // playAxeSwing will reset after duration
        }
    }

    static handleFishingInput(player) {
        if (!player.isFishing) {
            player.isFishing = true;
            player.fishingTimer = 0;
        } else {
            if (player.fishingTimer > 0.8) {
                player.isFishing = false;
                player.fishingTimer = 0;
            }
        }
    }

    static updateFishing(player, dt) {
        if (player.isFishing) {
            player.fishingTimer += dt;
        } else {
            player.fishingTimer = 0;
        }
    }

    static playPunch(player) {
        if (!player.isPunch) {
            player.isPunch = true;
            player.punchTimer = 0;
            player.comboChain = 1;
            player.punchHasHit = false;
            player.isAxeSwing = false; // Ensure mutually exclusive
        }
    }

    static playAxeSwing(player) {
        if (!player.isAxeSwing) {
            player.isAxeSwing = true;
            player.axeSwingTimer = 0;
            player.hasHit = false; 
            player.isPunch = false; // Ensure mutually exclusive

            // Combo System Logic
            const now = performance.now();
            const COMBO_WINDOW = 800; // 0.8s window

            if (player.comboChain > 0 && player.comboTimer > 0) {
                player.comboChain = (player.comboChain % 3) + 1;
            } else {
                player.comboChain = 1;
            }
            player.comboTimer = 0.8; // Reset window
        }
    }

    static updateAxeSwing(player, dt, obstacles, particleManager) {
        if (player.isAxeSwing) {
            player.axeSwingTimer += dt;
            const item = player.config.selectedItem;
            const isSword = item === 'Sword';
            const isKnife = item === 'Knife';
            const isAxe = item === 'Axe';
            const isPick = item === 'Pickaxe';
            
            let duration = 0.9;
            if (isSword) duration = 0.6;
            if (isKnife) duration = 0.4;
            
            const impactTime = duration * 0.5;
            
            if (!player.hasHit && player.axeSwingTimer > impactTime) {
                if (isAxe || isPick) {
                    this.checkChoppingImpact(player, obstacles, particleManager);
                } else if (isSword || isKnife) {
                    this.checkCombatImpact(player);
                }
                player.hasHit = true;
            }

            if (player.axeSwingTimer > duration) { 
                player.isAxeSwing = false; 
                player.axeSwingTimer = 0; 
                player.hasHit = false;
            }
        }
    }

    static checkCombatImpact(player) {
        const hitRange = 2.5;
        const playerPos = player.mesh.position;
        const playerForward = new THREE.Vector3();
        player.mesh.getWorldDirection(playerForward);

        const nearbyEnemies = player.worldManager?.getNearbyNPCs(playerPos, hitRange + 2) || [];
        const nearbyFauna = player.worldManager?.getNearbyFauna(playerPos, hitRange + 2) || [];
        const allTargets = [...nearbyEnemies, ...nearbyFauna];

        let baseDamage = 5;
        const item = player.inventory?.hotbar[player.inventory.selectedSlot];
        if (item && item.stats && item.stats.damage) {
            baseDamage = item.stats.damage;
        }

        // Apply Combo Multiplier
        const comboMultipliers = [1.0, 1.2, 1.5];
        let multiplier = comboMultipliers[Math.max(0, player.comboChain - 1)] || 1.0;
        
        if (player.isHeavyAttack) {
            multiplier *= 2.0; // 2x damage for heavy attacks
        }

        // Apply Stealth Multiplier
        if (player.isCrouching) {
            multiplier *= 3.0; // 3x damage from stealth
        }
        
        baseDamage *= multiplier;

        allTargets.forEach(target => {
            if (target.isDead || target === player) return;

            const targetPos = (target.group || target.mesh).position;
            const dist = playerPos.distanceTo(targetPos);
            
            if (dist < hitRange) {
                const dirToTarget = new THREE.Vector3().subVectors(targetPos, playerPos).normalize();
                const dot = playerForward.dot(dirToTarget);

                if (dot > 0.4) {
                    let damageMultiplier = 1.0;
                    let hitWeakPoint = false;

                    // Weak point detection
                    const lootTableKey = `enemy_${target.type}`;
                    const table = player.worldManager?.lootTables?.loot_tables?.[lootTableKey];
                    
                    if (table && table.weak_points) {
                        for (const wp of table.weak_points) {
                            const wpPos = targetPos.clone();
                            // Rotate offset based on target rotation
                            const offset = new THREE.Vector3(wp.offset.x, wp.offset.y, wp.offset.z);
                            offset.applyQuaternion(target.group.quaternion);
                            wpPos.add(offset);

                            // Calculate hit point (approximate with ray from player)
                            const ray = new THREE.Ray(playerPos, playerForward);
                            const distToWP = ray.distanceSqToPoint(wpPos);
                            
                            if (distToWP < (wp.radius * wp.radius)) {
                                damageMultiplier = wp.multiplier;
                                hitWeakPoint = true;
                                break;
                            }
                        }
                    }

                    if (hitWeakPoint) {
                        player.worldManager?.game?.achievementManager?.unlock('weak_point_master');
                    }

                    const finalDamage = baseDamage * damageMultiplier;
                    target.takeDamage(finalDamage, playerPos, player, hitWeakPoint);
                    
                    // Heavy attack knockback
                    if (player.isHeavyAttack) {
                        const kbDir = new THREE.Vector3().subVectors(targetPos, playerPos).normalize();
                        if (target.velocity) {
                            target.velocity.addScaledVector(kbDir, 10);
                        }
                    }

                    // Durability cost
                    if (item && item.durability !== undefined) {
                        item.durability -= player.isHeavyAttack ? 2 : 1;
                        if (item.durability <= 0) {
                            item.durability = 0;
                        }
                    }
                }
            }
        });
    }

    static checkChoppingImpact(player, obstacles, particleManager) {
        const hitRange = 1.0; 
        const playerPos = player.mesh.position;
        const playerForward = new THREE.Vector3();
        player.mesh.getWorldDirection(playerForward);

        let closest = null;
        let minDist = Infinity;

        for (const obs of obstacles) {
            if (obs.userData?.type === 'hard') {
                const obsPos = new THREE.Vector3();
                obs.getWorldPosition(obsPos);
                
                const dist = playerPos.distanceTo(obsPos);

                if (dist < hitRange + 1.2) { 
                    const dirToObs = new THREE.Vector3().subVectors(obsPos, playerPos).normalize();
                    const dot = playerForward.dot(dirToObs);

                    if (dot > 0.5) {
                        if (dist < minDist) {
                            minDist = dist;
                            closest = obs;
                        }
                    }
                }
            }
        }

        if (closest && minDist <= hitRange + 1.2) { 
             const obsPos = new THREE.Vector3();
             closest.getWorldPosition(obsPos);
             
             const impactPos = playerPos.clone().lerp(obsPos, 0.4);
             impactPos.y += 1.0; 

             // Determine material and emit particles
             const matType = closest.userData?.material || 'wood';
             
             if (matType === 'wood' && particleManager) {
                 particleManager.emit(impactPos, 12, 'wood');
             } else if (matType === 'stone' && particleManager) {
                 particleManager.emit(impactPos, 20, 'spark');
             }
        }
    }

    static updatePunchCombo(player, dt, input, obstacles) {
        if (!player.isPunch) {
            player.punchTimer = 0;
            player.comboChain = 0;
            player.punchHasHit = false;
            return;
        }

        player.punchTimer += dt;
        const t = player.punchTimer;
        
        if (t > 0.15 && t < 0.3) {
            PlayerPhysics.applyForwardImpulse(player, dt, 2.0, obstacles);
        }
        if (player.comboChain >= 2 && t > 0.6 && t < 0.75) {
            PlayerPhysics.applyForwardImpulse(player, dt, 2.0, obstacles);
        }
        if (player.comboChain >= 3 && t > 1.05 && t < 1.20) {
            PlayerPhysics.applyForwardImpulse(player, dt, 2.5, obstacles);
        }

        const punch1Dur = 0.45;
        const punch2Dur = 0.90;
        const punch3Dur = 1.35;
        const isHolding = input.attack1 || false;

        const impactTimes = [0.2, 0.65, 1.1];
        const comboIndex = Math.max(0, player.comboChain - 1);
        const impactTime = impactTimes[comboIndex] || 0.2;
        if (!player.punchHasHit && t >= impactTime) {
            this.checkPunchImpact(player);
            player.punchHasHit = true;
        }

        if (player.comboChain === 1 && t > punch1Dur) {
            if (isHolding) {
                player.comboChain = 2;
                player.punchHasHit = false;
            } else {
                player.isPunch = false;
                player.punchTimer = 0;
                player.comboChain = 0;
                player.punchHasHit = false;
            }
        } else if (player.comboChain === 2 && t > punch2Dur) {
            if (isHolding) {
                player.comboChain = 3;
                player.punchHasHit = false;
            } else {
                player.isPunch = false;
                player.punchTimer = 0;
                player.comboChain = 0;
                player.punchHasHit = false;
            }
        } else if (player.comboChain === 3 && t > punch3Dur) {
            player.isPunch = false;
            player.comboChain = 0;
            player.punchTimer = 0;
            player.punchHasHit = false;
        }
    }

    static checkPunchImpact(player) {
        const hitRange = 2.0;
        const playerPos = player.mesh.position;
        const playerForward = new THREE.Vector3();
        player.mesh.getWorldDirection(playerForward);

        const nearbyEnemies = player.worldManager?.getNearbyNPCs(playerPos, hitRange + 2) || [];
        const nearbyFauna = player.worldManager?.getNearbyFauna(playerPos, hitRange + 2) || [];
        const allTargets = [...nearbyEnemies, ...nearbyFauna];

        const baseStrength = player.stats?.base?.strength || 5;
        let baseDamage = 3 + baseStrength * 0.5;

        // Apply stealth bonus for punch
        if (player.isCrouching) {
            baseDamage *= 2.0;
        }

        allTargets.forEach(target => {
            if (target.isDead || target === player) return;

            const targetPos = (target.group || target.mesh).position;
            const dist = playerPos.distanceTo(targetPos);
            if (dist > hitRange) return;

            const dirToTarget = new THREE.Vector3().subVectors(targetPos, playerPos).normalize();
            const dot = playerForward.dot(dirToTarget);
            if (dot < 0.2) return;

            target.takeDamage(baseDamage, playerPos, player, false);
        });
    }
}
