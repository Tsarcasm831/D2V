
export type BodyVariant = 'average' | 'muscular' | 'slim' | 'heavy';
export type OutfitType = 'nude' | 'naked' | 'peasant' | 'warrior' | 'noble';
export type WeaponStance = 'side' | 'shoulder';

export interface EquipmentState {
  helm: boolean;
  shoulders: boolean;
  shield: boolean;
}

export interface PlayerConfig {
  // Base
  bodyType: 'male' | 'female';
  bodyVariant: BodyVariant;
  outfit: OutfitType;
  equipment: EquipmentState;
  selectedItem: string | null;
  weaponStance: WeaponStance;
  
  // Colors
  skinColor: string;
  eyeColor: string;
  scleraColor: string;
  pupilColor: string;
  lipColor: string;
  
  // Detailed Proportions (can be overridden by BodyVariant)
  headScale: number;
  neckHeight: number;
  neckThickness: number;
  torsoWidth: number;
  torsoHeight: number;
  armScale: number;
  legScale: number;
  buttScale: number;
  
  // Feet details
  heelScale: number;
  heelHeight: number;
  toeScale: number;
  footLength: number;
  footWidth: number;
  toeSpread: number;
  
  // Head details
  chinSize: number;
  chinLength: number;
  chinForward: number;
  chinHeight: number;
  irisScale: number;
  pupilScale: number;
}

export interface PlayerInput {
  x: number;
  y: number;
  isRunning: boolean;
  isPickingUp: boolean;
  isDead: boolean;
  jump: boolean;
  interact?: boolean;
  attack1?: boolean; // Punch
  attack2?: boolean; // Axe Swing
}

export const DEFAULT_CONFIG: PlayerConfig = {
  bodyType: 'male',
  bodyVariant: 'average',
  outfit: 'naked',
  equipment: {
    helm: false,
    shoulders: false,
    shield: false,
  },
  selectedItem: null,
  weaponStance: 'side',
  
  skinColor: '#ffdbac',
  eyeColor: '#333333',
  scleraColor: '#ffffff',
  pupilColor: '#000000',
  lipColor: '#e0b094', // Slightly darker/redder than default skin
  
  headScale: 1.0,
  neckHeight: 0.6,
  neckThickness: 0.7,
  torsoWidth: 1.0,
  torsoHeight: 1.0,
  armScale: 1.0,
  legScale: 1.0,
  buttScale: 1.0,
  heelScale: 1.218,
  heelHeight: 1.0,
  toeScale: 1.0,
  footLength: 1.0,
  footWidth: 1.0,
  toeSpread: 1.0,
  chinSize: 0.7,
  chinLength: 1.0,
  chinForward: 0.03,
  chinHeight: -0.04,
  irisScale: 1.0,
  pupilScale: 1.0,
};