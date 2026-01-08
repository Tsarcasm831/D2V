import * as THREE from 'three';
import { SCALE_FACTOR } from '../../world/world_bounds.js';

export class HitIndicator {
    constructor(player) {
        this.player = player;
        this.mesh = this._createMesh();
        
        // Force global access for debugging
        window.hitIndicator = this;
        
        // Initial attempt to add to scene
        this._addToScene();
    }

    _addToScene() {
        const scene = this.player.scene
            || (this.player.game && this.player.game.scene)
            || (this.player.worldManager ? this.player.worldManager.scene : null)
            || (window.gameInstance ? window.gameInstance.scene : null)
            || (window.game ? window.game.scene : null);

        if (scene) {
            if (!this.mesh.parent) {
                scene.add(this.mesh);
            }
            return true;
        }

        if (!this._sceneRetryTimeout) {
            this._sceneRetryTimeout = setTimeout(() => {
                this._sceneRetryTimeout = null;
                this._addToScene();
            }, 250);
        }
        return false;
    }

    _createMesh() {
        const range = 7.5 * SCALE_FACTOR;
        const group = new THREE.Group();

        // 1. Vertical Line (Beam) - Extremely bright white/yellow
        const lineGeometry = new THREE.BufferGeometry();
        this._linePositions = new Float32Array([0, 0, 0, 0, 1, 0]);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(this._linePositions, 3));
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
            depthWrite: false
        });
        this.line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.line.renderOrder = 9999999;
        group.add(this.line);

        // 2. Flat Ring - ground-aligned
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Draw a thin bright ring
        ctx.beginPath();
        ctx.arc(128, 128, 110, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.0)';

        const texture = new THREE.CanvasTexture(canvas);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const ringGeo = new THREE.PlaneGeometry(1, 1);
        this.ring = new THREE.Mesh(ringGeo, ringMaterial);
        this.ring.rotation.x = -Math.PI / 2;
        this.ring.scale.set(range * 0.15, range * 0.15, 1);
        this.ring.renderOrder = 9999999;
        group.add(this.ring);

        return group;
    }

    update() {
        if (!this.mesh) return;

        const game = this.player.game || (this.player.worldManager ? this.player.worldManager.game : null) || window.game;
        if (!game) return;

        // Ensure we are in the scene
        if (!this.mesh.parent && game.scene) {
            game.scene.add(this.mesh);
        }

        const mousePos = game.inputManager.input.mouseWorldPos || game.mouseWorldPos;
        const attackRange = 3.0 * SCALE_FACTOR;
        const playerPos = this.player.mesh ? this.player.mesh.position : new THREE.Vector3();

        if (!mousePos) {
            this.mesh.visible = false;
            return;
        }

        let groundY = mousePos.y;
        if (this.player.worldManager && this.player.worldManager.getTerrainHeight) {
            groundY = this.player.worldManager.getTerrainHeight(mousePos.x, mousePos.z);
        }

        this.mesh.visible = true;
        this.mesh.position.set(mousePos.x, groundY + 0.05, mousePos.z);

        if (this.player.mesh) {
            const box = new THREE.Box3().setFromObject(this.player.mesh);
            const halfHeight = Math.max(0.1, (box.max.y - box.min.y) * 0.5);
            this._linePositions[1] = 0;
            this._linePositions[4] = halfHeight;
            this.line.geometry.attributes.position.needsUpdate = true;
        }

        const dist = playerPos.distanceTo(mousePos);
        const inRange = dist <= attackRange;

        // Flashy colors: Neon Green vs Neon Red
        const color = inRange ? 0x00ff00 : 0xff0000;
        this.ring.material.color.setHex(color);
        this.lineMaterial.color.setHex(color);

        // Debug logging every 100 frames
        if (!this._logCounter) this._logCounter = 0;
        this._logCounter++;
        if (this._logCounter % 100 === 0) {
            console.log(`HitIndicator Update: pos(${mousePos.x.toFixed(1)}, ${mousePos.y.toFixed(1)}, ${mousePos.z.toFixed(1)}), inRange: ${inRange}, dist: ${dist.toFixed(1)}`);
        }
    }

    setVisibility(visible) {
        this.visible = visible;
        this.mesh.visible = visible;
    }
}
