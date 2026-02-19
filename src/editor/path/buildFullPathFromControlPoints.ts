import { Cell } from '../../MapData';

export type TilePos = { x: number; y: number };

export type FullPathResult = { ok: true; path: TilePos[] } | { ok: false; error: string };

export function buildFullPathFromControlPoints(
    grid: Cell[][],
    controlPoints: TilePos[],
    findPathFn: (grid: Cell[][], start: TilePos, end: TilePos) => TilePos[],
): FullPathResult {
    if (controlPoints.length < 2) {
        return { ok: false, error: 'Set Start and End points first!' };
    }

    const fullPath: TilePos[] = [];

    for (let i = 0; i < controlPoints.length - 1; i++) {
        const from = controlPoints[i];
        const to = controlPoints[i + 1];
        const segment = findPathFn(grid, from, to);

        if (!segment || segment.length === 0) {
            return { ok: false, error: `No path between (${from.x},${from.y}) and (${to.x},${to.y})` };
        }

        if (i === 0) {
            fullPath.push(...segment);
        } else {
            fullPath.push(...segment.slice(1));
        }
    }

    return { ok: true, path: fullPath };
}
