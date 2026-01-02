import * as THREE from 'three';
import nipplejs from 'nipplejs';

export class InputManager {
    constructor(game) {
        this.game = game;
        this.input = { x: 0, y: 0, run: false, action: false, jump: false, mouseWorldPos: null };
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.isRotating = false;
        
        // Performance optimizations: reuse objects
        this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this._mouseIntersection = new THREE.Vector3();
        this._lastRaycastTime = 0;

        this.setupControls();
    }

    requestPointerLock() {
        const canvas = this.game.renderer.domElement;
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        canvas.requestPointerLock();
    }

    exitPointerLock() {
        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            // Lock input if NPC interaction or other blocking UI is open
            if (this.game.player.conversation && this.game.player.conversation.isOpen()) {
                if (e.key === 'Escape') {
                    this.game.player.conversation.close();
                }
                return;
            }

            const key = e.key.toLowerCase();
            if (key === 'v') this.game.toggleCameraMode();
            if (key === 'w') this.input.y = -1;
            if (key === 's') this.input.y = 1;
            if (key === 'a') this.input.x = -1;
            if (key === 'd') this.input.x = 1;
            if (key === 'shift') this.input.run = true;
            if (key === ' ') this.input.jump = true;
            if (key === 'q') {
                if (this.game.buildManager.isBuildMode) {
                    this.game.buildManager.changeElevation(1);
                } else {
                    this.game.player.eatBerries();
                }
            }
            if (key === 'e') {
                if (this.game.buildManager.isBuildMode) {
                    this.game.buildManager.changeElevation(-1);
                }
            }
            if (key === 'x') this.game.player.toggleCombat();
            if (key === 'c') {
                const cSlot = document.getElementById('slot-c');
                if (cSlot) {
                    cSlot.classList.add('active');
                    setTimeout(() => cSlot.classList.remove('active'), 150);
                }
                this.game.player.summon();
            }
            if (key === 'r') {
                if (this.game.buildManager.isBuildMode) {
                    this.game.buildManager.rotate();
                } else {
                    this.game.player.castSkill();
                }
                const rSlot = document.getElementById('slot-r');
                if (rSlot) {
                    rSlot.classList.add('active');
                    setTimeout(() => rSlot.classList.remove('active'), 150);
                }
            }
            if (key === 'g') {
                this.game.grid.visible = !this.game.grid.visible;
                this.game.worldManager.setGridVisibility(this.game.grid.visible);
            }
            if (key === 'm') this.game.minimap.toggle();
            if (key === 'n') this.game.shardMap.toggle();
            if (key === 'tab') {
                e.preventDefault();
                this.game.player.ui.toggleInventory();
            }
            if (key === 'p') {
                this.game.player.ui.toggleInventory();
            }
            if (key === 'f') {
                console.log("InputManager: 'f' key pressed");
                this.game.player.tryHarvest();
            }
            // Removed duplicate 'q' entry from here
            if (key === 'b') this.game.buildManager.toggle();
            if (key === 'k') this.game.player.ui.toggleSkills();
            if (key === 'enter') {
                this.game.chat.toggle();
            }
            if (key === '-') {
                const modal = document.getElementById('ore-modal');
                if (modal) {
                    const isVisible = modal.style.display === 'flex';
                    const newVisibility = !isVisible;
                    modal.style.display = newVisibility ? 'flex' : 'none';
                    if (newVisibility && this.game.player.ui) {
                        this.game.player.ui.updateResourceCounts();
                    }
                }
            }

            // Hotbar keys 1-8
            const num = parseInt(key);
            if (num >= 1 && num <= 8) {
                if (this.game.buildManager.isBuildMode) {
                    this.game.buildManager.selectSlot(num - 1);
                } else {
                    // Hotbar selection removed
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key === 'w' || key === 's') this.input.y = 0;
            if (key === 'a' || key === 'd') this.input.x = 0;
            if (key === 'shift') this.input.run = false;
            if (key === ' ') this.input.jump = false;
        });

        // Mobile Joystick
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            const joystick = nipplejs.create({
                zone: document.body,
                mode: 'static',
                position: { left: '80px', bottom: '80px' },
                color: 'white'
            });

            joystick.on('move', (evt, data) => {
                if (data.vector) {
                    this.input.x = data.vector.x;
                    this.input.y = -data.vector.y;
                }
            });

