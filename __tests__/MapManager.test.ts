import { describe, it, expect } from 'vitest';
import { MapManager } from '../src/Map';

describe('MapManager Tile Bitmasks', () => {
    it('calculates correct bitmasks for water tiles', () => {
        const mockMapData = {
            width: 3, height: 3,
            tiles: [
                [0, 2, 0],
                [2, 2, 2], // Center water has neighbors
                [0, 2, 0]
            ],
            waypoints: [] as any[], waves: [] as any[], objects: [] as any[]
        };

        const map = new MapManager(mockMapData);

        // Mock canvas context
        const mockCtx = {
            clearRect: () => { },
            drawImage: () => { },
            fillRect: () => { }
        } as unknown as CanvasRenderingContext2D;

        // Force creation of cache canvas
        map['cacheCanvas'] = { getContext: () => mockCtx, width: 300, height: 300 } as any;

        // Trigger prerender which calculates bitmasks
        map.prerender();

        const positions = map['_animatedTilePositions'];
        expect(positions).toBeDefined();

        // Water tiles only
        expect(positions.length).toBe(5);
        expect(positions.every((p: any) => p.type === 'water')).toBe(true);

        // Center water (x=1, y=1) has all 4 neighbors = NORTH(1) | WEST(2) | EAST(4) | SOUTH(8) = 15
        const centerWater = positions.find((p: any) => p.px === 64 && p.py === 64);
        expect(centerWater).toBeDefined();
        expect(centerWater.bitmask).toBe(15);

        // Top water (x=1, y=0) has only South neighbor = 8
        const topWater = positions.find((p: any) => p.px === 64 && p.py === 0);
        expect(topWater).toBeDefined();
        expect(topWater.bitmask).toBe(8);

        // Left water (x=0, y=1) has only East neighbor = 4
        const leftWater = positions.find((p: any) => p.px === 0 && p.py === 64);
        expect(leftWater).toBeDefined();
        expect(leftWater.bitmask).toBe(4);
    });
});
