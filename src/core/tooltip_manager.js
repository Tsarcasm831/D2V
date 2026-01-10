import * as THREE from 'three';

export class TooltipManager {
    constructor(scene, inputManager, worldManager) {
        this.scene = scene;
        this.inputManager = inputManager;
        this.worldManager = worldManager;
        this.raycaster = new THREE.Raycaster();
        this._tempVec3 = new THREE.Vector3();

        this.unitTooltip = this.createWorldTooltipSprite(260, 96, 2.4, 0.9);
        this.buildingTooltip = this.createWorldTooltipSprite(300, 120, 2.8, 1.1);

        this.scene.add(this.unitTooltip.sprite);
        this.scene.add(this.buildingTooltip.sprite);

        this.unitTooltip.sprite.visible = false;
        this.buildingTooltip.sprite.visible = false;
        
        this.unitTooltip.sprite.layers.set(1);
        this.buildingTooltip.sprite.layers.set(1);
        
        this.unitTooltip.sprite.frustumCulled = false;
        this.buildingTooltip.sprite.frustumCulled = false;
    }

    createWorldTooltipSprite(width, height, worldWidth, worldHeight) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(worldWidth, worldHeight, 1);
        sprite.layers.enable(1);

        return { canvas, ctx, texture, sprite, lastKey: '' };
    }

    drawTooltipBase(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(7, 12, 18, 0.92)';
        ctx.strokeStyle = 'rgba(160, 200, 255, 0.35)';
        ctx.lineWidth = 2;
        const x = 4;
        const y = 4;
        const w = width - 8;
        const h = height - 8;
        const r = 10;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    update(player, camera) {
        if (!player || !player.mesh) {
            if (this.unitTooltip) this.unitTooltip.sprite.visible = false;
            if (this.buildingTooltip) this.buildingTooltip.sprite.visible = false;
            return;
        }

        this.updateUnitTooltip(player, camera);
        this.updateBuildingTooltip(player);
    }

    updateUnitTooltip(player, camera) {
        const checkRadius = 60;
        const npcs = this.worldManager.getNearbyNPCs(player.mesh.position, checkRadius);
        const fauna = this.worldManager.getNearbyFauna(player.mesh.position, checkRadius);
        
        const units = [];
        for (let i = 0; i < npcs.length; i++) {
            if (!npcs[i].isDead && npcs[i].level !== undefined) units.push(npcs[i]);
        }
        for (let i = 0; i < fauna.length; i++) {
            if (!fauna[i].isDead && fauna[i].level !== undefined) units.push(fauna[i]);
        }
        
        if (units.length === 0) {
            this.unitTooltip.sprite.visible = false;
            return;
        }

        this.raycaster.setFromCamera(this.inputManager.mouse, camera);
        
        const hitObjects = [];
        const unitMap = new Map();
        
        units.forEach(u => {
            const obj = u.group || u.mesh;
            if (obj) {
                hitObjects.push(obj);
                unitMap.set(obj.uuid, u);
                obj.traverse(child => {
                    unitMap.set(child.uuid, u);
                });
            }
        });

        const intersects = this.raycaster.intersectObjects(hitObjects, true);

        if (intersects.length > 0) {
            let hitUnit = null;
            for (const intersect of intersects) {
                hitUnit = unitMap.get(intersect.object.uuid);
                if (hitUnit) break;
            }

            if (hitUnit) {
                const unitName = hitUnit.type || hitUnit.constructor.name || 'Unknown';
                const hpPercent = (hitUnit.health / (hitUnit.maxHealth || 1)) * 100;
                const statusText = hitUnit.isEnemy ? 'Hostile' : 'Passive';
                const statusColor = hitUnit.isEnemy ? '#ff4444' : '#44ccff';

                const anchor = hitUnit.group || hitUnit.mesh;
                if (anchor) {
                    anchor.getWorldPosition(this._tempVec3);
                    const box = new THREE.Box3().setFromObject(anchor);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    this._tempVec3.y += size.y + 0.5; 
                    this.unitTooltip.sprite.position.copy(this._tempVec3);
                }

                const key = `${unitName}|${hitUnit.level}|${statusText}|${Math.round(hpPercent)}`;
                if (this.unitTooltip.lastKey !== key) {
                    this.drawUnitTooltip(this.unitTooltip, unitName, hitUnit.level, statusText, statusColor, hpPercent);
                    this.unitTooltip.lastKey = key;
                }

                this.unitTooltip.sprite.visible = true;
                return;
            }
        }
        this.unitTooltip.sprite.visible = false;
    }

    updateBuildingTooltip(player) {
        const buildings = this.worldManager.getBuildingsByTag('yureigakure-bowl');
        if (!buildings.length) {
            this.buildingTooltip.sprite.visible = false;
            return;
        }

        const playerPos = player.mesh.position;
        let closest = null;
        let closestDist = Infinity;

        for (const building of buildings) {
            if (!building || building.isDead) continue;
            const dist = building.getProximityDistance(playerPos);
            if (dist <= 1 && dist < closestDist) {
                closest = building;
                closestDist = dist;
            }
        }

        if (!closest) {
            this.buildingTooltip.sprite.visible = false;
            return;
        }

        const heightOffset = closest.collisionHeight ? Math.max(closest.collisionHeight, 2.0) : 2.0;
        this._tempVec3.copy(closest.group.position);
        this._tempVec3.y += heightOffset;
        this.buildingTooltip.sprite.position.copy(this._tempVec3);

        const name = closest.getDisplayName();
        const desc = closest.getTooltipDescription();
        const key = `${name}|${desc}`;
        if (this.buildingTooltip.lastKey !== key) {
            this.drawBuildingTooltip(this.buildingTooltip, name, 'Yureigakure Bowl', desc);
            this.buildingTooltip.lastKey = key;
        }

        this.buildingTooltip.sprite.visible = true;
    }

    drawUnitTooltip(tooltip, name, level, statusText, statusColor, hpPercent) {
        const { canvas, ctx, texture } = tooltip;
        const width = canvas.width;
        const height = canvas.height;
        this.drawTooltipBase(ctx, width, height);

        ctx.fillStyle = '#dfefff';
        ctx.font = 'bold 18px Cinzel, serif';
        ctx.textAlign = 'left';
        ctx.fillText(name.toUpperCase(), 16, 28);

        ctx.fillStyle = 'rgba(153, 204, 255, 0.8)';
        ctx.font = '12px Cinzel, serif';
        ctx.textAlign = 'right';
        ctx.fillText(`LV. ${level}`, width - 16, 28);

        ctx.fillStyle = statusColor;
        ctx.textAlign = 'left';
        ctx.fillText(statusText.toUpperCase(), 16, 46);

        const barX = 16;
        const barY = 56;
        const barW = width - 32;
        const barH = 14;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(barX, barY, barW * Math.max(0, Math.min(hpPercent, 100)) / 100, barH);

        texture.needsUpdate = true;
    }

    drawBuildingTooltip(tooltip, name, tagLine, desc) {
        const { canvas, ctx, texture } = tooltip;
        const width = canvas.width;
        const height = canvas.height;
        this.drawTooltipBase(ctx, width, height);

        ctx.fillStyle = '#dfefff';
        ctx.font = 'bold 18px Cinzel, serif';
        ctx.textAlign = 'left';
        ctx.fillText(name.toUpperCase(), 16, 30);

        ctx.fillStyle = 'rgba(153, 204, 255, 0.8)';
        ctx.font = '12px Cinzel, serif';
        ctx.fillText(tagLine.toUpperCase(), 16, 50);

        if (desc) {
            ctx.fillStyle = 'rgba(220, 230, 240, 0.9)';
            ctx.font = '12px EB Garamond, serif';
            const words = desc.split(' ');
            let line = '';
            let y = 70;
            const maxWidth = width - 32;
            for (let i = 0; i < words.length; i++) {
                const testLine = `${line}${words[i]} `;
                if (ctx.measureText(testLine).width > maxWidth && line) {
                    ctx.fillText(line.trim(), 16, y);
                    line = `${words[i]} `;
                    y += 16;
                } else {
                    line = testLine;
                }
            }
            if (line) ctx.fillText(line.trim(), 16, y);
        }

        texture.needsUpdate = true;
    }
}
