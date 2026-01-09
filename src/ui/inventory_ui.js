import * as THREE from 'three';
import { createPlayerMesh } from '../entities/player_mesh.js';
import { PlayerAnimator } from '../entities/player_animator.js';
import * as gearFns from '../items/gear.js';
import { ItemRarity, SlotType, INVENTORY_CONFIG } from './inventory_types.js';
import { EquipSlot } from './components/EquipSlot.js';
import { Tooltip } from './components/Tooltip.js';
import { escapeHtml } from './utils.js';
import { getIcon } from './components/IconGenerator.js';

const CURRENCY_ITEMS = [
  { id: 'curr-1', name: 'Chaos Orb', icon: getIcon('Enchantment', ItemRarity.RARE), description: 'Re-rolls stats on a rare item.', rarity: ItemRarity.RARE, type: 'Enchantment' }
];

const GEM_ITEMS = [
  { id: 'gem-1', name: 'Fireball', icon: getIcon('Gem', ItemRarity.NORMAL), description: 'Launches a projectile of pure flame.', rarity: ItemRarity.NORMAL, type: 'Gem' },
  { id: 'gem-2', name: 'Frostblink', icon: getIcon('Gem', ItemRarity.NORMAL), description: 'Teleport and leave a trail of ice.', rarity: ItemRarity.NORMAL, type: 'Gem' }
];

