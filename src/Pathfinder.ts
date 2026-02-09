import { Cell } from './MapData';
import { PerformanceMonitor } from './utils/PerformanceMonitor';

export class Pathfinder {
    // Path cache - avoids recalculating path on every spawn
    private static cachedPath: { x: number; y: number }[] = [];
    private static cacheKey: string = '';

    /**
     * Invalidate cache when map changes (call this after map edits)
     */
    public static invalidateCache(): void {
        this.cachedPath = [];
        this.cacheKey = '';
    }

    /**
     * Generate a simple hash of start/end points for cache key
     */
    private static getCacheKey(
        start: { x: number; y: number },
        end: { x: number; y: number },
        gridRows: number,
        gridCols: number
    ): string {
        return `${start.x},${start.y}-${end.x},${end.y}-${gridRows}x${gridCols}`;
    }

    // Находит путь от start до end, используя только тайлы типа 1 (Path)
    // Возвращает массив координат {x, y} или пустой массив, если пути нет
    public static findPath(
        grid: Cell[][],
        start: { x: number; y: number },
        end: { x: number; y: number },
    ): { x: number; y: number }[] {
        PerformanceMonitor.startTimer('Pathfinding');
        PerformanceMonitor.addCount('PathCalls', 1);

        const rows = grid.length;
        const cols = grid[0].length;

        // Check cache first
        const key = this.getCacheKey(start, end, rows, cols);
        if (key === this.cacheKey && this.cachedPath.length > 0) {
            PerformanceMonitor.endTimer('Pathfinding');
            return this.cachedPath;
        }

        // Очередь для BFS: [ {x, y}, [path_so_far] ]
        const queue: { pos: { x: number; y: number }; path: { x: number; y: number }[] }[] = [];
        queue.push({ pos: start, path: [start] });

        const visited = new Set<string>();
        visited.add(`${start.x},${start.y}`);

        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 1, dy: 0 }, // Right
            { dx: 0, dy: 1 }, // Down
            { dx: -1, dy: 0 }, // Left
        ];

        while (queue.length > 0) {
            const { pos, path } = queue.shift()!;

            if (pos.x === end.x && pos.y === end.y) {
                // Cache the result
                this.cachedPath = path;
                this.cacheKey = key;
                PerformanceMonitor.endTimer('Pathfinding');
                return path;
            }

            for (let i = 0; i < directions.length; i++) {
                const dir = directions[i];
                const nx = pos.x + dir.dx;
                const ny = pos.y + dir.dy;
                const cellKey = `${nx},${ny}`;

                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited.has(cellKey)) {
                    const cell = grid[ny][nx];
                    if (cell.type === 1) {
                        visited.add(cellKey);
                        queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
                    }
                }
            }
        }

        PerformanceMonitor.endTimer('Pathfinding');
        return [];
    }
}
