import { GoogleGenAI } from "https://esm.sh/@google/genai@^1.34.0";

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
    
    // Explicitly handle reset button visibility
    const resetBtn = document.getElementById('reset-character-btn');
    if (resetBtn) {
        resetBtn.style.display = newDisplay === 'flex' ? 'none' : 'block';
    }

    if (!isVisible) {
      this.syncWithPlayer();
      this.render();
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
      case ItemRarity.MAGIC: return 'text-blue-400';
      case ItemRarity.RARE: return 'text-[#fcd34d]';
      case ItemRarity.UNIQUE: return 'text-[#fbbf24]';
      default: return 'text-neutral-200';
    }
  }

  getBorderColor(rarity) {
    switch (rarity) {
      case ItemRarity.MAGIC: return 'border-blue-900/60';
      case ItemRarity.RARE: return 'border-yellow-900/60';
      case ItemRarity.UNIQUE: return 'border-orange-900/60';
      default: return 'border-neutral-800';
    }
  }

  renderTooltipContent(item) {
    const isGeneric = !item.rarity;
    const headerColor = isGeneric ? 'text-neutral-200' : this.getRarityHeaderColor(item.rarity);
    return `
      <div class="py-3 px-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
        <h3 class="text-lg font-cinzel font-bold ${headerColor} uppercase tracking-wider text-center drop-shadow-sm">
          ${escapeHtml(item.name)}
        </h3>
        ${!isGeneric ? `
          <div class="flex justify-center items-center gap-2 mt-1">
            <div class="h-[1px] w-8 bg-current opacity-30"></div>
            <span class="text-[10px] uppercase font-cinzel text-neutral-400 tracking-widest">${escapeHtml(item.rarity)} ${escapeHtml(item.type)}</span>
            <div class="h-[1px] w-8 bg-current opacity-30"></div>
          </div>
        ` : ''}
      </div>
      <div class="p-4 space-y-4">
        ${item.description ? `<p class="text-[13px] text-neutral-400 italic font-serif leading-relaxed">${escapeHtml(item.description)}</p>` : ''}
        ${item.lore ? `<p class="text-[13px] text-[#c8aa6e] opacity-60 italic font-serif leading-relaxed">"${escapeHtml(item.lore)}"</p>` : ''}
      </div>
    `;
  }

  showTooltip(item, x, y) {
    if (!item || !this.tooltipEl) return;
    this.state.tooltipItemId = item.id;
    this.state.tooltipX = x;
    this.state.tooltipY = y;
    const borderClass = item.rarity ? this.getBorderColor(item.rarity) : 'border-neutral-800';
    this.tooltipEl.className = `fixed z-[100] pointer-events-none p-0 min-w-[280px] max-w-[340px] border shadow-[0_20px_60px_rgba(0,0,0,1)] bg-[#080808]/95 backdrop-blur-md transition-opacity duration-150 ${borderClass}`;
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
      <div class="relative slot-border flex items-center justify-center cursor-pointer group rounded-sm ${className} ${hasItem ? 'bg-[#050505]' : 'bg-[#080808]'}"
        ${hasItem ? `data-action="unequip" data-slot="${slotKey}" data-tooltip-id="${item.id}"` : ''}>
        ${!hasItem && label ? `<span class="absolute top-1 left-0 w-full text-center text-[8px] uppercase font-cinzel text-neutral-600 tracking-widest font-semibold pointer-events-none opacity-60">${escapeHtml(label)}</span>` : ''}
        ${hasItem ? `<img src="${item.icon}" class="w-full h-full object-contain p-1" />` : ''}
      </div>
    `;
  }

  renderInventoryContent() {
    const totalCells = INVENTORY_ROWS * INVENTORY_COLS;
    const cellClass = 'relative group w-[48px] h-[48px] md:w-[50px] md:h-[50px] bg-[#0a0a0a] hover:bg-[#111] transition-colors flex items-center justify-center';

    if (this.state.activeTab === 'CURRENCY') {
      const currencyCells = CURRENCY_ITEMS.map((curr) => (
        `<div class="${cellClass}" data-tooltip-id="${curr.id}">
          <div class="w-full h-full p-2">
            <img src="${curr.icon}" class="w-full h-full object-contain transition-transform group-hover:scale-110" alt="${escapeHtml(curr.name)}" />
          </div>
          <div class="absolute bottom-0.5 right-1 text-[9px] text-[#fbbf24] font-bold font-cinzel drop-shadow-md">20</div>
        </div>`
      )).join('');

      const emptyCount = Math.max(0, 64 - CURRENCY_ITEMS.length);
      const emptyCells = Array.from({ length: emptyCount })
        .map(() => `<div class="${cellClass}"></div>`)
        .join('');

      return `
        <div class="animate-fade-in bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
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
            <img src="${gem.icon}" class="w-full h-full object-contain transition-transform group-hover:scale-110 brightness-110" alt="${escapeHtml(gem.name)}" />
          </div>
        </div>`
      )).join('');

      const emptyCount = Math.max(0, 64 - GEM_ITEMS.length);
      const emptyCells = Array.from({ length: emptyCount })
        .map(() => `<div class="${cellClass}"></div>`)
        .join('');

      return `
        <div class="animate-fade-in bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
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

      return `
        <div class="${cellClass}">
          ${!item ? `
            <div class="absolute inset-0 opacity-[0.03] pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 10 10">
                <path d="M0 0 L10 10" stroke="currentColor" stroke-width="0.5"/>
              </svg>
            </div>
          ` : ''}

          ${item ? `
            <div
              class="absolute inset-0 z-10 p-[3px] cursor-pointer"
              data-action="equip"
              data-item-id="${item.id}"
              data-tooltip-id="${item.id}"
            >
              <img src="${item.icon}" class="w-full h-full object-contain rounded-sm saturate-[0.85] group-hover:saturate-100 transition-all drop-shadow-sm" alt="${escapeHtml(item.name)}" />
              <div class="absolute bottom-[2px] left-[2px] right-[2px] h-[2px] opacity-70 ${item.rarity === ItemRarity.UNIQUE ? 'bg-orange-600' : item.rarity === ItemRarity.RARE ? 'bg-yellow-500' : item.rarity === ItemRarity.MAGIC ? 'bg-blue-600' : 'bg-transparent'}"></div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="animate-fade-in bg-[#2a221a] p-[1px] shadow-2xl mx-auto w-fit select-none">
        <div class="new-inventory-grid">
          ${cells}
        </div>
      </div>
    `;
  }

  renderEquipmentSection() {
    const stats = this.player?.stats;
    const charName = (this.player?.characterData?.name || 'ADVENTURER').toUpperCase();
    const charLevel = this.player?.level || 1;
    const charClass = this.player?.characterData?.class || 'Nomad';

    const equipped = this.state.equipped;

    return `
      <div class="flex-[1.4] flex flex-col bg-[#0c0c0c] border-r border-[#1f1a14] relative overflow-hidden">
        <div class="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] bg-repeat"></div>

        <!-- Silhouette -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-[70%] h-[70%] opacity-[0.07] border-[30px] border-[#c8aa6e] rounded-full blur-[80px] translate-y-[-5%]"></div>
            <svg class="absolute h-[580px] w-auto opacity-[0.04]" viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet" fill="#c8aa6e">
               <path d="M50 10 C 65 10, 75 25, 75 40 C 75 55, 65 65, 50 65 C 35 65, 25 55, 25 40 C 25 25, 35 10, 50 10 Z M 20 70 L 80 70 L 90 120 L 80 140 L 50 140 L 20 140 L 10 120 Z M 30 145 L 70 145 L 75 190 L 25 190 Z" />
            </svg>
            <div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60"></div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-start py-8 relative z-10 overflow-y-auto custom-scrollbar">
          <div class="paper-doll-container scale-90">
            <!-- Head Row -->
            <div class="flex justify-center gap-4 mb-4">
              ${this.renderEquipSlot({ slotKey: 'AMULET', item: equipped.AMULET, className: 'w-12 h-12 rounded-full', label: 'Neck' })}
              ${this.renderEquipSlot({ slotKey: 'HELMET', item: equipped.HELMET, className: 'w-16 h-16', label: 'Head' })}
              ${this.renderEquipSlot({ slotKey: 'TRINKET', item: equipped.TRINKET, className: 'w-12 h-12 rounded-full', label: 'Relic' })}
            </div>

            <!-- Torso Row -->
            <div class="flex justify-center items-center gap-4 mb-4">
              <div class="flex flex-col gap-4">
                ${this.renderEquipSlot({ slotKey: 'RING_1', item: equipped.RING_1, className: 'w-12 h-12', label: 'Ring' })}
                ${this.renderEquipSlot({ slotKey: 'GLOVES', item: equipped.GLOVES, className: 'w-16 h-16', label: 'Hands' })}
              </div>
              
              <div class="flex flex-col gap-1 items-center">
                ${this.renderEquipSlot({ slotKey: 'BODY', item: equipped.BODY, className: 'w-32 h-48', label: 'Torso' })}
                ${this.renderEquipSlot({ slotKey: 'SHORTS', item: equipped.SHORTS, className: 'w-32 h-12', label: 'Legs' })}
              </div>

              <div class="flex flex-col gap-4">
                ${this.renderEquipSlot({ slotKey: 'RING_2', item: equipped.RING_2, className: 'w-12 h-12', label: 'Ring' })}
                ${this.renderEquipSlot({ slotKey: 'BOOTS', item: equipped.BOOTS, className: 'w-16 h-16', label: 'Feet' })}
              </div>
            </div>

            <!-- Belt Row -->
            <div class="flex justify-center mb-6">
              ${this.renderEquipSlot({ slotKey: 'BELT', item: equipped.BELT, className: 'w-64 h-12', label: 'Waist' })}
            </div>

            <!-- Weapon Row -->
            <div class="flex justify-center gap-16 border-t border-white/5 pt-6">
              ${this.renderEquipSlot({ slotKey: 'WEAPON_MAIN', item: equipped.WEAPON_MAIN, className: 'w-24 h-48', label: 'Main Hand' })}
              <div class="flex flex-col gap-3">
                ${['FLASK_1', 'FLASK_2', 'FLASK_3', 'FLASK_4', 'FLASK_5'].map((slotKey, idx) => 
                  this.renderEquipSlot({ slotKey, item: equipped[slotKey], className: 'w-12 h-16', label: String(idx + 1) })
                ).join('')}
              </div>
              ${this.renderEquipSlot({ slotKey: 'WEAPON_OFF', item: equipped.WEAPON_OFF, className: 'w-24 h-48', label: 'Off Hand' })}
            </div>
          </div>
        </div>

        <!-- Stats Panel -->
        <div class="relative z-20 bg-[#0a0a0a] border-t border-[#2a221a] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div class="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c8aa6e]/40 to-transparent"></div>

          <div class="flex flex-col p-6 gap-6">
            <div class="flex justify-between items-end border-b border-[#1f1a14] pb-3">
              <div>
                <h2 class="text-2xl font-cinzel text-[#c8aa6e] tracking-wider font-bold drop-shadow-sm leading-none">
                  ${charName}
                </h2>
                <div class="flex items-center gap-2 mt-1 opacity-80">
                  <span class="text-xs font-cinzel text-neutral-400 tracking-[0.2em] uppercase">Level ${charLevel}</span>
                  <span class="w-1 h-1 rounded-full bg-[#444]"></span>
                  <span class="text-xs font-cinzel text-[#a3a3a3] uppercase">${charClass}</span>
                </div>
              </div>
              <div class="w-10 h-10 border border-[#2a221a] bg-[#0f0f0f] flex items-center justify-center opacity-50 rounded-sm">
                <svg class="w-6 h-6 text-[#555]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20h-13L12 5.5z"/></svg>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-6">
              <div class="space-y-2">
                <h4 class="text-[10px] font-cinzel text-[#666] uppercase tracking-widest mb-2">Attributes</h4>
                <div class="flex justify-between text-sm font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                  <span>Strength</span> <span class="text-white">${stats?.base?.strength || 0}</span>
                </div>
                <div class="flex justify-between text-sm font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                  <span>Dexterity</span> <span class="text-white">${stats?.base?.dexterity || 0}</span>
                </div>
                <div class="flex justify-between text-sm font-serif text-[#60a5fa] border-b border-[#1a1a1a] pb-1">
                  <span>Intelligence</span> <span class="font-bold">${stats?.base?.intelligence || 0}</span>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-[10px] font-cinzel text-[#666] uppercase tracking-widest mb-2">Defenses</h4>
                <div class="flex justify-between text-sm font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                  <span>Armour</span> <span class="text-white">${stats?.derived?.defense || 0}</span>
                </div>
                <div class="flex justify-between text-sm font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                  <span>Evasion</span> <span class="text-white">${stats?.derived?.dodge || 0}</span>
                </div>
                <div class="flex justify-between text-sm font-serif text-[#60a5fa] border-b border-[#1a1a1a] pb-1">
                  <span>Energy Shield</span> <span class="font-bold">0</span>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-[10px] font-cinzel text-[#666] uppercase tracking-widest mb-2">Resistances</h4>
                <div class="flex justify-between text-sm font-serif text-[#ef4444] border-b border-[#1a1a1a] pb-1">
                  <span>Fire</span> <span>0%</span>
                </div>
                <div class="flex justify-between text-sm font-serif text-[#3b82f6] border-b border-[#1a1a1a] pb-1">
                  <span>Cold</span> <span>0%</span>
                </div>
                <div class="flex justify-between text-sm font-serif text-[#eab308] border-b border-[#1a1a1a] pb-1">
                  <span>Lightning</span> <span>0%</span>
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
            class="inventory-tab-premium ${isActive ? 'active' : ''} whitespace-nowrap"
          >
            ${tab}
          </button>
        `;
      })
      .join('');

    const sortControls = this.state.activeTab === 'GENERAL' ? `
      <div id="inventory-sort-controls" class="flex items-center gap-1 pb-2">
        ${['NAME', 'TYPE', 'RARITY'].map((label) => (
          `<button
            data-sort="${label}"
            class="sort-button-premium whitespace-nowrap"
          >
            ${label}
          </button>`
        )).join('')}
      </div>
    ` : '';

    return `
      <div class="inventory-grid-pane">
        <div class="inventory-tabs-container shrink-0 overflow-x-auto no-scrollbar">
          ${tabs}
          <div class="flex-1"></div>
          ${sortControls}
        </div>

        <div class="flex-1 overflow-auto p-6 custom-scrollbar bg-[radial-gradient(circle_at_top,_#0f0f0f_0%,_#050505_100%)]">
          <div class="mx-auto w-fit">
            ${this.renderInventoryContent()}
          </div>
        </div>

        <div class="inventory-footer-premium">
          <div class="flex items-center gap-6">
            <div class="footer-stat">
              <span class="footer-stat-dot bg-yellow-600/50"></span>
              <span class="footer-stat-label">Gold</span>
              <span class="footer-stat-value text-[#c8aa6e] font-serif">${this.player?.inventory?.currency?.gold || 0}</span>
            </div>
            <div class="footer-stat">
              <span class="footer-stat-dot bg-blue-600/50"></span>
              <span class="footer-stat-label">Resonance</span>
              <span class="footer-stat-value text-[#60a5fa] font-serif">0</span>
            </div>
          </div>
          <div class="text-[9px] font-cinzel text-[#333] tracking-[0.2em] uppercase">
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
      <div id="inventory-overlay-wrapper" class="fixed inset-0 flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm z-[2000] overflow-hidden select-none font-serif pointer-events-auto" style="display: ${currentDisplay}">
        <div class="fixed inset-0 pointer-events-none overflow-hidden select-none">
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1a1a_0%,_#050505_80%)]"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80"></div>
        </div>

        <div class="relative w-full max-w-[1080px] h-[88vh] flex flex-col bg-[#0a0a0a] border border-[#2a221a] shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-[2px] overflow-hidden z-[2001] animate-fade-in ring-1 ring-[#1a1a1a] ring-offset-0 pointer-events-auto">
          <div class="relative h-12 w-full flex items-center justify-between px-6 bg-[#0f0f0f] border-b border-[#2a221a] shrink-0 select-none">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-[#c8aa6e] shadow-[0_0_8px_rgba(200,170,110,0.4)]"></div>
              <h1 class="font-cinzel text-lg text-[#c8aa6e] tracking-[0.15em] font-semibold drop-shadow-sm">
                INVENTORY
              </h1>
            </div>
            <div class="flex items-center gap-4 text-[#4a3f32] text-[10px] font-cinzel">
              <span class="tracking-widest opacity-60 uppercase">System Protocol <span class="text-[#665c4e] ml-1">X7-AEGIS</span></span>
              <div id="close-new-inv" class="text-2xl cursor-pointer hover:text-[#c8aa6e] transition-all hover:scale-110 ml-4 leading-none">&times;</div>
            </div>
          </div>

          <div class="inventory-layout">
            ${this.renderEquipmentSection()}
            ${this.renderInventoryPane()}
          </div>
        </div>

        <div class="absolute bottom-4 flex gap-8 pointer-events-none select-none opacity-20">
          <span class="text-[9px] font-cinzel text-neutral-500 uppercase tracking-[0.2em]">
            Inventory System v1.0.4
          </span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = document.getElementById('close-new-inv');
    if (closeBtn) closeBtn.onclick = () => this.toggle();
    this.appEl.querySelectorAll('[data-tooltip-id]').forEach(el => {
      el.onmouseenter = (e) => this.showTooltip(this.getTooltipItemById(el.dataset.tooltipId), e.clientX, e.clientY);
      el.onmouseleave = () => this.hideTooltip();
    });
    this.appEl.querySelectorAll('[data-action="equip"]').forEach(el => {
      el.ondblclick = () => this.handleEquip(el.dataset.itemId);
    });
  }
}


