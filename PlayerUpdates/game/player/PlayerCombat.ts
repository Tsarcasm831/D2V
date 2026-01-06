import * as THREE from 'three';
import type { Player } from '../Player';
import { PlayerInput } from '../../types';
import { PlayerPhysics } from './PlayerPhysics';

export class PlayerCombat {
    static update(player: Player, dt: number, input: PlayerInput, obstacles: THREE.Object3D[]) {
        
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
        this.updateAxeSwing(player, dt);
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
        }
    }

    private static updateAxeSwing(player: Player, dt: number) {
        if (player.isAxeSwing) {
            player.axeSwingTimer += dt;
            const item = player.config.selectedItem;
            const isSword = item === 'Sword';
            const isKnife = item === 'Knife';
            let duration = 0.9;
            if (isSword) duration = 0.6;
            if (isKnife) duration = 0.4;
            
            if (player.axeSwingTimer > duration) { 
                player.isAxeSwing = false; 
                player.axeSwingTimer = 0; 
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