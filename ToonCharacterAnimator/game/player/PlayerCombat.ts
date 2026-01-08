
import * as THREE from 'three';
import type { Player } from '../Player';
import { PlayerInput } from '../../types';
import { PlayerPhysics } from './PlayerPhysics';
import { ParticleManager } from '../ParticleManager';
import { Environment } from '../Environment';

export class PlayerCombat {
    static update(player: Player, dt: number, input: PlayerInput, environment: Environment, particleManager: ParticleManager) {
        
        const attack1Triggered = input.attack1 && !player.wasAttack1Pressed;
        const attack2Triggered = input.attack2 && !player.wasAttack2Pressed;

        // Handle Inputs
        if (player.config.selectedItem === 'Fishing Pole') {
            // Fishing requires precise toggle (Rising Edge)
            if (attack1Triggered || attack2Triggered) {
                this.handleFishingInput(player);
            }
        } else {
            // Other weapons support continuous hold (Auto-attack)
            if (input.attack1) {
                if (player.config.selectedItem) {
                    this.playAxeSwing(player);
                } else {
                    this.playPunch(player);
                }
            }
            if (input.attack2) {
                if (player.config.selectedItem) {
                    this.playAxeSwing(player);
                }
            }
        }

        // Update Input History
        player.wasAttack1Pressed = !!input.attack1;
        player.wasAttack2Pressed = !!input.attack2;

        // Update Timers & Logic
        this.updateAxeSwing(player, dt, environment, particleManager);
        this.updateFishing(player, dt);
        this.updatePunchCombo(player, dt, input, environment.obstacles);
    }

    private static handleFishingInput(player: Player) {
        if (!player.isFishing) {
            // Start Cast
            player.isFishing = true;
            player.fishingTimer = 0;
        } else {
            // If already fishing and cast is complete (in hold phase), retract
            // Cast duration is roughly 0.8s
            if (player.fishingTimer > 0.8) {
                player.isFishing = false;
                player.fishingTimer = 0;
                // Transition back to idle is handled by the animator blending out of FishingAction
            }
        }
    }

    private static updateFishing(player: Player, dt: number) {
        if (player.isFishing) {
            player.fishingTimer += dt;
        } else {
            player.fishingTimer = 0;
        }
    }

    private static playPunch(player: Player) {
        if (!player.isPunch) {
            player.isPunch = true;
            player.punchTimer = 0;
            player.comboChain = 1;
        }
    }

    private static playAxeSwing(player: Player) {
        if (!player.isAxeSwing) {
            player.isAxeSwing = true;
            player.axeSwingTimer = 0;
            player.hasHit = false; // Reset hit flag at start of swing
        }
    }

    private static updateAxeSwing(player: Player, dt: number, environment: Environment, particleManager: ParticleManager) {
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
            
            // IMPACT LOGIC
            // Typically impact happens midway through. For default swing (Axe/Pick), it's around 0.5 progress.
            // Duration for axe is 0.9. Impact ~0.45s.
            const impactTime = duration * 0.5;
            
            if (!player.hasHit && player.axeSwingTimer > impactTime) {
                // Check for tree collision to spawn particles
                if (isAxe || isPick) {
                    this.checkChoppingImpact(player, environment, particleManager);
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

    private static checkChoppingImpact(player: Player, environment: Environment, particleManager: ParticleManager) {
        const hitRange = 1.0; // 1 meter
        const playerPos = player.mesh.position;
        const playerForward = new THREE.Vector3();
        player.mesh.getWorldDirection(playerForward);

        // Find closest obstacle in front
        let closest: THREE.Object3D | null = null;
        let minDist = Infinity;

        // Iterate through environment obstacles
        for (const obs of environment.obstacles) {
            // Only care about trees (wood) or potentially rocks (stone)
            if (obs.userData.type === 'hard') {
                const obsPos = new THREE.Vector3();
                obs.getWorldPosition(obsPos);
                
                // Ignore height difference for general proximity
                const dist = playerPos.distanceTo(obsPos);

                if (dist < hitRange + 1.2) { // Broad phase check (radius of obstacle + hit range)
                    // Precise check to surface roughly
                    const dirToObs = new THREE.Vector3().subVectors(obsPos, playerPos).normalize();
                    const dot = playerForward.dot(dirToObs);

                    // Must be in front (dot > 0.5 is ~60 degree cone)
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
             // Determine impact point (roughly between player and object)
             const obsPos = new THREE.Vector3();
             closest.getWorldPosition(obsPos);
             
             // Hit point calculation
             const impactPos = playerPos.clone().lerp(obsPos, 0.4);
             impactPos.y += 1.0; // Hit at chest height

             // Call Environment to handle logic (health, felling)
             const materialType = environment.damageObstacle(closest, 1);
             
             if (materialType === 'wood') {
                 particleManager.emit(impactPos, 12, 'wood');
             } else if (materialType === 'stone') {
                 // Stone hits create sparks
                 particleManager.emit(impactPos, 20, 'spark');
             }
        }
    }

    private static updatePunchCombo(player: Player, dt: number, input: PlayerInput, obstacles: THREE.Object3D[]) {
        if (!player.isPunch) return;

        player.punchTimer += dt;
        const t = player.punchTimer;
        
        // Movement Impulses
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

        if (player.comboChain === 1 && t > punch1Dur) {
            if (isHolding) {
                player.comboChain = 2;
            } else {
                player.isPunch = false;
                player.punchTimer = 0;
            }
        } else if (player.comboChain === 2 && t > punch2Dur) {
            if (isHolding) {
                player.comboChain = 3;
            } else {
                player.isPunch = false;
                player.punchTimer = 0;
            }
        } else if (player.comboChain === 3 && t > punch3Dur) {
            player.isPunch = false;
            player.comboChain = 1;
            player.punchTimer = 0;
        }
    }
}
