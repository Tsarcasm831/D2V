import { Land23 } from './lands/Land23.js';
import { SHARD_SIZE } from './world_bounds.js';

export class WorldMask {
    constructor() {
        // SVG points from Land23 are in some SVG coordinate space.
        // We need to map them to world space.
        // Based on Land23.js, points are roughly in range [38, 49] for X and [4, 21] for Y.
        this.rawPoints = Land23.points;
        
        // Calculate bounding box of SVG points
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [x, y] of this.rawPoints) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        this.svgBounds = { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
        this.svgCenter = { x: (minX + maxX) / 2, z: (minY + maxY) / 2 };

        // Scale factor to map SVG units to world units.
        // If we want the island to be ~300 shards wide:
        // 300 * 60 = 18000 world units.
        // SVG width is ~11 units. 18000 / 11 approx 1600.
        this.worldScale = 1500; 

        // Pre-convert points to world space (x, z)
        this.poly = this.rawPoints.map(([x, y]) => ({
            x: (x - this.svgCenter.x) * this.worldScale,
            z: (y - this.svgCenter.z) * this.worldScale
        }));

        // Bounding box in world space for fast rejection
        this.worldBounds = {
            minX: Infinity, maxX: -Infinity,
            minZ: Infinity, maxZ: -Infinity
        };
        for (const p of this.poly) {
            if (p.x < this.worldBounds.minX) this.worldBounds.minX = p.x;
            if (p.x > this.worldBounds.maxX) this.worldBounds.maxX = p.x;
            if (p.z < this.worldBounds.minZ) this.worldBounds.minZ = p.z;
            if (p.z > this.worldBounds.maxZ) this.worldBounds.maxZ = p.z;
        }
    }

    containsXZ(x, z) {
        // Fast bounding box check
        if (x < this.worldBounds.minX || x > this.worldBounds.maxX ||
            z < this.worldBounds.minZ || z > this.worldBounds.maxZ) {
            return false;
        }

        // Ray casting algorithm for point-in-polygon
        let inside = false;
        for (let i = 0, j = this.poly.length - 1; i < this.poly.length; j = i++) {
            const xi = this.poly[i].x, zi = this.poly[i].z;
            const xj = this.poly[j].x, zj = this.poly[j].z;

            const intersect = ((zi > z) !== (zj > z)) &&
                (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    containsShard(sx, sz) {
        // Test the shard center in world coordinates
        const cx = sx * SHARD_SIZE;
        const cz = sz * SHARD_SIZE;
        return this.containsXZ(cx, cz);
    }
}
