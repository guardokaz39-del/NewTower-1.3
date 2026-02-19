import { buildFullPathFromControlPoints } from '../../../editor/path/buildFullPathFromControlPoints';

describe('buildFullPathFromControlPoints', () => {
    it('concatenates segments and removes duplicate joints', () => {
        const grid = [[{ type: 1 }]] as any;
        const controlPoints = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        ];

        const findPathFn = jest.fn((_: any, start: { x: number; y: number }, end: { x: number; y: number }) => {
            if (start.x === 0 && end.x === 1) {
                return [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                ];
            }
            return [
                { x: 1, y: 0 },
                { x: 2, y: 0 },
            ];
        });

        const result = buildFullPathFromControlPoints(grid, controlPoints, findPathFn);

        expect(result).toEqual({
            ok: true,
            path: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
            ],
        });
        expect(findPathFn).toHaveBeenCalledTimes(2);
    });

    it('returns concise error when any segment is missing', () => {
        const grid = [[{ type: 1 }]] as any;
        const controlPoints = [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ];

        const result = buildFullPathFromControlPoints(grid, controlPoints, () => []);

        expect(result).toEqual({
            ok: false,
            error: 'No path between (1,1) and (2,2)',
        });
    });
});
