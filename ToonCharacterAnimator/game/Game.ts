
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Player } from './Player';
import { Environment } from './Environment';
import { InputManager } from './InputManager';
import { SoundManager } from './SoundManager';
import { ParticleManager } from './ParticleManager';
import { PlayerConfig, PlayerInput } from '../types';

export class Game {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private clock: THREE.Clock;
    
    private player: Player;
    private environment: Environment;
    private inputManager: InputManager;
    private soundManager: SoundManager;
    private particleManager: ParticleManager;

    private animationId: number = 0;
    private prevTargetPos = new THREE.Vector3();
    
    // 0 = Head, 1 = Torso, 2 = Feet
    private cameraFocusMode: number = 0;

    // Callbacks provided by React
    onInventoryUpdate?: (items: string[]) => void;
    onInteractionUpdate?: (text: string | null, progress: number | null) => void;

    constructor(container: HTMLElement, initialConfig: PlayerConfig, initialManualInput: Partial<PlayerInput>, initialInventory: string[]) {
        this.container = container;

        // Init Managers
        this.inputManager = new InputManager();
        this.inputManager.setManualInput(initialManualInput);
        this.soundManager = new SoundManager();

        // Setup Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f5ff);
        this.scene.fog = new THREE.Fog(0xf0f5ff, 10, 40);

        this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
        // Adjusted camera position to better frame the head view
        this.camera.position.set(0, 3.2, 5.0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        // Target head height approx 1.7m
        this.controls.target.set(0, 1.7, 0);
        this.controls.mouseButtons = {
            LEFT: undefined as any,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        this.prevTargetPos.copy(this.controls.target);

        // Lights
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 15, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.bias = -0.0001;
        const d = 25;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.scene.add(dirLight);

        // Build Environment
        this.environment = new Environment(this.scene);
        
        // Init Particles
        this.particleManager = new ParticleManager(this.scene);

        // Build Player
        this.player = new Player(this.scene);
        Object.assign(this.player.config, initialConfig);
        // Initialize inventory with passed data
        this.player.inventory = [...initialInventory];
        this.player.inventoryDirty = true; // Force callback sync

        this.clock = new THREE.Clock();

        // Bind Input Callbacks
        this.inputManager.onToggleHitbox = () => this.player.toggleHitbox();
        this.inputManager.onToggleCamera = () => this.toggleCameraFocus();
        this.inputManager.onToggleHands = () => this.player.toggleHandsDebug();
        
        this.animate = this.animate.bind(this);
    }

    start() {
        this.animate();
    }

    stop() {
        cancelAnimationFrame(this.animationId);
        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
        this.inputManager.dispose();
    }

    setManualInput(input: Partial<PlayerInput>) {
        this.inputManager.setManualInput(input);
    }

    setConfig(config: PlayerConfig) {
        Object.assign(this.player.config, config);
    }
    
    setSlotSelectCallback(cb: (index: number) => void) {
        this.inputManager.onSlotSelect = cb;
    }

    private toggleCameraFocus() {
        this.cameraFocusMode = (this.cameraFocusMode + 1) % 3;
    }

    resize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    private animate() {
        this.animationId = requestAnimationFrame(this.animate);
        const delta = Math.min(this.clock.getDelta(), 0.1);

        // Update Inputs
        const input = this.inputManager.getInput();

        // Camera Angle for Player Movement
        const cameraRotation = Math.atan2(
            this.camera.position.x - this.controls.target.x,
            this.camera.position.z - this.controls.target.z
        );

        // Update Systems
        this.environment.update(delta);
        this.particleManager.update(delta);
        this.player.update(delta, input, this.camera.position, cameraRotation, this.environment, this.particleManager);
        this.soundManager.update(this.player, delta);

        // Camera Follow Logic
        const targetPos = this.player.mesh.position.clone();
        
        // Determine offset based on mode (Head -> Torso -> Feet)
        let heightOffset = 1.7; // Head
        if (this.cameraFocusMode === 1) heightOffset = 1.0; // Torso
        if (this.cameraFocusMode === 2) heightOffset = 0.4; // Feet

        targetPos.y += heightOffset; 
        
        this.controls.target.lerp(targetPos, 0.1);
  
        const targetDelta = new THREE.Vector3().subVectors(this.controls.target, this.prevTargetPos);
        this.camera.position.add(targetDelta);
        this.prevTargetPos.copy(this.controls.target);
  
        this.controls.update();

        // UI Callbacks
        if (this.player.isSkinning) {
            this.onInteractionUpdate?.(null, this.player.skinningProgress);
        } else if (this.player.canSkin) {
            this.onInteractionUpdate?.('Press F to Skin', null);
        } else {
            this.onInteractionUpdate?.(null, null);
        }
  
        if (this.player.inventoryDirty) {
            this.onInventoryUpdate?.([...this.player.inventory]);
            this.player.inventoryDirty = false;
        }

        this.renderer.render(this.scene, this.camera);
    }
}
