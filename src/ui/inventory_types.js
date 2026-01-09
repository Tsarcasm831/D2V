/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} rarity
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} icon
 * @property {string} [description]
 * @property {string[]} [stats]
 * @property {string} [lore]
 * @property {number} [levelReq]
 * @property {number} [defense]
 * @property {number} [attackSpeed]
 * @property {number} [critChance]
 * @property {number} [blockChance]
 * @property {string} [damageRange]
 * @property {number} [count]
 */

export const ItemRarity = {
  NORMAL: 'Normal',
  MAGIC: 'Magic',
  RARE: 'Rare',
  UNIQUE: 'Unique',
  QUEST: 'Quest',
  GEM: 'Gem',
  ENCHANTMENT: 'Enchantment'
};

export const SlotType = {
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
  INVENTORY: 'INVENTORY',
  SUMMON: 'SUMMON',
  RESONANT: 'RESONANT',
  SHORTS: 'SHORTS',
  TRINKET: 'TRINKET'
};

export const INVENTORY_CONFIG = {
  COLS: 7,
  ROWS: 8,
  CELL_SIZE: 50
};
