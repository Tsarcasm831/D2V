import * as THREE from 'three';
import { PlayerAnimator } from '../entities/player_animator.js';
import { BODY_PRESETS } from '../data/constants.js';

export class CharacterCreator {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.creator = document.getElementById('character-creator');
        this.previewContainer = document.getElementById('creator-preview');
        this.currentPreviewMesh = null;
        this.createPlayerMeshFn = null;
        this.attachShortsFn = null;
        this.attachUnderwearFn = null;
        this.attachShirtFn = null;
        this.gearFns = {};
        this.previewRotation = 0;
        this.isDragging = false;
        this.previousMouseX = 0;
        this.animator = null;
        this.lastUpdateTime = performance.now();
        this.animationState = {
            isMoving: false,
            isRunning: false,
            isPickingUp: false,
            isDead: false,
            isJumping: false,
            jumpPhase: 'none',
            jumpTimer: 0,
            jumpVelocity: 0,
            isLedgeGrabbing: false,
            ledgeGrabTime: 0,
            recoverTimer: 0,
            isDragged: false,
            draggedPartName: 'hips',
            dragVelocity: new THREE.Vector3(),
            deathTime: 0,
            deathVariation: null
        };

        this.setupScene();
        this.setupEventListeners();
        this.loadModules();
    }

    setupScene() {
        const width = this.previewContainer.clientWidth || 400;
        const height = this.previewContainer.clientHeight || 400;

        this.previewScene = new THREE.Scene();
        this.previewScene.background = new THREE.Color(0x333333);

        this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.previewCamera.position.set(0, 1.5, 4.5);
        this.previewCamera.lookAt(0, 1.0, 0);

        this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.previewRenderer.setSize(width, height);
        this.previewRenderer.setPixelRatio(window.devicePixelRatio);
        this.previewRenderer.setClearColor(0x333333, 1);
        this.previewContainer.appendChild(this.previewRenderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.previewScene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(5, 5, 5);
        this.previewScene.add(sun);

        setTimeout(() => this.handleResize(), 100);
    }

    handleResize() {
        const newWidth = this.previewContainer.clientWidth;
        const newHeight = this.previewContainer.clientHeight;
        this.previewRenderer.setSize(newWidth, newHeight);
        this.previewCamera.aspect = newWidth / newHeight;
        this.previewCamera.updateProjectionMatrix();
    }

    async loadModules() {
        const [
            { createPlayerMesh },
            { attachShorts },
            { attachUnderwear },
            { attachShirt },
            gear
        ] = await Promise.all([
            import('../entities/player_mesh.js'),
            import('../items/shorts.js'),
            import('../items/underwear.js'),
            import('../items/shirt.js'),
            import('../items/gear.js')
        ]);

        this.createPlayerMeshFn = createPlayerMesh;
        this.attachShortsFn = attachShorts;
        this.attachUnderwearFn = attachUnderwear;
        this.attachShirtFn = attachShirt;
        this.gearFns = gear;
        this.updatePreview();
    }

    setupEventListeners() {
        // Input changes with number display updates
        const inputs = [
            'body-type', 'player-name', 'skin-color', 'eye-color', 'shirt-color', 'shirt-pattern', 
            'head-scale', 'torso-width', 'torso-height', 'arm-scale', 'leg-scale',
            'neck-thickness', 'neck-height', 'neck-rotation', 'neck-tilt',
            'chin-size', 'chin-length', 'chin-height', 'chin-forward', 'iris-scale', 'pupil-scale',
            'foot-width', 'foot-length', 'heel-scale', 'heel-height', 'toe-spread', 'butt-scale',
            'toggle-underwear', 'toggle-shirt', 'toggle-shorts'
        ];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            const valueElement = document.getElementById(`${id}-value`);
            const eventType = (element.type === 'color' || element.tagName === 'SELECT') ? 'change' : 'input';
            
            const updateValue = () => {
                // Update number display if it exists
                if (valueElement) {
                    let value = element.value;
                    if (element.type === 'range') {
                        value = parseFloat(value);
                        // Format to 2 decimal places for precision
                        valueElement.textContent = value.toFixed(2);
                    }
                }
                this.updatePreview();
            };
            
            element.addEventListener(eventType, updateValue);
            if (eventType === 'change') {
                element.addEventListener('input', updateValue);
            }
            
            // Initialize number display
            if (valueElement && element.type === 'range') {
                valueElement.textContent = parseFloat(element.value).toFixed(2);
            }
        });

        // Rotation
        this.previewContainer.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMouseX = e.clientX;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !this.currentPreviewMesh) return;
            const deltaX = e.clientX - this.previousMouseX;
            this.currentPreviewMesh.rotation.y += deltaX * 0.01;
            this.previousMouseX = e.clientX;
            this.previewRotation = this.currentPreviewMesh.rotation.y;
        });

        window.addEventListener('mouseup', () => this.isDragging = false);

        // Touch support
        this.previewContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this.isDragging = true;
                this.previousMouseX = e.touches[0].clientX;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging || !this.currentPreviewMesh || e.touches.length === 0) return;
            const deltaX = e.touches[0].clientX - this.previousMouseX;
            this.currentPreviewMesh.rotation.y += deltaX * 0.01;
            this.previousMouseX = e.touches[0].clientX;
            this.previewRotation = this.currentPreviewMesh.rotation.y;
        }, { passive: true });

        window.addEventListener('touchend', () => this.isDragging = false, { passive: true });

        // Tabs
        const tabs = document.querySelectorAll('.creator-tab');
        const contents = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${target}-tab`).classList.add('active');
            });
        });

        // Gear
        const gearItems = ['gear-shirt', 'gear-shorts', 'gear-vest', 'gear-leather-armor', 'gear-headband', 'gear-leather-gloves', 'gear-leather-hunters-cap', 'gear-assassins-cap', 'gear-leather-boots', 'gear-cloak', 'gear-pants'];
        gearItems.forEach(id => {
            const itemName = id.replace('gear-', '');
            const element = document.getElementById(id);
            const isEnabled = localStorage.getItem(`admin_${itemName}`) === 'true';
            if (isEnabled) {
                element.style.background = 'rgba(0, 170, 255, 0.2)';
                element.style.borderColor = 'rgba(0, 170, 255, 0.5)';
            }

            element.addEventListener('click', () => {
                const current = localStorage.getItem(`admin_${itemName}`) === 'true';
                localStorage.setItem(`admin_${itemName}`, !current);
                if (!current) {
                    element.style.background = 'rgba(0, 170, 255, 0.2)';
                    element.style.borderColor = 'rgba(0, 170, 255, 0.5)';
                } else {
                    element.style.background = 'rgba(255, 255, 255, 0.03)';
                    element.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
                this.updatePreview();
            });
        });

        // Animation buttons
        const animButtons = [
            { id: 'btn-anim-walk', action: () => { this.animationState.isMoving = !this.animationState.isMoving; } },
            { id: 'btn-anim-punch', action: () => { if (this.animator) this.animator.playPunch(); } },
            { id: 'btn-anim-axe', action: () => { if (this.animator) this.animator.playAxeSwing(); } },
            { id: 'btn-anim-jump', action: () => { 
                this.animationState.isJumping = true;
                this.animationState.jumpTimer = 0.2; // Trigger air state
                this.animationState.jumpVelocity = 5;
                setTimeout(() => {
                    this.animationState.isJumping = false;
                    this.animationState.jumpTimer = 0;
                }, 1000);
            } }
        ];

        animButtons.forEach(cfg => {
            const btn = document.getElementById(cfg.id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    cfg.action();
                });
            }
        });

        // Start Journey
        document.getElementById('start-journey').onclick = () => {
            const charData = this.getCharacterData();
            localStorage.setItem('character_config', JSON.stringify(charData));
            this.creator.style.display = 'none';
            if (this.onComplete) this.onComplete(charData);
        };

        // Body preset buttons
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const presetName = btn.getAttribute('data-preset');
                this.applyBodyPreset(presetName);
            });
        });

        // Outfit preset buttons
        const outfitPresetButtons = document.querySelectorAll('.outfit-preset-btn');
        outfitPresetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const presetName = btn.getAttribute('data-outfit');
                this.applyOutfitPreset(presetName);
            });
        });
    }

    getCharacterData() {
        return {
            bodyType: document.getElementById('body-type').value,
            name: document.getElementById('player-name').value || 'Traveler',
            skinColor: document.getElementById('skin-color').value,
            eyeColor: document.getElementById('eye-color').value,
            shirtColor: document.getElementById('shirt-color').value,
            shirtPattern: document.getElementById('shirt-pattern').value,
            headScale: parseFloat(document.getElementById('head-scale').value),
            torsoWidth: parseFloat(document.getElementById('torso-width').value),
            torsoHeight: parseFloat(document.getElementById('torso-height').value),
            armScale: parseFloat(document.getElementById('arm-scale').value),
            legScale: parseFloat(document.getElementById('leg-scale').value),
            neckThickness: parseFloat(document.getElementById('neck-thickness').value),
            neckHeight: parseFloat(document.getElementById('neck-height').value),
            neckRotation: parseFloat(document.getElementById('neck-rotation').value),
            neckTilt: parseFloat(document.getElementById('neck-tilt').value),
            chinSize: parseFloat(document.getElementById('chin-size').value),
            chinLength: parseFloat(document.getElementById('chin-length').value),
            chinHeight: parseFloat(document.getElementById('chin-height').value),
            chinForward: parseFloat(document.getElementById('chin-forward').value),
            irisScale: parseFloat(document.getElementById('iris-scale').value),
            pupilScale: parseFloat(document.getElementById('pupil-scale').value),
            footWidth: parseFloat(document.getElementById('foot-width').value),
            footLength: parseFloat(document.getElementById('foot-length').value),
            heelScale: parseFloat(document.getElementById('heel-scale').value),
            heelHeight: parseFloat(document.getElementById('heel-height').value),
            toeSpread: parseFloat(document.getElementById('toe-spread').value),
            buttScale: parseFloat(document.getElementById('butt-scale').value),
            outfit: 'nude',
            toggleUnderwear: document.getElementById('toggle-underwear').checked,
            toggleShirt: document.getElementById('toggle-shirt').checked,
            toggleShorts: document.getElementById('toggle-shorts').checked,
            gear: {
                vest: localStorage.getItem('admin_vest') === 'true',
                leatherArmor: localStorage.getItem('admin_leather-armor') === 'true',
                headband: localStorage.getItem('admin_headband') === 'true',
                leatherGloves: localStorage.getItem('admin_leather-gloves') === 'true',
                leatherHuntersCap: localStorage.getItem('admin_leather-hunters-cap') === 'true',
                assassinsCap: localStorage.getItem('admin_assassins-cap') === 'true',
                leatherBoots: localStorage.getItem('admin_leather-boots') === 'true',
                cloak: localStorage.getItem('admin_cloak') === 'true',
                pants: localStorage.getItem('admin_pants') === 'true'
            }
        };
    }

    updatePreview() {
        if (!this.createPlayerMeshFn) return;
        
        const charData = this.getCharacterData();
        const { mesh, parts } = this.createPlayerMeshFn(charData);

        if (this.currentPreviewMesh) {
            this.previewRotation = this.currentPreviewMesh.rotation.y;
            this.previewScene.remove(this.currentPreviewMesh);
        }

        this.currentPreviewMesh = mesh;
        this.currentPreviewMesh.position.y = 0;
        this.currentPreviewMesh.rotation.y = this.previewRotation;

        // Apply outfit materials directly if needed, or rely on createPlayerMesh initialization
        if (charData.outfit !== 'naked' && parts.materials) {
            const mats = parts.materials;
            let shirtColor = 0x888888;
            let pantsColor = 0x444444;
            let bootsColor = 0x222222;

            switch (charData.outfit) {
                case 'peasant':
                    shirtColor = 0x8d6e63;
                    pantsColor = 0x5d4037;
                    bootsColor = 0x3e2723;
                    break;
                case 'warrior':
                    shirtColor = 0x607d8b;
                    pantsColor = 0x37474f;
                    bootsColor = 0x263238;
                    break;
                case 'noble':
                    shirtColor = 0x3f51b5;
                    pantsColor = 0x1a237e;
                    bootsColor = 0x111111;
                    break;
            }
            if (mats.shirt) mats.shirt.color.setHex(shirtColor);
            if (mats.pants) mats.pants.color.setHex(pantsColor);
            if (mats.boots) mats.boots.color.setHex(bootsColor);
        }

        // Existing item attachment logic (shorts/shirt/gear)
        const gearShirtEnabled = localStorage.getItem('admin_shirt') === 'true';
        const gearShortsEnabled = localStorage.getItem('admin_shorts') === 'true';
        const showShirt = charData.toggleShirt || gearShirtEnabled;
        const showShorts = charData.toggleShorts || gearShortsEnabled;

        // Handle individual clothing toggles
        if (this.attachUnderwearFn && charData.toggleUnderwear) {
            this.attachUnderwearFn(parts);
        }
        if (this.attachShortsFn && showShorts) {
            this.attachShortsFn(parts, charData);
        }
        if (this.attachShirtFn && showShirt) {
            this.attachShirtFn(parts, charData);
        }

        const gearItems = ['vest', 'leather-armor', 'headband', 'leather-gloves', 'leather-hunters-cap', 'assassins-cap', 'leather-boots', 'cloak', 'pants'];
        gearItems.forEach(item => {
            const isEnabled = localStorage.getItem(`admin_${item}`) === 'true';
            if (isEnabled) {
                const camelName = item.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
                const fnName = `attach${camelName}`;
                if (this.gearFns[fnName]) this.gearFns[fnName](parts);
            }
        });

        this.previewScene.add(this.currentPreviewMesh);
        this.animator = new PlayerAnimator(parts);
    }

    show() {
        this.creator.style.display = 'flex';
        this.animate();
    }

    animate() {
        if (this.creator.style.display === 'none') {
            this.previewRenderer.dispose();
            return;
        }
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const delta = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        if (this.animator) {
            this.animator.animate(
                delta,
                this.animationState.isMoving,
                this.animationState.isRunning,
                this.animationState.isPickingUp,
                this.animationState.isDead,
                this.animationState.isJumping,
                this.animationState.jumpPhase,
                this.animationState.jumpTimer,
                this.animationState.jumpVelocity,
                this.animationState.isLedgeGrabbing,
                this.animationState.ledgeGrabTime,
                this.animationState.recoverTimer,
                this.animationState.isDragged,
                this.animationState.draggedPartName,
                this.animationState.dragVelocity,
                this.animationState.deathTime,
                this.animationState.deathVariation
            );
        }

        this.previewRenderer.render(this.previewScene, this.previewCamera);
    }

    applyOutfitPreset(presetName) {
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
                // Trigger input event to update preview
                element.dispatchEvent(new Event('input'));
            }
        };

        switch (presetName) {
            case 'nude':
                setValue('toggle-underwear', false);
                setValue('toggle-shirt', false);
                setValue('toggle-shorts', false);
                break;
            case 'underwear':
                setValue('toggle-underwear', true);
                setValue('toggle-shirt', false);
                setValue('toggle-shorts', false);
                break;
            case 'casual':
                setValue('toggle-underwear', true);
                setValue('toggle-shirt', true);
                setValue('toggle-shorts', true);
                break;
            case 'full':
                setValue('toggle-underwear', true);
                setValue('toggle-shirt', true);
                setValue('toggle-shorts', true);
                break;
        }
    }

    applyBodyPreset(presetName) {
        const preset = BODY_PRESETS[presetName];
        if (!preset) return;

        // Apply preset values to UI elements
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            const valueElement = document.getElementById(`${id}-value`);
            if (element) {
                element.value = value;
                // Update number display if it exists
                if (valueElement && element.type === 'range') {
                    valueElement.textContent = parseFloat(value).toFixed(2);
                }
                // Trigger input event to update preview
                element.dispatchEvent(new Event('input'));
            }
        };

        setValue('torso-width', preset.torsoWidth || 1.0);
        setValue('torso-height', preset.torsoHeight || 1.0);
        setValue('arm-scale', preset.armScale || 1.0);
        setValue('leg-scale', preset.legScale || 1.0);
        setValue('head-scale', preset.headScale || 1.0);
        setValue('foot-width', preset.footWidth || 1.0);
        setValue('neck-height', preset.neckHeight || 0.6);
        setValue('neck-thickness', preset.neckThickness || 1.0);
        setValue('neck-rotation', preset.neckRotation || 0.0);
        setValue('neck-tilt', preset.neckTilt || 0.0);
        setValue('chin-size', preset.chinSize || 0.7);
        setValue('chin-length', preset.chinLength || 1.0);
        setValue('chin-height', preset.chinHeight || -0.04);
        setValue('chin-forward', preset.chinForward || 0.03);
        setValue('iris-scale', preset.irisScale || 1.0);
        setValue('pupil-scale', preset.pupilScale || 1.0);
        setValue('foot-length', preset.footLength || 1.0);
        setValue('heel-scale', preset.heelScale || 1.218);
        setValue('heel-height', preset.heelHeight || 1.0);
        setValue('toe-spread', preset.toeSpread || 1.0);
        setValue('butt-scale', preset.buttScale || 1.0);
        
        // Apply colors if present
        if (preset.shirtColor) {
            setValue('shirt-color', preset.shirtColor);
        }
        if (preset.hairColor) {
            // Note: hair color would need to be added to the UI
            console.log('Hair color preset:', preset.hairColor);
        }
    }
}
