// Temporary stub file - needs to be refactored into separate files
// This file contains multiple classes that should be split up

import { INVENTORY_CONFIG } from '../ui/inventory_types.js';

export class PlayerUI {
    constructor(player) {
        this.player = player;
        this.elements = {};
        this.statusTimeout = null;
        this.setupUI();
    }
    
    setupUI() {
        const get = (id) => document.getElementById(id);

        // HUD bars
        this.elements.healthFill = get('health-fill');
        this.elements.staminaFill = get('stamina-fill');
        this.elements.chakraFill = get('chakra-fill');
        this.elements.xpFill = get('xp-fill');

        this.elements.hpText = get('hud-hp-text');
        this.elements.staminaText = get('hud-stamina-text');
        this.elements.chakraText = get('hud-chakra-text');
        this.elements.xpText = get('hud-xp-text');
        this.elements.levelBadge = get('hud-level-badge');

        // Profile stats
        this.elements.statHp = get('stat-hp');
        this.elements.statHpFill = get('stat-hp-fill');
        this.elements.statStamina = get('stat-stamina');
        this.elements.statStaminaFill = get('stat-stamina-fill');
        this.elements.statChakra = get('stat-chakra');
        this.elements.statChakraFill = get('stat-chakra-fill');
        this.elements.statTier = get('stat-tier');

        // Status
        this.elements.statusMessage = get('status-message');

        // Hotbars
        this.hotbarWrapper = get('hotbar-wrapper');
        this.buildHotbarWrapper = get('build-hotbar-wrapper');
        this.hotbarSlots = Array.from(document.querySelectorAll('#hotbar .hotbar-slot'));
        this.buildSlots = Array.from(document.querySelectorAll('#build-hotbar .build-slot'));
    }
    
    updateHealth(health, maxHealth) {
        const percent = maxHealth > 0 ? (health / maxHealth) * 100 : 0;
        if (this.elements.healthFill) {
            this.elements.healthFill.style.width = `${percent}%`;
        }
        if (this.elements.hpText) {
            this.elements.hpText.textContent = `${Math.floor(health)}/${Math.floor(maxHealth)}`;
        }
        if (this.elements.statHp) {
            this.elements.statHp.textContent = `${Math.floor(health)}/${Math.floor(maxHealth)}`;
        }
        if (this.elements.statHpFill) {
            this.elements.statHpFill.style.width = `${percent}%`;
        }
    }
    
    updateMana(mana, maxMana) {
        const percent = maxMana > 0 ? (mana / maxMana) * 100 : 0;
        if (this.elements.chakraFill) {
            this.elements.chakraFill.style.width = `${percent}%`;
        }
        if (this.elements.chakraText) {
            this.elements.chakraText.textContent = `${Math.floor(mana)}/${Math.floor(maxMana)}`;
        }
        if (this.elements.statChakra) {
            this.elements.statChakra.textContent = `${Math.floor(mana)}/${Math.floor(maxMana)}`;
        }
        if (this.elements.statChakraFill) {
            this.elements.statChakraFill.style.width = `${percent}%`;
        }
    }
    
    updateStamina(stamina, maxStamina) {
        const percent = maxStamina > 0 ? (stamina / maxStamina) * 100 : 0;
        if (this.elements.staminaFill) {
            this.elements.staminaFill.style.width = `${percent}%`;
        }
        if (this.elements.staminaText) {
            this.elements.staminaText.textContent = `${Math.floor(stamina)}/${Math.floor(maxStamina)}`;
        }
        if (this.elements.statStamina) {
            this.elements.statStamina.textContent = `${Math.floor(stamina)}/${Math.floor(maxStamina)}`;
        }
        if (this.elements.statStaminaFill) {
            this.elements.statStaminaFill.style.width = `${percent}%`;
        }
    }
    
    updateLevel(level) {
        if (this.elements.levelBadge) {
            this.elements.levelBadge.textContent = `LV.${level}`;
        }
    }
    
