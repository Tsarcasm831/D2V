export class PlayerInventory {
    constructor(player) { 
        this.player = player;
        this.hotbar = new Array(8).fill(null);
        this.storage = new Array(20).fill(null);
        this.selectedSlot = 0;
        
        // Default items
        this.hotbar[0] = { type: 'sword', name: 'Iron Sword', icon: 'sword_icon.png', count: 1 };
        this.hotbar[1] = { type: 'axe', name: 'Iron Axe', icon: 'axe_icon.png', count: 1 };
        this.hotbar[2] = { type: 'club', name: 'Wooden Club', icon: 'club_icon.png', count: 1 };
        this.hotbar[3] = { type: 'pickaxe', name: 'Iron Pickaxe', icon: 'pickaxe_icon.png', count: 1 };

        // Some sample inventory items
        this.storage[0] = { type: 'iron', name: 'Iron Ore', icon: 'pickaxe_icon.png', count: 1 }; 
        this.storage[1] = { type: 'wood', name: 'Wood Log', icon: 'wood_log_icon.png', count: 1 };

        this.equipment = {
            helmet: null,
            chest: { type: 'shirt', name: 'Nomad Tunic', icon: 'shirt_icon.png' },
            pants: null,
            shoes: null,
            mainhand: null,
            offhand: null
        };
    }

    selectSlot(index) {
        if (index >= 0 && index < 8) {
            this.selectedSlot = index;
            if (this.player.ui) this.player.ui.updateHotbar();
            if (this.player.updateHeldItem) this.player.updateHeldItem();
        }
    }

    pickup(item) { 
        console.log("Picked up", item);
        if (item.parent) item.parent.remove(item);
    }

    unequip(slotName) {
        const item = this.equipment[slotName];
        if (!item) return;

        // Try to put back in storage
        for (let i = 0; i < this.storage.length; i++) {
            if (this.storage[i] === null) {
                this.storage[i] = item;
                this.equipment[slotName] = null;
                if (this.player.ui) {
                    this.player.ui.renderEquipment();
                    this.player.ui.renderProfileGrid();
                    if (this.player.updateHeldItem) this.player.updateHeldItem();
                }
                return true;
            }
        }
        if (this.player.ui) this.player.ui.showStatus("Inventory Full!");
        return false;
    }

    equip(item, storageIndex) {
        let slotName = null;
        if (item.type === 'shirt') slotName = 'chest';
        if (['axe', 'club', 'pickaxe', 'sword'].includes(item.type)) slotName = 'mainhand';
        
        if (!slotName) {
            if (this.player.ui) this.player.ui.showStatus("Not equippable!");
            return false;
        }

        const currentEquipped = this.equipment[slotName];
        this.equipment[slotName] = item;
        this.storage[storageIndex] = currentEquipped;

        if (this.player.ui) {
            this.player.ui.renderEquipment();
            this.player.ui.renderProfileGrid();
            if (this.player.updateHeldItem) this.player.updateHeldItem();
        }
        return true;
    }

    addItem(item, preferredSlot = -1) {
        const stackLimit = item.stackLimit || 99;
        const countToAdd = item.count || 1;

        const findAndAdd = (arr) => {
            for (let i = 0; i < arr.length; i++) {
                const existing = arr[i];
                if (existing && existing.type === item.type && existing.count < stackLimit) {
                    const room = stackLimit - existing.count;
                    const canAdd = Math.min(room, countToAdd);
                    existing.count += canAdd;
                    // Logic for partial stacks if we ever added multiple at once could go here
                    return true;
                }
            }
            return false;
        };

        // 1. Try to stack in preferred slot
        if (preferredSlot !== -1) {
            const existing = this.hotbar[preferredSlot];
            if (existing && existing.type === item.type && existing.count < stackLimit) {
                existing.count += countToAdd;
                if (this.player.ui) this.player.ui.updateHotbar();
                return true;
            }
        }

        // 2. Try to stack in hotbar
        if (findAndAdd(this.hotbar)) {
            if (this.player.ui) this.player.ui.updateHotbar();
            return true;
        }

        // 3. Try to stack in storage
        if (findAndAdd(this.storage)) {
            if (this.player.ui && document.getElementById('inventory-container').style.display === 'flex') {
                this.player.ui.renderInventory();
            }
            return true;
        }

        // 4. Try empty preferred slot
        if (preferredSlot !== -1 && this.hotbar[preferredSlot] === null) {
            this.hotbar[preferredSlot] = { ...item, count: countToAdd };
            if (this.player.ui) this.player.ui.updateHotbar();
            return true;
        }

        // 5. Try empty hotbar slot
        for (let i = 0; i < this.hotbar.length; i++) {
            if (this.hotbar[i] === null) {
                this.hotbar[i] = { ...item, count: countToAdd };
                if (this.player.ui) this.player.ui.updateHotbar();
                return true;
            }
        }

        // 6. Try empty storage slot
        for (let i = 0; i < this.storage.length; i++) {
            if (this.storage[i] === null) {
                this.storage[i] = { ...item, count: countToAdd };
                if (this.player.ui && document.getElementById('inventory-container').style.display === 'flex') {
                    this.player.ui.renderInventory();
                }
                return true;
            }
        }

        return false;
    }
}

