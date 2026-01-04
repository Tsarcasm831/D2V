import * as Island01 from '../world/lands/Island01.js';
import * as Island02 from '../world/lands/Island02.js';
import * as Island03 from '../world/lands/Island03.js';
import * as Island04 from '../world/lands/Island04.js';
import * as Island05 from '../world/lands/Island05.js';
import * as Island06 from '../world/lands/Island06.js';
import * as Island07 from '../world/lands/Island07.js';
import * as Island08 from '../world/lands/Island08.js';
import * as Island09 from '../world/lands/Island09.js';
import * as Island10 from '../world/lands/Island10.js';
import * as Island11 from '../world/lands/Island11.js';
import * as Land01 from '../world/lands/Land01.js';
import * as Land02 from '../world/lands/Land02.js';
import * as Land03 from '../world/lands/Land03.js';
import * as Land04 from '../world/lands/Land04.js';
import * as Land05 from '../world/lands/Land05.js';
import * as Land06 from '../world/lands/Land06.js';
import * as Land07 from '../world/lands/Land07.js';
import * as Land08 from '../world/lands/Land08.js';
import * as Land09 from '../world/lands/Land09.js';
import * as Land10 from '../world/lands/Land10.js';
import * as Land11 from '../world/lands/Land11.js';
import * as Land12 from '../world/lands/Land12.js';
import * as Land13 from '../world/lands/Land13.js';
import * as Land14 from '../world/lands/Land14.js';
import * as Land15 from '../world/lands/Land15.js';
import * as Land16 from '../world/lands/Land16.js';
import * as Land17 from '../world/lands/Land17.js';
import * as Land18 from '../world/lands/Land18.js';
import * as Land19 from '../world/lands/Land19.js';
import * as Land20 from '../world/lands/Land20.js';
import * as Land21 from '../world/lands/Land21.js';
import * as Land22 from '../world/lands/Land22.js';
import * as Land23 from '../world/lands/Land23.js';
import * as Land24 from '../world/lands/Land24.js';
import * as Land25 from '../world/lands/Land25.js';
import * as Land26 from '../world/lands/Land26.js';

export class FullWorld {
    constructor() {
        this.container = document.getElementById('fullworld-screen');
        this.canvas = document.getElementById('fullworld-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.infoEl = document.getElementById('land-info');
        this.nameEl = document.getElementById('land-name');
        this.descEl = document.getElementById('land-desc');
        
        this.lands = [];
        this.offset = { x: 0, y: 0 };
        this.zoom = 5;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        
        this.loadLands();
        this.autoCenter();
        
        this.setupEventListeners();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    loadLands() {
        const modules = [
            Island01, Island02, Island03, Island04, Island05, Island06, Island07, Island08, Island09, Island10, Island11,
            Land01, Land02, Land03, Land04, Land05, Land06, Land07, Land08, Land09, Land10, Land11, Land12, Land13, Land14,
            Land15, Land16, Land17, Land18, Land19, Land20, Land21, Land22, Land23, Land24, Land25, Land26
        ];

        this.rawModules = [];
        modules.forEach(m => {
            const landKey = Object.keys(m)[0];
            if (m[landKey]) {
                const land = m[landKey];
                this.rawModules.push(land);
                // In world coordinates, X is often East/West and Z is North/South.
                // Our JSON points are [X, Z]. In 2D canvas, we'll map X to X and Z to Y.
                const mappedLand = {
                    ...land,
                    points: land.points.map(p => [p[0] * 100, p[1] * 100])
                };
                this.lands.push(mappedLand);
            }
        });
        console.log(`Loaded ${this.lands.length} lands for the world map.`);
    }

    autoCenter() {
        if (this.lands.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.lands.forEach(land => {
            land.points.forEach(p => {
                minX = Math.min(minX, p[0]);
                maxX = Math.max(maxX, p[0]);
                minY = Math.min(minY, p[1]);
                maxY = Math.max(maxY, p[1]);
            });
        });

        console.log(`World bounds: X[${minX}, ${maxX}], Y[${minY}, ${maxY}]`);

        const worldWidth = maxX - minX;
        const worldHeight = maxY - minY;
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        this.offset.x = -centerX;
        this.offset.y = -centerY;

        const padding = 1.2;
        const scaleX = this.canvas.width / (worldWidth * padding);
        const scaleY = this.canvas.height / (worldHeight * padding);
        this.zoom = Math.min(scaleX, scaleY);
        
        console.log(`Auto-centered: Offset(${this.offset.x}, ${this.offset.y}), Zoom: ${this.zoom}`);
    }

    setupEventListeners() {
        const backBtn = document.getElementById('fullworld-back');
        if (backBtn) {
            backBtn.onclick = () => this.hide();
        }

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.hasMoved = false;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = (e.clientX - this.lastMousePos.x) / this.zoom;
                const dy = (e.clientY - this.lastMousePos.y) / this.zoom;
                
                if (Math.abs(e.clientX - this.dragStartX) > 5 || Math.abs(e.clientY - this.dragStartY) > 5) {
                    this.hasMoved = true;
                }
                
                this.offset.x += dx;
                this.offset.y += dy;
                this.lastMousePos = { x: e.clientX, y: e.clientY };
                this.draw();
            } else {
                this.handleHover(e);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isDragging && !this.hasMoved) {
                this.handleClick(e);
            }
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('wheel', (e) => {
            const zoomSpeed = 0.1;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= delta;
            this.zoom = Math.max(1, Math.min(100, this.zoom));
            this.draw();
            e.preventDefault();
        }, { passive: false });
    }

    handleHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.canvas.width / 2) / this.zoom - this.offset.x;
        const mouseY = (e.clientY - rect.top - this.canvas.height / 2) / this.zoom - this.offset.y;

        let hoveredLand = null;
        for (const land of this.lands) {
            if (this.isPointInPolygon([mouseX, mouseY], land.points)) {
                hoveredLand = land;
                break;
            }
        }

        if (hoveredLand) {
            this.infoEl.style.display = 'block';
            this.nameEl.textContent = hoveredLand.name || hoveredLand.id;
            this.descEl.textContent = hoveredLand.desc || "A mysterious land...";
            this.canvas.style.cursor = 'pointer';
        } else {
            this.infoEl.style.display = 'none';
            if (!this.isDragging) this.canvas.style.cursor = 'grab';
        }
    }