    showStatus(message, isError = true) {
        if (!this.elements.statusMessage) return;
        this.elements.statusMessage.textContent = message;
        this.elements.statusMessage.style.color = isError ? '#ff4444' : '#44ff44';
        this.elements.statusMessage.style.opacity = '1';
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }
        this.statusTimeout = setTimeout(() => {
            if (this.elements.statusMessage) {
                this.elements.statusMessage.style.opacity = '0';
            }
        }, 2500);
    }
    
    updateHud() {
        if (!this.player || !this.player.stats) return;
        
        this.updateHealth(this.player.stats.health, this.player.stats.maxHealth);
        this.updateMana(this.player.stats.chakra, this.player.stats.maxChakra);
        this.updateStamina(this.player.stats.stamina, this.player.stats.maxStamina);
        this.updateLevel(this.player.stats.level || 1);

        const xp = this.player.stats.xp || 0;
        const xpToNext = this.player.stats.xpToNextLevel || 1;
        const xpPercent = xpToNext > 0 ? (xp / xpToNext) * 100 : 0;
        if (this.elements.xpFill) {
            this.elements.xpFill.style.width = `${xpPercent}%`;
        }
        if (this.elements.xpText) {
            this.elements.xpText.textContent = `${Math.floor(xp)}/${Math.floor(xpToNext)}`;
        }
    }

    updateHotbar() {
        if (!this.hotbarSlots || this.hotbarSlots.length === 0) return;
        const hotbar = this.player?.inventory?.hotbar || [];
        const selected = this.player?.inventory?.selectedSlot || 0;

        this.hotbarSlots.forEach((slot, idx) => {
            const existingIcon = slot.querySelector('img.hotbar-icon.item');
            if (existingIcon) existingIcon.remove();
            const existingCount = slot.querySelector('.hotbar-count');
            if (existingCount) existingCount.remove();

            const item = hotbar[idx];
            if (item && item.icon) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.className = 'hotbar-icon item';
                img.alt = item.name || item.id || `slot-${idx + 1}`;
                slot.insertBefore(img, slot.firstChild);
            }
            if (item && item.count > 1) {
                const count = document.createElement('span');
                count.className = 'hotbar-count';
                count.textContent = `${item.count}`;
                slot.appendChild(count);
            }

            if (idx === selected) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });
    }

    updateBuildHotbar(selectedIndex = 0) {
        if (!this.buildSlots || this.buildSlots.length === 0) return;
        this.buildSlots.forEach((slot, idx) => {
            if (idx === selectedIndex) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });
    }

    toggleInventory() {
        if (this.player?.inventoryUI) {
            this.player.inventoryUI.toggle();
            return;
        }
        const container = document.getElementById('inventory-container');
        if (!container) return;
        const isVisible = container.style.display === 'block';
        container.style.display = isVisible ? 'none' : 'block';
    }

    toggleSkills() {
        const container = document.getElementById('skills-container');
        if (!container) return;
        const isVisible = container.style.display === 'flex';
        container.style.display = isVisible ? 'none' : 'flex';
    }

    renderInventory() {
        if (this.player?.inventoryUI) {
            this.player.inventoryUI.syncWithPlayer();
            this.player.inventoryUI.render();
        }
    }

    updateResourceCounts() {
        const wm = this.player?.worldManager;
        if (!wm) return;
        if (wm._updateEntityCaches) wm._updateEntityCaches();
        const resources = wm._cachedResources || [];
        const fauna = wm._cachedFauna || [];
        const npcs = wm._cachedNPCs || [];

        const counts = {
            tree: 0,
            rock: 0,
            berry_bush: 0,
            coal: 0,
            copper: 0,
            iron: 0,
            sulfur: 0,
            silver: 0,
            gold: 0,
            deer: 0,
            wolf: 0,
            bear: 0,
            humanoid: 0
        };

        resources.forEach((res) => {
            if (res.isDead) return;
            if (counts.hasOwnProperty(res.type)) counts[res.type] += 1;
        });
        fauna.forEach((animal) => {
            if (animal.isDead) return;
            if (counts.hasOwnProperty(animal.type)) counts[animal.type] += 1;
        });
        npcs.forEach((npc) => {
            if (npc.isDead) return;
            counts.humanoid += 1;
        });

        const setCount = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = `${value}`;
        };

        setCount('count-tree', counts.tree);
        setCount('count-rock', counts.rock);
        setCount('count-berry_bush', counts.berry_bush);
        setCount('count-coal', counts.coal);
        setCount('count-copper', counts.copper);
        setCount('count-iron', counts.iron);
        setCount('count-sulfur', counts.sulfur);
        setCount('count-silver', counts.silver);
        setCount('count-gold', counts.gold);
        setCount('count-deer', counts.deer);
        setCount('count-wolf', counts.wolf);
        setCount('count-bear', counts.bear);
        setCount('count-humanoid', counts.humanoid);
    }

    openPlantingUI(plot) {
        const availableSeeds = this.player?.inventory?.storage?.filter((item) => item && item.plantId);
        if (!availableSeeds || availableSeeds.length === 0) {
            this.showStatus('No seeds available', true);
            return;
        }
        this.showStatus('Planting UI not implemented yet.', true);
    }
}

