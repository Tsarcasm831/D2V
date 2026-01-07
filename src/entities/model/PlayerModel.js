import * as THREE from 'three';
import { PlayerMaterials } from './PlayerMaterials.js';
import { PlayerEquipment } from './PlayerEquipment.js';
import { PlayerMeshBuilder } from './mesh/PlayerMeshBuilder.js';
import { HairBuilder } from './mesh/HairBuilder.js';

export class PlayerModel {
    constructor(config = {}) {
        this.parts = {};
        this.materials = new PlayerMaterials(config);
        
        const build = PlayerMeshBuilder.build(this.materials, config);
        this.group = build.group;
        this.parts = build.parts;
        
        this.forefootGroups = build.arrays.forefootGroups;
        this.heelGroups = build.arrays.heelGroups;
        this.toeUnits = build.arrays.toeUnits;
        this.irises = build.arrays.irises;
        this.pupils = build.arrays.pupils;
        this.eyelids = build.arrays.eyelids;
        this.rightFingers = build.arrays.rightFingers;
        this.rightThumb = build.arrays.rightThumb;
        this.leftFingers = build.arrays.leftFingers;
        this.leftThumb = build.arrays.leftThumb;
        this.buttockCheeks = build.arrays.buttockCheeks;

        this.equippedMeshes = {};
        this.currentHeldItem = null;

        this.lastHairHash = '';
        this.updateHair(config);
    }

    applyOutfit(outfit, skinColor) {
        this.materials.applyOutfit(outfit, skinColor);
    }

    updateHeldItem(itemName) {
        this.currentHeldItem = PlayerEquipment.updateHeldItem(
            itemName,
            this.currentHeldItem,
            this.parts,
            this.equippedMeshes
        );
    }

    updateEquipment(equipment) {
        PlayerEquipment.updateArmor(equipment, this.parts, this.equippedMeshes);
    }

    updateHair(config) {
        const hash = `${config.hairStyle}_${config.headScale}`;
        if (hash === this.lastHairHash) return;
        this.lastHairHash = hash;
        HairBuilder.build(this.parts, config, this.materials.hair);
    }

