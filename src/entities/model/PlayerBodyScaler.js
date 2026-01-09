import * as THREE from 'three';

export class PlayerBodyScaler {
    constructor(registry, materials) {
        this.registry = registry;
        this.materials = materials;
    }

    sync(config, isCombatStance) {
        const parts = this.registry.parts;
        const materials = this.materials;
        const lerp = THREE.MathUtils.lerp;
        const damp = 0.15;

        const isFemale = config.bodyType === 'female';
        const isNaked = config.outfit === 'naked';
        const isNude = config.outfit === 'nude';
        const isClothed = !isNaked && !isNude;

        // 1. Torso Scaling
        const tW = config.torsoWidth;
        const tH = config.torsoHeight;
        parts.torsoContainer.scale.set(tW, tH, tW);

        // 2. Gender & Hip Adjustments
        let baseLegSpacing = 0.12;
        let hipScale = 1.0;
        let shoulderScale = 1.0;

        if (isFemale) {
            shoulderScale = 0.85;
            hipScale = 1.15;
            baseLegSpacing = 0.14; 
            if (parts.buttocks) {
                parts.buttocks.visible = true;
                const bs = config.buttScale;
                parts.buttocks.scale.set(1 * bs, 1 * bs, 1 * bs);
            }
            parts.chest.visible = true;
            parts.maleChest.visible = false;
        } else {
            shoulderScale = 1.0;
            hipScale = 1.0;
            baseLegSpacing = 0.12;
            if (parts.buttocks) {
                const bs = config.buttScale;
                parts.buttocks.scale.set(0.8 * bs, 0.8 * bs, 0.3 * bs);
                parts.buttocks.visible = false; 
            }
            parts.chest.visible = false;
            parts.maleChest.visible = true;
        }

        parts.topCap.scale.set(shoulderScale, 0.8, shoulderScale);
        parts.pelvis.scale.set(hipScale, 1, hipScale);

        // 3. Limb Positioning
        const legX = baseLegSpacing * tW; 
        parts.leftThigh.position.x = legX;
        parts.rightThigh.position.x = -legX;

        // 4. Limb Scaling Compensation
        const aS = config.armScale;
        const invTW = 1 / tW;
        const invTH = 1 / tH;
        
        parts.rightArm.scale.set(aS * invTW, aS * invTH, aS * invTW);
        parts.leftArm.scale.set(aS * invTW, aS * invTH, aS * invTW);

        const lS = config.legScale;
        parts.rightThigh.scale.setScalar(lS);
        parts.leftThigh.scale.setScalar(lS);

        // 5. Neck & Head Scaling
        const nT = config.neckThickness;
        const nH = config.neckHeight;
        
        if (parts.neck) {
            parts.neck.scale.set(nT, nH, nT);
            parts.neck.position.y = 0.70 + (0.12 * nH);
        }
        if (parts.neckBase) {
            parts.neckBase.scale.set(nT, 1, nT);
        }

        const hS = config.headScale;
        const parentScaleX = tW * nT;
        const parentScaleY = tH * nH;
        const safePX = parentScaleX || 1;
        const safePY = parentScaleY || 1;

        parts.head.scale.set(hS / safePX, hS / safePY, hS / safePX);

        // Brain
        if (parts.brain) {
            parts.brain.visible = config.showBrain;
            const bS = config.brainSize;
            parts.brain.scale.set(bS, bS, bS);
        }

        // Buttocks Material & Underwear Visibility
        if (parts.buttocks && this.registry.buttockCheeks.length > 0) {
            parts.buttocks.children.forEach((container, i) => {
                const cheek = this.registry.buttockCheeks[i];
                const undie = container.children.find(c => c.name === 'undie');
                if (isClothed) {
                    cheek.material = materials.pants;
                    if (undie) undie.visible = false;
                } else {
                    cheek.material = materials.skin;
                    if (undie) undie.visible = isNaked; 
                }
            });
        }
        
        if (parts.underwearBottom) {
            parts.underwearBottom.visible = isNaked;
        }
        
        const showBra = isNaked && isFemale;
        if (parts.braStrap) parts.braStrap.visible = showBra;
        if (parts.braCups) parts.braCups.forEach(c => c.visible = showBra);

        // Update Male Bulge & Pants Bulge Position & Scale
        const updateBulge = (mesh, scaleMult = 1.0) => {
             mesh.visible = !isFemale;
             mesh.position.set(config.bulgeX, config.bulgeY, config.bulgeZ);
             mesh.rotation.set(config.bulgeRotX, config.bulgeRotY, config.bulgeRotZ);
             mesh.scale.set(
                 1.2 * config.bulgeScale * scaleMult, 
                 1.2 * config.bulgeScale * scaleMult, 
                 0.85 * config.bulgeScale * scaleMult
             );
        };

        if (parts.maleBulge) updateBulge(parts.maleBulge, 1.0);
        
        // Locate pants bulge (added by PantsBuilder)
        if (parts.pelvis) {
            const pantsBulge = parts.pelvis.children.find(c => c.name === 'pantsBulge');
            if (pantsBulge) updateBulge(pantsBulge, 1.1); // Slightly larger to cover underwear
        }

        // Update Abs Positioning & Scale (Skin)
        if (parts.maleChest) {
             parts.maleChest.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'SphereGeometry') {
                    if (child.userData.basePos) {
                        const base = child.userData.basePos;
                        const centerY = -0.07; // Approx center of ab mass
                        const distY = base.y - centerY;
                        
                        const newY = centerY + (distY * config.absSpacing) + config.absY;
                        
                        child.position.set(
                            base.x + config.absX,
                            newY,
                            base.z + config.absZ
                        );
                        
                        child.scale.set(1.2 * config.absScale, 0.8 * config.absScale, 0.3 * config.absScale);
                    }
                }
             });
        }

        // Update Abs Positioning & Scale (Shirt Overlays)
        if (parts.shirt && parts.shirt.details) {
             parts.shirt.details.forEach(child => {
                if (child.userData.isAbs && child.userData.basePos) {
                        const base = child.userData.basePos;
                        const centerY = -0.07; 
                        const distY = base.y - centerY;
                        const newY = centerY + (distY * config.absSpacing) + config.absY;
                        
                        child.position.set(
                            base.x + config.absX,
                            newY,
                            base.z + config.absZ
                        );
                        
                        // Scale slightly larger than skin abs to form the fabric layer
                        child.scale.set(1.25 * config.absScale, 0.85 * config.absScale, 0.35 * config.absScale);
                }
             });
        }

        // Face & Feet details
        parts.jaw.scale.setScalar(config.chinSize);
        parts.jaw.position.y = -0.05 + config.chinHeight;
        parts.jawMesh.scale.y = 0.45 * config.chinLength;
        parts.jawMesh.position.z = 0.09 + config.chinForward;

        if (parts.maxilla) {
            parts.maxilla.scale.set(config.maxillaScaleX, config.maxillaScaleY, config.maxillaScaleZ);
            parts.maxilla.position.set(0, -0.075 + config.maxillaOffsetY, 0.18 + config.maxillaOffsetZ);
        }

        if (this.registry.upperLip) {
            this.registry.upperLip.scale.set(config.upperLipWidth, config.upperLipHeight, 0.5 * config.upperLipThick);
            this.registry.upperLip.position.y = -0.028 + config.upperLipOffsetY;
            this.registry.upperLip.position.z = 0.025 + config.upperLipOffsetZ;
        }
        if (this.registry.lowerLip) {
            this.registry.lowerLip.scale.set(config.lowerLipWidth, config.lowerLipHeight, 0.5 * config.lowerLipThick);
            this.registry.lowerLip.position.y = 0.035 + config.lowerLipOffsetY;
            this.registry.lowerLip.position.z = 0.11 + config.lowerLipOffsetZ;
        }

        if (parts.nose && parts.nose.userData.basePosition) {
            const base = parts.nose.userData.basePosition;
            parts.nose.position.set(
                base.x,
                base.y + config.noseHeight,
                base.z + config.noseForward
            );
        }
        
        this.registry.irises.forEach(i => i.scale.setScalar(config.irisScale));
        this.registry.pupils.forEach(p => p.scale.setScalar(config.pupilScale));
        
        this.registry.heelGroups.forEach(hg => { hg.scale.setScalar(config.heelScale); hg.scale.y *= config.heelHeight; });
        this.registry.forefootGroups.forEach(fg => fg.scale.set(config.footWidth, 1, config.footLength));
        
        this.registry.toeUnits.forEach(u => {
            if (u.userData.initialX !== undefined) {
                u.position.x = u.userData.initialX * config.toeSpread;
            }
            u.scale.z = config.toeLengthScale;
            if (u.userData.index !== undefined) {
                const splayDir = (u.parent && u.parent.name.includes('left')) ? 1 : -1;
                u.rotation.y = u.userData.index * config.toeAngle * splayDir;
            }
        });

        // Hand Pose
        const isHolding = !!config.selectedItem;
        const updateHand = (fingers, thumb, isLeft) => {
            const shouldFist = isLeft ? isCombatStance : (isHolding || isCombatStance);
            const baseCurl = shouldFist ? 1.6 : 0.1;
            
            fingers.forEach((fGroup, i) => {
                 const curl = baseCurl + (shouldFist ? i * 0.1 : i * 0.05);
                 const prox = fGroup.children.find(c => c.name === 'proximal');
                 if (prox) {
                     prox.rotation.x = lerp(prox.rotation.x, curl, damp);
                     const dist = prox.children.find(c => c.name === 'distal');
                     if (dist) {
                         dist.rotation.x = lerp(dist.rotation.x, curl * 1.1, damp);
                     }
                 }
            });

            if (thumb) {
                const sideMult = isLeft ? -1 : 1;
                thumb.position.set(config.thumbX * sideMult, config.thumbY, config.thumbZ);
                thumb.rotation.set(config.thumbRotX, config.thumbRotY * sideMult, config.thumbRotZ * sideMult);
                thumb.scale.setScalar(config.thumbScale);

                const prox = thumb.children.find(c => c.name === 'proximal');
                if (prox) {
                     // Adjusted to prevent thumb from curling under the handle
                     const tX = shouldFist ? 0.15 : 0.1; 
                     prox.rotation.x = lerp(prox.rotation.x, tX, damp);
                     
                     const tZBase = shouldFist ? -0.15 : 0;
                     const tZ = isLeft ? -tZBase : tZBase;
                     prox.rotation.z = lerp(prox.rotation.z, tZ, damp); 
                     
                     const dist = prox.children.find(c => c.name === 'distal');
                     if (dist) {
                         dist.rotation.x = lerp(dist.rotation.x, shouldFist ? 0.7 : 0.1, damp);
                     }
                }
            }
        };

        updateHand(this.registry.rightFingers, this.registry.rightThumb, false);
        updateHand(this.registry.leftFingers, this.registry.leftThumb, true);
        
        this.registry.thenars.forEach((mesh, i) => {
             const mult = i === 0 ? 1 : -1;
             mesh.position.set(config.thenarX * mult, config.thenarY, config.thenarZ);
             const s = config.thenarScale;
             mesh.scale.set(0.8 * s, 1.3 * s, 0.7 * s);
        });
    }
}