export class PlayerUI {
    constructor(player) { 
        this.player = player;
        this.hFill = document.getElementById('health-fill');
        this.sFill = document.getElementById('stamina-fill');
        this.cFill = document.getElementById('chakra-fill');
        this.xFill = document.getElementById('xp-fill');

        this.hudHpText = document.getElementById('hud-hp-text');
        this.hudStaminaText = document.getElementById('hud-stamina-text');
        this.hudChakraText = document.getElementById('hud-chakra-text');
        this.hudXpText = document.getElementById('hud-xp-text');

        this.hotbarSlots = document.querySelectorAll('#hotbar .hotbar-slot');
        this.inventoryContainer = document.getElementById('inventory-container');
        this.inventoryGrid = document.getElementById('inventory-grid');
        this.craftingList = document.getElementById('crafting-list');
        this.abilitySlots = {
            lmb: document.getElementById('slot-lmb'),
            r: document.getElementById('slot-r'),
            x: document.getElementById('slot-x'),
            c: document.getElementById('slot-c')
        };
        this.skillsContainer = document.getElementById('skills-container');
        this.statusEl = document.getElementById('status-message');
        this.statusTimeout = null;

        this.hotbarWrapper = document.getElementById('hotbar-wrapper');
        this.buildHotbarWrapper = document.getElementById('build-hotbar-wrapper');
        this.buildSlots = document.querySelectorAll('#build-hotbar .build-slot');

        const invToggle = document.getElementById('invulnerable-toggle');
        if (invToggle) {
            invToggle.addEventListener('change', (e) => {
                this.player.isInvulnerable = e.target.checked;
                this.showStatus(this.player.isInvulnerable ? "God Mode On" : "God Mode Off", !this.player.isInvulnerable);
            });
        }

        this.previewContainer = document.getElementById('player-preview-container');
        this.previewRenderer = null;
        this.previewScene = null;
        this.previewCamera = null;
        this.previewMesh = null;
        this.isPreviewDragging = false;
        this.lastPreviewX = 0;

        // Tab Switching
        this.tabs = document.querySelectorAll('.inventory-tab');
        this.panes = {
            items: document.getElementById('inventory-pane-items'),
            crafting: document.getElementById('inventory-pane-crafting')
        };

        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                this.switchTab(target);
            });
        });

        this.equipmentSlots = document.querySelectorAll('.equipment-slot');
        this.profileGearGrid = document.getElementById('profile-gear-grid');

        // Add click listeners to equipment slots for unequipping
        this.equipmentSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const slotName = slot.getAttribute('data-slot');
                this.player.inventory.unequip(slotName);
            });
        });

        // Add click listeners to hotbar slots for manual selection
        this.hotbarSlots.forEach((slot, i) => {
            slot.style.pointerEvents = 'auto'; 
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.player.inventory.selectSlot(i);
            });
        });

        this.buildSlots.forEach((slot, i) => {
            slot.style.pointerEvents = 'auto';
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.player.game && this.player.game.buildManager) this.player.game.buildManager.selectSlot(i);
            });
        });

        this.skillMenu = document.getElementById('skill-selection-menu');
        
        // Right-click on R slot
        if (this.abilitySlots.r) {
            this.abilitySlots.r.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showSkillMenu(e.clientX, e.clientY);
            });
        }

        // Skill menu item clicks
        if (this.skillMenu) {
            this.skillMenu.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const skillId = item.getAttribute('data-skill');
                    this.selectSkill(skillId);
                    this.skillMenu.style.display = 'none';
                });
            });

            // Close menu when clicking elsewhere
            window.addEventListener('mousedown', (e) => {
                if (!this.skillMenu.contains(e.target)) {
                    this.skillMenu.style.display = 'none';
                }
            });
        }

        this.updateHotbar();
    }

    showSkillMenu(x, y) {
        if (!this.skillMenu) return;
        this.skillMenu.style.display = 'flex';
        this.skillMenu.style.left = `${x}px`;
        this.skillMenu.style.top = `${y - this.skillMenu.offsetHeight - 10}px`;
    }

    selectSkill(skillId) {
        const skills = {
            fireball: { id: 'fireball', name: 'Fireball', icon: 'fireball.png', cost: 20 },
            icebolt: { id: 'icebolt', name: 'Icebolt', icon: 'icebolt.png', cost: 15 }
        };
        const skill = skills[skillId];
        if (skill) {
            this.player.selectedSkill = skill;
            this.updateHotbar();
            this.showStatus(`Selected ${skill.name}`, false);
        }
    }

    switchTab(tabName) {
        this.tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabName));
        Object.keys(this.panes).forEach(k => {
            if (this.panes[k]) this.panes[k].style.display = (k === tabName) ? 'flex' : 'none';
        });

        if (tabName === 'items') this.renderInventory();
        if (tabName === 'crafting') this.renderCrafting();
    }

    toggleInventory() {
        const isVisible = this.inventoryContainer.style.display === 'flex';
        this.inventoryContainer.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            // Default to items tab when opening
            this.switchTab('items');
            if (this.previewContainer) this.previewContainer.style.display = 'none';
            if (this.skillsContainer) this.skillsContainer.style.display = 'none';
        }
    }

    toggleSkills() {
        if (!this.skillsContainer) return;
        const isVisible = this.skillsContainer.style.display === 'flex';
        this.skillsContainer.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            if (this.inventoryContainer) this.inventoryContainer.style.display = 'none';
            if (this.previewContainer) this.previewContainer.style.display = 'none';
            this.renderSkills();
        }
    }

    renderSkills() {
        const grid = this.skillsContainer.querySelector('.skills-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const skills = [
            { id: 'fireball', name: 'Fireball', icon: 'fireball.png', cost: 20 },
            { id: 'icebolt', name: 'Icebolt', icon: 'icebolt.png', cost: 15 }
        ];

        skills.forEach(skill => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            if (this.player.selectedSkill && this.player.selectedSkill.id === skill.id) {
                card.classList.add('active');
                card.style.borderColor = '#00aaff';
                card.style.background = 'rgba(0, 170, 255, 0.1)';
            }

            card.innerHTML = `
                <img src="${skill.icon}" class="skill-icon" alt="${skill.name}">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-cost">${skill.cost} CHAKRA</div>
            `;

            card.addEventListener('click', () => {
                this.player.selectedSkill = skill;
                this.showStatus(`Selected ${skill.name}`, false);
                this.renderSkills();
                this.updateHotbar();
                // Optionally close modal after selection
                // this.toggleSkills();
            });

            grid.appendChild(card);
        });
    }

    togglePlayerPreview() {
        const isVisible = this.previewContainer.style.display === 'flex';
        this.previewContainer.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            this.inventoryContainer.style.display = 'none';
            this.initPreviewRenderer();
            this.updateStats();
            this.renderEquipment();
            this.renderProfileGrid();
        }
    }

    renderProfileGrid() {
        if (!this.profileGearGrid) return;
        this.profileGearGrid.innerHTML = '';
        
        const storage = this.player.inventory.storage;
        storage.forEach((item, i) => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.style.width = '100%';
            slot.style.height = 'auto';
            slot.style.aspectRatio = '1';
            
            if (item && item.icon) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.className = 'hotbar-icon';
                slot.appendChild(img);
                slot.title = `Equip ${item.name}`;
                slot.style.cursor = 'pointer';
                
                slot.addEventListener('click', () => {
                    this.player.inventory.equip(item, i);
                });

                if (item.count > 1) {
                    const countLabel = document.createElement('div');
                    countLabel.className = 'slot-count';
                    countLabel.textContent = item.count;
                    slot.appendChild(countLabel);
                }
            }
            
            this.profileGearGrid.appendChild(slot);
        });
    }

    renderEquipment() {
        const equipment = this.player.inventory.equipment;
        this.equipmentSlots.forEach(slot => {
            const slotName = slot.getAttribute('data-slot');
            const item = equipment[slotName];
            
            // Clear current icon
            const existingIcon = slot.querySelector('.hotbar-icon');
            if (existingIcon) existingIcon.remove();

            if (item && item.icon) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.className = 'hotbar-icon';
                slot.appendChild(img);
                slot.title = item.name;
            } else {
                slot.title = slot.getAttribute('data-label');
            }
        });
    }

    updateStats() {
        const elHp = document.getElementById('stat-hp');
        const elStamina = document.getElementById('stat-stamina');
        const elChakra = document.getElementById('stat-chakra');
        const elTier = document.getElementById('stat-tier');

        if (elHp) elHp.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;
        if (elStamina) elStamina.textContent = `${Math.ceil(this.player.stamina)}/${this.player.maxStamina}`;
        if (elChakra) elChakra.textContent = `${Math.ceil(this.player.chakra)}/${this.player.maxChakra}`;
        
        const tool = this.player.inventory.hotbar[this.player.inventory.selectedSlot];
        const tier = (tool && tool.tier) || 0;
        if (elTier) elTier.textContent = tier;
    }

    updatePreviewHeldItem() {
        if (!this.previewHeldItems) return;
        const slot = this.player.inventory.selectedSlot;
        const item = this.player.inventory.hotbar[slot];
        
        for (const [type, mesh] of Object.entries(this.previewHeldItems)) {
            mesh.visible = !!(item && item.type === type);
        }
    }

    initPreviewRenderer() {
        if (this.previewRenderer) return;

        import('three').then(THREE => {
            const container = document.getElementById('preview-canvas-container');
            const rect = container.getBoundingClientRect();

            this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.previewRenderer.setSize(rect.width, rect.height);
            this.previewRenderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(this.previewRenderer.domElement);

            this.previewScene = new THREE.Scene();
            this.previewCamera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
            this.previewCamera.position.set(0, 1.2, 3.5);
            this.previewCamera.lookAt(0, 1.1, 0);

            const ambient = new THREE.AmbientLight(0xffffff, 0.6);
            this.previewScene.add(ambient);
            const directional = new THREE.DirectionalLight(0xffffff, 1.0);
            directional.position.set(2, 2, 5);
            this.previewScene.add(directional);

            import('./player_mesh.js').then(({ createPlayerMesh }) => {
                const { mesh, parts } = createPlayerMesh();
                this.previewMesh = mesh;

                // Attach the base clothing and weapons to the preview character
                Promise.all([
                    import('./underwear.js'),
                    import('./shorts.js'),
                    import('./shirt.js'),
                    import('./axe.js'),
                    import('./club.js'),
                    import('./pickaxe.js'),
                    import('./world_bounds.js')
                ]).then(([underwear, shorts, shirt, axe, club, pick, bounds]) => {
                    underwear.attachUnderwear(parts);
                    shorts.attachShorts(parts);
                    shirt.attachShirt(parts);

                    const scale = bounds.SCALE_FACTOR;
                    const rightHand = new THREE.Group();
                    rightHand.position.set(0, -0.35 * scale, 0);
                    rightHand.rotation.x = Math.PI / 2;
                    parts.rightForeArm.add(rightHand);

                    this.previewHeldItems = {
                        axe: axe.createAxe(),
                        club: club.createClub(),
                        pickaxe: pick.createPickaxe()
                    };

                    Object.values(this.previewHeldItems).forEach(m => {
                        m.visible = false;
                        rightHand.add(m);
                    });
                    
                    this.updatePreviewHeldItem();
                });

                // Face the character slightly forward-right initially
                this.previewMesh.rotation.y = Math.PI * 0.15;
                this.previewScene.add(this.previewMesh);
                
                const animate = () => {
                    if (this.previewContainer.style.display === 'none') return;
                    requestAnimationFrame(animate);
                    this.previewRenderer.render(this.previewScene, this.previewCamera);
                };
                animate();
            });

            // Handle Preview Rotation
            container.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left click
                    this.isPreviewDragging = true;
                    this.lastPreviewX = e.clientX;
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (this.isPreviewDragging && this.previewMesh) {
                    const deltaX = e.clientX - this.lastPreviewX;
                    this.previewMesh.rotation.y += deltaX * 0.015;
                    this.lastPreviewX = e.clientX;
                }
            });

            window.addEventListener('mouseup', () => {
                this.isPreviewDragging = false;
            });
        });
    }

    renderInventory() {
        if (!this.inventoryGrid) return;
        this.inventoryGrid.innerHTML = '';
        
        const storage = this.player.inventory.storage;
        storage.forEach((item, i) => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            if (item && item.icon) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.className = 'hotbar-icon';
                slot.appendChild(img);
                slot.title = item.name;

                if (item.count > 1) {
                    const countLabel = document.createElement('div');
                    countLabel.className = 'slot-count';
                    countLabel.textContent = item.count;
                    slot.appendChild(countLabel);
                }
            }
            
            this.inventoryGrid.appendChild(slot);
        });
    }

    renderCrafting() {
        if (!this.craftingList) return;
        this.craftingList.innerHTML = '';

        const recipes = [
            { name: 'Wooden Wall', type: 'wall', icon: 'wall_icon.png', mats: [{ type: 'wood', count: 10 }] },
            { name: 'Wooden Floor', type: 'floor', icon: 'floor_icon.png', mats: [{ type: 'wood', count: 5 }] },
            { name: 'Firepit', type: 'firepit', icon: 'firepit_icon.png', mats: [{ type: 'wood', count: 5 }] },
            { name: 'Wooden Doorway', type: 'doorway', icon: 'doorway_icon.png', mats: [{ type: 'wood', count: 12 }] }
        ];

        recipes.forEach(recipe => {
            const div = document.createElement('div');
            div.className = 'crafting-recipe';

            const info = document.createElement('div');
            info.className = 'recipe-info';
            
            const icon = document.createElement('img');
            icon.src = recipe.icon;
            icon.className = 'recipe-icon';
            
            const details = document.createElement('div');
            details.className = 'recipe-details';
            
            const name = document.createElement('div');
            name.className = 'recipe-name';
            name.textContent = recipe.name;
            
            const mats = document.createElement('div');
            mats.className = 'recipe-mats';
            mats.textContent = recipe.mats.map(m => `${m.count}x ${m.type}`).join(', ');
            
            details.appendChild(name);
            details.appendChild(mats);
            info.appendChild(icon);
            info.appendChild(details);
            
            const btn = document.createElement('button');
            btn.className = 'craft-button';
            btn.textContent = 'CRAFT';
            
            // Logic to check if player has materials
            const hasMats = recipe.mats.every(mat => {
                let total = 0;
                [...this.player.inventory.hotbar, ...this.player.inventory.storage].forEach(item => {
                    if (item && item.type === mat.type) total += item.count;
                });
                return total >= mat.count;
            });

            btn.disabled = !hasMats;
            if (!hasMats) btn.title = "Insufficient Materials";

            btn.addEventListener('click', () => {
                // Consume materials
                recipe.mats.forEach(mat => {
                    let needed = mat.count;
                    // Check hotbar
                    for (let i = 0; i < this.player.inventory.hotbar.length; i++) {
                        const item = this.player.inventory.hotbar[i];
                        if (item && item.type === mat.type) {
                            const take = Math.min(item.count, needed);
                            item.count -= take;
                            needed -= take;
                            if (item.count <= 0) this.player.inventory.hotbar[i] = null;
                        }
                    }
                    // Check storage
                    for (let i = 0; i < this.player.inventory.storage.length; i++) {
                        const item = this.player.inventory.storage[i];
                        if (item && item.type === mat.type) {
                            const take = Math.min(item.count, needed);
                            item.count -= take;
                            needed -= take;
                            if (item.count <= 0) this.player.inventory.storage[i] = null;
                        }
                    }
                });

                // Add crafted item
                const newItem = { 
                    type: recipe.type, 
                    name: recipe.name, 
                    icon: recipe.icon, 
                    count: 1, 
                    stackLimit: 20 
                };
                this.player.inventory.addItem(newItem);
                
                this.player.ui.showStatus(`Crafted ${recipe.name}!`, false);
                this.renderCrafting(); 
                this.updateHotbar();
                this.renderInventory();
            });

            div.appendChild(info);
            div.appendChild(btn);
            this.craftingList.appendChild(div);
        });
    }

    toggleInfo() {}

    updateBuildHotbar(selectedIndex) {
        if (!this.buildSlots) return;
        this.buildSlots.forEach((slot, i) => {
            if (i === selectedIndex) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });
    }

    updateHotbar() {
        this.updatePreviewHeldItem();
        if (this.hotbarSlots) {
            const selected = this.player.inventory.selectedSlot;
            const inventory = this.player.inventory.hotbar;
            
            this.hotbarSlots.forEach((slot, i) => {
                // Handle active state
                if (i === selected) {
                    slot.classList.add('active');
                } else {
                    slot.classList.remove('active');
                }

                // Handle icon display
                const item = inventory[i];
                let iconImg = slot.querySelector('.hotbar-icon');
                
                if (item && item.icon) {
                    if (!iconImg) {
                        iconImg = document.createElement('img');
                        iconImg.className = 'hotbar-icon';
                        slot.appendChild(iconImg);
                    }
                    if (iconImg.src !== item.icon) {
                        iconImg.src = item.icon;
                    }
                } else if (iconImg) {
                    iconImg.remove();
                }

                // Handle count display
                let countLabel = slot.querySelector('.slot-count');
                if (item && item.count > 1) {
                    if (!countLabel) {
                        countLabel = document.createElement('div');
                        countLabel.className = 'slot-count';
                        slot.appendChild(countLabel);
                    }
                    countLabel.textContent = item.count;
                } else if (countLabel) {
                    countLabel.remove();
                }
            });
        }

        // Ability X highlights when in combat mode
        if (this.abilitySlots && this.abilitySlots.x) {
            if (this.player.isCombat) {
                this.abilitySlots.x.classList.add('active');
            } else {
                this.abilitySlots.x.classList.remove('active');
            }
        }

        // Update R slot with selected skill icon
        if (this.abilitySlots && this.abilitySlots.r) {
            const rSlot = this.abilitySlots.r;
            let iconImg = rSlot.querySelector('.hotbar-icon');
            if (this.player.selectedSkill) {
                if (!iconImg) {
                    iconImg = document.createElement('img');
                    iconImg.className = 'hotbar-icon';
                    rSlot.appendChild(iconImg);
                }
                iconImg.src = this.player.selectedSkill.icon;
            } else if (iconImg) {
                iconImg.remove();
            }
        }
    }

    updateHud() {
        if (this.hFill) {
            const hpPerc = (this.player.health / this.player.maxHealth) * 100;
            this.hFill.style.width = `${hpPerc}%`;
            this.hFill.parentElement.classList.toggle('low-hp', hpPerc < 25);
        }
        if (this.sFill) this.sFill.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
        if (this.cFill) this.cFill.style.width = `${(this.player.chakra / this.player.maxChakra) * 100}%`;
        if (this.xFill) this.xFill.style.width = `${(this.player.xp / this.player.xpToNextLevel) * 100}%`;

        if (this.hudHpText) this.hudHpText.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;
        if (this.hudStaminaText) this.hudStaminaText.textContent = `${Math.ceil(this.player.stamina)}/${this.player.maxStamina}`;
        if (this.hudChakraText) this.hudChakraText.textContent = `${Math.ceil(this.player.chakra)}/${this.player.maxChakra}`;
        if (this.hudXpText) {
            const xpPerc = Math.floor((this.player.xp / this.player.xpToNextLevel) * 100);
            this.hudXpText.textContent = `LV.${this.player.level} [${xpPerc}%]`;
        }
    }

    showStatus(text, isError = true) {
        if (!this.statusEl) return;
        clearTimeout(this.statusTimeout);
        
        this.statusEl.textContent = text;
        this.statusEl.style.color = isError ? '#ff4444' : '#44ff44';
        this.statusEl.style.opacity = '1';
        this.statusEl.style.transform = 'translate(-50%, -50%) scale(1.1)';

        if (isError) {
            import('./audio_manager.js').then(({ audioManager }) => {
                audioManager.play('error-bad', 0.4);
            });
        }
        
        this.statusTimeout = setTimeout(() => {
            this.statusEl.style.opacity = '0';
            this.statusEl.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 1500);
    }

    updateResourceCounts() {
        if (!this.player.worldManager) return;
        
        const counts = {
            tree: 0, berry_bush: 0, rock: 0, coal: 0, copper: 0, iron: 0, sulfur: 0, silver: 0, gold: 0,
            deer: 0, wolf: 0, bear: 0, humanoid: 0
        };

        const resources = this.player.worldManager.getNearbyResources();
        resources.forEach(res => {
            if (!res.isDead && counts.hasOwnProperty(res.type)) {
                counts[res.type]++;
            }
        });

        const npcs = this.player.worldManager.getNearbyNPCs();
        npcs.forEach(npc => {
            if (!npc.isDead && counts.hasOwnProperty(npc.type)) {
                counts[npc.type]++;
            }
        });

        const fauna = this.player.worldManager.getNearbyFauna();
        fauna.forEach(f => {
            if (!f.isDead && counts.hasOwnProperty(f.type)) {
                counts[f.type]++;
            }
        });

        // Update DOM
        for (const [key, count] of Object.entries(counts)) {
            const el = document.getElementById(`count-${key}`);
            if (el) el.textContent = count;
        }
    }
}

