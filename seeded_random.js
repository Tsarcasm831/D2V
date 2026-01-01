/**
 * Simple seeded random generator (Mulberry32)
 */
export function getSeededRandom(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Creates a unique seed for a shard coordinate
 */
export function getShardSeed(gridX, gridZ, worldSeed) {
    // Combine world seed with grid coordinates to create a unique integer seed
    const h1 = Math.imul(gridX ^ (gridX >>> 16), 0x21f0aaad);
    const h2 = Math.imul(gridZ ^ (gridZ >>> 16), 0x735a2d97);
    return (h1 ^ h2 ^ worldSeed) >>> 0;
}