export class InventoryUI {
  constructor(player) {
    this.player = player;
    this.state = {
      items: [],
      inventoryIds: [],
      draggedItem: null,
      draggedSource: null,
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
      activeTab: 'GENERAL'
    };
    
    this.appEl = document.getElementById('app');
    this.tooltip = new Tooltip();
    this.container = null;
    
    this.previewScene = null;
    this.previewCamera = null;
    this.previewRenderer = null;
    this.previewAnimator = null;
    this.currentPreviewMesh = null;
    this.lastUpdateTime = performance.now();
    this.animationFrameId = null;
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
    const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : [];
    const storage = Array.isArray(inv.storage) ? inv.storage : [];
    const equipment = inv.equipment || {};
    
    // Flatten all items from hotbar, storage, and equipment to ensure they are in the state list
    this.state.items = [
      ...hotbar.filter(i => i),
      ...storage.filter(i => i),
      ...Object.values(equipment).filter(i => i)
    ];
    
    this.state.inventoryIds = storage.map((item, idx) => {
      if (item) {
        if (!item.id) {
          item.id = `inv-${idx}-${Date.now()}`;
        }
        return item.id;
      }
      return null;
    });
    this.state.equipped = { ...equipment };
    
    // Refresh the state items list from all potential sources to ensure IDs are synced
    this.state.items = [
      ...hotbar.filter(i => i),
      ...storage.filter(i => i),
      ...Object.values(equipment).filter(i => i)
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
    this.tooltip.show(item, x, y);
  }

  hideTooltip() {
    this.tooltip.hide();
  }

  renderEquipSlot(options) {
    return EquipSlot.render(options);
  }

  renderInventoryContent() {
    if (this.state.activeTab === 'CURRENCY') return this.renderCurrencyTab();
    if (this.state.activeTab === 'GEMS') return this.renderGemsTab();
    return this.renderGeneralTab();
  }

  renderCurrencyTab() {
    const cellClass = 'inventory-slot-premium';
    const totalCells = INVENTORY_CONFIG.ROWS * INVENTORY_CONFIG.COLS;
    const currencyCells = CURRENCY_ITEMS.map((curr) => (
      `<div class="${cellClass}" data-tooltip-id="${curr.id}">
        <div class="w-full h-full p-2">
          <img src="${curr.icon}" class="w-full h-full object-contain transition-transform" alt="${escapeHtml(curr.name)}" />
        </div>
        <div class="absolute bottom-0.5 right-1 text-[9px] text-[#fbbf24] font-bold font-cinzel drop-shadow-md">20</div>
      </div>`
    )).join('');

    const emptyCells = Array.from({ length: Math.max(0, totalCells - CURRENCY_ITEMS.length) })
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
    const totalCells = INVENTORY_CONFIG.ROWS * INVENTORY_CONFIG.COLS;
    const gemCells = GEM_ITEMS.map((gem) => (
      `<div class="${cellClass}" data-tooltip-id="${gem.id}">
        <div class="w-full h-full p-2">
          <img src="${gem.icon}" class="w-full h-full object-contain transition-transform brightness-110" alt="${escapeHtml(gem.name)}" />
        </div>
      </div>`
    )).join('');

    const emptyCells = Array.from({ length: Math.max(0, totalCells - GEM_ITEMS.length) })
      .map(() => `<div class="${cellClass}"></div>`)
      .join('');

    return `
      <div class="bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
        <div class="new-inventory-grid">${gemCells}${emptyCells}</div>
      </div>
    `;
  }

  renderGeneralTab() {
    const totalCells = INVENTORY_CONFIG.ROWS * INVENTORY_CONFIG.COLS;
    const cellClass = 'inventory-slot-premium';

    const cells = Array.from({ length: totalCells }).map((_, idx) => {
      const itemId = this.state.inventoryIds[idx];
      const item = this.getItemById(itemId);

      return `
        <div class="${cellClass} ${item ? `rarity-${(item.rarity || 'normal').toLowerCase()}` : ''}" data-slot-type="STORAGE" data-slot-index="${idx}">
          ${!item ? `<div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>` : ''}
          ${item ? `
            <div class="inventory-item-container" draggable="true" 
                 data-action="equip" data-item-id="${item.id}" data-tooltip-id="${item.id}"
                 data-slot-type="STORAGE" data-slot-index="${idx}">
              <img src="${item.icon}" class="w-full h-full object-contain saturate-[0.85] transition-all drop-shadow-sm pointer-events-none" alt="${escapeHtml(item.name)}" />
              <div class="rarity-indicator-v3"></div>
              ${item.count > 1 ? `<div class="item-count-v3">${item.count}</div>` : ''}
              ${item.durability !== undefined ? `
                <div class="absolute bottom-1 left-1 right-1 h-1 bg-black/50 rounded-full overflow-hidden">
                  <div class="h-full ${item.durability / item.maxDurability < 0.25 ? 'bg-red-500' : 'bg-green-500'}" 
                       style="width: ${(item.durability / item.maxDurability) * 100}%"></div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          <div class="absolute inset-0 border border-white/0 group-hover:border-[#c8aa6e]/50 pointer-events-none transition-colors duration-75 z-20"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="flex flex-col gap-4 mx-auto w-fit select-none">
        <div class="bg-[#5c4d3c] p-[1px] shadow-2xl">
          <div class="new-inventory-grid">${cells}</div>
        </div>
        ${this.renderHotbarSection()}
      </div>
    `;
  }

  renderHotbarSection() {
    const hotbarItems = this.player?.inventory?.hotbar || Array(8).fill(null);
    const cellClass = 'inventory-slot-premium';
    
    const cells = hotbarItems.map((item, idx) => {
      return `
        <div class="${cellClass} hotbar-slot-v3 ${item ? `rarity-${(item.rarity || 'normal').toLowerCase()}` : ''}" data-slot-type="HOTBAR" data-slot-index="${idx}">
          ${!item ? `<div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>` : ''}
          ${item ? `
            <div class="inventory-item-container" draggable="true"
                 data-action="equip" data-item-id="${item.id}" data-tooltip-id="${item.id}"
                 data-slot-type="HOTBAR" data-slot-index="${idx}">
              <img src="${item.icon}" class="w-full h-full object-contain saturate-[0.85] transition-all drop-shadow-sm pointer-events-none" alt="${escapeHtml(item.name)}" />
              <div class="rarity-indicator-v3"></div>
              ${item.count > 1 ? `<div class="item-count-v3">${item.count}</div>` : ''}
              ${item.durability !== undefined ? `
                <div class="absolute bottom-1 left-1 right-1 h-1 bg-black/50 rounded-full overflow-hidden">
                  <div class="h-full ${item.durability / item.maxDurability < 0.25 ? 'bg-red-500' : 'bg-green-500'}" 
                       style="width: ${(item.durability / item.maxDurability) * 100}%"></div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          <div class="hotbar-key-v3">${idx + 1}</div>
          <div class="absolute inset-0 border border-white/0 group-hover:border-[#c8aa6e]/30 pointer-events-none transition-colors duration-75 z-20"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="hotbar-container-v3">
        <div class="hotbar-label-v3">Quick Access</div>
        <div class="hotbar-grid-v3">${cells}</div>
      </div>
    `;
  }

  getRarityBgClass(rarity) {
    switch (rarity) {
      case ItemRarity.UNIQUE: return 'bg-unique';
      case ItemRarity.RARE: return 'bg-rare';
      case ItemRarity.MAGIC: return 'bg-magic';
      case ItemRarity.QUEST: return 'bg-quest';
      case ItemRarity.GEM: return 'bg-gem';
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

    const { mesh, parts, model } = createPlayerMesh(charData);
    this.currentPreviewMesh = mesh;
    this.currentPreviewMesh.position.y = 0;
    this.previewScene.add(this.currentPreviewMesh);

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

    this.previewAnimator = new PlayerAnimator(parts, model);
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

  renderPreviewContainer() {
    return `
      <div class="absolute inset-0">
        <div id="preview-canvas-container" class="w-full h-full"></div>
      </div>
    `;
  }

  renderEquipmentSection() {
    const equipped = this.state.equipped;
    return `
      <div class="background-doll relative overflow-hidden">
        <div class="doll-texture"></div>
        ${this.renderPreviewContainer()}
        <div class="flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden">
          <div class="paper-doll-container">
            <div class="equip-row-top">
              ${this.renderEquipSlot({ slotKey: 'AMULET', item: equipped.AMULET, className: 'w-10 h-10 rounded-full amulet-slot', label: 'Neck' })}
              ${this.renderEquipSlot({ slotKey: 'HELMET', item: equipped.HELMET, className: 'w-16 h-16 helmet-slot', label: 'Head' })}
              ${this.renderEquipSlot({ slotKey: 'TRINKET', item: equipped.TRINKET, className: 'w-10 h-10 rounded-full relic-slot', label: 'Relic' })}
            </div>
            
            <div class="equipment-grid-v3">
              <div class="equip-column-side pt-2">
                ${this.renderEquipSlot({ slotKey: 'WEAPON_MAIN', item: equipped.WEAPON_MAIN, className: 'w-20 h-40 weapon-slot', label: 'Main Hand' })}
              </div>
              
              <div class="equip-column-center">
                <div class="equip-center-main-row">
                  <div class="equip-side-slots pt-2">
                    ${this.renderEquipSlot({ slotKey: 'RING_1', item: equipped.RING_1, className: 'w-10 h-10 ring-slot', label: 'Ring' })}
                    ${this.renderEquipSlot({ slotKey: 'GLOVES', item: equipped.GLOVES, className: 'w-16 h-16 gloves-slot', label: 'Hands' })}
                    ${this.renderEquipSlot({ slotKey: 'SUMMON', item: equipped.SUMMON, className: 'w-12 h-12 rounded-full summon-slot', label: 'Summon' })}
                  </div>

                  ${this.renderEquipSlot({ slotKey: 'BODY', item: equipped.BODY, className: 'w-28 h-40 body-slot', label: 'Torso' })}

                  <div class="equip-side-slots pt-2">
                    ${this.renderEquipSlot({ slotKey: 'RING_2', item: equipped.RING_2, className: 'w-10 h-10 ring-slot', label: 'Ring' })}
                    ${this.renderEquipSlot({ slotKey: 'BOOTS', item: equipped.BOOTS, className: 'w-16 h-16 boots-slot', label: 'Feet' })}
                    ${this.renderEquipSlot({ slotKey: 'RESONANT', item: equipped.RESONANT, className: 'w-12 h-12 rounded-full resonant-slot', label: 'Resonant' })}
                  </div>
                </div>
                
                ${this.renderEquipSlot({ slotKey: 'BELT', item: equipped.BELT, className: 'w-28 h-10 belt-slot', label: 'Waist' })}
              </div>

              <div class="equip-column-side pt-2">
                ${this.renderEquipSlot({ slotKey: 'WEAPON_OFF', item: equipped.WEAPON_OFF, className: 'w-20 h-40 weapon-slot', label: 'Off Hand' })}
              </div>
            </div>
          </div>
        </div>
        ${this.renderStatsPanel()}
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
        <div class="flex flex-col p-6 gap-2">
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
      <div class="char-header-row">
        <div>
          <h2 class="char-name-doll">${name}</h2>
          <div class="char-subtitle-doll">
            <span class="level-label-doll">LEVEL ${level}</span>
            <span class="doll-dot"></span>
            <span class="class-label-doll">${className}</span>
            <span class="doll-dot"></span>
            <span class="title-label-doll">LICH LORD</span>
          </div>
        </div>
        <div class="doll-icon-container">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20h-13L12 5.5z"/></svg>
        </div>
      </div>
    `;
  }

  renderAttributes(stats) {
    return `
      <div class="stats-col-doll">
        <h4 class="stats-header-doll">Attributes</h4>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Strength</span>
          <span class="stat-value-v3">${stats?.base?.strength || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Dexterity</span>
          <span class="stat-value-v3">${stats?.base?.dexterity || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Intelligence</span>
          <span class="stat-value-v3 highlight-blue">${stats?.base?.intelligence || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Vitality</span>
          <span class="stat-value-v3">${stats?.base?.vitality || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Luck</span>
          <span class="stat-value-v3">42</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Fame</span>
          <span class="stat-value-v3 highlight-gold">12,500</span>
        </div>
      </div>
    `;
  }

  renderDefenses(stats) {
    return `
      <div class="stats-col-doll">
        <h4 class="stats-header-doll">Defenses</h4>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Armour</span>
          <span class="stat-value-v3">${stats?.derived?.defense || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Natural Soak</span>
          <span class="stat-value-v3">18%</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Evasion</span>
          <span class="stat-value-v3">${stats?.derived?.dodge || 0}</span>
        </div>
        <div class="stats-row-v3">
          <span class="stat-label-v3">Energy Shield</span>
          <span class="stat-value-v3 highlight-blue">1,250</span>
        </div>
      </div>
    `;
  }

  renderResistances(stats) {
    return `
      <div class="stats-col-doll">
        <h4 class="stats-header-doll">Resistances</h4>
        <div class="stats-row-v3 highlight-red">
          <span class="stat-label-v3">Fire</span>
          <span class="stat-value-v3">75%</span>
        </div>
        <div class="stats-row-v3 highlight-water">
          <span class="stat-label-v3">Water</span>
          <span class="stat-value-v3">75%</span>
        </div>
        <div class="stats-row-v3 highlight-wind">
          <span class="stat-label-v3">Wind</span>
          <span class="stat-value-v3">68%</span>
        </div>
        <div class="stats-row-v3 highlight-lightning">
          <span class="stat-label-v3">Lightning</span>
          <span class="stat-value-v3">76%</span>
        </div>
        <div class="stats-row-v3 highlight-earth">
          <span class="stat-label-v3">Earth</span>
          <span class="stat-value-v3">52%</span>
        </div>
        <div class="stats-row-v3 highlight-shadow">
          <span class="stat-label-v3">Shadow</span>
          <span class="stat-value-v3">30%</span>
        </div>
        <div class="stats-row-v3 highlight-light">
          <span class="stat-label-v3">Light</span>
          <span class="stat-value-v3">-15%</span>
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
            class="inventory-tab-premium ${isActive ? 'active' : ''}"
          >
            <span class="tab-label-v3">${tab}</span>
          </div>
        `;
      }).join('');

    return `
      <div class="inventory-pane-v3">
        <div class="inventory-tabs-container">
          ${tabs}
          <div class="flex-1"></div>
          <div class="flex items-center gap-1 pb-1">
            <button class="sort-button-premium" data-sort="NAME">NAME</button>
            <button class="sort-button-premium" data-sort="TYPE">TYPE</button>
            <button class="sort-button-premium" data-sort="RARITY">RARITY</button>
          </div>
        </div>

        <div class="inventory-main-content-v3 custom-scrollbar">
          <div class="mx-auto w-fit py-4">
            ${this.renderInventoryContent()}
          </div>
        </div>

        <div class="inventory-footer-v3">
          <div class="footer-stats-v3">
            <div class="footer-stat-v3">
              <span class="footer-stat-dot-gold"></span>
              <span class="footer-stat-label">GOLD</span>
              <span class="footer-stat-value-v3 text-unique">${this.player?.inventory?.currency?.gold || 0}</span>
            </div>
            <div class="footer-stat-v3">
              <span class="footer-stat-dot-resonance"></span>
              <span class="footer-stat-label">RESONANCE</span>
              <span class="footer-stat-value-v3 text-magic">142</span>
            </div>
          </div>
          <div class="footer-status-v3">
            AWAITING INPUT
          </div>
        </div>
      </div>
    `;
  }

  handleTradeOffer(itemId) {
    // Basic logic for a future trading window
    const item = this.getItemById(itemId);
    if (item && this.player.game?.tradingSystem) {
        this.player.game.tradingSystem.offerItem(item);
        this.render();
    }
  }

  render() {
    if (!this.appEl) return;
    this.hideTooltip();

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
          
          <div class="inventory-border-premium t"></div>
          <div class="inventory-border-premium b"></div>
          <div class="inventory-border-premium l"></div>
          <div class="inventory-border-premium r"></div>
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
      this.setupPreviewScene();
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
    wrapper.querySelectorAll('.inventory-tab-premium').forEach(tab => {
      tab.onclick = (e) => {
        e.stopPropagation();
        const tabName = tab.dataset.tab;
        if (this.state.activeTab !== tabName) {
          this.state.activeTab = tabName;
          this.render();
        }
      };
    });
    
    wrapper.querySelectorAll('.sort-button-premium').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.handleSort(btn.dataset.sort);
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
        // Trade Mode: if in trade, move to trade window instead of equip
        if (this.state.isTrading) {
            this.handleTradeOffer(target.dataset.itemId);
        } else {
            this.handleEquip(target.dataset.itemId);
        }
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

    // Drag and Drop events
    wrapper.addEventListener('dragstart', (e) => {
      const target = e.target.closest('.inventory-item-container');
      if (!target) return;

      this.state.draggedSource = {
        type: target.dataset.slotType,
        index: parseInt(target.dataset.slotIndex)
      };
      
      // Visual feedback: make the original item semi-transparent
      target.style.opacity = '0.5';
      
      // Required for Firefox
      e.dataTransfer.setData('text/plain', '');
      e.dataTransfer.effectAllowed = 'move';
    });

    wrapper.addEventListener('dragend', (e) => {
      const target = e.target.closest('.inventory-item-container');
      if (target) target.style.opacity = '1';
      this.state.draggedSource = null;
    });

    wrapper.addEventListener('dragover', (e) => {
      const slot = e.target.closest('.inventory-slot-premium');
      if (slot) {
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drag-over');
      }
    });

    wrapper.addEventListener('dragleave', (e) => {
      const slot = e.target.closest('.inventory-slot-premium');
      if (slot) {
        slot.classList.remove('drag-over');
      }
    });

    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      const slot = e.target.closest('.inventory-slot-premium');
      if (!slot || !this.state.draggedSource) return;

      slot.classList.remove('drag-over');

      const target = {
        type: slot.dataset.slotType,
        index: parseInt(slot.dataset.slotIndex)
      };

      if (this.player.inventory.moveItem(this.state.draggedSource, target)) {
        this.syncWithPlayer();
        this.render();
      }
    });

    // Prevent propagation
    wrapper.onclick = (e) => e.stopPropagation();
  }
}
