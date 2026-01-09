import { ItemRarity } from '../inventory_types.js';

/**
 * Utility to generate consistent, thematic SVG icons for items.
 * Ported from the React version to native ES modules.
 */
export const getIcon = (type, rarity) => {
  const colors = {
    [ItemRarity.UNIQUE]: '#d4af37', // Gold
    [ItemRarity.RARE]: '#fcd34d',   // Yellow
    [ItemRarity.MAGIC]: '#60a5fa',  // Blue
    [ItemRarity.NORMAL]: '#a3a3a3', // Grey
    [ItemRarity.QUEST]: '#a855f7',  // Purple
    [ItemRarity.GEM]: '#22d3ee',    // Cyan
    [ItemRarity.ENCHANTMENT]: '#d8b4fe' // Pale Purple
  };
  
  const color = colors[rarity] || colors[type] || '#9ca3af';
  
  let path = '';
  // Generate distinct shapes based on item type
  switch (type) {
    case 'Staff': 
      path = '<path d="M32 6 L32 58 M24 14 L40 10 M28 48 L36 50" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>'; 
      break;
    case 'Body Armour': 
    case 'Chest':
      path = '<path d="M16 14 Q32 54 48 14 L48 42 Q32 62 16 42 Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>'; 
      break;
    case 'Helmet': 
    case 'Helm':
      path = '<path d="M16 32 Q32 4 48 32 L48 48 L16 48 Z M32 12 L32 48" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>'; 
      break;
    case 'Gloves': 
      path = '<path d="M18 20 L28 20 L28 44 L18 44 Z M36 20 L46 20 L46 44 L36 44 Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>'; 
      break;
    case 'Boots': 
      path = '<path d="M20 18 L30 18 L32 40 L44 40 L44 48 L20 48 Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>'; 
      break;
    case 'Ring': 
      path = '<circle cx="32" cy="32" r="10" stroke="currentColor" stroke-width="3" fill="none"/><circle cx="32" cy="22" r="2.5" fill="currentColor"/>'; 
      break;
    case 'Flask': 
      path = '<path d="M26 20 L38 20 L42 46 L22 46 Z M32 14 L32 20" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.25"/>'; 
      break;
    case 'Quest': 
      path = '<path d="M22 14 L42 14 L42 50 L32 44 L22 50 Z M28 20 L36 20 M28 28 L36 28" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.2"/>'; 
      break;
    case 'Enchantment':
      path = '<circle cx="32" cy="32" r="18" stroke="currentColor" stroke-width="2" fill="none" opacity="0.6"/><path d="M32 16 L36 28 L48 32 L36 36 L32 48 L28 36 L16 32 L28 28 Z" fill="currentColor"/>';
      break;
    case 'Gem': 
      path = '<path d="M32 12 L48 28 L32 52 L16 28 Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.4"/>'; 
      break;
    default: 
      path = '<circle cx="32" cy="32" r="16" stroke="currentColor" stroke-width="2" fill="none"/>';
  }

  // Use a sanitized rarity string for IDs
  const rarityId = (rarity || 'Normal').replace(/\s+/g, '');

  // Create SVG string
  const svg = `
  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="grad-${type}-${rarityId}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:0.25" />
        <stop offset="100%" style="stop-color:#000;stop-opacity:0" />
      </radialGradient>
      <filter id="glow-${type}-${rarityId}">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="64" height="64" fill="#0f0f0f"/>
    <circle cx="32" cy="32" r="28" fill="url(#grad-${type}-${rarityId})" />
    <g color="${color}" filter="url(#glow-${type}-${rarityId})">
      ${path}
    </g>
  </svg>`.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};
