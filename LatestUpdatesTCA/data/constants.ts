
import { BodyVariant, PlayerConfig, OutfitType } from '../types';

export const BODY_PRESETS: Record<BodyVariant, Partial<PlayerConfig>> = {
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
    chinSize: 0.85, chinLength: 0.9,
    buttScale: 1.3,
    shirtColor: '#d69e2e',
    hairStyle: 'crew',
    hairColor: '#212121'
  }
};

export const OUTFIT_PRESETS: Record<OutfitType, Partial<PlayerConfig>> = {
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

export const ITEM_ICONS: Record<string, string> = {
  'Axe': '🪓',
  'Sword': '⚔️',
  'Pickaxe': '⛏️',
  'Knife': '🔪',
  'Fishing Pole': '🎣',
  'Shirt': '👕',
  'Pants': '👖',
  'Shoes': '👢'
};
