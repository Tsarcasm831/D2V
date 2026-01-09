
export enum WeaponType {
  SWORD = 'Sword',
  AXE = 'Axe',
  MACE = 'Mace',
  SPEAR = 'Spear',
  DAGGER = 'Dagger',
  KUNAI = 'Kunai',
  CHAKRAM = 'Chakram',
  ARROW = 'Arrow',
  SHIRT = 'Shirt',
  FISHING_POLE = 'Fishing Pole'
}

export enum WeaponEffect {
  NONE = 'None',
  FIRE = 'Fire',
  LIGHTNING = 'Lightning',
  GLOW = 'Glow',
  FROST = 'Frost',
  POISON = 'Poison',
  MUD = 'Mud'
}

export enum TextureStyle {
  NONE = 'None',
  CLOTH = 'Cloth Wrap',
  LEATHER = 'Leather',
  WOOD = 'Wood',
  DAMASCUS = 'Damascus',
  SCALES = 'Scales',
  RUST = 'Rust',
  COSMIC = 'Cosmic'
}

export interface WeaponConfig {
  type: WeaponType;
  // Dimensions (Normalized 0.5 - 2.0 usually)
  handleLength: number;
  handleRadius: number;
  guardWidth: number;
  bladeLength: number;
  bladeWidth: number; // For axe, this is head width
  bladeThickness: number;
  pommelSize: number;
  
  // Materials
  handleColor: string;
  metalColor: string;
  guardColor: string;
  roughness: number;
  metalness: number;
  
  // Textures
  handleTexture?: TextureStyle;
  bladeTexture?: TextureStyle;

  // Effects
  effect: WeaponEffect;
  effectColor: string;
  
  // Variation
  variant?: string; // 'wavy', 'curved', 'rapier', etc.
}

export interface Preset {
  name: string;
  config: WeaponConfig;
}