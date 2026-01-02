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
  GLOVES: 'GLOVES',
  BOOTS: 'BOOTS',
  BELT: 'BELT',
  RING: 'RING',
  AMULET: 'AMULET',
  WEAPON_MAIN: 'WEAPON_MAIN',
  WEAPON_OFF: 'WEAPON_OFF',
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
        SHORTS: null
      },
      activeTab: 'GENERAL',
      tooltipItemId: null,
      tooltipX: 0,
      tooltipY: 0
    };
    
    this.appEl = document.getElementById('app');
    this.tooltipEl = document.getElementById('tooltip');
    this.container = null; // Will be set after first render
    
    // Preview Scene State
    this.previewScene = null;
    this.previewCamera = null;
    this.previewRenderer = null;
    this.previewAnimator = null;
    this.currentPreviewMesh = null;
    this.lastUpdateTime = performance.now();
    this.animationFrameId = null;
    
    const metaEnv = window.importMetaEnv || {};
    const apiKey = metaEnv.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '';
    if (apiKey) {
      this.ai = new GoogleGenAI(apiKey);
    } else {
      this.ai = null;
    }
  }

  init() {
    if (this.appEl) {
      this.render();
    }
  }

  toggle() {
    if (!this.appEl) return;
    
    // The main wrapper created in render()
    const wrapper = document.getElementById('inventory-overlay-wrapper');
    
    if (!wrapper) {
      // If not rendered yet, render it first
      this.render();
      const newWrapper = document.getElementById('inventory-overlay-wrapper');
      if (newWrapper) {
        newWrapper.style.display = 'flex';
        this.syncWithPlayer();
        this.render(); // Re-render to populate content
      }
      return;
    }

    const isVisible = window.getComputedStyle(wrapper).display !== 'none';
    const newDisplay = isVisible ? 'none' : 'flex';
    wrapper.style.display = newDisplay;
    
    if (newDisplay === 'none') {
      this.stopPreviewAnimation();
    } else {
      this.syncWithPlayer();
      this.render();
      this.startPreviewAnimation();
    }
  }

  syncWithPlayer() {
    if (!this.player || !this.player.inventory) return;
    const inv = this.player.inventory;
    
    this.state.items = [...inv.storage.filter(i => i), ...Object.values(inv.equipment).filter(i => i)];
    this.state.inventoryIds = inv.storage.map((item, idx) => item ? (item.id || `inv-${idx}`) : null);
    this.state.equipped = { ...inv.equipment };
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
    this.positionTooltip(x, y);
  }

  hideTooltip() {
    if (!this.tooltipEl) return;
    this.state.tooltipItemId = null;
    this.tooltipEl.style.opacity = '0';
    this.tooltipEl.style.display = 'none';
  }

  positionTooltip(x, y) {
    if (!this.state.tooltipItemId || !this.tooltipEl) return;
    const padding = 20;
    let left = x + padding;
    let top = y + padding;
    if (left + this.tooltipEl.offsetWidth > window.innerWidth) left = x - this.tooltipEl.offsetWidth - padding;
    if (top + this.tooltipEl.offsetHeight > window.innerHeight) top = y - this.tooltipEl.offsetHeight - padding;
    this.tooltipEl.style.left = `${Math.max(10, left)}px`;
    this.tooltipEl.style.top = `${Math.max(10, top)}px`;
  }

  renderEquipSlot({ slotKey, item, className, label }) {
    const hasItem = !!item;
    return `
      <div class="relative slot-border flex items-center justify-center cursor-pointer group ${className} ${hasItem ? 'bg-[#050505]' : 'bg-[#080808]'}"
        ${hasItem ? `data-action="unequip" data-slot="${slotKey}" data-tooltip-id="${item.id}"` : ''}>
        ${!hasItem && label ? `<span class="absolute top-1 left-0 w-full text-center text-[8px] uppercase font-cinzel text-neutral-600 tracking-widest font-semibold pointer-events-none opacity-60">${escapeHtml(label)}</span>` : ''}
        ${hasItem ? `<img src="${item.icon}" class="w-full h-full object-contain p-1" />` : ''}
      </div>
    `;
  }

  renderInventoryContent() {
    const totalCells = INVENTORY_ROWS * INVENTORY_COLS;
    const cellClass = 'inventory-slot-premium';
    const unlockedCellsCount = 3 * INVENTORY_COLS; // 3 rows unlocked

    if (this.state.activeTab === 'CURRENCY') {
      const currencyCells = CURRENCY_ITEMS.map((curr) => (
        `<div class="${cellClass}" data-tooltip-id="${curr.id}">
          <div class="w-full h-full p-2">
            <img src="${curr.icon}" class="w-full h-full object-contain transition-transform" alt="${escapeHtml(curr.name)}" />
          </div>
          <div class="absolute bottom-0.5 right-1 text-[9px] text-[#fbbf24] font-bold font-cinzel drop-shadow-md">20</div>
        </div>`
      )).join('');

      const emptyCount = Math.max(0, 64 - CURRENCY_ITEMS.length);
      const emptyCells = Array.from({ length: emptyCount })
        .map(() => `<div class="${cellClass}"></div>`)
        .join('');

      return `
        <div class="bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
          <div class="new-inventory-grid">
            ${currencyCells}
            ${emptyCells}
          </div>
        </div>
      `;
    }

    if (this.state.activeTab === 'GEMS') {
      const gemCells = GEM_ITEMS.map((gem) => (
        `<div class="${cellClass}" data-tooltip-id="${gem.id}">
          <div class="w-full h-full p-2">
            <img src="${gem.icon}" class="w-full h-full object-contain transition-transform brightness-110" alt="${escapeHtml(gem.name)}" />
          </div>
        </div>`
      )).join('');

      const emptyCount = Math.max(0, 64 - GEM_ITEMS.length);
      const emptyCells = Array.from({ length: emptyCount })
        .map(() => `<div class="${cellClass}"></div>`)
        .join('');

      return `
        <div class="bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
          <div class="new-inventory-grid">
            ${gemCells}
            ${emptyCells}
          </div>
        </div>
      `;
    }

    const cells = Array.from({ length: totalCells }).map((_, idx) => {
      const itemId = this.state.inventoryIds[idx];
      const item = this.getItemById(itemId);
      const isLocked = idx >= unlockedCellsCount;

      return `
        <div class="${cellClass} ${isLocked ? 'locked-slot' : ''}">
          ${!item && !isLocked ? `
            <div class="absolute inset-0 opacity-[0.03] pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 10 10">
                <path d="M0 0 L10 10" stroke="currentColor" stroke-width="0.5"/>
              </svg>
            </div>
          ` : ''}

          ${isLocked && !item ? `
            <div class="absolute inset-0 flex items-center justify-center opacity-20">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-1.24-5-4-5s-4 2.24-4 5v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71.83-3.1 3.1-3.1 2.27 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </div>
          ` : ''}

          ${item ? `
            <div
              class="absolute inset-0 z-10 p-[3px] cursor-pointer"
              data-action="equip"
              data-item-id="${item.id}"
              data-tooltip-id="${item.id}"
            >
              <img src="${item.icon}" class="w-full h-full object-contain saturate-[0.85] transition-all drop-shadow-sm" alt="${escapeHtml(item.name)}" />
              <div class="absolute bottom-[2px] left-[2px] right-[2px] h-[2px] opacity-70 ${item.rarity === ItemRarity.UNIQUE ? 'bg-unique' : item.rarity === ItemRarity.RARE ? 'bg-rare' : item.rarity === ItemRarity.MAGIC ? 'bg-magic' : 'bg-transparent'}"></div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
        <div class="new-inventory-grid">
          ${cells}
        </div>
      </div>
    `;
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
    const stats = this.player?.stats;
    const charName = (this.player?.characterData?.name || 'ADVENTURER').toUpperCase();
    const charLevel = this.player?.level || 1;
    const charClass = this.player?.characterData?.class || 'Nomad';

    const equipped = this.state.equipped;

    return `
      <div class="flex-1-2 flex flex-col background-doll border-r-doll relative overflow-hidden">
        <div class="doll-texture"></div>

        <!-- Player Preview -->
        <div id="preview-canvas-container" class="silhouette-overlay">
            <div class="silhouette-glow"></div>
            <div class="silhouette-gradient"></div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-start relative z-10 overflow-hidden pt-0">
          <div class="paper-doll-container">
            <!-- Header Row: Accessories -->
            <div class="flex justify-center gap-4 mb-2">
              ${this.renderEquipSlot({ slotKey: 'AMULET', item: equipped.AMULET, className: 'w-8 h-8 rounded-full', label: 'Neck' })}
              ${this.renderEquipSlot({ slotKey: 'HELMET', item: equipped.HELMET, className: 'w-10 h-10', label: 'Head' })}
              ${this.renderEquipSlot({ slotKey: 'TRINKET', item: equipped.TRINKET, className: 'w-8 h-8 rounded-full', label: 'Relic' })}
            </div>

            <!-- Main Body & Weapons -->
            <div class="equipment-grid-main" style="gap: 0.5rem;">
              <!-- Far Left: Main Hand -->
              <div class="equipment-column" style="gap: 0.5rem;">
                ${this.renderEquipSlot({ slotKey: 'WEAPON_MAIN', item: equipped.WEAPON_MAIN, className: 'w-14 h-28', label: 'Main' })}
              </div>

              <!-- Near Left Column: Ring 1 & Hands -->
              <div class="equipment-column" style="gap: 0.5rem;">
                ${this.renderEquipSlot({ slotKey: 'RING_1', item: equipped.RING_1, className: 'w-8 h-8', label: 'Ring' })}
                ${this.renderEquipSlot({ slotKey: 'GLOVES', item: equipped.GLOVES, className: 'w-12 h-12', label: 'Hands' })}
              </div>

              <!-- Center Column: Body, Belt, Legs -->
              <div class="equipment-column" style="gap: 0.5rem;">
                ${this.renderEquipSlot({ slotKey: 'BODY', item: equipped.BODY, className: 'w-20 h-28', label: 'Torso' })}
                ${this.renderEquipSlot({ slotKey: 'BELT', item: equipped.BELT, className: 'w-20 h-6', label: 'Waist' })}
                ${this.renderEquipSlot({ slotKey: 'SHORTS', item: equipped.SHORTS, className: 'w-20 h-20', label: 'Legs' })}
              </div>

              <!-- Near Right Column: Ring 2 & Feet -->
              <div class="equipment-column" style="gap: 0.5rem;">
                ${this.renderEquipSlot({ slotKey: 'RING_2', item: equipped.RING_2, className: 'w-8 h-8', label: 'Ring' })}
                ${this.renderEquipSlot({ slotKey: 'BOOTS', item: equipped.BOOTS, className: 'w-12 h-12', label: 'Feet' })}
              </div>

              <!-- Far Right: Off Hand -->
              <div class="equipment-column" style="gap: 0.5rem;">
                ${this.renderEquipSlot({ slotKey: 'WEAPON_OFF', item: equipped.WEAPON_OFF, className: 'w-14 h-28', label: 'Off' })}
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Panel -->
        <div class="stats-panel-doll relative z-20">
          <div class="stats-panel-glow"></div>

          <div class="flex flex-col p-3 gap-2">
            <div class="char-header-row" style="padding-bottom: 0.25rem;">
              <div>
                <h2 class="char-name-doll">
                  ${charName}
                </h2>
                <div class="char-subtitle-doll">
                  <span class="level-label-doll">Level ${charLevel}</span>
                  <span class="doll-dot"></span>
                  <span class="class-label-doll">${charClass}</span>
                </div>
              </div>
              <div class="doll-icon-container" style="width: 2rem; height: 2rem;">
                <svg class="doll-icon-svg" style="width: 1.25rem; height: 1.25rem;" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20h-13L12 5.5z"/></svg>
              </div>
            </div>

            <div class="stats-grid-doll">
              <div class="stats-col-doll">
                <h4 class="stats-header-doll">Attributes</h4>
                <div class="stats-row-doll">
                  <span>Str</span> <span class="text-white">${stats?.base?.strength || 0}</span>
                </div>
                <div class="stats-row-doll">
                  <span>Dex</span> <span class="text-white">${stats?.base?.dexterity || 0}</span>
                </div>
                <div class="stats-row-doll highlight-blue">
                  <span>Int</span> <span class="font-bold">${stats?.base?.intelligence || 0}</span>
                </div>
              </div>

              <div class="stats-col-doll">
                <h4 class="stats-header-doll">Defenses</h4>
                <div class="stats-row-doll">
                  <span>Armour</span> <span class="text-white">${stats?.derived?.defense || 0}</span>
                </div>
                <div class="stats-row-doll">
                  <span>Evasion</span> <span class="text-white">${stats?.derived?.dodge || 0}</span>
                </div>
                <div class="stats-row-doll highlight-blue">
                  <span>ES</span> <span class="font-bold">0</span>
                </div>
              </div>

              <div class="stats-col-doll">
                <h4 class="stats-header-doll">Resists</h4>
                <div class="grid grid-cols-2 gap-x-4">
                  <div class="stats-row-doll highlight-red">
                    <span>Fire</span> <span>0%</span>
                  </div>
                  <div class="stats-row-doll highlight-blue-dark">
                    <span>Wind</span> <span>0%</span>
                  </div>
                  <div class="stats-row-doll highlight-blue">
                    <span>Water</span> <span>0%</span>
                  </div>
                  <div class="stats-row-doll highlight-yellow">
                    <span>Earth</span> <span>0%</span>
                  </div>
                  <div class="stats-row-doll" style="color: #fbbf24;">
                    <span>Lightn</span> <span>0%</span>
                  </div>
                  <div class="stats-row-doll" style="color: #fff;">
                    <span>Light</span> <span>0%</span>
                  </div>
                  <div class="stats-row-doll" style="color: #a855f7;">
                    <span>Shadow</span> <span>0%</span>
                  </div>
                  <div class="stats-row-doll" style="color: #22d3ee;">
                    <span>Reson</span> <span>0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderInventoryPane() {
    const tabs = ['GENERAL', 'CURRENCY', 'GEMS']
      .map((tab) => {
        const isActive = this.state.activeTab === tab;
        return `
          <button
            data-tab="${tab}"
            class="inventory-tab-premium ${isActive ? 'active' : ''}"
          >
            ${tab}
          </button>
        `;
      })
      .join('');

    const sortControls = this.state.activeTab === 'GENERAL' ? `
      <div id="inventory-sort-controls" class="inventory-sort-row">
        ${['NAME', 'TYPE', 'RARITY'].map((label) => (
          `<button
            data-sort="${label}"
            class="sort-button-premium"
          >
            ${label}
          </button>`
        )).join('')}
      </div>
    ` : '';

    return `
      <div class="inventory-grid-pane">
        <div class="inventory-tabs-container no-scrollbar">
          ${tabs}
          <div class="flex-1"></div>
          ${sortControls}
        </div>

        <div class="inventory-main-content custom-scrollbar">
          <div class="mx-auto w-fit">
            ${this.renderInventoryContent()}
          </div>
        </div>

        <div class="inventory-footer-premium">
          <div class="footer-stats-container">
            <div class="footer-stat">
              <span class="footer-stat-dot-gold"></span>
              <span class="footer-stat-label">Gold</span>
              <span class="footer-stat-value text-unique">${this.player?.inventory?.currency?.gold || 0}</span>
            </div>
            <div class="footer-stat">
              <span class="footer-stat-dot-resonance"></span>
              <span class="footer-stat-label">Resonance</span>
              <span class="footer-stat-value text-magic">0</span>
            </div>
          </div>
          <div class="footer-status-text">
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

        <div class="inventory-modal-container">
          <div class="inventory-header">
            <div class="flex items-center gap-2">
              <div class="inventory-header-dot"></div>
              <h1 class="inventory-header-title">
                INVENTORY
              </h1>
            </div>
            <div class="inventory-header-system">
              <span class="system-protocol-text">System Protocol <span class="system-id-text">X7-AEGIS</span></span>
              <div id="close-new-inv" class="close-btn-doll">&times;</div>
            </div>
          </div>

          <div class="inventory-layout">
            ${this.renderEquipmentSection()}
            ${this.renderInventoryPane()}
          </div>
        </div>

        <div class="inventory-version-footer">
          <span class="version-text-doll">
            Inventory System v1.0.4
          </span>
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
    const closeBtn = document.getElementById('close-new-inv');
    if (closeBtn) closeBtn.onclick = () => this.toggle();

    // Tab switching
    this.appEl.querySelectorAll('.inventory-tab-premium').forEach(tab => {
      tab.onclick = () => {
        const tabName = tab.dataset.tab;
        if (this.state.activeTab !== tabName) {
          this.state.activeTab = tabName;
          this.render();
        }
      };
    });

    this.appEl.querySelectorAll('[data-tooltip-id]').forEach(el => {
      el.onmouseenter = (e) => this.showTooltip(this.getTooltipItemById(el.dataset.tooltipId), e.clientX, e.clientY);
      el.onmouseleave = () => this.hideTooltip();
    });
    this.appEl.querySelectorAll('[data-action="equip"]').forEach(el => {
      el.ondblclick = () => this.handleEquip(el.dataset.itemId);
    });
  }
}


