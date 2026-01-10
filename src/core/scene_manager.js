import * as THREE from 'three';
import { debugLog } from '../utils/logger.js';

export class SceneManager {
    constructor(game) {
        this.game = game;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050a14);
        this.scene.fog = new THREE.FogExp2(0x050a14, 0.008);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Ensure camera sees both Layer 0 (default) and Layer 1 (world objects)
        this.camera.layers.enable(0);
        this.camera.layers.enable(1);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        
        document.body.appendChild(this.renderer.domElement);

        this.setupLights();
        
        window.addEventListener('resize', () => this.onResize());
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0x4040ff, 0.4);
        ambient.layers.enable(0);
        ambient.layers.enable(1);
        this.scene.add(ambient);

        this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sun.layers.enable(0);
        this.sun.layers.enable(1);
        this.sun.position.set(30, 60, 30);
        this.sun.castShadow = true;
        
        this.sun.shadow.camera.left = -40;
        this.sun.shadow.camera.right = 40;
        this.sun.shadow.camera.top = 40;
        this.sun.shadow.camera.bottom = -40;
        this.sun.shadow.camera.far = 200;
        this.sun.shadow.mapSize.set(1024, 1024);
        this.sun.shadow.bias = -0.001;
        this.sun.shadow.normalBias = 0.04;
        
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setQuality(quality) {
        if (!this.renderer) return;
        switch (quality) {
            case 'low':
                this.renderer.setPixelRatio(1);
                this.renderer.shadowMap.enabled = false;
                break;
            case 'medium':
                this.renderer.setPixelRatio(window.devicePixelRatio * 0.8);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFShadowMap;
                break;
            case 'high':
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
            case 'ultra':
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.VSMShadowMap;
                break;
        }
    }

    updateSun(targetPos) {
        if (this.sun) {
            this.sun.position.set(targetPos.x + 30, targetPos.y + 60, targetPos.z + 30);
            this.sun.target.position.copy(targetPos);
            this.sun.target.updateMatrixWorld();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
