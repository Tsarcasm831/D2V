
export class PlayerInventory {
    constructor(player) { 
        this.player = player;
        this.hotbar = new Array(8).fill(null);
        this.storage = new Array(64).fill(null);
        
        // Initial hotbar items
        this.hotbar[1] = { id: 'start-axe', name: 'Iron Axe', type: 'tool', icon: 'assets/icons/axe_icon.png', slot: 'main_hand', count: 1 };
        this.hotbar[2] = { id: 'start-pickaxe', name: 'Iron Pickaxe', type: 'tool', icon: 'assets/icons/pickaxe_icon.png', slot: 'main_hand', count: 1 };
        
        // Starting items
        this.storage[0] = { id: 'start-armor', name: 'Armor Vest', type: 'vest', icon: 'assets/gear/vest.png', slot: 'vest', meshName: 'Vest', count: 1 };
        this.storage[1] = { id: 'start-cloak', name: "Assassin's Cloak", type: 'clothing', icon: 'assets/gear/assassins_cloak.png', slot: 'back', count: 1 };
        this.storage[2] = { id: 'start-band', name: 'Ninja Band', type: 'clothing', icon: 'assets/gear/ninja_headband.png', slot: 'head', count: 1 };
        this.storage[3] = { id: 'start-cap', name: "Hunter's Cap", type: 'clothing', icon: 'assets/gear/hunters_cap.png', slot: 'head', count: 1 };
        this.storage[4] = { id: 'start-gloves', name: "Assassin's Gloves", type: 'clothing', icon: 'assets/gear/leather_gloves.png', slot: 'gloves', count: 1 };
        this.storage[5] = { id: 'start-boots', name: 'Leather Boots', type: 'clothing', icon: 'assets/gear/leather_boots.png', slot: 'boots', count: 1 };
        this.storage[6] = { id: 'start-pants', name: 'Black Pants', type: 'clothing', icon: 'assets/gear/black_pants.png', slot: 'pants', count: 1 };
        this.storage[7] = { id: 'start-sword', name: 'Iron Sword', type: 'weapon', icon: 'assets/icons/sword_icon.png', slot: 'main_hand', count: 1 };
        this.storage[8] = { id: 'start-wood', name: 'Wood', type: 'material', icon: 'assets/icons/wood_log_icon.png', count: 50 };
        this.storage[9] = { id: 'start-stone', name: 'Stone', type: 'material', icon: 'assets/icons/wall_icon.png', count: 50 };
        this.storage[10] = { id: 'start-gold', name: 'Gold Coin', type: 'currency', icon: 'assets/icons/gold_coin.png', count: 100 };
        this.storage[11] = { id: 'leather-armor', name: 'Leather Armor', type: 'armor', icon: 'assets/gear/leather_armor.png', slot: 'chest', meshName: 'LeatherArmor', count: 1 };
        this.storage[12] = { id: 'konoha-vest', name: 'Konoha Vest', type: 'vest', icon: 'assets/gear/vest.png', slot: 'vest', meshName: 'Vest', count: 1 };
        
        this.selectedSlot = 0;
        this.currency = { gold: 0 };
        this.equipment = {
            HELMET: null,
            BODY: { id: 'default-shirt', name: 'Shirt', type: 'body', icon: 'assets/gear/shirt.png', slot: 'BODY' },
            VEST: null,
            BACK: null,
            GLOVES: null,
            BOOTS: null,
            BELT: null,
            RING_1: null,
            RING_2: null,
            AMULET: null,
            WEAPON_MAIN: null,
            WEAPON_OFF: null,
            TRINKET: null,
            FLASK_1: null,
            FLASK_2: null,
            FLASK_3: null,
            FLASK_4: null,
            FLASK_5: null,
            SHORTS: { id: 'default-shorts', name: 'Shorts', type: 'shorts', icon: 'assets/gear/shorts.png', slot: 'SHORTS' }
        };
    }

    selectSlot(index) {
        if (index >= 0 && index < 8) {
            this.selectedSlot = index;
            if (this.player.ui) this.player.ui.updateHotbar();
            if (this.player.gear && this.player.gear.updateHeldItem) {
                this.player.gear.updateHeldItem();
            }
        }
    }