export class ChatUI {
    constructor(player) {
        this.player = player;
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.isVisible = false;
        
        this.setupChat();
    }
    
    setupChat() {
        if (!this.chatContainer || !this.chatMessages || !this.chatInput) {
            console.warn('Chat UI elements not found');
            return;
        }
        
        // Chat input handling
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Close chat when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.chatContainer.contains(e.target)) {
                this.hide();
            }
        });
    }
    
    show() {
        if (this.chatContainer) {
            this.chatContainer.style.display = 'block';
            this.chatInput.style.display = 'block';
            this.chatInput.focus();
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.chatContainer) {
            this.chatContainer.style.display = 'none';
            this.chatInput.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Check for fast travel command
        if (message.startsWith('/travel ') || message.startsWith('/tp ')) {
            const locationName = message.replace('/travel ', '').replace('/tp ', '').trim();
            this.handleFastTravel(locationName);
            this.chatInput.value = '';
            return;
        }
        
        // Check for locations command
        if (message === '/locations' || message === '/locs') {
            this.showLocations();
            this.chatInput.value = '';
            return;
        }
        
        // Regular chat message
        if (this.player.game && this.player.game.multiplayer) {
            this.player.game.multiplayer.sendChat(message);
            this.chatInput.value = '';
        }
    }
    
    handleFastTravel(locationName) {
        if (!this.player.game || !this.player.game.worldManager) {
            this.addMessage('Fast travel not available', 'System');
            return;
        }
        
        const worldManager = this.player.game.worldManager;
        const locations = Array.from(this.player.discoveredLocations || []);
        
        if (locations.length === 0) {
            this.addMessage('No locations discovered yet!', 'System');
            return;
        }
        
        // Find matching location
        const city = worldManager.worldMask?.cities?.find(c => 
            c.name.toLowerCase() === locationName.toLowerCase()
        );
        
        if (city && this.player.discoveredLocations.has(city.name)) {
            this.player.teleport(city.worldX, city.worldZ);
            this.addMessage(`Teleported to ${city.name}`, 'System');
        } else {
            this.addMessage(`Location "${locationName}" not found or not discovered`, 'System');
            this.addMessage(`Available: ${locations.join(', ')}`, 'System');
        }
    }
    
    showLocations() {
        const locations = Array.from(this.player.discoveredLocations || []);
        if (locations.length === 0) {
            this.addMessage('No locations discovered yet!', 'System');
        } else {
            this.addMessage(`Discovered locations: ${locations.join(', ')}`, 'System');
            this.addMessage('Use /travel <location> to fast travel', 'System');
        }
    }
    
    addMessage(message, sender = 'System') {
        if (this.chatMessages) {
            const messageEl = document.createElement('div');
            messageEl.className = 'chat-message';
            messageEl.textContent = `[${sender}]: ${message}`;
            this.chatMessages.appendChild(messageEl);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            
            // Limit message history
            while (this.chatMessages.children.length > 50) {
                this.chatMessages.removeChild(this.chatMessages.firstChild);
            }
        }
    }
}

// Placeholder classes that need to be implemented
export class PlayerInventory {
    constructor(player) {
        this.player = player;
        this.storageSize = INVENTORY_CONFIG.ROWS * INVENTORY_CONFIG.COLS;
        this.storage = new Array(this.storageSize).fill(null);
        this.selectedSlot = 0;
        this.hotbar = new Array(8).fill(null); // 8 hotbar slots
        this.equipment = {
            HELMET: null,
            BODY: null,
            VEST: null,
            GLOVES: null,
            BOOTS: null,
            BELT: null,
            RING_1: null,
            RING_2: null,
            AMULET: null,
            WEAPON_MAIN: null,
            WEAPON_OFF: null,
            BACK: null,
            TRINKET: null,
            FLASK_1: null,
            FLASK_2: null,
            FLASK_3: null,
            FLASK_4: null,
            FLASK_5: null,
            SUMMON: null,
            RESONANT: null,
            SHORTS: null
        };
    }