            joystick.on('end', () => {
                this.input.x = 0;
                this.input.y = 0;
            });
        }

        // Tap/Click Actions
        document.body.addEventListener('touchstart', (e) => {
            const inventoryWrapper = document.getElementById('inventory-overlay-wrapper');
            const isInventoryOpen = inventoryWrapper && window.getComputedStyle(inventoryWrapper).display !== 'none';
            
            if (isInventoryOpen && e.target.closest('#inventory-overlay-wrapper')) return;
            if (e.target.closest('#ui-layer')) return;
            this.input.action = true;
            this.triggerActionFeedback();
        });
        document.body.addEventListener('touchend', () => {
            this.input.action = false;
        });

        window.addEventListener('mousedown', (e) => {
            // Block game clicks if inventory is open
            const inventoryWrapper = document.getElementById('inventory-overlay-wrapper');
            const isInventoryOpen = inventoryWrapper && window.getComputedStyle(inventoryWrapper).display !== 'none';
            
            if (isInventoryOpen && e.target.closest('#inventory-overlay-wrapper')) {
                return;
            }

            if (e.button === 2) {
                if (this.game.buildManager.isBuildMode) {
                    this.game.buildManager.cancel();
                    return;
                }
                // Try to interact with plot on right click
                if (this.game.player.tryInteractPlot(true)) {
                    return;
                }
                this.isRotating = true;
            }
            if (e.button === 0) {
                // Discover slots based on ID for click support
                if (e.target.closest('#slot-p')) {
                    // Profile preview toggle removed
                    return;
                }

                const isUI = !!e.target.closest('#ui-layer');
                console.log("InputManager: mousedown LMB", {
                    target: e.target,
                    isUI: isUI,
                    isBuildMode: this.game.buildManager.isBuildMode,
                    mouseWorldPos: this.input.mouseWorldPos,
                    gameMouseWorldPos: this.game.mouseWorldPos
                });

                if (isUI) {
                    console.log("InputManager: UI clicked, ignoring");
                    return;
                }
                
                if (this.game.buildManager.isBuildMode) {
                    console.log("InputManager: Build mode placement triggered");
                    this.game.buildManager.place();
                    return;
                }
                this.input.action = true;
                this.triggerActionFeedback();
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) this.isRotating = false;
            if (e.button === 0) this.input.action = false;
        });
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            if (this.game.cameraMode === 'fpv' && document.pointerLockElement) {
                const sensitivity = 0.002;
                this.game.fpvRotation.yaw -= e.movementX * sensitivity;
                this.game.fpvRotation.pitch -= e.movementY * sensitivity;
                
                // Constrain pitch
                this.game.fpvRotation.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.game.fpvRotation.pitch));
                
                // Sync player rotation with camera yaw in FPV
                if (this.game.player && this.game.player.mesh) {
                    this.game.player.mesh.rotation.y = this.game.fpvRotation.yaw;
                }
            } else if (this.isRotating) {
                this.game.cameraRotation.theta -= e.movementX * 0.01;
                this.game.cameraRotation.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, this.game.cameraRotation.phi + e.movementY * 0.01));
            }
        });

        window.addEventListener('wheel', (e) => {
            const modalIds = ['shard-map-container', 'ore-modal', 'death-screen'];
            const isModalOpen = modalIds.some(id => {
                const el = document.getElementById(id);
                return el && window.getComputedStyle(el).display !== 'none';
            });
            if (isModalOpen) return;

            if (this.game.buildManager.isBuildMode) {
                const delta = e.deltaY > 0 ? -1 : 1;
                this.game.buildManager.changeElevation(delta);
                return;
            }

            const zoomStep = 2.0;
            if (e.deltaY > 0) {
                this.game.cameraRotation.distance += zoomStep;
            } else if (e.deltaY < 0) {
                this.game.cameraRotation.distance -= zoomStep;
            }
            this.game.cameraRotation.distance = Math.max(10, Math.min(80, this.game.cameraRotation.distance));
        }, { passive: true });

        window.addEventListener('contextmenu', (e) => {
        const inventoryWrapper = document.getElementById('inventory-overlay-wrapper');
        const isInventoryOpen = inventoryWrapper && window.getComputedStyle(inventoryWrapper).display !== 'none';
        
        if (isInventoryOpen && e.target.closest('#inventory-overlay-wrapper')) {
            // Let the inventory UI handle its own context menu events
            return;
        }
        e.preventDefault();
    });
    }

    triggerActionFeedback() {
        const lmbSlot = document.getElementById('slot-lmb');
        if (lmbSlot) {
            lmbSlot.classList.add('active');
            setTimeout(() => lmbSlot.classList.remove('active'), 150);
        }
    }

    updateMouseWorldPos(terrainMeshes) {
        const now = performance.now();
        // Throttle raycasting to ~30Hz (33ms) to save CPU, especially on complex terrain
        if (now - this._lastRaycastTime < 33) return; 
        this._lastRaycastTime = now;

        this.raycaster.setFromCamera(this.mouse, this.game.camera);
        
        // Filter out null/undefined meshes
        const validMeshes = terrainMeshes.filter(m => m);
        const intersects = this.raycaster.intersectObjects(validMeshes);
        
        if (intersects.length > 0) {
            this.input.mouseWorldPos = intersects[0].point.clone();
        } else {
            if (this.raycaster.ray.intersectPlane(this._groundPlane, this._mouseIntersection)) {
                this.input.mouseWorldPos = this._mouseIntersection.clone();
            } else {
                this.input.mouseWorldPos = null;
            }
        }
        
        // Sync to game instance for easy access by other managers
        this.game.mouseWorldPos = this.input.mouseWorldPos;
    }
}
