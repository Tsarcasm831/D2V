import * as THREE from 'three';
import { FireballProjectile } from './fireball_projectile.js';
import { IceboltProjectile } from './icebolt_projectile.js';

export class MagicSystem {
    constructor(game) {
        this.game = game;
        this.spells = {
            'fireball': {
                name: 'Fireball',
                cost: 25,
                type: 'projectile',
                element: 'fire',
                damage: 30,
                level: 1,
                xp: 0,
                maxXp: 100
            },
            'icebolt': {
                name: 'Icebolt',
                cost: 20,
                type: 'projectile',
                element: 'ice',
                damage: 20,
                level: 1,
                xp: 0,
                maxXp: 100
            },
            'frost_nova': {
                name: 'Frost Nova',
                cost: 40,
                type: 'aoe',
                element: 'ice',
                radius: 10,
                damage: 15,
                level: 1,
                xp: 0,
                maxXp: 150
            }
        };
    }

    castSpell(spellId, player, targetPos) {
        const spell = this.spells[spellId];
        if (!spell) return false;

        if (player.mana < spell.cost) {
            if (player.ui) player.ui.showStatus("NOT ENOUGH MANA", true);
            return false;
        }

        player.mana -= spell.cost;
        if (player.ui) player.ui.updateHud();

        switch (spell.type) {
            case 'projectile':
                this.castProjectile(spell, player, targetPos);
                break;
            case 'aoe':
                this.castAoE(spell, player);
                break;
        }

        this.addSpellXp(spellId, 10);
        return true;
    }

    castProjectile(spell, player, targetPos) {
        const startPos = player.mesh.position.clone();
        startPos.y += 1.2;
        
        let projectile;
        if (spell.element === 'fire') {
            projectile = new FireballProjectile(player.scene, startPos, targetPos, player);
        } else if (spell.element === 'ice') {
            projectile = new IceboltProjectile(player.scene, startPos, targetPos, player);
        }

        if (projectile) {
            projectile.damage = spell.damage + (spell.level * 2);
            this.game.projectiles.push(projectile);
        }
    }

    castAoE(spell, player) {
        const playerPos = player.mesh.position;
        
        // Visual effect for AoE
        const ringGeo = new THREE.TorusGeometry(spell.radius, 0.2, 16, 32);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: spell.element === 'ice' ? 0x00ffff : 0xff4400, 
            transparent: true, 
            opacity: 0.6 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(playerPos);
        ring.position.y += 0.1;
        player.scene.add(ring);

        // Fade out ring
        let opacity = 0.6;
        const fade = setInterval(() => {
            opacity -= 0.05;
            ring.material.opacity = opacity;
            ring.scale.multiplyScalar(1.02);
            if (opacity <= 0) {
                player.scene.remove(ring);
                ringGeo.dispose();
                ringMat.dispose();
                clearInterval(fade);
            }
        }, 50);

        // Deal damage to nearby enemies
        const targets = [...this.game.worldManager.getNearbyNPCs(playerPos, spell.radius), 
                         ...this.game.worldManager.getNearbyFauna(playerPos, spell.radius)];
        
        targets.forEach(target => {
            if (target === player || target.isDead) return;
            const dist = playerPos.distanceTo((target.group || target.mesh).position);
            if (dist < spell.radius) {
                target.takeDamage(spell.damage + (spell.level * 2), playerPos, player);
                if (spell.element === 'ice' && target.moveSpeed) {
                    // Slow effect
                    const originalSpeed = target.moveSpeed;
                    target.moveSpeed *= 0.5;
                    setTimeout(() => {
                        if (!target.isDead) target.moveSpeed = originalSpeed;
                    }, 3000);
                }
            }
        });
    }

    addSpellXp(spellId, amount) {
        const spell = this.spells[spellId];
        if (!spell) return;

        spell.xp += amount;
        if (spell.xp >= spell.maxXp) {
            spell.level++;
            spell.xp = 0;
            spell.maxXp = Math.floor(spell.maxXp * 1.5);
            spell.cost = Math.max(5, spell.cost - 1);
            if (this.game.player.ui) {
                this.game.player.ui.showStatus(`${spell.name} LEVELED UP TO ${spell.level}!`, false);
            }
        }
    }
}
