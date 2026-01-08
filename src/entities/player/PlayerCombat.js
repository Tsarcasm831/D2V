import * as THREE from 'three';
import { PlayerPhysics } from './PlayerPhysics.js';

export class PlayerCombat {
    static update(player, dt, input, obstacles, particleManager) {
        
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

    static playPunch(player) {
        if (!player.isPunch) {
            player.isPunch = true;
            player.punchTimer = 0;
            player.comboChain = 1;
            if (player.animator) {
                if (typeof player.animator.playPunch === 'function') {
                    player.animator.playPunch();
                } else {
                    player.animator.isPunch = true;
                    player.animator.punchTimer = 0;
                    player.animator.isAxeSwing = false;
                    player.animator.axeSwingTimer = 0;
                }
            }
        }
    }

    static playAxeSwing(player) {
        if (!player.isAxeSwing) {
            player.isAxeSwing = true;
            player.axeSwingTimer = 0;
            player.hasHit = false; 
            if (player.animator) {
                if (typeof player.animator.playAxeSwing === 'function') {
                    player.animator.playAxeSwing();
                } else {
                    player.animator.isAxeSwing = true;
                    player.animator.axeSwingTimer = 0;
                    player.animator.isPunch = false;
                    player.animator.punchTimer = 0;
                }
            }
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
                }
                player.hasHit = true;
            }

        if (player.axeSwingTimer > duration) { 
                player.isAxeSwing = false; 
                player.axeSwingTimer = 0; 
                player.hasHit = false;
                
                // Reset animator state if it exists
                if (player.animator) {
                    player.animator.isAxeSwing = false;
                    player.animator.axeSwingTimer = 0;
                }
            }
        }
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

                if (dist < hitRange + 1.0) { 
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

        if (closest && minDist <= hitRange + 1.0) { 
             const obsPos = new THREE.Vector3();
             closest.getWorldPosition(obsPos);
             const impactPos = playerPos.clone().lerp(obsPos, 0.7);
             impactPos.y += 1.0; 

             const matType = closest.userData?.material;
             
             if (matType === 'wood' && particleManager) {
                 particleManager.emit(impactPos, 8, 'wood');
             } else if (matType === 'stone' && particleManager) {
                 particleManager.emit(impactPos, 5, 'stone');
             }
        }
    }

    static updatePunchCombo(player, dt, input, obstacles) {
        if (!player.isPunch) return;

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

        if (player.comboChain === 1 && t > punch1Dur) {
            if (isHolding) {
                player.comboChain = 2;
            } else {
                player.isPunch = false;
                player.punchTimer = 0;
                if (player.animator) {
                    player.animator.isPunch = false;
                    player.animator.punchTimer = 0;
                }
            }
        } else if (player.comboChain === 2 && t > punch2Dur) {
            if (isHolding) {
                player.comboChain = 3;
            } else {
                player.isPunch = false;
                player.punchTimer = 0;
                if (player.animator) {
                    player.animator.isPunch = false;
                    player.animator.punchTimer = 0;
                }
            }
        } else if (player.comboChain === 3 && t > punch3Dur) {
            player.isPunch = false;
            player.comboChain = 1;
            player.punchTimer = 0;
            if (player.animator) {
                player.animator.isPunch = false;
                player.animator.punchTimer = 0;
            }
        }
    }
}
