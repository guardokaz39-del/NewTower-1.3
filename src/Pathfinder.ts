import { Cell } from './MapData';
import { PerformanceMonitor } from './utils/PerformanceMonitor';

export class Pathfinder {
    // Path cache - avoids recalculating path on every spawn
    private static cachedPath: { x: number; y: number }[] = [];
    private static cacheKey: string = '';

    // Grid version to ensure cache invalidation on map edits
    private static gridVersion: number = 0;

    // Engine-Grade Buffers (Static, shared across all pathfind calls)
    private static queue: Int32Array | null = null;
    private static visited: Uint16Array | null = null;
    private static parent: Int32Array | null = null; // Stores index of parent node
    private static searchId: number = 0;
    private static bufferSize: number = 0;


    /**
     * Invalidate cache when map changes (call this after map edits)
     */
    public static invalidateCache(): void {
        this.cachedPath = [];
        this.cacheKey = '';
        this.gridVersion++;
    }

    /**
     * Ensure buffers are large enough for the current grid
     */
    private static ensureBuffers(cols: number, rows: number) {
        const size = cols * rows;
        if (!this.queue || this.bufferSize < size) {
            this.bufferSize = size;
            this.queue = new Int32Array(size);
            this.visited = new Uint16Array(size);
            this.parent = new Int32Array(size);
            this.searchId = 0;
        }
    }

    /**
     * Generate a hash of start/end/grid for cache key
     */
    private static getCacheKey(
        start: { x: number; y: number },
        end: { x: number; y: number },
        gridRows: number,
        gridCols: number
    ): string {
        return `${start.x},${start.y}-${end.x},${end.y}-${gridRows}x${gridCols}-v${this.gridVersion}`;
    }

    /**
     * Finds path using Zero-Allocation BFS logic (internally).
     * Returns a fresh array of points (allocates result only).
     */
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
            return [...this.cachedPath]; // Return copy to prevent mutation
        }

        // Initialize buffers
        this.ensureBuffers(cols, rows);
        const queue = this.queue!;
        const visited = this.visited!;
        const parent = this.parent!;

        // Increment Search ID
        this.searchId++;
        if (this.searchId >= 65000) {
            this.searchId = 1;
            visited.fill(0);
        }
        const sid = this.searchId;

        const startIdx = start.y * cols + start.x;
        const endIdx = end.y * cols + end.x;

        // BFS Init
        let head = 0;
        let tail = 0;

        queue[tail++] = startIdx;
        visited[startIdx] = sid;
        parent[startIdx] = -1; // Start has no parent

        const offsets = [-cols, 1, cols, -1]; // Up, Right, Down, Left (Deterministic)

        let found = false;

        // Search Loop
        while (head < tail) {
            const currentIdx = queue[head++];

            if (currentIdx === endIdx) {
                found = true;
                break;
            }

            // Neighbors
            for (let i = 0; i < 4; i++) {
                const neighborIdx = currentIdx + offsets[i];

                // Bounds Check (1D)
                if (neighborIdx < 0 || neighborIdx >= visited.length) continue;
                // Wrap Check
                if (i === 1 && (neighborIdx % cols) === 0) continue; // Right wrap
                if (i === 3 && ((neighborIdx + 1) % cols) === 0) continue; // Left wrap

                // Valid check
                const ny = (neighborIdx / cols) | 0;
                const nx = neighborIdx % cols; // Optim: could avoid mod?

                const cell = grid[ny][nx];
                if (cell.type === 1) { // STRICT: Path only
                    if (visited[neighborIdx] !== sid) {
                        visited[neighborIdx] = sid;
                        parent[neighborIdx] = currentIdx;
                        queue[tail++] = neighborIdx;
                    }
                }
            }
        }

        if (found) {
            // Reconstruct path
            const path: { x: number; y: number }[] = [];
            let curr = endIdx;
            while (curr !== -1) {
                const cx = curr % cols;
                const cy = (curr / cols) | 0;
                path.push({ x: cx, y: cy });
                curr = parent[curr];
            }
            // Reverse to get Start -> End
            path.reverse();

            // Cache result
            this.cachedPath = path;
            this.cacheKey = key;

            PerformanceMonitor.endTimer('Pathfinding');
            return [...path];
        }

        PerformanceMonitor.endTimer('Pathfinding');
        return [];
    }
}
