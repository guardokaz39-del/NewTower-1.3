import { FlowField } from '../src/FlowField';

describe('FlowField Navigation', () => {
    let mapData: number[][];

    beforeEach(() => {
        // Simple 5x5 map, 0 = walkable, 1 = wall
        mapData = [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 1, 0, 0, 0],
            [0, 1, 0, 1, 0],
            [0, 0, 0, 0, 0],
        ];
    });

    it('should generate valid distances avoiding walls', () => {
        const field = new FlowField(5, 5);
        const grid = mapData.map(row => row.map(v => ({ type: v === 0 ? 1 : 0 })));
        field.generate(grid as any, { x: 4, y: 4 });

        expect(field.distances[4 * 5 + 4]).toBe(0);
        expect(field.distances[1 * 5 + 1]).toBe(-1);
        expect(field.distances[3 * 5 + 4]).toBe(1);
    });

    it('should assign normalized vectors pointing towards lower distance', () => {
        const field = new FlowField(5, 5);
        const grid = mapData.map(row => row.map(v => ({ type: v === 0 ? 1 : 0 })));
        field.generate(grid as any, { x: 4, y: 4 });

        const idx = 3 * 5 + 4;
        const vx = field.vectors[idx * 2];
        const vy = field.vectors[idx * 2 + 1];

        expect(vy).toBeGreaterThan(0); // pointing DOWN to y=4
    });
});