export class ChatUI {
    constructor(player) {
        this.player = player;
        this.container = document.getElementById('chat-container');
        this.messagesList = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.isOpen = false;
        this.hideTimeout = null;
        
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.send();
            }
            if (e.key === 'Escape') {
                this.close();
            }
        });

        // Initial show
        this.showTemporarily();
    }

    showTemporarily() {
        this.container.classList.add('visible');
        clearTimeout(this.hideTimeout);
        if (!this.isOpen) {
            this.hideTimeout = setTimeout(() => {
                if (!this.isOpen) {
                    this.container.classList.remove('visible');
                }
            }, 5000);
        }
    }

    toggle() {
        if (this.isOpen) {
            this.send();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.container.classList.add('visible');
        clearTimeout(this.hideTimeout);
        this.input.style.display = 'block';
        this.input.focus();
        this.messagesList.classList.add('focused');
        // Clear movements
        if (this.player.game && this.player.game.inputManager) {
            this.player.game.inputManager.input.x = 0;
            this.player.game.inputManager.input.y = 0;
        }
    }

    close() {
        this.isOpen = false;
        this.input.style.display = 'none';
        this.input.value = '';
        this.input.blur();
        this.messagesList.classList.remove('focused');
        this.showTemporarily();
    }

    send() {
        const text = this.input.value.trim();
        if (text) {
            if (text.toLowerCase() === '/god') {
                if (this.player && typeof this.player.toggleInvulnerability === 'function') {
                    const newState = this.player.toggleInvulnerability();
                    this.addMessage("System", `God mode: ${newState ? 'ON' : 'OFF'}`);
                }
            } else if (this.player.game && this.player.game.multiplayer) {
                this.player.game.multiplayer.broadcastChat(text);
                
                // Add local message to history immediately
                const username = this.player.name || "Me";
                this.addMessage(username, text);
            }
        }
        this.close();
    }

    addMessage(username, text) {
        const msg = document.createElement('div');
        msg.className = 'chat-msg';
        
        const userSpan = document.createElement('span');
        userSpan.className = 'username';
        userSpan.textContent = username + ':';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        
        msg.appendChild(userSpan);
        msg.appendChild(textSpan);
        
        this.messagesList.appendChild(msg);
        this.messagesList.scrollTop = this.messagesList.scrollHeight;
        
        // Keep only last 50 messages
        while (this.messagesList.children.length > 50) {
            this.messagesList.removeChild(this.messagesList.firstChild);
        }
        
        // Ensure new message is visible
        msg.style.opacity = '1';
        
        // Show container when message arrives
        this.showTemporarily();
        
        // Fade out message after 10 seconds but keep it in history
        setTimeout(() => {
            if (!this.isOpen) {
                msg.style.transition = 'opacity 2s, background 2s';
                msg.style.opacity = '0.7';
                msg.style.background = 'rgba(0, 0, 0, 0.3)';
            }
        }, 10000);
    }
}

export class CraftingMenu { constructor(p) {} toggle() {} }
export class ConversationUI { constructor(p) {} isOpen() { return false; } close() {} open(n) {} }
export function getClosestTalkableNpc(pos, npcs, range) { return null; }