export class HexGrid {
    constructor(cols, rows, width, height) {
        this.cols = cols;
        this.rows = rows;
        this.width = width;
        this.height = height;
        
        // Calculate hex size to fit screen
        // HoMM 3 uses pointy-topped hexes
        // Width of hex = sqrt(3) * size
        // Height of hex = 2 * size
        // Horiz spacing = width
        // Vert spacing = height * 3/4
        
        const padding = 40;
        const availableW = width - padding * 2;
        const availableH = height - padding * 2;

        // Formula for total grid width: (cols + 0.5) * hexWidth
        // Formula for total grid height: (rows * 0.75 + 0.25) * hexHeight
        // Let's simplify and solve for size:
        const hexWidthRatio = Math.sqrt(3);
        const hexHeightRatio = 2;
        
        const sizeW = availableW / ((cols + 0.5) * hexWidthRatio);
        const sizeH = availableH / ((rows * 0.75 + 0.25) * hexHeightRatio);
        
        this.size = Math.min(sizeW, sizeH);
        this.hexW = this.size * Math.sqrt(3);
        this.hexH = this.size * 2;

        this.gridWidth = (this.cols + 0.5) * this.hexW;
        this.gridHeight = (this.rows * 0.75 + 0.25) * this.hexH;
        
        this.offsetX = (width - this.gridWidth) / 2 + this.hexW / 2;
        this.offsetY = (height - this.gridHeight) / 2 + this.hexH / 2;

        this.hoveredHex = null;
        this.selectedHex = null;
    }

    getHexCoords(q, r) {
        const x = this.hexW * (q + (r % 2) * 0.5) + this.offsetX;
        const y = this.hexH * (r * 0.75) + this.offsetY;
        return { x, y };
    }

    pixelToHex(px, py) {
        const x = px - this.offsetX;
        const y = py - this.offsetY;
        
        const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / this.size;
        const r = (2 / 3 * y) / this.size;
        
        return this.hexRound(q, r);
    }

    hexRound(q, r) {
        let s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);

        const q_diff = Math.abs(rq - q);
        const r_diff = Math.abs(rr - r);
        const s_diff = Math.abs(rs - s);

        if (q_diff > r_diff && q_diff > s_diff) {
            rq = -rr - rs;
        } else if (r_diff > s_diff) {
            rr = -rq - rs;
        }
        
        // Convert cube to axial/offset
        // Our grid is r-offset (even rows shifted right)
        // Wait, HoMM is actually simpler with a basic row/col offset logic
        // Let's stick to the visual coordinate system we used in getHexCoords
        
        // The above round is for cube coordinates. 
        // Let's find the nearest col, row manually for better precision in this specific layout
        let bestDist = Infinity;
        let bestHex = null;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const { x, y } = this.getHexCoords(col, row);
                const d = Math.pow(px - x, 2) + Math.pow(py - y, 2);
                if (d < bestDist) {
                    bestDist = d;
                    bestHex = { col, row };
                }
            }
        }
        
        // Only return if within reasonable hex radius
        if (bestDist > Math.pow(this.hexH * 0.8, 2)) return null;
        return bestHex;
    }

    // Better pixel to hex for staggered grid
    hitTest(px, py) {
        let bestDist = Infinity;
        let bestHex = null;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const { x, y } = this.getHexCoords(col, row);
                const d = Math.pow(px - x, 2) + Math.pow(py - y, 2);
                if (d < bestDist) {
                    bestDist = d;
                    bestHex = { col, row };
                }
            }
        }
        
        if (bestDist > Math.pow(this.size * 0.9, 2)) return null;
        return bestHex;
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.width, this.height);
        
        for (let r = 0; r < this.rows; r++) {
            for (let q = 0; q < this.cols; q++) {
                const { x, y } = this.getHexCoords(q, r);
                this.drawHex(ctx, x, y, q, r);
            }
        }
    }

    drawHex(ctx, x, y, q, r) {
        const isHovered = this.hoveredHex && this.hoveredHex.col === q && this.hoveredHex.row === r;
        const isSelected = this.selectedHex && this.selectedHex.col === q && this.selectedHex.row === r;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const vx = x + this.size * Math.cos(angle);
            const vy = y + this.size * Math.sin(angle);
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.closePath();

        // Style
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (isSelected) {
            ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (isHovered) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.fill();
        }
    }
}