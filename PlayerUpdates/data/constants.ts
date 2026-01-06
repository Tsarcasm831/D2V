import { BodyVariant, PlayerConfig } from '../types';

export const BODY_PRESETS: Record<BodyVariant, Partial<PlayerConfig>> = {
  average: {
    torsoWidth: 1.0, torsoHeight: 1.0, 
    armScale: 1.0, legScale: 1.0, 
    headScale: 1.0, footWidth: 1.0, 
    neckHeight: 0.6, neckThickness: 0.7,
    chinSize: 0.7, chinLength: 1.0,
    buttScale: 1.0
  },
  muscular: {
    torsoWidth: 1.35, torsoHeight: 1.1, 
    armScale: 1.15, legScale: 1.08, 
    headScale: 0.95, footWidth: 1.1, 
    neckHeight: 0.55, neckThickness: 1.1,
    chinSize: 0.9, chinLength: 1.1,
    buttScale: 1.1
  },
  slim: {
    torsoWidth: 0.85, torsoHeight: 0.98, 
    armScale: 0.9, legScale: 1.05, 
    headScale: 1.02, footWidth: 0.9, 
    neckHeight: 0.75, neckThickness: 0.65,
    chinSize: 0.6, chinLength: 0.9,
    buttScale: 0.9
  },
  heavy: {
    torsoWidth: 1.45, torsoHeight: 1.0, 
    armScale: 1.1, legScale: 0.95, 
    headScale: 1.05, footWidth: 1.25, 
    neckHeight: 0.5, neckThickness: 1.0,
    chinSize: 0.85, chinLength: 0.9,
    buttScale: 1.3
  }
};

export const ITEM_ICONS: Record<string, string> = {
  'Axe': '🪓',
  'Sword': '⚔️',
  'Pickaxe': '⛏️',
  'Knife': '🔪'
};