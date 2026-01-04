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

        this.modal = document.getElementById('combat-modal');
        this.logEl = document.getElementById('combat-log');
        this.unitsEl = document.getElementById('combat-units');
        this.turnIndicator = document.getElementById('turn-indicator');
        
        this.setupModalRenderer();
        this.setupUIListeners();
    }

    setupModalRenderer() {
        const canvas = document.getElementById('combat-canvas');
        if (!canvas) return;

        // Use alpha: false and solid background to ensure canvas is visible
        this.modalRenderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true, 
            alpha: false,
            powerPreference: "high-performance"
        });
        
        // Ensure renderer size matches its container
        const rect = canvas.getBoundingClientRect();
        this.modalRenderer.setSize(rect.width, rect.height, false);
        this.modalRenderer.setPixelRatio(window.devicePixelRatio);
        
        this.modalScene = new THREE.Scene();
        this.modalScene.background = new THREE.Color(0x050a14);
        
        this.modalCamera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.modalCamera.position.set(0, 2, 8);
        this.modalCamera.lookAt(0, 1, 0);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.modalScene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(5, 10, 5);
        this.modalScene.add(sun);

        // Add a simple floor for the modal
        const floorGeo = new THREE.CircleGeometry(10, 32);
        const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.5 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.modalScene.add(floor);

        this.modalUnits = new THREE.Group();
        this.modalScene.add(this.modalUnits);

        window.addEventListener('resize', () => this.resizeModal());
    }

    resizeModal() {
        if (!this.modalRenderer) return;
        const canvas = this.modalRenderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        this.modalRenderer.setSize(width, height, false);
        this.modalCamera.aspect = width / height;
        this.modalCamera.updateProjectionMatrix();
    }

    setupUIListeners() {
        document.getElementById('btn-move')?.addEventListener('click', () => this.setMode('move'));
        document.getElementById('btn-attack')?.addEventListener('click', () => this.setMode('attack'));
        document.getElementById('btn-end-turn')?.addEventListener('click', () => this.nextTurn());
    }

    setMode(mode) {
        this.interactionMode = mode;
        this.log(`Switched to ${mode} mode`);
        if (mode === 'move') {
            this.showMoveRange(this.player);
            this.clearHighlights(this.attackHighlights);
        } else if (mode === 'attack') {
            this.showAttackRange(this.player);
            this.clearHighlights(this.highlights);
        }
    }

    log(message) {
        if (!this.logEl) return;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}] ${message}`;
        this.logEl.prepend(entry);
    }

    start(centerX, centerZ) {
        this.isActive = true;
        
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.log("Combat Started!");
            this.resizeModal();
            
            // Setup Modal Scene Units
            this.modalUnits.clear();
            
            // Clone or create proxy meshes for modal view
            // In a real implementation, we might move the actual meshes or clone them
            // For now, let's try to "move" them to the modal scene layer or just render them there
            this.playerMesh = this.player.mesh;
            this.modalUnits.add(this.playerMesh);
            this.playerMesh.position.set(-1.5, 0, 0); // Brought closer to camera
            this.playerMesh.rotation.y = Math.PI / 2;
            this.playerMesh.scale.setScalar(1.5); // Scaled up for better visibility in modal

            this.enemies.forEach((enemy, index) => {
                const mesh = enemy.mesh;
                this.modalUnits.add(mesh);
                mesh.position.set(1.5, 0, (index - (this.enemies.length-1)/2) * 1.5);
                mesh.rotation.y = -Math.PI / 2;
                mesh.scale.setScalar(1.5);
            });

            // Re-enable buttons
            ['btn-move', 'btn-attack', 'btn-end-turn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
            });
        }

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
        this.updateUI();
        this.startTurn();
    }

    updateUI() {
        if (!this.turnIndicator) return;
        const currentUnit = this.turnQueue[this.currentTurnIndex];
        if (currentUnit === this.player) {
            this.turnIndicator.textContent = "PLAYER TURN";
            this.turnIndicator.style.background = "var(--primary)";
        } else {
            this.turnIndicator.textContent = "ENEMY TURN";
            this.turnIndicator.style.background = "#ff4444";
        }

        if (this.unitsEl) {
            this.unitsEl.innerHTML = '';
            this.turnQueue.forEach(unit => {
                const item = document.createElement('div');
                item.style.padding = '8px';
                item.style.marginBottom = '5px';
                item.style.background = 'rgba(255,255,255,0.05)';
                item.style.borderRadius = '4px';
                item.style.borderLeft = unit === currentUnit ? '4px solid var(--primary)' : 'none';
                
                const name = unit === this.player ? 'Player' : (unit.type || 'Enemy');
                const health = unit.stats ? unit.stats.health : unit.health;
                const maxHealth = unit.stats ? unit.stats.maxHealth : unit.maxHealth;
                
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                        <span>${name}</span>
                        <span>${Math.ceil(health)}/${Math.ceil(maxHealth)}</span>
                    </div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.1);">
                        <div style="width:${(health/maxHealth)*100}%; height:100%; background:${unit === this.player ? 'var(--primary)' : '#ff4444'};"></div>
                    </div>
                `;
                this.unitsEl.appendChild(item);
            });
        }
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
        const attackerName = attacker === this.player ? 'You' : (attacker.type || 'Enemy');
        const targetName = target === this.player ? 'you' : (target.type || 'enemy');

        if (isHit) {
            const damage = 10;
            if (target === this.player) {
                this.player.stats.health -= damage;
                this.log(`${attackerName} hit ${targetName} for ${damage} damage!`);
                this.game.player.ui?.showStatus(`Took ${damage} damage!`, true);
            } else {
                target.health -= damage;
                this.log(`${attackerName} hit ${targetName} for ${damage} damage!`);
                this.game.player.ui?.showStatus(`Dealt ${damage} damage!`, false);
                if (target.health <= 0) {
                    target.isDead = true;
                    this.log(`${targetName} has been defeated!`);
                    if (target.die) target.die();
                }
            }
        } else {
            this.log(`${attackerName} missed ${targetName}!`);
            this.game.player.ui?.showStatus("Miss!", false);
        }

        this.updateUI();

        if (attacker.animator?.playPunch) attacker.animator.playPunch();
        else if (attacker.playAttackAnimation) attacker.playAttackAnimation();
    }

    handleInput(input) {
        if (!this.isActive || this.turnQueue[this.currentTurnIndex] !== this.player || this.isMoving) return;
        
        if (input.action && this.game.mouseWorldPos) {
            const target = this.game.mouseWorldPos.clone();
            this.snapToGrid(target);
            
            const dx = Math.abs(target.x - this.player.mesh.position.x);
            const dz = Math.abs(target.z - this.player.mesh.position.z);
            const dist = (dx + dz) / this.gridSize;

            if (this.interactionMode === 'move') {
                if (dist > 0 && dist <= this.moveRange) {
                    this.player.mesh.position.copy(target);
                    this.log(`Moved to ${Math.round(target.x)}, ${Math.round(target.z)}`);
                    this.nextTurn();
                }
            } else if (this.interactionMode === 'attack') {
                const enemy = this.enemies.find(e => {
                    const edx = Math.abs(target.x - e.mesh.position.x);
                    const edz = Math.abs(target.z - e.mesh.position.z);
                    return edx < 0.1 && edz < 0.1 && !e.isDead;
                });

                if (enemy && dist <= this.attackRange) {
                    this.performAttack(this.player, enemy);
                    this.nextTurn();
                }
            }
        }
    }

    endCombat(won) {
        this.isActive = false;
        
        if (this.modal) {
            this.modal.style.display = 'none';
        }

        // Return meshes to the main scene
        if (this.playerMesh) {
            this.scene.add(this.playerMesh);
            // Snap back to world position
            this.snapToGrid(this.playerMesh.position);
        }
        
        this.enemies.forEach(enemy => {
            if (enemy.mesh) {
                this.scene.add(enemy.mesh);
                this.snapToGrid(enemy.mesh.position);
            }
        });

        if (this.game.inputManager) {
            this.game.inputManager.enabled = true;
        }

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

        // Render the modal scene
        if (this.modalRenderer && this.modalScene && this.modalCamera) {
            this.modalRenderer.render(this.modalScene, this.modalCamera);
        }

        // Animate units in modal (they are the actual game objects)
        if (this.player.update) {
            // Player update logic if needed, but usually handled by game loop
        }
        
        this.enemies.forEach(enemy => {
            if (enemy.update && !enemy.isDead) {
                // Keep animations running
                if (enemy.animator) {
                    enemy.animator.animate(delta, false, false, false, false);
                }
            }
        });
    }
}