    addItem(item, preferStorage = false) {
        if (!item) return false;
        
        // Ensure item has an ID
        if (!item.id) {
            item.id = `item-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
        }

        // Special case: currency
        if (item.type === 'gold_coin' || item.type === 'gold') {
            this.currency.gold += (item.count || 1);
            if (this.player.ui) this.player.ui.showStatus(`+${item.count || 1} Gold`, false);
            return true;
        }

        const stackLimit = item.stackLimit || 99;
        const countToAdd = item.count || 1;

        if (preferStorage) {
            // 1. Try to stack in storage
            for (let i = 0; i < this.storage.length; i++) {
                const existing = this.storage[i];
                if (existing && existing.type === item.type && existing.count < stackLimit) {
                    const room = stackLimit - existing.count;
                    const canAdd = Math.min(room, countToAdd);
                    existing.count += canAdd;
                    return true;
                }
            }
            // 2. Try empty storage slot
            for (let i = 0; i < this.storage.length; i++) {
                if (this.storage[i] === null) {
                    this.storage[i] = { ...item };
                    return true;
                }
            }
        }

        // 3. Try to stack in hotbar (if not already tried or failed storage)
        for (let i = 0; i < this.hotbar.length; i++) {
            const existing = this.hotbar[i];
            if (existing && existing.type === item.type && existing.count < stackLimit) {
                const room = stackLimit - existing.count;
                const canAdd = Math.min(room, countToAdd);
                existing.count += canAdd;
                if (this.player.ui) this.player.ui.updateHotbar();
                return true;
            }
        }

        if (!preferStorage) {
            // 4. Try to stack in storage
            for (let i = 0; i < this.storage.length; i++) {
                const existing = this.storage[i];
                if (existing && existing.type === item.type && existing.count < stackLimit) {
                    const room = stackLimit - existing.count;
                    const canAdd = Math.min(room, countToAdd);
                    existing.count += canAdd;
                    return true;
                }
            }
        }

        // 5. Try empty hotbar slot (if not already tried or failed storage)
        if (!preferStorage) {
            for (let i = 0; i < this.hotbar.length; i++) {
                if (this.hotbar[i] === null) {
                    this.hotbar[i] = { ...item, id: item.id || `item-${Math.random().toString(36).substr(2, 9)}`, count: countToAdd };
                    if (this.player.ui) this.player.ui.updateHotbar();
                    return true;
                }
            }
        }

        // 6. Try empty storage slot (if not already tried or failed hotbar)
        if (!preferStorage) {
            for (let i = 0; i < this.storage.length; i++) {
                if (this.storage[i] === null) {
                    this.storage[i] = { ...item };
                    return true;
                }
            }
        } else {
            // If preferStorage was true and we are here, we already tried storage, so try hotbar as last resort
            for (let i = 0; i < this.hotbar.length; i++) {
                if (this.hotbar[i] === null) {
                    this.hotbar[i] = { ...item, id: item.id || `item-${Math.random().toString(36).substr(2, 9)}`, count: countToAdd };
                    if (this.player.ui) this.player.ui.updateHotbar();
                    return true;
                }
            }
        }

        return false;
    }

    equipById(itemId) {
        const index = this.storage.findIndex(i => i && i.id === itemId);
        if (index === -1) return false;
        
        const item = this.storage[index];
        let slotName = this.getSlotForItem(item);
        
        if (!slotName) return false;

        const currentEquipped = this.equipment[slotName];
        this.equipment[slotName] = item;
        this.storage[index] = currentEquipped;

        if (this.player.recalculateStats) this.player.recalculateStats();
        if (this.player.gear && this.player.gear.updateVisuals) this.player.gear.updateVisuals();
        return true;
    }

    unequip(slotName) {
        if (!this.equipment[slotName]) return false;
        
        const item = this.equipment[slotName];
        
        // Try to add back to storage (prefer storage for unequipping)
        if (this.addItem(item, true)) {
            this.equipment[slotName] = null;
            if (this.player.recalculateStats) this.player.recalculateStats();
            if (this.player.gear && this.player.gear.updateVisuals) this.player.gear.updateVisuals();
            return true;
        }
        
        if (this.player.ui) this.player.ui.showStatus("Inventory Full!", true);
        return false;
    }

    getSlotForItem(item) {
        const type = (item.type || '').toLowerCase();
        const itemSlot = (item.slot || '').toLowerCase();

        // Check explicit slot property first
        if (itemSlot === 'head') return 'HELMET';
        if (itemSlot === 'vest') return 'VEST';
        if (itemSlot === 'chest') return 'VEST';
        if (itemSlot === 'torso') return 'BODY';
        if (itemSlot === 'body') return 'BODY';
        if (itemSlot === 'back') return 'BACK';
        if (itemSlot === 'pants') return 'SHORTS';
        if (itemSlot === 'gloves') return 'GLOVES';
        if (itemSlot === 'boots') return 'BOOTS';
        if (itemSlot === 'main_hand') return 'WEAPON_MAIN';
        if (itemSlot === 'off_hand') return 'WEAPON_OFF';

        // Fallback to type mapping
        if (['helmet', 'headband', 'hunters_cap', 'assassins_cap', 'head'].includes(type)) return 'HELMET';
        if (['vest', 'armor_vest'].includes(type)) return 'VEST';
        if (['body', 'shirt', 'chest'].includes(type)) {
            return 'BODY';
        }
        if (['armor', 'leather_armor'].includes(type)) {
            // Check if it's actually a vest by ID or meshName
            if (item.id && (item.id.toLowerCase().includes('vest') || item.id === 'start-armor')) return 'VEST';
            if (item.meshName === 'Vest') return 'VEST';
            if (item.id === 'leather-armor') return 'VEST'; // Leather Armor also goes to VEST slot to avoid overlapping with shirt
            return 'VEST'; 
        }
        if (['cloak', 'back'].includes(type)) return 'BACK';
        if (['shorts', 'pants', 'legs', 'black_pants'].includes(type)) return 'SHORTS';
        if (['gloves', 'hands', 'assassins_gloves', 'leather_gloves'].includes(type)) return 'GLOVES';
        if (['boots', 'shoes', 'leather_boots'].includes(type)) return 'BOOTS';
        if (type === 'belt') return 'BELT';
        if (type === 'ring') return this.equipment.RING_1 ? 'RING_2' : 'RING_1';
        if (type === 'amulet') return 'AMULET';
        if (['weapon', 'sword', 'axe', 'pickaxe', 'staff', 'bow', 'dagger', 'kunai'].includes(type)) return 'WEAPON_MAIN';
        if (type === 'shield') return 'WEAPON_OFF';
        if (type === 'flask') {
            const flasks = ['FLASK_1', 'FLASK_2', 'FLASK_3', 'FLASK_4', 'FLASK_5'];
            return flasks.find(f => !this.equipment[f]) || 'FLASK_1';
        }
        return null;
    }

    consumeItem(index, amount, isHotbar = true) {
        const arr = isHotbar ? this.hotbar : this.storage;
        if (arr[index]) {
            arr[index].count -= amount;
            if (arr[index].count <= 0) arr[index] = null;
            if (this.player.ui) this.player.ui.updateHotbar();
            return true;
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
        this.mainInventoryGrid = document.getElementById('main-inventory-grid');
        this.statusEl = document.getElementById('status-message');
        this.statusTimeout = null;

        this.hotbarWrapper = document.getElementById('hotbar-wrapper');
        this.buildHotbarWrapper = document.getElementById('build-hotbar-wrapper');
        this.buildSlots = document.querySelectorAll('#build-hotbar .build-slot');

        this.abilitySlots = {
            r: document.getElementById('slot-r'),
            x: document.getElementById('slot-x'),
            c: document.getElementById('slot-c'),
            p: document.getElementById('slot-p'),
            lmb: document.getElementById('slot-lmb')
        };

        this.updateHotbar();

        this.plantingModal = document.getElementById('planting-modal');
        this.plantingSeedList = document.getElementById('planting-seed-list');
        this.noSeedsMsg = document.getElementById('no-seeds-msg');
        this.activePlot = null;

        const closeInv = document.getElementById('close-new-inv');
        if (closeInv) {
            closeInv.onclick = () => this.toggleInventory();
        }

        const startInvuln = document.getElementById('start-invulnerable');
        if (startInvuln) {
            // Check localStorage for saved preference
            const saved = localStorage.getItem('startInvulnerable') === 'true';
            startInvuln.checked = saved;
            if (saved) {
                this.player.isInvulnerable = true;
                this.showStatus("Invulnerability Active", false);
            }
            startInvuln.addEventListener('change', (e) => {
                localStorage.setItem('startInvulnerable', e.target.checked);
                this.player.isInvulnerable = e.target.checked;
                this.showStatus(e.target.checked ? "Invulnerability Enabled" : "Invulnerability Disabled", !e.target.checked);
            });
        }

        // Audio Controls
        import('../utils/audio_manager.js').then(({ audioManager }) => {
            const masterVol = document.getElementById('master-volume');
            if (masterVol) {
                masterVol.value = audioManager.masterVolume * 100;
                masterVol.addEventListener('input', (e) => {
                    audioManager.setMasterVolume(e.target.checked ? 0 : e.target.value / 100);
                });
            }
            const musicVol = document.getElementById('music-volume');
            if (musicVol) {
                musicVol.value = audioManager.musicVolume * 100;
                musicVol.addEventListener('input', (e) => {
                    audioManager.setMusicVolume(e.target.value / 100);
                });
            }
        });

        // FPS Toggle
        const fpsToggle = document.getElementById('show-fps');
        if (fpsToggle) {
            fpsToggle.checked = localStorage.getItem('showFPS') === 'true';
            fpsToggle.addEventListener('change', (e) => {
                localStorage.setItem('showFPS', e.target.checked);
                if (this.player.game) this.player.game.toggleFPS(e.target.checked);
            });
        }

        // Bloom Toggle
        const bloomToggle = document.getElementById('bloom-toggle');
        if (bloomToggle) {
            bloomToggle.checked = (localStorage.getItem('bloomEnabled') ?? 'true') === 'true';
            bloomToggle.addEventListener('change', (e) => {
                localStorage.setItem('bloomEnabled', e.target.checked);
                if (this.player.game) this.player.game.toggleBloom(e.target.checked);
            });
        }

        // Quality Select
        const qualitySelect = document.getElementById('graphics-quality');
        if (qualitySelect) {
            qualitySelect.value = localStorage.getItem('graphicsQuality') || 'medium';
            qualitySelect.addEventListener('change', (e) => {
                localStorage.setItem('graphicsQuality', e.target.value);
                if (this.player.game) this.player.game.setQuality(e.target.value);
            });
        }

        // Add Escape key listener to open options
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleOptions();
            }
        });


        // Tab Switching

        this.buildSlots.forEach((slot, i) => {
            slot.style.pointerEvents = 'auto';
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.player.game && this.player.game.buildManager) this.player.game.buildManager.selectSlot(i);
            });
        });

        this.skillMenu = document.getElementById('skill-selection-menu');
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
            fireball: { id: 'fireball', name: 'Fireball', icon: 'assets/vfx/fireball.png', cost: 20 },
            icebolt: { id: 'icebolt', name: 'Icebolt', icon: 'assets/vfx/icebolt.png', cost: 15 }
        };
        const skill = skills[skillId];
        if (skill) {
            this.player.selectedSkill = skill;
            this.updateHotbar();
            this.showStatus(`Selected ${skill.name}`, false);
        }
    }


    toggleOptions() {
        if (!this.optionsContainer) return;
        const isVisible = this.optionsContainer.style.display === 'flex';
        this.optionsContainer.style.display = isVisible ? 'none' : 'flex';
        
        // Close other modals if opening options
        if (!isVisible) {
            if (this.inventoryContainer) this.inventoryContainer.style.display = 'none';
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
            { id: 'fireball', name: 'Fireball', icon: 'assets/vfx/fireball.png', cost: 20 },
            { id: 'icebolt', name: 'Icebolt', icon: 'assets/vfx/icebolt.png', cost: 15 }
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

    toggleInventory() {
        if (this.player.inventoryUI) {
            this.player.inventoryUI.toggle();
        }
    }

    renderEquipment() {
        // Legacy method - disabled to prevent TypeErrors
        // Equipment is now handled by InventoryUI.renderPaperDoll
    }

    updateStats() {
        const elHp = document.getElementById('stat-hp');
        const elStamina = document.getElementById('stat-stamina');
        const elChakra = document.getElementById('stat-chakra');
        const elTier = document.getElementById('stat-tier');

        const fillHp = document.getElementById('stat-hp-fill');
        const fillStamina = document.getElementById('stat-stamina-fill');
        const fillChakra = document.getElementById('stat-chakra-fill');

        if (elHp) elHp.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;
        if (fillHp) fillHp.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;

        if (elStamina) elStamina.textContent = `${Math.ceil(this.player.stamina)}/${this.player.maxStamina}`;
        if (fillStamina) fillStamina.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;

        if (elChakra) elChakra.textContent = `${Math.ceil(this.player.chakra)}/${this.player.maxChakra}`;
        if (fillChakra) fillChakra.style.width = `${(this.player.chakra / this.player.maxChakra) * 100}%`;
        
    }


    renderCrafting() {
        if (!this.craftingList) return;
        this.craftingList.innerHTML = '';

        const recipes = [
            { name: 'Wooden Wall', type: 'wall', icon: 'assets/icons/wall_icon.png', mats: [{ type: 'wood', count: 10 }] },
            { name: 'Wooden Floor', type: 'floor', icon: 'assets/icons/floor_icon.png', mats: [{ type: 'wood', count: 5 }] },
            { name: 'Firepit', type: 'firepit', icon: 'assets/icons/firepit_icon.png', mats: [{ type: 'wood', count: 5 }] },
            { name: 'Wooden Doorway', type: 'doorway', icon: 'assets/icons/doorway_icon.png', mats: [{ type: 'wood', count: 12 }] }
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
        if (this.hotbarSlots) {
            const inventoryObj = this.player.inventory;
            if (!inventoryObj) return;

            const selected = inventoryObj.selectedSlot || 0;
            const hotbar = inventoryObj.hotbar || [];
            
            this.hotbarSlots.forEach((slot, i) => {
                // Handle active state
                if (i === selected) {
                    slot.classList.add('active');
                } else {
                    slot.classList.remove('active');
                }

                // Handle icon display
                const item = hotbar[i];
                let iconImg = slot.querySelector('.hotbar-icon');
                
                if (item && item.icon) {
                    if (!iconImg) {
                        iconImg = document.createElement('img');
                        iconImg.className = 'hotbar-icon';
                        slot.appendChild(iconImg);
                    }
                    
                    // Fix malformed icon paths (e.g., missing 'assets/icons/')
                    let iconPath = item.icon;
                    if (iconPath === 'wood_log_icon.png') {
                        iconPath = 'assets/icons/wood_log_icon.png';
                    }
                    
                    if (iconImg.src !== iconPath) {
                        iconImg.src = iconPath;
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
            const selectedSkill = this.player.selectedSkill || (this.player.actions && this.player.actions.selectedSkill);
            
            if (selectedSkill) {
                if (!iconImg) {
                    iconImg = document.createElement('img');
                    iconImg.className = 'hotbar-icon';
                    rSlot.appendChild(iconImg);
                }
                if (iconImg.src !== selectedSkill.icon) {
                    iconImg.src = selectedSkill.icon;
                }
            } else if (iconImg) {
                iconImg.remove();
            }
        }
    }

    updateHud() {
        if (!this.player || !this.player.stats) return;

        if (this.hFill) {
            const hpPerc = (this.player.stats.health / this.player.stats.maxHealth) * 100;
            this.hFill.style.width = `${hpPerc}%`;
            this.hFill.parentElement.classList.toggle('low-hp', hpPerc < 25);
        }
        if (this.sFill) this.sFill.style.width = `${(this.player.stats.stamina / this.player.stats.maxStamina) * 100}%`;
        if (this.cFill) this.cFill.style.width = `${(this.player.stats.chakra / this.player.stats.maxChakra) * 100}%`;
        if (this.xFill) this.xFill.style.width = `${(this.player.stats.xp / this.player.stats.xpToNextLevel) * 100}%`;

        if (this.hudHpText) this.hudHpText.textContent = `${Math.ceil(this.player.stats.health)}/${this.player.stats.maxHealth}`;
        if (this.hudStaminaText) this.hudStaminaText.textContent = `${Math.ceil(this.player.stats.stamina)}/${this.player.stats.maxStamina}`;
        if (this.hudChakraText) this.hudChakraText.textContent = `${Math.ceil(this.player.stats.chakra)}/${this.player.stats.maxChakra}`;
        if (this.hudXpText) {
            const xpPerc = Math.floor((this.player.stats.xp / this.player.stats.xpToNextLevel) * 100);
            this.hudXpText.textContent = `LV.${this.player.stats.level} [${xpPerc}%]`;
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
            import('../utils/audio_manager.js').then(({ audioManager }) => {
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

        // Use a larger radius for the world resources screen than the minimap
        const searchRadius = 150; 
        const playerPos = this.player.mesh.position;

        const resources = this.player.worldManager.getNearbyResources(playerPos, searchRadius);
        resources.forEach(res => {
            if (!res.isDead && counts.hasOwnProperty(res.type)) {
                counts[res.type]++;
            }
        });

        const npcs = this.player.worldManager.getNearbyNPCs(playerPos, searchRadius);
        npcs.forEach(npc => {
            if (!npc.isDead && counts.hasOwnProperty(npc.type)) {
                counts[npc.type]++;
            }
        });

        const fauna = this.player.worldManager.getNearbyFauna(playerPos, searchRadius);
        fauna.forEach(f => {
            if (!f.isDead && counts.hasOwnProperty(f.type)) {
                counts[f.type]++;
            }
        });

        // Update DOM
        for (const [key, count] of Object.entries(counts)) {
            const el = document.getElementById(`count-${key}`);
            if (el) {
                el.textContent = count;
                // Add a visual cue if count is 0
                el.parentElement.parentElement.style.opacity = count > 0 ? '1' : '0.5';
            }
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
export class ConversationUI { 
    constructor(player) {
        this.player = player;
        this.init();
    }

    init() {
        this.modal = document.getElementById('npc-interaction-modal');
        this.npcName = document.getElementById('npc-name');
        this.npcPortrait = document.getElementById('npc-portrait');
        this.npcDialogue = document.getElementById('npc-dialogue');
        this.npcOptions = document.getElementById('npc-options');
        this.btnClose = document.getElementById('close-npc-interaction');
        this.btnLeave = document.getElementById('npc-btn-leave');
        this.btnTrade = document.getElementById('npc-btn-trade');
        this.btnQuest = document.getElementById('npc-btn-quest');

        if (this.btnClose) this.btnClose.onclick = () => this.close();
        if (this.btnLeave) this.btnLeave.onclick = () => this.close();
        
        if (this.btnTrade) {
            this.btnTrade.onclick = () => {
                this.player.ui.showStatus("Trading is not yet implemented", false);
            };
        }
        
        if (this.btnQuest) {
            this.btnQuest.onclick = () => {
                this.player.ui.showStatus("Quests are not yet implemented", false);
            };
        }
    }

    isOpen() { 
        return this.modal && this.modal.style.display === 'flex'; 
    }

    close() { 
        if (this.modal) this.modal.style.display = 'none';
    }

    open(npc) { 
        if (!this.modal) {
            this.init(); // Try re-initializing if elements were added to DOM after constructor
        }

        if (!this.modal) {
            console.error("ConversationUI: Modal element 'npc-interaction-modal' not found!");
            return;
        }
        
        if (this.npcName) this.npcName.textContent = npc.name || "Unknown NPC";
        if (this.npcPortrait) this.npcPortrait.src = npc.portrait || "assets/gear/assassins_cowl.png";
        if (this.npcDialogue) this.npcDialogue.textContent = npc.dialogue || "Hello there.";
        
        if (this.npcOptions) {
            this.npcOptions.innerHTML = '';
            if (npc.dialogueOptions) {
                npc.dialogueOptions.forEach(opt => {
                    const btn = document.createElement('div');
                    btn.className = 'npc-dialogue-option';
                    btn.textContent = opt.text;
                    btn.onclick = () => {
                        this.npcDialogue.textContent = opt.dialogue;
                    };
                    this.npcOptions.appendChild(btn);
                });
            }
        }
        
        this.modal.style.display = 'flex';
        
        if (this.player.game && this.player.game.inputManager) {
            this.player.game.inputManager.input.x = 0;
            this.player.game.inputManager.input.y = 0;
            this.player.game.inputManager.input.run = false;
        }
    }
}

export function getClosestTalkableNpc(pos, npcs, range) { return null; }
export class InventoryUI {
    constructor(player) {
        this.player = player;
        this.container = document.getElementById('inventory-container');
    }
    toggle() {
        if (!this.container) return;
        const isVisible = window.getComputedStyle(this.container).display !== 'none';
        this.container.style.display = isVisible ? 'none' : 'flex';
    }
    render() {}
    syncWithPlayer() {}
}
