import { escapeHtml } from '../utils.js';
import { ItemRarity } from '../inventory_types.js';

export class Tooltip {
  constructor(elementId = 'tooltip') {
    this.el = document.getElementById(elementId);
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = elementId;
      document.body.appendChild(this.el);
    }
    this.state = {
      itemId: null,
      x: 0,
      y: 0
    };
  }

  getRarityHeaderColor(rarity) {
    switch (rarity) {
      case ItemRarity.MAGIC: return 'text-magic';
      case ItemRarity.RARE: return 'text-rare';
      case ItemRarity.UNIQUE: return 'text-unique';
      case ItemRarity.QUEST: return 'text-quest';
      case ItemRarity.GEM: return 'text-gem';
      default: return 'text-normal';
    }
  }

  getBorderColor(rarity) {
    switch (rarity) {
      case ItemRarity.MAGIC: return 'border-magic';
      case ItemRarity.RARE: return 'border-rare';
      case ItemRarity.UNIQUE: return 'border-unique';
      case ItemRarity.QUEST: return 'border-quest';
      case ItemRarity.GEM: return 'border-gem';
      default: return 'border-normal';
    }
  }

  /**
   * @param {import('../inventory_types.js').Item} item
   */
  renderContent(item) {
    const isGeneric = !item.rarity || item.rarity === ItemRarity.NORMAL;
    const headerColor = this.getRarityHeaderColor(item.rarity);
    
    return `
      <div class="tooltip-header">
        <h3 class="tooltip-title ${headerColor}">
          ${escapeHtml(item.name)}
        </h3>
        ${!isGeneric ? `
          <div class="tooltip-rarity-row">
            <div class="tooltip-rarity-line"></div>
            <span class="tooltip-rarity-text">${escapeHtml(item.rarity)} ${escapeHtml(item.type || '')}</span>
            <div class="tooltip-rarity-line"></div>
          </div>
        ` : ''}
      </div>
      <div class="tooltip-body">
        ${item.damageRange ? `<div class="tooltip-stat">Damage: <span class="text-white">${item.damageRange}</span></div>` : ''}
        ${item.defense ? `<div class="tooltip-stat">Defense: <span class="text-white">${item.defense}</span></div>` : ''}
        ${item.attackSpeed ? `<div class="tooltip-stat">Attack Speed: <span class="text-white">${item.attackSpeed}</span></div>` : ''}
        
        ${item.stats ? item.stats.map(stat => `<p class="tooltip-mod">${escapeHtml(stat)}</p>`).join('') : ''}
        
        ${item.description ? `<p class="tooltip-description">${escapeHtml(item.description)}</p>` : ''}
        ${item.lore ? `<p class="tooltip-lore">"${escapeHtml(item.lore)}"</p>` : ''}
        ${item.levelReq ? `<p class="tooltip-level-req">Requires Level ${item.levelReq}</p>` : ''}
      </div>
    `;
  }

  show(item, x, y) {
    if (!item || !this.el) return;
    this.state.itemId = item.id;
    this.state.x = x;
    this.state.y = y;
    
    const borderClass = this.getBorderColor(item.rarity);
    this.el.className = `tooltip-premium ${borderClass}`;
    this.el.innerHTML = this.renderContent(item);
    this.el.style.display = 'block';
    this.el.style.opacity = '1';
    this.el.style.visibility = 'visible';
    this.position(x, y);
  }

  hide() {
    if (!this.el) return;
    this.state.itemId = null;
    this.el.style.opacity = '0';
    this.el.style.display = 'none';
    this.el.style.visibility = 'hidden';
  }

  position(x, y) {
    if (!this.state.itemId || !this.el) return;
    const padding = 15;
    const tooltipWidth = this.el.offsetWidth || 300;
    const tooltipHeight = this.el.offsetHeight || 200;
    
    let left = x + padding;
    let top = y + padding;

    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - padding;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = y - tooltipHeight - padding;
    }

    this.el.style.left = `${Math.max(10, left)}px`;
    this.el.style.top = `${Math.max(10, top)}px`;
  }
}
