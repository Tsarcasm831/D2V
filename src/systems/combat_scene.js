import * as THREE from 'three';

export class CombatScene {
    constructor(game, enemies = []) {
        this.game = game;
        this.scene = game.scene;
        this.worldManager = game.worldManager;
        this.player = game.player;
        this.enemies = enemies;
        
        this.isActive = false;
        this.turn = 'player'; // 'player' or 'enemy'
        
        this.gridSize = 1; 
        this.center = new THREE.Vector3();
        
        this.highlights = new THREE.Group();
        this.scene.add(this.highlights);

        this.attackHighlights = new THREE.Group();
        this.scene.add(this.attackHighlights);
        
        this.turnQueue = [];
        this.currentTurnIndex = 0;
        
        this.isMoving = false;
        this.moveRange = 5;
        this.attackRange = 1;
        this.hitChance = 0.8;
    }

    start(centerX, centerZ) {
        this.isActive = true;
        this.center.set(centerX, this.worldManager.getTerrainHeight(centerX, centerZ), centerZ);
        
        this.player.isCombatMode = true;

        if (this.game.buildManager) this.game.buildManager.cancel();
        
        this.snapToGrid(this.player.mesh.position);
        
        this.enemies.forEach((enemy, index) => {
            const angle = (index / this.enemies.length) * Math.PI * 2;
            const dist = 5;
            const x = this.center.x + Math.cos(angle) * dist;
            const z = this.center.z + Math.sin(angle) * dist;
            enemy.mesh.position.set(x, this.worldManager.getTerrainHeight(x, z), z);
            this.snapToGrid(enemy.mesh.position);
            enemy.isCombat = true;
        });
        
        this.initTurnQueue();
        this.startTurn();
        
        this.game.player.ui?.showStatus("Combat Started!", false);
    }

    snapToGrid(pos) {
        pos.x = Math.round(pos.x / this.gridSize) * this.gridSize;
        pos.z = Math.round(pos.z / this.gridSize) * this.gridSize;
        pos.y = this.worldManager.getTerrainHeight(pos.x, pos.z);
    }

    initTurnQueue() {
        this.turnQueue = [this.player, ...this.enemies];
        this.currentTurnIndex = 0;
    }

    startTurn() {
        const currentUnit = this.turnQueue[this.currentTurnIndex];
        if (!currentUnit || currentUnit.isDead) {
            this.nextTurn();
            return;
        }
        
        if (currentUnit === this.player) {
            this.showMoveRange(this.player);
            this.showAttackRange(this.player);
        } else {
            this.executeEnemyTurn(currentUnit);
        }
    }

    nextTurn() {
        this.clearHighlights();
        
        const aliveEnemies = this.enemies.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) {
            this.endCombat(true);
            return;
        }
        
