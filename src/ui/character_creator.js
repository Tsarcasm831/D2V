import * as THREE from 'three';
import { PlayerAnimator } from '../entities/player_animator.js';
import { PlayerDebug } from '../entities/player/PlayerDebug.js';
import { BODY_PRESETS } from '../data/constants.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class CharacterCreator {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.creator = document.getElementById('character-creator');
        this.previewContainer = document.getElementById('creator-preview');
        this.currentPreviewMesh = null;
        this.currentPreviewParts = null;
        this.currentPreviewModel = null;
        this.createPlayerMeshFn = null;
        this.attachUnderwearFn = null;
        this.gearFns = {};
        this.equipmentPreviewFns = null;
        this.previewRotation = 0;
        this.isDragging = false;
        this.previousMouseX = 0;
        this.animator = null;
        this.previewZoomDelta = 0;
        this.previewZoomMin = 1.5;
        this.previewZoomMax = 8.0;
        this.previewCameraMode = 'character';
        this.previewCameraTarget = new THREE.Vector3(0, 1.0, 0);
        this.baseCameraDistance = 0;
        this.isDebugHitbox = false;
        this.equippedWeapon = null;
        this.activeTab = 'body';
        this.selectedEquipmentItem = 'Axe';
        this.equipmentItems = [];
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

        // Hair defaults (no UI yet)
        const fallbackPreset = BODY_PRESETS.average || {};
        this.hairStyle = fallbackPreset.hairStyle || 'crew';
        this.hairColor = fallbackPreset.hairColor || '#3e2723';

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
        this.baseCameraDistance = this.previewCamera.position.distanceTo(this.previewCameraTarget);
        this.previewCameraDefaults = {
            position: this.previewCamera.position.clone(),
            target: new THREE.Vector3(0, 1.0, 0)
        };
        this.previewCameraEquipment = {
            position: new THREE.Vector3(0, 0.9, 3.2),
            target: new THREE.Vector3(0, 0.2, 0)
        };

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
            { attachUnderwear },
            gear,
            { createAxe },
            { createSword },
            { createPickaxe },
            { createClub },
            { createBow },
            { createDagger },
            { createKunai }
        ] = await Promise.all([
            import('../entities/player_mesh.js'),
            import('../items/underwear.js'),
            import('../items/gear.js'),
            import('../items/axe.js'),
            import('../items/sword.js'),
            import('../items/pickaxe.js'),
            import('../items/club.js'),
            import('../items/bow.js'),
            import('../items/dagger.js'),
            import('../items/kunai.js')
        ]);

        this.createPlayerMeshFn = createPlayerMesh;
        this.attachUnderwearFn = attachUnderwear;
        this.gearFns = gear;
        this.equipmentPreviewFns = {
            Axe: createAxe,
            Sword: createSword,
            Pickaxe: createPickaxe,
            Club: createClub,
            Bow: createBow,
            Dagger: createDagger,
            Kunai: createKunai
        };
        this.updatePreview();
    }

    setupEventListeners() {
        // Input changes with number display updates
        const inputs = [
            'body-type', 'player-name', 'skin-color', 'torso-color-enabled', 'torso-color', 'eye-color', 'shirt-color', 'shirt-pattern', 
            'head-scale', 'torso-width', 'torso-height', 'arm-scale', 'leg-scale',
            'neck-thickness', 'neck-height', 'neck-rotation', 'neck-tilt',
            'chin-size', 'chin-length', 'chin-height', 'chin-forward',
            'maxilla-scale-x', 'upper-lip-width', 'nose-forward',
            'show-brain', 'brain-size',
            'iris-scale', 'pupil-scale',
            'foot-width', 'foot-length', 'heel-scale', 'heel-height', 'toe-spread', 'butt-scale',
            'butt-pos-x', 'butt-pos-y', 'butt-pos-z',
            'cloak-cape-x', 'cloak-cape-y', 'cloak-cape-z',
            'cloak-yoke-x', 'cloak-yoke-y', 'cloak-yoke-z',
            'cloak-collar-x', 'cloak-collar-y', 'cloak-collar-z',
            'cloak-clasp-x', 'cloak-clasp-y', 'cloak-clasp-z',
            'toggle-underwear'
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
                if (element.id === 'torso-color-enabled') {
                    const torsoColorInput = document.getElementById('torso-color');
                    if (torsoColorInput) {
                        torsoColorInput.disabled = !element.checked;
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

        const torsoColorToggle = document.getElementById('torso-color-enabled');
        const torsoColorInput = document.getElementById('torso-color');
        if (torsoColorToggle && torsoColorInput) {
            torsoColorInput.disabled = !torsoColorToggle.checked;
        }

        // Rotation
        this.previewContainer.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMouseX = e.clientX;
        });

        // Zoom (scroll wheel)
        this.previewContainer.addEventListener('wheel', (e) => {
            if (this.creator.style.display === 'none') return;
            if (!this.previewCameraTarget) return;
            e.preventDefault();
            const zoomStep = 0.4;
            this.previewZoomDelta += e.deltaY > 0 ? zoomStep : -zoomStep;
            const minDelta = this.previewZoomMin - this.baseCameraDistance;
            const maxDelta = this.previewZoomMax - this.baseCameraDistance;
            this.previewZoomDelta = Math.max(minDelta, Math.min(maxDelta, this.previewZoomDelta));
            this.applyPreviewZoom();
        }, { passive: false });

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

        window.addEventListener('keydown', (e) => {
            if (this.creator.style.display === 'none') return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            if (e.key.toLowerCase() === 'g') {
                this.isDebugHitbox = !this.isDebugHitbox;
                this.updatePreviewDebug();
            }
        });

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
                this.activeTab = target;
                this.updateAnimControlsVisibility();
                this.updatePreview();
            });
        });

        // Dropdowns (start hidden)
        const dropdowns = document.querySelectorAll('.creator-section.dropdown');
        dropdowns.forEach(section => {
            const content = section.querySelector('.dropdown-content');
            const header = section.querySelector('.dropdown-header');
            if (!content || !header) return;

            content.style.display = 'none';
            header.addEventListener('click', () => {
                const isOpen = content.style.display === 'block';
                content.style.display = isOpen ? 'none' : 'block';
                const caret = section.querySelector('.dropdown-caret');
                if (caret) {
                    caret.textContent = isOpen ? '▼' : '▲';
                }
            });
        });

        // Gear
        const gearItems = ['gear-shirt', 'gear-shorts', 'gear-vest', 'gear-leather-armor', 'gear-headband', 'gear-leather-gloves', 'gear-leather-hunters-cap', 'gear-assassins-cap', 'gear-leather-boots', 'gear-cloak', 'gear-blue-pants'];
        gearItems.forEach(id => {
            const itemName = id.replace('gear-', '');
            const element = document.getElementById(id);
            if (!element) return;
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
                if (itemName === 'cloak') {
                    this.updateCloakControlsVisibility();
                }
                this.updatePreview();
            });
        });

        const gearItemsOld = ['vest', 'leather-armor', 'headband', 'leather-gloves', 'leather-hunters-cap', 'assassins-cap', 'leather-boots', 'cloak', 'blue-pants'];
        gearItemsOld.forEach(item => {
            const isEnabled = localStorage.getItem(`admin_${item}`) === 'true';
            if (isEnabled) {
                if (this.gearFns[`attach${item.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`]) {
                    // This section might be redundant now that updateShirt/updatePants handle it
                }
            }
        });

        // Equipment previews
        this.equipmentItems = Array.from(document.querySelectorAll('.equipment-grid .gear-item'));
        this.equipmentItems.forEach(item => {
            const itemName = item.dataset.item;
            if (!itemName) return;
            item.addEventListener('click', () => {
                this.setEquipmentSelection(itemName);
                if (this.activeTab === 'equipment') {
                    this.updatePreview();
                }
            });
        });
        if (this.equipmentItems.length) {
            this.setEquipmentSelection(this.selectedEquipmentItem);
        }

        // Animation buttons
        const setAnimToggleState = (btn, isActive) => {
            if (!btn) return;
            btn.classList.toggle('active', !!isActive);
        };

        const animButtons = [
            { 
                id: 'btn-anim-walk',
                isToggle: true,
                action: (btn) => {
                    this.animationState.isMoving = !this.animationState.isMoving;
                    setAnimToggleState(btn, this.animationState.isMoving);
                }
            },
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
                    cfg.action(btn);
                });
                if (cfg.isToggle) {
                    if (cfg.id === 'btn-anim-walk') {
                        setAnimToggleState(btn, this.animationState.isMoving);
                    }
                }
            }
        });

        const weaponSelect = document.getElementById('equip-weapon-select');
        if (weaponSelect) {
            weaponSelect.addEventListener('change', () => {
                const selection = weaponSelect.value;
                this.equippedWeapon = selection ? selection : null;
                this.updatePreview();
            });
        }

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

        this.updateCloakControlsVisibility();
        this.updateAnimControlsVisibility();
    }

    updateAnimControlsVisibility() {
        const controls = document.querySelector('.anim-controls');
        if (!controls) return;
        const animButtons = controls.querySelectorAll('.anim-btn');
        const shouldHide = this.activeTab === 'equipment';
        animButtons.forEach(btn => {
            btn.style.display = shouldHide ? 'none' : '';
        });
    }

    updateCloakControlsVisibility() {
        const section = document.getElementById('cloak-position-section');
        if (!section) return;
        const enabled = localStorage.getItem('admin_cloak') === 'true';
        section.style.display = enabled ? 'block' : 'none';
    }

    setEquipmentSelection(itemName) {
        this.selectedEquipmentItem = itemName;
        this.equipmentItems.forEach(item => {
            item.classList.toggle('active', item.dataset.item === itemName);
        });
    }

    setPreviewCamera(mode) {
        const preset = mode === 'equipment' ? this.previewCameraEquipment : this.previewCameraDefaults;
        if (!preset) return;
        this.previewCameraMode = mode;
        this.previewCameraTarget = preset.target.clone();
        this.baseCameraDistance = preset.position.distanceTo(this.previewCameraTarget);
        this.previewCamera.position.copy(preset.position);
        this.previewCamera.lookAt(preset.target);
        this.applyPreviewZoom();
    }

    applyPreviewZoom() {
        if (!this.previewCameraTarget) return;
        const dir = new THREE.Vector3().subVectors(this.previewCamera.position, this.previewCameraTarget).normalize();
        let distance = this.baseCameraDistance + this.previewZoomDelta;
        distance = Math.max(this.previewZoomMin, Math.min(this.previewZoomMax, distance));
        this.previewCamera.position.copy(dir.multiplyScalar(distance).add(this.previewCameraTarget));
        this.previewCamera.lookAt(this.previewCameraTarget);
    }

    replacePreviewMesh(mesh, parts = null, model = null) {
        if (this.currentPreviewMesh) {
            this.previewRotation = this.currentPreviewMesh.rotation.y;
            this.previewScene.remove(this.currentPreviewMesh);
        }

        this.currentPreviewMesh = mesh;
        this.currentPreviewParts = parts;
        this.currentPreviewModel = model;
        this.currentPreviewMesh.rotation.y = this.previewRotation;
        this.previewScene.add(this.currentPreviewMesh);
    }

    updateEquipmentPreview() {
        if (!this.equipmentPreviewFns) return;

        const itemName = this.selectedEquipmentItem || 'Axe';
        const createFn = this.equipmentPreviewFns[itemName];
        if (!createFn) return;

        this.setPreviewCamera('equipment');
        const mesh = createFn();
        this.prepareEquipmentPreview(mesh);
        this.replacePreviewMesh(mesh);
        this.currentPreviewParts = null;
        this.currentPreviewModel = null;
        this.animator = null;
    }

    prepareEquipmentPreview(mesh) {
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        mesh.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scale = 1.6 / maxDim;
            mesh.scale.setScalar(scale);
        }

        mesh.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.y -= scaledBox.min.y + 0.05;
        mesh.position.y -= 0.2;
    }

    attachEquipmentToHand(itemName, parts, model) {
        const createFn = this.equipmentPreviewFns?.[itemName];
        if (!createFn || !parts?.rightHandMount) return;

        if (model?.equippedMeshes?.heldItem) {
            parts.rightHandMount.remove(model.equippedMeshes.heldItem);
            model.equippedMeshes.heldItem = null;
        }

        const heldGroup = new THREE.Group();
        heldGroup.rotation.set(Math.PI, 0, 0);

        const mesh = createFn();
        const gripConfigs = {
            Axe: { baseHandleLength: 0.9, targetHandleLength: 0.65, gripOffset: 0.15 },
            Sword: { baseHandleLength: 0.25, targetHandleLength: 0.3, gripOffset: 0.05 },
            Pickaxe: { baseHandleLength: 0.9, targetHandleLength: 0.65, gripOffset: 0.15 },
            Club: { baseHandleLength: 0.4, targetHandleLength: 0.45, gripOffset: 0.1 },
            Dagger: { baseHandleLength: 0.15, targetHandleLength: 0.22, gripOffset: 0.04 },
            Kunai: { baseHandleLength: 0.15, targetHandleLength: 0.22, gripOffset: 0.04 },
            Bow: { scale: 0.9, position: { x: 0.08, y: 0.02, z: 0.02 }, preserveRotation: true }
        };
        const config = gripConfigs[itemName] || {};

        if (config.baseHandleLength) {
            const baseHandleLength = config.baseHandleLength * SCALE_FACTOR;
            const targetHandleLength = config.targetHandleLength || config.baseHandleLength;
            const scale = targetHandleLength / baseHandleLength;
            const gripOffset = config.gripOffset ?? 0.1;

            mesh.scale.setScalar(scale);
            mesh.rotation.z = -Math.PI / 2;
            mesh.rotateY(-Math.PI / 2);
            mesh.position.x = gripOffset - (baseHandleLength * 0.5 * scale);
        } else {
            if (!config.preserveRotation) {
                mesh.rotation.z = -Math.PI / 2;
                mesh.rotateY(-Math.PI / 2);
            }
            if (config.scale) {
                mesh.scale.setScalar(config.scale);
            }
        }

        if (config.position) {
            mesh.position.x += config.position.x || 0;
            mesh.position.y += config.position.y || 0;
            mesh.position.z += config.position.z || 0;
        }

        mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });

        heldGroup.add(mesh);
        parts.rightHandMount.add(heldGroup);

        if (model?.equippedMeshes) {
            model.equippedMeshes.heldItem = heldGroup;
        }
    }

    getCharacterData() {
        const getRangeValue = (id) => {
            const element = document.getElementById(id);
            return element ? parseFloat(element.value) : 0;
        };

        return {
            bodyType: document.getElementById('body-type').value,
            name: document.getElementById('player-name').value || 'Traveler',
            skinColor: document.getElementById('skin-color').value,
            torsoColor: document.getElementById('torso-color-enabled').checked
                ? document.getElementById('torso-color').value
                : null,
            eyeColor: document.getElementById('eye-color').value,
            hairStyle: this.hairStyle,
            hairColor: this.hairColor,
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
            maxillaScaleX: parseFloat(document.getElementById('maxilla-scale-x').value),
            upperLipWidth: parseFloat(document.getElementById('upper-lip-width').value),
            noseForward: parseFloat(document.getElementById('nose-forward').value),
            showBrain: document.getElementById('show-brain').checked,
            brainSize: parseFloat(document.getElementById('brain-size').value),
            footWidth: parseFloat(document.getElementById('foot-width').value),
            footLength: parseFloat(document.getElementById('foot-length').value),
            heelScale: parseFloat(document.getElementById('heel-scale').value),
            heelHeight: parseFloat(document.getElementById('heel-height').value),
            toeSpread: parseFloat(document.getElementById('toe-spread').value),
            buttScale: parseFloat(document.getElementById('butt-scale').value),
            buttPosX: parseFloat(document.getElementById('butt-pos-x').value),
            buttPosY: parseFloat(document.getElementById('butt-pos-y').value),
            buttPosZ: parseFloat(document.getElementById('butt-pos-z').value),
            outfit: document.getElementById('body-type').value === 'female' ? 'naked' : 'nude', // Default based on body type
            equipment: {
                shirt: localStorage.getItem('admin_shirt') === 'true',
                pants: localStorage.getItem('admin_blue-pants') === 'true',
                helm: localStorage.getItem('admin_headband') === 'true' || localStorage.getItem('admin_assassins-cap') === 'true' || localStorage.getItem('admin_leather-hunters-cap') === 'true',
                shoulders: localStorage.getItem('admin_leather-armor') === 'true',
                shield: localStorage.getItem('admin_shield') === 'true'
            },
            toggleUnderwear: document.getElementById('toggle-underwear').checked,
            cloakOffsets: {
                cape: {
                    x: getRangeValue('cloak-cape-x'),
                    y: getRangeValue('cloak-cape-y'),
                    z: getRangeValue('cloak-cape-z')
                },
                yoke: {
                    x: getRangeValue('cloak-yoke-x'),
                    y: getRangeValue('cloak-yoke-y'),
                    z: getRangeValue('cloak-yoke-z')
                },
                collar: {
                    x: getRangeValue('cloak-collar-x'),
                    y: getRangeValue('cloak-collar-y'),
                    z: getRangeValue('cloak-collar-z')
                },
                clasp: {
                    x: getRangeValue('cloak-clasp-x'),
                    y: getRangeValue('cloak-clasp-y'),
                    z: getRangeValue('cloak-clasp-z')
                }
            },
            gear: {
                vest: localStorage.getItem('admin_vest') === 'true',
                leatherArmor: localStorage.getItem('admin_leather-armor') === 'true',
                headband: localStorage.getItem('admin_headband') === 'true',
                leatherGloves: localStorage.getItem('admin_leather-gloves') === 'true',
                leatherHuntersCap: localStorage.getItem('admin_leather-hunters-cap') === 'true',
                assassinsCap: localStorage.getItem('admin_assassins-cap') === 'true',
                leatherBoots: localStorage.getItem('admin_leather-boots') === 'true',
                cloak: localStorage.getItem('admin_cloak') === 'true',
                pants: localStorage.getItem('admin_blue-pants') === 'true'
            }
        };
    }

    updatePreview() {
        if (this.activeTab === 'equipment') {
            this.updateEquipmentPreview();
            return;
        }
        if (!this.createPlayerMeshFn) return;
        
        this.setPreviewCamera('character');
        const charData = this.getCharacterData();
        const previewConfig = {
            ...charData,
            selectedItem: this.equippedWeapon || null
        };
        const { mesh, parts, model } = this.createPlayerMeshFn(previewConfig);
        if (this.equippedWeapon) {
            this.attachEquipmentToHand(this.equippedWeapon, parts, model);
        }

        this.replacePreviewMesh(mesh, parts, model);
        this.currentPreviewMesh.position.y = 0;

        // Force a sync to apply all procedural scaling
        if (model && model.sync) {
            model.sync(previewConfig);
        }

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

        // Handle individual clothing toggles
        if (this.attachUnderwearFn && charData.toggleUnderwear) {
            this.attachUnderwearFn(parts);
        }

        const gearItems = ['vest', 'leather-armor', 'headband', 'leather-gloves', 'leather-hunters-cap', 'assassins-cap', 'leather-boots', 'cloak', 'blue-pants'];
        gearItems.forEach(item => {
            const isEnabled = localStorage.getItem(`admin_${item}`) === 'true';
            if (isEnabled) {
                const camelName = item.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
                const fnName = `attach${camelName}`;
                if (this.gearFns[fnName]) {
                    if (item === 'cloak') {
                        this.gearFns[fnName](parts, charData.cloakOffsets);
                    } else {
                        this.gearFns[fnName](parts);
                    }
                }
            }
        });

        this.animator = new PlayerAnimator(parts, model);
        this.animator.setHolding(!!this.equippedWeapon);
        this.updatePreviewDebug();
    }

    updatePreviewDebug() {
        if (!this.currentPreviewMesh || !this.currentPreviewParts) return;
        const previewPlayer = {
            model: {
                group: this.currentPreviewMesh,
                parts: this.currentPreviewParts
            },
            scene: this.previewScene,
            isDebugHitbox: this.isDebugHitbox
        };
        PlayerDebug.updateHitboxVisuals(previewPlayer);
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

        if (this.isDebugHitbox) {
            this.updatePreviewDebug();
        }

        this.updateClothPreview(delta);
        this.previewRenderer.render(this.previewScene, this.previewCamera);
    }

    updateClothPreview(delta) {
        if (!this.currentPreviewMesh || !this.currentPreviewParts) return;

        this.currentPreviewMesh.updateMatrixWorld(true);

        const collisionSpheres = [];
        const addSphere = (obj, radius, yOffset = 0) => {
            if (!obj) return;
            const center = new THREE.Vector3();
            obj.getWorldPosition(center);
            center.y += yOffset;
            collisionSpheres.push({ center, radius });
        };
        const addSphereLocal = (obj, radius, offset) => {
            if (!obj) return;
            const center = offset.clone().applyMatrix4(obj.matrixWorld);
            collisionSpheres.push({ center, radius });
        };

        addSphere(this.currentPreviewParts.torso, 0.32 * SCALE_FACTOR);
        addSphere(this.currentPreviewParts.hips, 0.3 * SCALE_FACTOR);
        addSphere(this.currentPreviewParts.topCap, 0.26 * SCALE_FACTOR, 0.02 * SCALE_FACTOR);
        const upperArmOffset = new THREE.Vector3(0, -0.14 * SCALE_FACTOR, 0);
        const foreArmOffset = new THREE.Vector3(0, -0.12 * SCALE_FACTOR, 0);
        addSphereLocal(this.currentPreviewParts.rightArm, 0.13 * SCALE_FACTOR, upperArmOffset);
        addSphereLocal(this.currentPreviewParts.leftArm, 0.13 * SCALE_FACTOR, upperArmOffset);
        addSphereLocal(this.currentPreviewParts.rightForeArm, 0.11 * SCALE_FACTOR, foreArmOffset);
        addSphereLocal(this.currentPreviewParts.leftForeArm, 0.11 * SCALE_FACTOR, foreArmOffset);

        this.currentPreviewMesh.traverse(child => {
            if (child.userData && child.userData.clothSimulator) {
                child.userData.clothSimulator.update(delta, child.matrixWorld, collisionSpheres);
                child.userData.clothSimulator.updateMesh();
            }
        });
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
                break;
            case 'underwear':
                setValue('toggle-underwear', true);
                break;
            case 'casual':
                setValue('toggle-underwear', true);
                break;
            case 'full':
                setValue('toggle-underwear', true);
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
        setValue('butt-scale', preset.buttScale || 0.85);
        setValue('butt-pos-x', preset.buttPosX || 0.0);
        setValue('butt-pos-y', preset.buttPosY || 0.0);
        setValue('butt-pos-z', preset.buttPosZ || 0.0);
        
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
