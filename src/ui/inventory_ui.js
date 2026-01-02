import { GoogleGenAI } from "https://esm.sh/@google/genai@^1.34.0";
import * as THREE from 'three';
import { createPlayerMesh } from '../entities/player_mesh.js';
import { PlayerAnimator } from '../entities/player_animator.js';
import { attachShorts } from '../items/shorts.js';
import { attachShirt } from '../items/shirt.js';
import * as gearFns from '../items/gear.js';

const ItemRarity = {
  NORMAL: 'Normal',
  MAGIC: 'Magic',
  RARE: 'Rare',
  UNIQUE: 'Unique'
};

const SlotType = {
  HELMET: 'HELMET',
  BODY: 'BODY',
  VEST: 'VEST',
  GLOVES: 'GLOVES',
  BOOTS: 'BOOTS',
  BELT: 'BELT',
  RING: 'RING',
  AMULET: 'AMULET',
  WEAPON_MAIN: 'WEAPON_MAIN',
  WEAPON_OFF: 'WEAPON_OFF',
  BACK: 'BACK',
  FLASK: 'FLASK',
  CHARM: 'CHARM',
  INVENTORY: 'INVENTORY'
};

const INVENTORY_COLS = 8;
const INVENTORY_ROWS = 8;

const CURRENCY_ITEMS = [
  { id: 'curr-1', name: 'Chaos Orb', icon: 'assets/icons/gold_coin.png', description: 'Re-rolls stats on a rare item.' }
];

const GEM_ITEMS = [];

