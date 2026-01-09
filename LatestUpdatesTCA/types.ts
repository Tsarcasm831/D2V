
export type BodyVariant = 'average' | 'muscular' | 'slim' | 'heavy';
export type OutfitType = 'nude' | 'naked' | 'peasant' | 'warrior' | 'noble';
export type WeaponStance = 'side' | 'shoulder';
export type HairStyle = 'bald' | 'crew';

export interface EquipmentState {
  helm: boolean;
  shoulders: boolean;
  shield: boolean;
  shirt: boolean;
  pants: boolean;
  shoes: boolean;
}

export interface PlayerConfig {
  // Base
  bodyType: 'male' | 'female';
  bodyVariant: BodyVariant;
  outfit: OutfitType;
  equipment: EquipmentState;
  selectedItem: string | null;
  weaponStance: WeaponStance;
  
  // Settings
  globalVolume: number;

  // Colors
  skinColor: string;
  eyeColor: string;
  scleraColor: string;
  pupilColor: string;
  lipColor: string;
  shirtColor: string;
  shirtColor2: string; // Secondary shirt color
  pantsColor: string;
  hairColor: string;
  hairStyle: HairStyle;
  
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
  
  // Toe Rigging
  toeLengthScale: number;
  toeX: number;
  toeZ: number;
  toeY: number;
  toeAngle: number;

  // Thumb Rigging
  thumbX: number;
  thumbY: number;
  thumbZ: number;
  thumbRotX: number;
  thumbRotY: number;
  thumbRotZ: number;
  thumbScale: number;

  // Thenar (Thumb Muscle)
  thenarScale: number;
  thenarX: number;
  thenarY: number;
  thenarZ: number;
  
  // Head details
  chinSize: number;
  chinLength: number;
  chinForward: number;
  chinHeight: number;
  noseHeight: number;
  noseForward: number;
  irisScale: number;
  pupilScale: number;
  
  // Maxilla (Upper Jaw)
  maxillaScaleX: number;
  maxillaScaleY: number;
  maxillaScaleZ: number;
  maxillaOffsetY: number;
  maxillaOffsetZ: number;

  // Lips
  upperLipWidth: number;
  upperLipHeight: number;
  upperLipThick: number;
  upperLipOffsetY: number;
  upperLipOffsetZ: number;
  
  lowerLipWidth: number;
  lowerLipHeight: number;
  lowerLipThick: number;
  lowerLipOffsetY: number;
  lowerLipOffsetZ: number;

  // Abs Rigging
  absX: number;
  absY: number;
  absZ: number;
  absScale: number;
  absSpacing: number;

  // Groin Rigging
  bulgeX: number;
  bulgeY: number;
  bulgeZ: number;
  bulgeRotX: number;
  bulgeRotY: number;
  bulgeRotZ: number;
  bulgeScale: number;

  // Brain
  showBrain: boolean;
  brainSize: number;
  
  // Debug
  debugHead: boolean;
}

export interface PlayerInput {
  x: number;
  y: number;
  isRunning: boolean;
  isPickingUp: boolean;
  isDead: boolean;
  jump: boolean;
  wave?: boolean;
  interact?: boolean;
  attack1?: boolean; // Punch
  attack2?: boolean; // Axe Swing
  combat?: boolean; // Toggle Combat Stance
  resetView?: boolean; // Reset head/eye tracking to forward
}

export const DEFAULT_CONFIG: PlayerConfig = {
  bodyType: 'male',
  bodyVariant: 'average',
  outfit: 'naked',
  equipment: {
    helm: false,
    shoulders: false,
    shield: false,
    shirt: false,
    pants: false,
    shoes: false,
  },
  selectedItem: null,
  weaponStance: 'side',
  
  globalVolume: 0.5,

  skinColor: '#ffdbac',
  eyeColor: '#333333',
  scleraColor: '#ffffff',
  pupilColor: '#000000',
  lipColor: '#e0b094', // Slightly darker/redder than default skin
  shirtColor: '#cc0000',
  shirtColor2: '#ffeb3b', // Yellowish default
  pantsColor: '#2d3748',
  hairColor: '#3e2723',
  hairStyle: 'bald',
  
  headScale: 1.0,
  neckHeight: 0.75,
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
  
  // Toe Defaults
  toeLengthScale: 1.0,
  toeX: -0.01,
  toeZ: 0.14,
  toeY: -0.054,
  toeAngle: 0.05,

  // Thumb Defaults
  // Updated for Over-Hand Grip (Flipped 180 via Z)
  thumbX: 0.042,
  thumbY: 0.02, // Top of palm
  thumbZ: 0.04, // Forward
  thumbRotX: 0.5, // Angle forward from Up
  thumbRotY: -0.5, // Angle In
  thumbRotZ: 2.8, // ~160 degrees: Flips thumb to point Up (Geom is -Y, rotated 180 Z -> +Y)
  thumbScale: 1.0,

  // Thenar Defaults
  thenarScale: 1.0,
  thenarX: 0.038,
  thenarY: -0.02,
  thenarZ: 0.006,
  
  // Jaw Options
  chinSize: 0.65,
  chinLength: 0.95,
  chinForward: 0.01,
  chinHeight: -0.03,
  
  noseHeight: 0.0,
  noseForward: -0.02,
  irisScale: 0.50,
  pupilScale: 0.40,
  
  // Maxilla (Upper Jaw)
  maxillaScaleX: 0.95,
  maxillaScaleY: 1.25,
  maxillaScaleZ: 1.5,
  maxillaOffsetY: -0.03,
  maxillaOffsetZ: -0.05,

  upperLipWidth: 0.75,
  upperLipHeight: 0.75,
  upperLipThick: 1.0,
  upperLipOffsetY: 0.023,
  upperLipOffsetZ: 0.006,
  
  lowerLipWidth: 1.0,
  lowerLipHeight: 1.0,
  lowerLipThick: 1.0,
  lowerLipOffsetY: -0.1,
  lowerLipOffsetZ: 0.112,

  // Abs
  absX: 0,
  absY: 0,
  absZ: -0.024,
  absScale: 1.0,
  absSpacing: 1.0,

  // Groin
  bulgeX: 0,
  bulgeY: -0.125,
  bulgeZ: 0.075,
  bulgeRotX: 0.45,
  bulgeRotY: 0,
  bulgeRotZ: 0,
  bulgeScale: 1.0,

  showBrain: false,
  brainSize: 1.0,
  debugHead: false,
};
