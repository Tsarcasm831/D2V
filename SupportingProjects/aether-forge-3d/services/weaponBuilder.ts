
import * as THREE from 'three';
import { WeaponConfig, WeaponType, WeaponEffect } from '../types';
import { getMaterials } from './geometryUtils';
import { generateSword } from './generators/swordGenerator';
import { generateAxe } from './generators/axeGenerator';
import { generateSpear } from './generators/spearGenerator';
import { generateMace } from './generators/maceGenerator';
import { generateKunai } from './generators/kunaiGenerator';
import { generateChakram } from './generators/chakramGenerator';
import { generateArrow } from './generators/arrowGenerator';
import { generateShirt } from './generators/shirtGenerator';
import { generateFishingPole } from './generators/fishingPoleGenerator';
import { buildEffect } from './effectBuilder';

export const buildWeapon = (config: WeaponConfig): THREE.Group => {
    const group = new THREE.Group();
    const mats = getMaterials(config);

    // 1. Generate Geometry
    switch (config.type) {
        case WeaponType.SWORD:
        case WeaponType.DAGGER:
            generateSword(group, config, mats);
            break;
        case WeaponType.AXE:
            generateAxe(group, config, mats);
            break;
        case WeaponType.SPEAR:
            generateSpear(group, config, mats);
            break;
        case WeaponType.MACE:
            generateMace(group, config, mats);
            break;
        case WeaponType.KUNAI:
            generateKunai(group, config, mats);
            break;
        case WeaponType.CHAKRAM:
            generateChakram(group, config, mats);
            break;
        case WeaponType.ARROW:
            generateArrow(group, config, mats);
            break;
        case WeaponType.SHIRT:
            generateShirt(group, config);
            break;
        case WeaponType.FISHING_POLE:
            generateFishingPole(group, config, mats);
            break;
        default:
            generateSword(group, config, mats);
            break;
    }

    // 2. Apply Effects
    if (config.effect && config.effect !== WeaponEffect.NONE && config.effectColor) {
        const effectsToApply: THREE.Object3D[] = [];
        const updateFns: ((dt: number) => void)[] = [];

        const applyToTarget = (target: THREE.Object3D) => {
            if (target && target instanceof THREE.Mesh) {
                const effectSystem = buildEffect(config.effect, config.effectColor, target);
                if (effectSystem) {
                    target.add(effectSystem.mesh);
                    updateFns.push(effectSystem.update);
                }
            }
        };

        if (config.type === WeaponType.ARROW) {
            // Arrow Logic: 
            // Poison/Mud -> Tip Only
            // Others -> Tip + Shaft
            const tip = group.getObjectByName('damagePart');
            const shaft = group.getObjectByName('shaftPart');

            if (config.effect === WeaponEffect.POISON || config.effect === WeaponEffect.MUD) {
                if (tip) applyToTarget(tip);
            } else {
                if (tip) applyToTarget(tip);
                if (shaft) applyToTarget(shaft);
            }
        } else {
            // Standard Logic: Find damagePart or biggest metal
            let target = group.getObjectByName('damagePart');
            if (!target) {
                group.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material === mats.metalMat) {
                        target = child; 
                    }
                });
            }
            if (target) applyToTarget(target);
        }

        if (updateFns.length > 0) {
            group.userData.updateEffect = (dt: number) => {
                updateFns.forEach(fn => fn(dt));
            };
        }
    }

    return group;
};