const escapeHtml = (value) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(value).replace(/[&<>"']/g, (char) => map[char]);
};

export class InventoryUI {
  constructor(player) {
    this.player = player;
    this.state = {
      items: [],
      inventoryIds: [],
      equipped: {
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
        SHORTS: null
      },
      activeTab: 'GENERAL',
      tooltipItemId: null,
      tooltipX: 0,
      tooltipY: 0
    };
    
    this.appEl = document.getElementById('app');
    this.tooltipEl = document.getElementById('tooltip');
    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.id = 'tooltip';
      document.body.appendChild(this.tooltipEl);
    }
    this.container = null; // Will be set after first render
    
    // Preview Scene State
    this.previewScene = null;
    this.previewCamera = null;
    this.previewRenderer = null;
    this.previewAnimator = null;
    this.currentPreviewMesh = null;
    this.lastUpdateTime = performance.now();
    this.animationFrameId = null;
    
    this.ai = this.initAI();
  }

  initAI() {
    const metaEnv = window.importMetaEnv || {};
    const apiKey = metaEnv.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '';
    return apiKey ? new GoogleGenAI(apiKey) : null;
  }

  init() {
    if (this.appEl) {
      this.render();
    }
  }

  toggle() {
    if (!this.appEl) return;
    
    const wrapper = document.getElementById('inventory-overlay-wrapper');
    if (!wrapper) {
      this.render();
      const newWrapper = document.getElementById('inventory-overlay-wrapper');
      if (newWrapper) {
        newWrapper.style.display = 'flex';
        this.onOpen();
      }
      return;
    }

    const isVisible = window.getComputedStyle(wrapper).display !== 'none';
    const newDisplay = isVisible ? 'none' : 'flex';
    wrapper.style.display = newDisplay;
    
    if (newDisplay === 'none') {
      this.onClose();
    } else {
      this.onOpen();
    }
  }

  onOpen() {
    this.syncWithPlayer();
    this.render();
    this.startPreviewAnimation();
  }

  onClose() {
    this.stopPreviewAnimation();
  }

  syncWithPlayer() {
    if (!this.player || !this.player.inventory) return;
    const inv = this.player.inventory;
    
    // Flatten all items from hotbar, storage, and equipment to ensure they are in the state list
    this.state.items = [
      ...inv.hotbar.filter(i => i),
      ...inv.storage.filter(i => i),
      ...Object.values(inv.equipment).filter(i => i)
    ];
    
    this.state.inventoryIds = inv.storage.map((item, idx) => {
      if (item) {
        if (!item.id) {
          item.id = `inv-${idx}-${Date.now()}`;
        }
        return item.id;
      }
      return null;
    });
    this.state.equipped = { ...inv.equipment };
    
    // Refresh the state items list from all potential sources to ensure IDs are synced
    this.state.items = [
      ...inv.hotbar.filter(i => i),
      ...inv.storage.filter(i => i),
      ...Object.values(inv.equipment).filter(i => i)
    ];

    // Ensure all items have IDs in the flattened list
    this.state.items.forEach((item, idx) => {
      if (item && !item.id) {
        item.id = `item-sync-${idx}-${Date.now()}`;
      }
    });
  }

  getItemById(id) {
    if (!id) return null;
    return this.state.items.find((item) => item.id === id) || null;
  }

  getTooltipItemById(id) {
    if (!id) return null;
    return this.getItemById(id)
      || CURRENCY_ITEMS.find((item) => item.id === id)
      || GEM_ITEMS.find((item) => item.id === id)
      || null;
  }

  async generateItemLore(itemName, itemType) {
    if (!this.ai) return 'The origin of this artifact is lost to time.';
    try {
      const model = this.ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Write a short, atmospheric, dark fantasy lore snippet (max 30 words) for an RPG item called "${itemName}" which is a "${itemType}". Make it sound cryptic and ancient.`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Gemini Lore Error:', error);
      return 'The origin of this artifact is lost to time.';
    }
  }

  async handleGenerateLore(item) {
    if (item.lore) return;
    const lore = await this.generateItemLore(item.name, item.type);
    this.state.items = this.state.items.map((entry) => entry.id === item.id ? { ...entry, lore } : entry);
    if (this.state.tooltipItemId === item.id) {
      this.showTooltip(this.getItemById(item.id), this.state.tooltipX, this.state.tooltipY);
    } else {
      this.render();
    }
  }

  handleEquip(itemId) {
    if (this.player.inventory.equipById(itemId)) {
      this.syncWithPlayer();
      this.render();
    }
  }

  handleUnequip(slotKey) {
    if (this.player.inventory.unequip(slotKey)) {
      this.syncWithPlayer();
      this.render();
    }
  }

  handleSort(sortType) {
    // Basic sorting logic
    this.render();
  }

  getRarityHeaderColor(rarity) {
    switch (rarity) {
      case ItemRarity.MAGIC: return 'text-magic';
      case ItemRarity.RARE: return 'text-rare';
      case ItemRarity.UNIQUE: return 'text-unique';
      default: return 'text-normal';
    }
  }

  getBorderColor(rarity) {
    switch (rarity) {
      case ItemRarity.MAGIC: return 'border-magic';
      case ItemRarity.RARE: return 'border-rare';
      case ItemRarity.UNIQUE: return 'border-unique';
      default: return 'border-normal';
    }
  }

  renderTooltipContent(item) {
    const isGeneric = !item.rarity;
    const headerColor = isGeneric ? 'text-normal' : this.getRarityHeaderColor(item.rarity);
    return `
      <div class="tooltip-header">
        <h3 class="tooltip-title ${headerColor}">
          ${escapeHtml(item.name)}
        </h3>
        ${!isGeneric ? `
          <div class="tooltip-rarity-row">
            <div class="tooltip-rarity-line"></div>
            <span class="tooltip-rarity-text">${escapeHtml(item.rarity)} ${escapeHtml(item.type)}</span>
            <div class="tooltip-rarity-line"></div>
          </div>
        ` : ''}
      </div>
      <div class="tooltip-body">
        ${item.description ? `<p class="tooltip-description">${escapeHtml(item.description)}</p>` : ''}
        ${item.lore ? `<p class="tooltip-lore">"${escapeHtml(item.lore)}"</p>` : ''}
      </div>
    `;
  }

  showTooltip(item, x, y) {
    if (!item || !this.tooltipEl) return;
    this.state.tooltipItemId = item.id;
    this.state.tooltipX = x;
    this.state.tooltipY = y;
    const borderClass = item.rarity ? this.getBorderColor(item.rarity) : 'border-normal';
    this.tooltipEl.className = `tooltip-premium ${borderClass}`;
    this.tooltipEl.innerHTML = this.renderTooltipContent(item);
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.opacity = '1';
    this.tooltipEl.style.visibility = 'visible';
    this.positionTooltip(x, y);
  }

  hideTooltip() {
    if (!this.tooltipEl) return;
    this.state.tooltipItemId = null;
    this.tooltipEl.style.opacity = '0';
    this.tooltipEl.style.display = 'none';
    this.tooltipEl.style.visibility = 'hidden';
  }

  positionTooltip(x, y) {
    if (!this.state.tooltipItemId || !this.tooltipEl) return;
    const padding = 15;
    const tooltipWidth = this.tooltipEl.offsetWidth || 300;
    const tooltipHeight = this.tooltipEl.offsetHeight || 200;
    
    let left = x + padding;
    let top = y + padding;

    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - padding;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = y - tooltipHeight - padding;
    }

    this.tooltipEl.style.left = `${Math.max(10, left)}px`;
    this.tooltipEl.style.top = `${Math.max(10, top)}px`;
  }

  renderEquipSlot({ slotKey, item, className, label, rarity }) {
    const hasItem = !!item;
    const rarityClass = hasItem ? `rarity-${(item.rarity || 'normal').toLowerCase()}` : '';
    return `
      <div class="inventory-slot-premium equipment-slot-v3 ${className} ${rarityClass} ${hasItem ? 'has-item' : ''}"
        data-action="unequip" data-slot="${slotKey}" ${hasItem ? `data-tooltip-id="${item.id}"` : ''}>
        <div class="slot-inner">
          ${!hasItem && label ? `<span class="slot-label-v3">${escapeHtml(label)}</span>` : ''}
          ${hasItem ? `<img src="${item.icon}" class="item-icon-v3" />` : ''}
        </div>
        ${hasItem ? `<div class="rarity-indicator-v3"></div>` : ''}
      </div>
    `;
  }

  renderInventoryContent() {
    if (this.state.activeTab === 'CURRENCY') return this.renderCurrencyTab();
    if (this.state.activeTab === 'GEMS') return this.renderGemsTab();
    return this.renderGeneralTab();
  }

  renderCurrencyTab() {
    const cellClass = 'inventory-slot-premium';
    const currencyCells = CURRENCY_ITEMS.map((curr) => (
      `<div class="${cellClass}" data-tooltip-id="${curr.id}">
        <div class="w-full h-full p-2">
          <img src="${curr.icon}" class="w-full h-full object-contain transition-transform" alt="${escapeHtml(curr.name)}" />
        </div>
        <div class="absolute bottom-0.5 right-1 text-[9px] text-[#fbbf24] font-bold font-cinzel drop-shadow-md">20</div>
      </div>`
    )).join('');

    const emptyCells = Array.from({ length: Math.max(0, 64 - CURRENCY_ITEMS.length) })
      .map(() => `<div class="${cellClass}"></div>`)
      .join('');

    return `
      <div class="bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
        <div class="new-inventory-grid">${currencyCells}${emptyCells}</div>
      </div>
    `;
  }

  renderGemsTab() {
    const cellClass = 'inventory-slot-premium';
    const gemCells = GEM_ITEMS.map((gem) => (
      `<div class="${cellClass}" data-tooltip-id="${gem.id}">
        <div class="w-full h-full p-2">
          <img src="${gem.icon}" class="w-full h-full object-contain transition-transform brightness-110" alt="${escapeHtml(gem.name)}" />
        </div>
      </div>`
    )).join('');

    const emptyCells = Array.from({ length: Math.max(0, 64 - GEM_ITEMS.length) })
      .map(() => `<div class="${cellClass}"></div>`)
      .join('');

    return `
      <div class="bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
        <div class="new-inventory-grid">${gemCells}${emptyCells}</div>
      </div>
    `;
  }

  renderGeneralTab() {
    const totalCells = INVENTORY_ROWS * INVENTORY_COLS;
    const cellClass = 'inventory-slot-premium';
    const unlockedCellsCount = 3 * INVENTORY_COLS;

    const cells = Array.from({ length: totalCells }).map((_, idx) => {
      const itemId = this.state.inventoryIds[idx];
      const item = this.getItemById(itemId);
      const isLocked = idx >= unlockedCellsCount;

      return `
        <div class="${cellClass} ${isLocked ? 'locked-slot' : ''}">
          ${isLocked && !item ? `
            <div class="absolute inset-0 flex items-center justify-center opacity-20">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-1.24-5-4-5s-4 2.24-4 5v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71.83-3.1 3.1-3.1 2.27 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </div>
          ` : ''}
          ${item ? `
            <div class="absolute inset-0 z-10 p-[3px] cursor-pointer" data-action="equip" data-item-id="${item.id}" data-tooltip-id="${item.id}">
              <img src="${item.icon}" class="w-full h-full object-contain saturate-[0.85] transition-all drop-shadow-sm" alt="${escapeHtml(item.name)}" />
              <div class="absolute bottom-[2px] left-[2px] right-[2px] h-[2px] opacity-70 ${this.getRarityBgClass(item.rarity)}"></div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
        <div class="new-inventory-grid">${cells}</div>
      </div>
    `;
  }

  getRarityBgClass(rarity) {
    switch (rarity) {
      case ItemRarity.UNIQUE: return 'bg-unique';
      case ItemRarity.RARE: return 'bg-rare';
      case ItemRarity.MAGIC: return 'bg-magic';
      default: return 'bg-transparent';
    }
  }

  setupPreviewScene() {
    const container = document.getElementById('preview-canvas-container');
    if (!container) return;

    // Dispose old renderer if it exists
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      if (this.previewRenderer.domElement.parentElement) {
        this.previewRenderer.domElement.parentElement.removeChild(this.previewRenderer.domElement);
      }
    }

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 450;

    this.previewScene = new THREE.Scene();
    this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.previewCamera.position.set(0, 1.2, 3.5);
    this.previewCamera.lookAt(0, 1.0, 0);

    this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.previewRenderer.setSize(width, height);
    this.previewRenderer.setPixelRatio(window.devicePixelRatio);
    this.previewRenderer.setClearColor(0x000000, 0);
    container.appendChild(this.previewRenderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.previewScene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(5, 5, 5);
    this.previewScene.add(sun);

    this.updatePreviewMesh();
  }

  updatePreviewMesh() {
    if (!this.previewScene || !this.player) return;

    if (this.currentPreviewMesh) {
      this.previewScene.remove(this.currentPreviewMesh);
    }

    const charData = this.player.characterData || {
      bodyType: 'male',
      skinColor: '#ffdbac',
      eyeColor: '#333333',
      shirtColor: '#ffffff',
      shirtPattern: 'none'
    };

    const { mesh, parts } = createPlayerMesh(charData);
    this.currentPreviewMesh = mesh;
    this.currentPreviewMesh.position.y = 0;
    this.previewScene.add(this.currentPreviewMesh);

    // Attach base clothing
    attachShorts(parts, charData);
    attachShirt(parts, charData);

    // Attach currently equipped items
    const equipped = this.player.inventory.equipment;
    Object.entries(equipped).forEach(([slot, item]) => {
      if (item && item.meshName) {
        const fnName = `attach${item.meshName}`;
        if (gearFns[fnName]) {
          gearFns[fnName](parts);
        }
      }
    });

    this.previewAnimator = new PlayerAnimator(parts);
  }

  startPreviewAnimation() {
    this.stopPreviewAnimation();
    this.lastUpdateTime = performance.now();
    
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      const now = performance.now();
      const delta = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;

      if (this.previewAnimator) {
        this.previewAnimator.animate(
          delta,
          false, // isMoving
          false, // isRunning
          false, // isPickingUp
          false, // isDead
          false, // isJumping
          'none', // jumpPhase
          0, // jumpTimer
          0, // jumpVelocity
          false, // isLedgeGrabbing
          0, // ledgeGrabTime
          0, // recoverTimer
          false, // isDragged
          'hips', // draggedPartName
          new THREE.Vector3(), // dragVelocity
          0, // deathTime
          null // deathVariation
        );
      }

      if (this.previewRenderer && this.previewScene && this.previewCamera) {
        this.previewRenderer.render(this.previewScene, this.previewCamera);
      }
    };
    
    animate();
  }

  stopPreviewAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  renderEquipmentSection() {
    const equipped = this.state.equipped;
    return `
      <div class="flex-1-2 flex flex-col background-doll border-r-doll relative overflow-hidden">
        <div class="doll-texture"></div>
        ${this.renderPreviewContainer()}
        <div class="flex-1 flex flex-col items-center justify-start relative z-10 overflow-hidden pt-0">
          <div class="paper-doll-container">
            ${this.renderEquipmentTopRow(equipped)}
            ${this.renderEquipmentGrid(equipped)}
          </div>
        </div>
        ${this.renderStatsPanel()}
      </div>
    `;
  }

  renderPreviewContainer() {
    return `
      <div id="preview-canvas-container" class="silhouette-overlay">
          <div class="silhouette-glow"></div>
          <div class="silhouette-gradient"></div>
      </div>
    `;
  }

  renderEquipmentTopRow(equipped) {
    return `
      <div class="flex justify-center items-end gap-6 mb-4">
        <div class="flex flex-col items-center gap-2">
           ${this.renderEquipSlot({ slotKey: 'AMULET', item: equipped.AMULET, className: 'w-10 h-10 rounded-full amulet-slot', label: 'Neck' })}
        </div>
        <div class="flex flex-col items-center">
          ${this.renderEquipSlot({ slotKey: 'HELMET', item: equipped.HELMET, className: 'w-14 h-14 helmet-slot', label: 'Head' })}
        </div>
        <div class="flex flex-col items-center gap-2">
          ${this.renderEquipSlot({ slotKey: 'TRINKET', item: equipped.TRINKET, className: 'w-10 h-10 rounded-full relic-slot', label: 'Relic' })}
        </div>
      </div>
    `;
  }

  renderEquipmentGrid(equipped) {
    return `
      <div class="equipment-grid-v3">
        <div class="equip-column-side">
          ${this.renderEquipSlot({ slotKey: 'WEAPON_MAIN', item: equipped.WEAPON_MAIN, className: 'w-16 h-32 weapon-slot', label: 'Main' })}
          ${this.renderEquipSlot({ slotKey: 'RING_1', item: equipped.RING_1, className: 'w-10 h-10 ring-slot', label: 'Ring' })}
        </div>
        
        <div class="equip-column-center">
          ${this.renderEquipSlot({ slotKey: 'BODY', item: equipped.BODY, className: 'w-24 h-24 body-slot', label: 'Torso' })}
          ${this.renderEquipSlot({ slotKey: 'VEST', item: equipped.VEST, className: 'w-24 h-24 vest-slot', label: 'Vest' })}
          ${this.renderEquipSlot({ slotKey: 'BELT', item: equipped.BELT, className: 'w-24 h-8 belt-slot', label: 'Waist' })}
          ${this.renderEquipSlot({ slotKey: 'SHORTS', item: equipped.SHORTS, className: 'w-24 h-24 legs-slot', label: 'Legs' })}
        </div>

        <div class="equip-column-side">
          ${this.renderEquipSlot({ slotKey: 'BACK', item: equipped.BACK, className: 'w-16 h-16 cloak-slot', label: 'Cloak' })}
          ${this.renderEquipSlot({ slotKey: 'WEAPON_OFF', item: equipped.WEAPON_OFF, className: 'w-16 h-32 weapon-slot', label: 'Off' })}
          ${this.renderEquipSlot({ slotKey: 'RING_2', item: equipped.RING_2, className: 'w-10 h-10 ring-slot', label: 'Ring' })}
        </div>
        
        <div class="equip-row-bottom">
           ${this.renderEquipSlot({ slotKey: 'GLOVES', item: equipped.GLOVES, className: 'w-14 h-14 gloves-slot', label: 'Hands' })}
           ${this.renderEquipSlot({ slotKey: 'BOOTS', item: equipped.BOOTS, className: 'w-14 h-14 boots-slot', label: 'Feet' })}
        </div>
      </div>
    `;
  }

  renderStatsPanel() {
    const stats = this.player?.stats;
    const charName = (this.player?.characterData?.name || 'ADVENTURER').toUpperCase();
    const charLevel = this.player?.level || 1;
    const charClass = this.player?.characterData?.class || 'Nomad';

    return `
      <div class="stats-panel-doll relative z-20">
        <div class="stats-panel-glow"></div>
        <div class="flex flex-col p-3 gap-2">
          ${this.renderStatsHeader(charName, charLevel, charClass)}
          <div class="stats-grid-doll">
            ${this.renderAttributes(stats)}
            ${this.renderDefenses(stats)}
            ${this.renderResistances(stats)}
          </div>
        </div>
      </div>
    `;
  }

  renderStatsHeader(name, level, className) {
    return `
      <div class="char-header-row" style="padding-bottom: 0.25rem;">
        <div>
          <h2 class="char-name-doll">${name}</h2>
          <div class="char-subtitle-doll">
            <span class="level-label-doll">Level ${level}</span>
            <span class="doll-dot"></span>
            <span class="class-label-doll">${className}</span>
          </div>
        </div>
        <div class="doll-icon-container" style="width: 2rem; height: 2rem;">
          <svg class="doll-icon-svg" style="width: 1.25rem; height: 1.25rem;" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20h-13L12 5.5z"/></svg>
        </div>
      </div>
    `;
  }

  renderAttributes(stats) {
    return `
      <div class="stats-col-doll">
        <h4 class="stats-header-doll">Attributes</h4>
        <div class="stats-row-v3">
          <span class="stat-label-v3">STRENGTH</span>
          <span class="stat-value-v3">${stats?.base?.strength || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">DEXTERITY</span>
          <span class="stat-value-v3">${stats?.base?.dexterity || 0}</span>
        </div>
        <div class="stats-row-v3 highlight-blue">
          <span class="stat-label-v3">INTELLIGENCE</span>
          <span class="stat-value-v3">${stats?.base?.intelligence || 0}</span>
        </div>
      </div>
    `;
  }

  renderDefenses(stats) {
    return `
      <div class="stats-col-doll">
        <h4 class="stats-header-doll">Defenses</h4>
        <div class="stats-row-v3">
          <span class="stat-label-v3">ARMOUR</span>
          <span class="stat-value-v3">${stats?.derived?.defense || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">EVASION</span>
          <span class="stat-value-v3">${stats?.derived?.dodge || 0}</span>
        </div>
        <div class="stats-row-v3 highlight-blue">
          <span class="stat-label-v3">EN. SHIELD</span>
          <span class="stat-value-v3">0</span>
        </div>
      </div>
    `;
  }

  renderResistances(stats) {
    return `
      <div class="stats-col-doll">
        <h4 class="stats-header-doll">Resistances</h4>
        <div class="grid grid-cols-2 gap-x-6">
          <div class="stats-row-v3 highlight-red"><span class="stat-label-v3">FIRE</span> <span class="stat-value-v3">0%</span></div>
          <div class="stats-row-v3 highlight-wind"><span class="stat-label-v3">WIND</span> <span class="stat-value-v3">0%</span></div>
          <div class="stats-row-v3 highlight-water"><span class="stat-label-v3">WATER</span> <span class="stat-value-v3">0%</span></div>
          <div class="stats-row-v3 highlight-earth"><span class="stat-label-v3">EARTH</span> <span class="stat-value-v3">0%</span></div>
          <div class="stats-row-v3 highlight-lightning"><span class="stat-label-v3">LIGHTN</span> <span class="stat-value-v3">0%</span></div>
          <div class="stats-row-v3 highlight-light"><span class="stat-label-v3">LIGHT</span> <span class="stat-value-v3">0%</span></div>
          <div class="stats-row-v3 highlight-shadow"><span class="stat-label-v3">SHADOW</span> <span class="stat-value-v3">0%</span></div>
          <div class="stats-row-v3 highlight-reson"><span class="stat-label-v3">RESON</span> <span class="stat-value-v3">0%</span></div>
        </div>
      </div>
    `;
  }

  renderInventoryPane() {
    const tabs = ['GENERAL', 'CURRENCY', 'GEMS']
      .map((tab) => {
        const isActive = this.state.activeTab === tab;
        return `
          <div
            data-tab="${tab}"
            class="inventory-tab-v3 ${isActive ? 'active' : ''}"
          >
            <span class="tab-label-v3">${tab}</span>
            <div class="tab-indicator-v3"></div>
          </div>
        `;
      }).join('');

    return `
      <div class="inventory-pane-v3">
        <div class="inventory-tabs-v3">
          ${tabs}
        </div>

        <div class="inventory-main-content-v3 custom-scrollbar">
          <div class="mx-auto w-fit py-4">
            ${this.renderInventoryContent()}
          </div>
        </div>

        <div class="inventory-footer-v3">
          <div class="footer-stats-v3">
            <div class="footer-stat-v3">
              <img src="assets/icons/gold_coin.png" class="footer-icon-v3" />
              <span class="footer-stat-value-v3 text-unique">${this.player?.inventory?.currency?.gold || 0}</span>
            </div>
            <div class="footer-stat-v3">
              <div class="footer-icon-v3 resonance-icon"></div>
              <span class="footer-stat-value-v3 text-magic">0</span>
            </div>
          </div>
          <div class="footer-status-v3">
            <span class="status-dot-v3"></span>
            Awaiting Input
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.appEl) return;
    this.hideTooltip();

    // Check if we need to preserve the display state
    const existingWrapper = document.getElementById('inventory-overlay-wrapper');
    const currentDisplay = existingWrapper ? window.getComputedStyle(existingWrapper).display : 'none';

    this.appEl.innerHTML = `
      <div id="inventory-overlay-wrapper" style="display: ${currentDisplay}">
        <div class="doll-overlay-bg">
          <div class="doll-radial-bg"></div>
          <div class="doll-gradient-bg"></div>
        </div>

        <div class="inventory-modal-container-v3">
          <div class="inventory-header-v3">
            <div class="header-left-v3">
              <div class="header-dot-v3"></div>
              <h1 class="header-title-v3">INVENTORY</h1>
            </div>
            <div class="header-right-v3">
              <div class="system-info-v3">
                <span class="system-label-v3">PROTOCOL</span>
                <span class="system-value-v3">X7-AEGIS</span>
              </div>
              <div id="close-new-inv" class="close-btn-v3">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </div>
            </div>
          </div>

          <div class="inventory-layout-v3">
            ${this.renderEquipmentSection()}
            ${this.renderInventoryPane()}
          </div>
          
          <div class="inventory-border-v3 t"></div>
          <div class="inventory-border-v3 b"></div>
          <div class="inventory-border-v3 l"></div>
          <div class="inventory-border-v3 r"></div>
        </div>

        <div class="inventory-version-v3">
          Ver. 1.0.4 <span class="version-dot-v3"></span> Secure Connection Established
        </div>
      </div>
    `;

    this.bindEvents();

    // If inventory is visible, ensure preview is running
    const wrapper = document.getElementById('inventory-overlay-wrapper');
    if (wrapper && window.getComputedStyle(wrapper).display !== 'none') {
      if (!this.animationFrameId) {
        this.startPreviewAnimation();
      } else {
        // If already animating, just update the mesh to reflect new equipment
        this.updatePreviewMesh();
      }
    }
  }

  bindEvents() {
    const wrapper = document.getElementById('inventory-overlay-wrapper');
    if (!wrapper) return;

    this.bindCloseButton();
    this.bindTabs(wrapper);
    this.bindTooltips(wrapper);
    this.bindActions(wrapper);
  }

  bindCloseButton() {
    const closeBtn = document.getElementById('close-new-inv');
    if (closeBtn) closeBtn.onclick = () => this.toggle();
  }

  bindTabs(wrapper) {
    wrapper.querySelectorAll('.inventory-tab-v3').forEach(tab => {
      tab.onclick = (e) => {
        e.stopPropagation();
        const tabName = tab.dataset.tab;
        if (this.state.activeTab !== tabName) {
          this.state.activeTab = tabName;
          this.render();
        }
      };
    });
  }

  bindTooltips(wrapper) {
    // Tooltip delegation for mousemove to ensure smooth following
    const handleMove = (e) => {
      const target = e.target.closest('[data-tooltip-id]');
      if (target) {
        const item = this.getTooltipItemById(target.dataset.tooltipId);
        if (item) {
          this.showTooltip(item, e.clientX, e.clientY);
        }
      } else {
        this.hideTooltip();
      }
    };

    wrapper.addEventListener('mousemove', handleMove, { passive: true });
    wrapper.addEventListener('mouseleave', () => this.hideTooltip(), { passive: true });
    
    // Explicitly hide on any click to prevent stuck tooltips
    wrapper.addEventListener('mousedown', () => this.hideTooltip(), { passive: true });
  }

  bindActions(wrapper) {
    // Right-click delegation
    wrapper.oncontextmenu = (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      
      if (target.dataset.action === 'equip') {
        this.handleEquip(target.dataset.itemId);
      } else if (target.dataset.action === 'unequip') {
        this.handleUnequip(target.dataset.slot);
      }
    };

    // Double-click delegation
    wrapper.ondblclick = (e) => {
      const equipTarget = e.target.closest('[data-action="equip"]');
      if (equipTarget) {
        e.stopPropagation();
        this.handleEquip(equipTarget.dataset.itemId);
      }
    };

    // Prevent propagation
    wrapper.onclick = (e) => e.stopPropagation();
  }
}