        if (this.player.isDead) {
            this.endCombat(false);
            return;
        }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnQueue.length;
        this.startTurn();
    }

    showMoveRange(unit) {
        this.clearHighlights(this.highlights);
        const range = this.moveRange;
        const pos = unit.mesh.position;
        
        const geo = new THREE.PlaneGeometry(0.9, 0.9);
        const mat = new THREE.MeshBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        
        for (let x = -range; x <= range; x++) {
            for (let z = -range; z <= range; z++) {
                const dist = Math.abs(x) + Math.abs(z);
                if (dist > 0 && dist <= range) {
                    const highlight = new THREE.Mesh(geo, mat);
                    const px = pos.x + x * this.gridSize;
                    const pz = pos.z + z * this.gridSize;
                    highlight.position.set(px, this.worldManager.getTerrainHeight(px, pz) + 0.1, pz);
                    highlight.rotation.x = -Math.PI / 2;
                    this.highlights.add(highlight);
                }
            }
        }
    }

    showAttackRange(unit) {
        this.clearHighlights(this.attackHighlights);
        const range = this.attackRange;
        const pos = unit.mesh.position;
        
        const geo = new THREE.PlaneGeometry(0.9, 0.9);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        
        for (let x = -range; x <= range; x++) {
            for (let z = -range; z <= range; z++) {
                const dist = Math.abs(x) + Math.abs(z);
                if (dist > 0 && dist <= range) {
                    const highlight = new THREE.Mesh(geo, mat);
                    const px = pos.x + x * this.gridSize;
                    const pz = pos.z + z * this.gridSize;
                    highlight.position.set(px, this.worldManager.getTerrainHeight(px, pz) + 0.15, pz);
                    highlight.rotation.x = -Math.PI / 2;
                    this.attackHighlights.add(highlight);
                }
            }
        }
    }

    clearHighlights(group) {
        const targetGroup = group || this.highlights;
        while (targetGroup.children.length > 0) {
            targetGroup.remove(targetGroup.children[0]);
        }
        if (!group) {
            this.clearHighlights(this.attackHighlights);
        }
    }

    executeEnemyTurn(enemy) {
        const pPos = this.player.mesh.position;
        const ePos = enemy.mesh.position;
        
        const dist = Math.abs(pPos.x - ePos.x) + Math.abs(pPos.z - ePos.z);
        
        setTimeout(() => {
            if (dist <= this.attackRange) {
                this.performAttack(enemy, this.player);
            } else {
                const dx = Math.sign(pPos.x - ePos.x);
                const dz = Math.sign(pPos.z - ePos.z);
                
                if (Math.abs(pPos.x - ePos.x) > Math.abs(pPos.z - ePos.z)) {
                    enemy.mesh.position.x += dx * this.gridSize;
                } else {
                    enemy.mesh.position.z += dz * this.gridSize;
                }
                this.snapToGrid(enemy.mesh.position);
                
                const newDist = Math.abs(pPos.x - enemy.mesh.position.x) + Math.abs(pPos.z - enemy.mesh.position.z);
                if (newDist <= this.attackRange) {
                    setTimeout(() => {
                        this.performAttack(enemy, this.player);
                    }, 500);
                    return;
                }
            }
            this.nextTurn();
        }, 800);
    }

    performAttack(attacker, target) {
        const isHit = Math.random() < this.hitChance;
        
        if (isHit) {
            const damage = 10;
            if (target === this.player) {
                this.player.stats.health -= damage;
                this.game.player.ui?.showStatus(`Took ${damage} damage!`, true);
            } else {
                target.health -= damage;
                this.game.player.ui?.showStatus(`Dealt ${damage} damage!`, false);
                if (target.health <= 0) {
                    target.isDead = true;
                    if (target.die) target.die();
                }
            }
        } else {
            this.game.player.ui?.showStatus("Miss!", false);
        }

        if (attacker.animator?.playPunch) attacker.animator.playPunch();
        else if (attacker.playAttackAnimation) attacker.playAttackAnimation();
    }

    handleInput(input) {
        if (!this.isActive || this.turnQueue[this.currentTurnIndex] !== this.player || this.isMoving) return;
        
        if (input.action && this.game.mouseWorldPos) {
            const target = this.game.mouseWorldPos.clone();
            this.snapToGrid(target);
            
            const dist = Math.abs(target.x - this.player.mesh.position.x) + Math.abs(target.z - this.player.mesh.position.z);
            
            const enemyAtTarget = this.enemies.find(e => 
                !e.isDead && 
                Math.round(e.mesh.position.x) === Math.round(target.x) && 
                Math.round(e.mesh.position.z) === Math.round(target.z)
            );

            if (enemyAtTarget && dist <= this.attackRange) {
                this.performAttack(this.player, enemyAtTarget);
                this.nextTurn();
                return;
            }

            if (dist > 0 && dist <= this.moveRange) {
                this.player.mesh.position.copy(target);
                this.nextTurn();
            }
        }
    }

    endCombat(won) {
        this.isActive = false;
        this.clearHighlights();
        this.scene.remove(this.highlights);
        this.scene.remove(this.attackHighlights);
        this.player.isCombatMode = false;
        
        if (won) {
            this.game.player.ui?.showStatus("Victory!", false);
        } else {
            this.game.player.ui?.showStatus("Defeat...", true);
        }
        
        if (this.onEnd) this.onEnd(won);
    }

    update(delta) {
        if (!this.isActive) return;
    }
}