    isPointInPolygon(point, vs) {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0], yi = vs[i][1];
            const xj = vs[j][0], yj = vs[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.canvas.width / 2) / this.zoom - this.offset.x;
        const mouseY = (e.clientY - rect.top - this.canvas.height / 2) / this.zoom - this.offset.y;

        let selectedLand = null;
        for (const land of this.lands) {
            if (this.isPointInPolygon([mouseX, mouseY], land.points)) {
                selectedLand = land;
                break;
            }
        }

        if (selectedLand && window.gameInstance && window.gameInstance.worldManager) {
            console.log(`FullWorld: Traveling to ${selectedLand.name || selectedLand.id}`);
            
            // Show loading screen if it exists
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'flex';

            // Find the original land data (without the map scaling)
            const rawLand = this.rawModules.find(m => m.id === selectedLand.id);
            
            // Use a small delay to let the loading screen show
            setTimeout(() => {
                window.gameInstance.worldManager.loadLand(rawLand || selectedLand);
                this.hide();
                if (loadingScreen) loadingScreen.style.display = 'none';
            }, 100);
        }
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }

    show() {
        this.container.style.display = 'flex';
        this.resize();
        this.autoCenter();
        this.draw();
    }

    hide() {
        this.container.style.display = 'none';
        if (window.showMainMenu) window.showMainMenu();
    }

    draw() {
        if (this.container.style.display === 'none') return;
        
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(this.offset.x, this.offset.y);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1 / this.zoom;
        const gridSize = 1000;
        const extent = 20000;
        for (let x = -extent; x <= extent; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, -extent);
            ctx.lineTo(x, extent);
            ctx.stroke();
        }
        for (let y = -extent; y <= extent; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(-extent, y);
            ctx.lineTo(extent, y);
            ctx.stroke();
        }

        this.lands.forEach(land => {
            if (!land.points || land.points.length < 3) return;
            
            ctx.beginPath();
            ctx.moveTo(land.points[0][0], land.points[0][1]);
            for (let i = 1; i < land.points.length; i++) {
                ctx.lineTo(land.points[i][0], land.points[i][1]);
            }
            ctx.closePath();
            
            ctx.fillStyle = land.color || '#3b82f6';
            ctx.globalAlpha = 1.0; 
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / this.zoom; 
            ctx.stroke();

            // Label the land
            if (this.zoom > 0.05) { // Only show labels when zoomed in enough
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = `${12 / this.zoom}px Cinzel`;
                ctx.textAlign = 'center';
                ctx.shadowBlur = 4 / this.zoom;
                ctx.shadowColor = 'black';
                // Calculate centroid for label position
                let cx = 0, cy = 0;
                land.points.forEach(p => { cx += p[0]; cy += p[1]; });
                cx /= land.points.length;
                cy /= land.points.length;
                ctx.fillText(land.name || land.id, cx, cy);
                ctx.restore();
            }
        });

        ctx.restore();
    }
}
