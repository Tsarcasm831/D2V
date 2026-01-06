import * as THREE from 'three';
import type { Player } from '../Player';
import { PlayerInput } from '../../types';
import { PlayerPhysics } from './PlayerPhysics';
import { ParticleManager } from '../ParticleManager';

export class PlayerCombat {
    static update(player: Player, dt: number, input: PlayerInput, obstacles: THREE.Object3D[], particleManager: ParticleManager) {
        
        // Handle Trigger Inputs
        if (input.attack1) {
            if (player.config.selectedItem) {
                this.playAxeSwing(player);
            } else {
                this.playPunch(player);
            }
        }
        if (input.attack2) this.playAxeSwing(player);

        // Update Timers & Logic
        this.updateAxeSwing(player, dt, obstacles, particleManager);
        this.updatePunchCombo(player, dt, input, obstacles);
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

    private static updateAxeSwing(player: Player, dt: number, obstacles: THREE.Object3D[], particleManager: ParticleManager) {
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
                    this.checkChoppingImpact(player, obstacles, particleManager);
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

    private static checkChoppingImpact(player: Player, obstacles: THREE.Object3D[], particleManager: ParticleManager) {
        const hitRange = 1.0; // 1 meter
        const playerPos = player.mesh.position;
        const playerForward = new THREE.Vector3();
        player.mesh.getWorldDirection(playerForward);

        // Find closest obstacle in front
        let closest: THREE.Object3D | null = null;
        let minDist = Infinity;

        for (const obs of obstacles) {
            // Only care about trees (wood) or potentially rocks (stone)
            if (obs.userData.type === 'hard') {
                const obsPos = new THREE.Vector3();
                obs.getWorldPosition(obsPos);
                
                // Ignore height difference for general proximity, but maybe clamp for tree trunks?
                // Just 3D distance is fine for now if player is on ground.
                const dist = playerPos.distanceTo(obsPos);

                if (dist < hitRange + 1.0) { // Broad phase check (radius of tree + hit range)
                    // Precise check to surface roughly
                    // Assume objects are roughly centered. 
                    // Let's get direction to object
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

        if (closest && minDist <= hitRange + 1.0) { // +1.0 accounts for object radius approx
             // Determine impact point (roughly between player and object)
             const obsPos = new THREE.Vector3();
             closest.getWorldPosition(obsPos);
             const impactPos = playerPos.clone().lerp(obsPos, 0.7);
             impactPos.y += 1.0; // Hit at chest height

             const matType = closest.userData.material;
             
             if (matType === 'wood') {
                 particleManager.emit(impactPos, 8, 'wood');
                 // Audio could trigger here too if SoundManager was passed
             } else if (matType === 'stone') {
                 // Optional: sparks for stone
                 particleManager.emit(impactPos, 5, 'stone');
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