    sync(config, isCombatStance = false) {
        const lerp = THREE.MathUtils.lerp;
        const damp = 0.15; 

        this.materials.sync(config);
        this.applyOutfit(config.outfit, config.skinColor);
        
        const isFemale = config.bodyType === 'female';
        const isNaked = config.outfit === 'naked';
        const isNude = config.outfit === 'nude';
        const isClothed = !isNaked && !isNude;

        // --- Body Proportions & Scaling ---
        
        // 1. Torso Scaling
        const tW = config.torsoWidth || 1.0;
        const tH = config.torsoHeight || 1.0;
        this.parts.torsoContainer.scale.set(tW, tH, tW);

        // 2. Gender & Hip Adjustments
        let baseLegSpacing = 0.12;
        let hipScale = 1.0;
        let shoulderScale = 1.0;

        if (isFemale) {
            shoulderScale = 0.85;
            hipScale = 1.15;
            baseLegSpacing = 0.14; 
            if (this.parts.buttocks) {
                this.parts.buttocks.visible = true;
                const bs = config.buttScale || 1.0;
                this.parts.buttocks.scale.setScalar(bs);
            }
            this.parts.chest.visible = true;
            this.parts.maleChest.visible = false;
        } else {
            shoulderScale = 1.0;
            hipScale = 1.0;
            baseLegSpacing = 0.12;
            if (this.parts.buttocks) {
                this.parts.buttocks.visible = false; 
            }
            this.parts.chest.visible = false;
            this.parts.maleChest.visible = true;
        }

        this.parts.topCap.scale.set(shoulderScale, 0.8, shoulderScale);
        this.parts.pelvis.scale.set(hipScale, 1, hipScale);
        if (this.parts.topCap) {
            if (!this.parts.topCap.userData.baseScale) {
                this.parts.topCap.userData.baseScale = this.parts.topCap.scale.clone();
            } else {
                this.parts.topCap.userData.baseScale.copy(this.parts.topCap.scale);
            }
            this.parts.topCap.userData.baseY = this.parts.topCap.position.y;
        }

        // 3. Limb Positioning
        const legX = baseLegSpacing * tW; 
        this.parts.leftThigh.position.x = legX;
        this.parts.rightThigh.position.x = -legX;

        // 4. Limb Scaling Compensation
        const aS = config.armScale || 1.0;
        const invTW = 1 / tW;
        const invTH = 1 / tH;
        
        this.parts.rightArm.scale.set(aS * invTW, aS * invTH, aS * invTW);
        this.parts.leftArm.scale.set(aS * invTW, aS * invTH, aS * invTW);

        const lS = config.legScale || 1.0;
        this.parts.rightThigh.scale.setScalar(lS);
        this.parts.leftThigh.scale.setScalar(lS);

        // 5. Neck & Head Scaling
        const nT = config.neckThickness || 1.0;
        const nH = config.neckHeight || 1.0;
        const nR = config.neckRotation || 0.0;
        const nTilt = config.neckTilt || 0.0;
        
        if (this.parts.neck) {
            this.parts.neck.scale.set(nT, nH, nT);
            this.parts.neck.position.y = 0.70 + (0.12 * nH);
            this.parts.neck.rotation.z = nR;
            this.parts.neck.rotation.x = nTilt;
        }
        if (this.parts.neckBase) {
            this.parts.neckBase.scale.set(nT, 1, nT);
        }

        const hS = config.headScale || 1.0;
        const parentScaleX = tW * nT;
        const parentScaleY = tH * nH;
        const safePX = parentScaleX || 1;
        const safePY = parentScaleY || 1;

        this.parts.head.scale.set(hS / safePX, hS / safePY, hS / safePX);

        // Buttocks Material & Underwear Visibility
        if (this.parts.buttocks && this.buttockCheeks.length > 0) {
            this.parts.buttocks.children.forEach((container, i) => {
                const cheek = this.buttockCheeks[i];
                const undie = container.children.find(c => c.name === 'undie');
                if (isClothed) {
                    cheek.material = this.materials.pants;
                    if (undie) undie.visible = false;
                } else {
                    cheek.material = this.materials.skin;
                    if (undie) undie.visible = isNaked; 
                }
            });
        }
        
        if (this.parts.underwearBottom) {
            this.parts.underwearBottom.visible = isNaked;
        }
        
        const showBra = isNaked && isFemale;
        if (this.parts.braStrap) this.parts.braStrap.visible = showBra;
        if (this.parts.braCups) this.parts.braCups.forEach((c) => c.visible = showBra);

        // Face & Feet details
        this.parts.jaw.scale.setScalar(config.chinSize || 0.7);
        this.parts.jaw.position.y = -0.05 + (config.chinHeight || -0.04);
        this.parts.jawMesh.scale.y = 0.45 * (config.chinLength || 1.0);
        this.parts.jawMesh.position.z = 0.09 + (config.chinForward || 0.03);
        
        this.irises.forEach(i => i.scale.setScalar(config.irisScale || 1.0));
        this.pupils.forEach(p => p.scale.setScalar(config.pupilScale || 1.0));
        this.heelGroups.forEach(hg => { hg.scale.setScalar(config.heelScale || 1.218); hg.scale.y *= (config.heelHeight || 1.0); });
        this.forefootGroups.forEach(fg => fg.scale.set(config.footWidth || 1.0, 1, config.footLength || 1.0));
        this.toeUnits.forEach((u, i) => {
            if (u.userData && u.userData.initialX !== undefined) {
                u.position.x = u.userData.initialX * (config.toeSpread || 1.0);
                return;
            }
            u.position.x = ((i % 5) - 2) * 0.035 * (config.toeSpread || 1.0);
        });

        // Update Hand Pose (Fist formation)
        const isHolding = !!config.selectedItem;
        const updateHand = (fingers, thumb, isLeft) => {
            if (!fingers) return;
            const shouldFist = isLeft ? isCombatStance : (isHolding || isCombatStance);
            const baseCurl = shouldFist ? 1.6 : 0.1;
            fingers.forEach((fGroup, i) => {
                const curl = baseCurl + (shouldFist ? i * 0.1 : i * 0.05);
                const prox = fGroup.children.find(c => c.name === 'proximal');
                if (prox) {
                    prox.rotation.x = lerp(prox.rotation.x, curl, damp);
                    const dist = prox.children.find(c => c.name === 'distal');
                    if (dist) dist.rotation.x = lerp(dist.rotation.x, curl * 1.1, damp);
                }
            });
            if (thumb) {
                const prox = thumb.children.find(c => c.name === 'proximal');
                if (prox) {
                    prox.rotation.x = lerp(prox.rotation.x, shouldFist ? 0.6 : 0.1, damp);
                    const tZBase = shouldFist ? -0.2 : 0;
                    prox.rotation.z = lerp(prox.rotation.z, isLeft ? -tZBase : tZBase, damp);
                    const dist = prox.children.find(c => c.name === 'distal');
                    if (dist) dist.rotation.x = lerp(dist.rotation.x, shouldFist ? 1.2 : 0.1, damp);
                }
            }
        };

        updateHand(this.rightFingers, this.rightThumb, false);
        updateHand(this.leftFingers, this.leftThumb, true);

        this.updateHair(config);

        this.updateEquipment(config.equipment || {});
        this.updateHeldItem(config.selectedItem);
    }
}
