import { escapeHtml } from '../utils.js';

export class EquipSlot {
  /**
   * @param {Object} options
   * @param {string} options.slotKey
   * @param {import('./inventory_types.js').Item|null} options.item
   * @param {string} options.className
   * @param {string} [options.label]
   */
  static render({ slotKey, item, className, label }) {
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
}
