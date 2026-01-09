export const BODY_PRESETS = {
  average: {
    torsoWidth: 1.0, torsoHeight: 1.0, 
    armScale: 1.0, legScale: 1.0, 
    headScale: 1.0, footWidth: 1.0, 
    neckHeight: 0.6, neckThickness: 0.7,
    chinSize: 0.7, chinLength: 1.0,
    buttScale: 1.0,
    shirtColor: '#cc0000',
    hairStyle: 'crew',
    hairColor: '#3e2723'
  },
  muscular: {
    torsoWidth: 1.35, torsoHeight: 1.1, 
    armScale: 1.15, legScale: 1.08, 
    headScale: 0.95, footWidth: 1.1, 
    neckHeight: 0.55, neckThickness: 1.1,
    neckRotation: 0.0, neckTilt: 0.0,
    chinSize: 0.9, chinLength: 1.1,
    buttScale: 1.1,
    shirtColor: '#2d3748',
    hairStyle: 'bald',
    hairColor: '#000000'
  },
  slim: {
    torsoWidth: 0.85, torsoHeight: 0.98, 
    armScale: 0.9, legScale: 1.05, 
    headScale: 1.02, footWidth: 0.9, 
    neckHeight: 0.75, neckThickness: 0.65,
    neckRotation: 0.0, neckTilt: 0.0,
    chinSize: 0.6, chinLength: 0.9,
    buttScale: 0.9,
    shirtColor: '#38a169',
    hairStyle: 'crew',
    hairColor: '#d7ccc8'
  },
  heavy: {
    torsoWidth: 1.45, torsoHeight: 1.0, 
    armScale: 1.1, legScale: 0.95, 
    headScale: 1.05, footWidth: 1.25, 
    neckHeight: 0.5, neckThickness: 1.0,
    neckRotation: 0.0, neckTilt: 0.0,
    chinSize: 0.85, chinLength: 0.9,
    buttScale: 1.3,
    shirtColor: '#d69e2e',
    hairStyle: 'crew',
    hairColor: '#212121'
  }
};

export const OUTFIT_PRESETS = {
  nude: {
    outfit: 'nude',
    equipment: { helm: false, shoulders: false, shield: false, shirt: false, pants: false, shoes: false },
    shirtColor: '#ffdbac',
    pantsColor: '#ffdbac'
  },
  naked: {
    outfit: 'naked',
    equipment: { helm: false, shoulders: false, shield: false, shirt: false, pants: false, shoes: false },
    shirtColor: '#ffdbac',
    pantsColor: '#3182ce' // Jeans (kept in config but not rendered)
  },
  peasant: {
    outfit: 'peasant',
    equipment: { helm: false, shoulders: false, shield: false, shirt: true, pants: true, shoes: true },
    shirtColor: '#8d6e63',
    pantsColor: '#5d4037'
  },
  warrior: {
    outfit: 'warrior',
    equipment: { helm: true, shoulders: true, shield: true, shirt: true, pants: true, shoes: true },
    shirtColor: '#607d8b',
    pantsColor: '#37474f'
  },
  noble: {
    outfit: 'noble',
    equipment: { helm: false, shoulders: false, shield: false, shirt: true, pants: true, shoes: true },
    shirtColor: '#3f51b5',
    pantsColor: '#1a237e'
  }
};

export const ITEM_ICONS = {
  'Axe': '🪓',
  'Sword': '⚔️',
  'Pickaxe': '⛏️',
  'Knife': '🔪',
  'Fishing Pole': '🎣'
};

export const DEFAULT_CONFIG = {
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
  lipColor: '#e0b094',
  shirtColor: '#cc0000',
  shirtColor2: '#ffeb3b',
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
  
  toeLengthScale: 1.0,
  toeX: -0.01,
  toeZ: 0.14,
  toeY: -0.054,
  toeAngle: 0.05,

  thumbX: 0.048,
  thumbY: -0.034,
  thumbZ: 0.002,
  thumbRotX: 0.3,
  thumbRotY: -0.5,
  thumbRotZ: 0.6,
  thumbScale: 1.0,

  thenarScale: 1.0,
  thenarX: 0.038,
  thenarY: -0.02,
  thenarZ: 0.006,
  
  chinSize: 0.65,
  chinLength: 0.95,
  chinForward: 0.01,
  chinHeight: -0.03,
  
  noseHeight: 0.0,
  noseForward: -0.02,
  irisScale: 0.50,
  pupilScale: 0.40,
  
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

  absX: 0,
  absY: 0,
  absZ: -0.024,
  absScale: 1.0,
  absSpacing: 1.0,

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