    getStackKey(item) {
        return item.stackKey || item.type || item.id || item.name || 'item';
    }

    normalizeItem(item) {
        if (!item) return null;
        const stackKey = this.getStackKey(item);
        const normalized = { ...item };
        normalized.stackKey = stackKey;
        if (!normalized.id || normalized.id === normalized.stackKey) {
            normalized.id = `${stackKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        }
        if (!normalized.count) normalized.count = 1;
        return normalized;
    }

    getStackLimit(item) {
        if (!item) return 1;
        if (item.stackLimit) return item.stackLimit;
        if (item.maxStack) return item.maxStack;
        if (item.stackable) return 99;
        return 1;
    }

    canStack(a, b) {
        if (!a || !b) return false;
        const keyA = this.getStackKey(a);
        const keyB = this.getStackKey(b);
        return keyA === keyB && this.getStackLimit(a) > 1;
    }

    selectSlot(index) {
        if (index < 0 || index >= this.hotbar.length) return;
        this.selectedSlot = index;
        if (this.player?.gear) this.player.gear.updateHeldItem();
        if (this.player?.stats) this.player.stats.recalculate();
        if (this.player?.ui) this.player.ui.updateHotbar();
    }

    addItem(item, hotbarSlot = null) {
        if (!item) return false;
        let remaining = item.count || 1;
        const baseItem = this.normalizeItem(item);
        const stackLimit = this.getStackLimit(baseItem);

        const tryStackInto = (slotItem) => {
            if (!this.canStack(baseItem, slotItem)) return 0;
            const space = stackLimit - slotItem.count;
            if (space <= 0) return 0;
            const add = Math.min(space, remaining);
            slotItem.count += add;
            remaining -= add;
            return add;
        };

        const placeInSlot = (arr, idx) => {
            if (remaining <= 0) return;
            const slotItem = arr[idx];
            if (slotItem) {
                tryStackInto(slotItem);
                return;
            }
            const add = Math.min(stackLimit, remaining);
            const newStack = this.normalizeItem({ ...baseItem, count: add });
            arr[idx] = newStack;
            remaining -= add;
        };

        if (hotbarSlot !== null && hotbarSlot >= 0 && hotbarSlot < this.hotbar.length) {
            placeInSlot(this.hotbar, hotbarSlot);
        }

        if (remaining > 0 && baseItem.hotbar_able) {
            for (let i = 0; i < this.hotbar.length && remaining > 0; i++) {
                placeInSlot(this.hotbar, i);
            }
        }

        if (remaining > 0) {
            for (let i = 0; i < this.storage.length && remaining > 0; i++) {
                placeInSlot(this.storage, i);
            }
        }

        if (this.player?.ui) this.player.ui.updateHotbar();
        if (this.player?.inventoryUI) this.player.inventoryUI.syncWithPlayer();

        return remaining === 0;
    }

    removeItem(item) {
        if (!item) return false;
        const removeFrom = (arr) => {
            const idx = arr.indexOf(item);
            if (idx !== -1) {
                arr[idx] = null;
                return true;
            }
            return false;
        };
        return removeFrom(this.hotbar) || removeFrom(this.storage);
    }

    moveItem(source, target) {
        if (!source || !target) return false;
        if (source.type === target.type && source.index === target.index) return false;

        const srcArr = source.type === 'HOTBAR' ? this.hotbar : this.storage;
        const tgtArr = target.type === 'HOTBAR' ? this.hotbar : this.storage;
        if (!srcArr || !tgtArr) return false;

        const srcItem = srcArr[source.index];
        if (!srcItem) return false;
        const tgtItem = tgtArr[target.index];

        if (tgtItem && this.canStack(srcItem, tgtItem)) {
            const stackLimit = this.getStackLimit(tgtItem);
            const space = stackLimit - tgtItem.count;
            if (space > 0) {
                const add = Math.min(space, srcItem.count);
                tgtItem.count += add;
                srcItem.count -= add;
                if (srcItem.count <= 0) srcArr[source.index] = null;
            }
        } else {
            tgtArr[target.index] = srcItem;
            srcArr[source.index] = tgtItem || null;
        }

        if (this.player?.ui) this.player.ui.updateHotbar();
        if (this.player?.inventoryUI) this.player.inventoryUI.syncWithPlayer();
        if (source.type === 'HOTBAR' && source.index === this.selectedSlot) {
            if (this.player?.gear) this.player.gear.updateHeldItem();
            if (this.player?.stats) this.player.stats.recalculate();
        }
        if (target.type === 'HOTBAR' && target.index === this.selectedSlot) {
            if (this.player?.gear) this.player.gear.updateHeldItem();
            if (this.player?.stats) this.player.stats.recalculate();
        }
        return true;
    }

    getSlotForItem(item) {
        if (!item) return null;
        const slot = (item.slot || item.equipSlot || '').toLowerCase();
        if (slot === 'main_hand') return 'WEAPON_MAIN';
        if (slot === 'off_hand') return 'WEAPON_OFF';
        if (slot === 'head') return 'HELMET';
        if (slot === 'chest') return 'BODY';
        if (slot === 'vest') return 'VEST';
        if (slot === 'gloves') return 'GLOVES';
        if (slot === 'boots') return 'BOOTS';
        if (slot === 'belt') return 'BELT';
        if (slot === 'back') return 'BACK';
        if (slot === 'ring') return 'RING_1';
        if (slot === 'amulet') return 'AMULET';
        if (slot === 'pants') return 'SHORTS';
        return null;
    }

    equipById(itemId) {
        if (!itemId) return false;
        let source = null;
        let item = null;
        let index = -1;

        index = this.storage.findIndex((i) => i && i.id === itemId);
        if (index !== -1) {
            source = 'STORAGE';
            item = this.storage[index];
        } else {
            index = this.hotbar.findIndex((i) => i && i.id === itemId);
            if (index !== -1) {
                source = 'HOTBAR';
                item = this.hotbar[index];
            }
        }

        if (!item) return false;
        const slotKey = this.getSlotForItem(item);
        if (!slotKey) return false;

        const previous = this.equipment[slotKey];
        this.equipment[slotKey] = item;

        if (source === 'STORAGE') this.storage[index] = null;
        if (source === 'HOTBAR') this.hotbar[index] = null;

        if (previous) {
            if (source === 'STORAGE') {
                this.storage[index] = previous;
            } else if (source === 'HOTBAR') {
                this.hotbar[index] = previous;
            } else {
                this.addItem(previous);
            }
        }

        if (this.player?.gear?.updateVisuals) this.player.gear.updateVisuals();
        if (this.player?.stats) this.player.stats.recalculate();
        if (this.player?.ui) this.player.ui.updateHotbar();
        return true;
    }

    unequip(slotKey) {
        if (!this.equipment.hasOwnProperty(slotKey)) return false;
        const item = this.equipment[slotKey];
        if (!item) return false;

        const emptyIndex = this.storage.findIndex((slot) => !slot);
        if (emptyIndex === -1) return false;

        this.storage[emptyIndex] = item;
        this.equipment[slotKey] = null;

        if (this.player?.gear?.updateVisuals) this.player.gear.updateVisuals();
        if (this.player?.stats) this.player.stats.recalculate();
        if (this.player?.ui) this.player.ui.updateHotbar();
        return true;
    }
}

export class CraftingMenu {
    constructor(player) {
        this.player = player;
        this.isVisible = false;
    }
    
    show() {
        this.isVisible = true;
    }
    
    hide() {
        this.isVisible = false;
    }
}

export class ConversationUI {
    constructor(player) {
        this.player = player;
        this.isVisible = false;
        this.activeNPC = null;
    }
    
    show() {
        this.isVisible = true;
    }
    
    hide() {
        this.isVisible = false;
    }
    
    isOpen() {
        return this.isVisible;
    }
    
    close() {
        this.hide();
    }

    open(npc) {
        this.activeNPC = npc || null;
        this.show();
        if (this.player?.ui) {
            const name = npc?.name || 'NPC';
            const line = npc?.dialogue || '...';
            this.player.ui.showStatus(`${name}: ${line}`, false);
        }
    }
}

export class PlayerInventoryUI {
    constructor(player) {
        this.player = player;
        this.inventory = new PlayerInventory(player);
        this.isVisible = false;
    }
    
    show() {
        this.isVisible = true;
    }
    
    hide() {
        this.isVisible = false;
    }
}
