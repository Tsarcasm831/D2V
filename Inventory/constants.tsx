
import { Item, ItemRarity } from './types';

// Utility to generate consistent, thematic SVG icons
const getIcon = (type: string, rarity: string): string => {
  const colors: Record<string, string> = {
    [ItemRarity.UNIQUE]: '#d4af37', // Gold
    [ItemRarity.RARE]: '#fcd34d',   // Yellow
    [ItemRarity.MAGIC]: '#60a5fa',  // Blue
    [ItemRarity.NORMAL]: '#a3a3a3', // Grey
    'Quest': '#a855f7',             // Purple
    'Gem': '#22d3ee',               // Cyan
    'Enchantment': '#d8b4fe'        // Pale Purple
  };
  
  const color = colors[rarity] || colors[type] || '#9ca3af';
  
  let path = '';
  // Generate distinct shapes based on item type
  switch (type) {
    case 'Staff': 
      path = '<path d="M32 6 L32 58 M24 14 L40 10 M28 48 L36 50" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>'; 
      break;
    case 'Body Armour': 
      path = '<path d="M16 14 Q32 54 48 14 L48 42 Q32 62 16 42 Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>'; 
      break;
    case 'Helmet': 
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

  // Create SVG string
  const svg = `
  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="grad-${type}-${rarity.replace(' ','')}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:0.25" />
        <stop offset="100%" style="stop-color:#000;stop-opacity:0" />
      </radialGradient>
      <filter id="glow-${type}-${rarity.replace(' ','')}">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="64" height="64" fill="#0f0f0f"/>
    <circle cx="32" cy="32" r="28" fill="url(#grad-${type}-${rarity.replace(' ','')})" />
    <g color="${color}" filter="url(#glow-${type}-${rarity.replace(' ','')})">
      ${path}
    </g>
  </svg>`.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'weapon-1',
    name: "Night's Whisper",
    type: "Staff",
    rarity: ItemRarity.UNIQUE,
    width: 2,
    height: 4,
    icon: getIcon('Staff', ItemRarity.UNIQUE),
    damageRange: "42-88",
    attackSpeed: 1.25,
    critChance: 6.5,
    stats: [
      "+(15-20)% Spell Damage", 
      "Gain (8-12) Life on Kill", 
      "Adds (10-15) to (20-30) Cold Damage",
      "Nearby enemies are Chilled"
    ],
    lore: "A relic from the silenced woods.",
    levelReq: 45
  },
  {
    id: 'chest-1',
    name: "Spectral Shroud",
    type: "Body Armour",
    rarity: ItemRarity.UNIQUE,
    width: 2,
    height: 3,
    icon: getIcon('Body Armour', ItemRarity.UNIQUE),
    defense: 452,
    stats: [
      "+(70-90) Maximum Life", 
      "(12-18)% Physical Damage Reduction", 
      "Regenerate 1.5% Energy Shield per second",
      "Phasing while at maximum Energy Shield"
    ],
    lore: "It flutters even when the wind is still.",
    levelReq: 52
  },
  {
    id: 'helm-1',
    name: "Crown of Thorns",
    type: "Helmet",
    rarity: ItemRarity.UNIQUE,
    width: 2,
    height: 2,
    icon: getIcon('Helmet', ItemRarity.UNIQUE),
    defense: 120,
    stats: [
      "Reflects (40-60) Physical Damage to Melee Attackers", 
      "+(15-25) to Resonance"
    ],
    lore: "Uneasy is the head that wears it.",
    levelReq: 12
  },
  {
    id: 'gloves-1',
    name: "Titan's Grip",
    type: "Gloves",
    rarity: ItemRarity.RARE,
    width: 2,
    height: 2,
    icon: getIcon('Gloves', ItemRarity.RARE),
    defense: 88,
    stats: ["+(10-12) Strength", "+(5-7)% Attack Speed", "+24% Fire Resistance"],
    levelReq: 30
  },
  {
    id: 'boots-1',
    name: "Shadow Steps",
    type: "Boots",
    rarity: ItemRarity.MAGIC,
    width: 2,
    height: 2,
    icon: getIcon('Boots', ItemRarity.MAGIC),
    defense: 45,
    stats: ["+(20-25)% Increased Movement Speed"],
    levelReq: 15
  },
  {
    id: 'ring-1',
    name: "Ancient Band",
    type: "Ring",
    rarity: ItemRarity.RARE,
    width: 1,
    height: 1,
    icon: getIcon('Ring', ItemRarity.RARE),
    stats: [
      "+(25-30)% Fire Resistance",
      "+(10-15) Maximum Mana",
      "Adds 2 to 4 Physical Damage to Attacks"
    ],
    levelReq: 20
  },
  {
    id: 'flask-1',
    name: "Sanguine Elixir",
    type: "Flask",
    rarity: ItemRarity.NORMAL,
    width: 1,
    height: 2,
    icon: getIcon('Flask', ItemRarity.NORMAL),
    description: "Restores 250 Life over 6 seconds."
  },
  {
    id: 'flask-2',
    name: "Mana Draught",
    type: "Flask",
    rarity: ItemRarity.NORMAL,
    width: 1,
    height: 2,
    icon: getIcon('Flask', ItemRarity.MAGIC),
    description: "Restores 120 Mana over 4 seconds."
  },
  {
    id: 'inv-item-1',
    name: "Chainmail Vest",
    type: "Body Armour",
    rarity: ItemRarity.NORMAL,
    width: 2,
    height: 3,
    icon: getIcon('Body Armour', ItemRarity.NORMAL),
    defense: 112
  },
  // Enchantments (Previously Currency)
  { 
    id: 'orb-entropy', 
    name: 'Orb of Entropy', 
    type: 'Enchantment', 
    rarity: ItemRarity.RARE,
    width: 1, 
    height: 1, 
    icon: getIcon('Enchantment', ItemRarity.RARE), 
    description: 'Reformulates the magical properties of an object, twisting its fate.' 
  },
  { 
    id: 'sphere-celestial', 
    name: 'Celestial Sphere', 
    type: 'Enchantment', 
    rarity: ItemRarity.UNIQUE,
    width: 1, 
    height: 1, 
    icon: getIcon('Enchantment', ItemRarity.UNIQUE), 
    description: 'Imbues a rare artifact with a powerful, heavenly enchantment.' 
  },
  { 
    id: 'frag-titan', 
    name: 'Titan Fragment', 
    type: 'Enchantment', 
    rarity: ItemRarity.MAGIC,
    width: 1, 
    height: 1, 
    icon: getIcon('Enchantment', ItemRarity.MAGIC), 
    description: 'A crystallized shard from the age of giants, pulsing with faint energy.' 
  },
];

export const QUEST_ITEMS: Item[] = [
    { 
        id: 'quest-key', 
        name: 'Iron Key of Solitude', 
        type: 'Quest', 
        rarity: ItemRarity.UNIQUE, 
        width: 1, 
        height: 1, 
        icon: getIcon('Quest', ItemRarity.UNIQUE), 
        description: 'Opens the gates to the forgotten ossuary.' 
    }
];

export const GEM_ITEMS = [
  { id: 'gem-1', name: 'Fireball', icon: getIcon('Gem', 'Gem'), description: 'Launches a projectile of pure flame.' },
  { id: 'gem-2', name: 'Frostblink', icon: getIcon('Gem', 'Gem'), description: 'Teleport and leave a trail of ice.' },
];

export const INVENTORY_COLS = 7;
export const INVENTORY_ROWS = 8;
export const CELL_SIZE = 50; // pixels
