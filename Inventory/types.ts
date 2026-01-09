
export enum ItemRarity {
  NORMAL = 'Normal',
  MAGIC = 'Magic',
  RARE = 'Rare',
  UNIQUE = 'Unique'
}

export enum SlotType {
  HELMET = 'HELMET',
  BODY = 'BODY',
  GLOVES = 'GLOVES',
  BOOTS = 'BOOTS',
  BELT = 'BELT',
  RING = 'RING',
  AMULET = 'AMULET',
  WEAPON_MAIN = 'WEAPON_MAIN',
  WEAPON_OFF = 'WEAPON_OFF',
  FLASK = 'FLASK',
  CHARM = 'CHARM',
  INVENTORY = 'INVENTORY',
  SUMMON = 'SUMMON',
  RESONANT = 'RESONANT'
}

export interface Item {
  id: string;
  name: string;
  type: string;
  rarity: ItemRarity;
  width: number;
  height: number;
  icon: string;
  description?: string;
  stats?: string[];
  lore?: string;
  levelReq?: number;
  // New detailed properties
  defense?: number;
  attackSpeed?: number;
  critChance?: number;
  blockChance?: number;
  damageRange?: string;
}

export interface InventorySlot {
  x: number;
  y: number;
  itemId?: string;
}

export interface EquippedItems {
  [SlotType.HELMET]?: Item;
  [SlotType.BODY]?: Item;
  [SlotType.GLOVES]?: Item;
  [SlotType.BOOTS]?: Item;
  [SlotType.BELT]?: Item;
  ring1?: Item;
  ring2?: Item;
  amulet?: Item;
  [SlotType.WEAPON_MAIN]?: Item;
  [SlotType.WEAPON_OFF]?: Item;
  flasks: (Item | null)[];
}
