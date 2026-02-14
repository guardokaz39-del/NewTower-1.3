import { CONFIG } from './Config';
import { Cell } from './MapData';

export class FlowField {
    public cols: number;
    public rows: number;
    public target: { x: number; y: number } | null = null;

    // Engine-Grade Buffers (Flat Arrays)
    // Distances: -1 = Unreachable, >=0 = Distance
    public distances: Int32Array;
    // Vectors: interleaved x,y. index*2 = x, index*2+1 = y. Values: -1, 0, 1
    public vectors: Int8Array;

    // Search State (Shared)
    private queue: Int32Array;
    private visited: Uint16Array;
    private searchId: number = 0;

    // Version tracking
    public version: number = 0;

    constructor(cols: number, rows: number) {
        this.cols = cols;
        this.rows = rows;

        // Allocate buffers
        const size = cols * rows;
        this.distances = new Int32Array(size);
        this.vectors = new Int8Array(size * 2);
        this.queue = new Int32Array(size); // Max queue size is whole map
        this.visited = new Uint16Array(size);

        this.reset();
    }

    /**
     * Resizes buffers if map dimensions change (Editor support)
     */
    public resize(cols: number, rows: number) {
        this.cols = cols;
        this.rows = rows;
        const size = cols * rows;
        this.distances = new Int32Array(size);
        this.vectors = new Int8Array(size * 2);
        this.queue = new Int32Array(size);
        this.visited = new Uint16Array(size);
        this.searchId = 0;
        this.reset();
    }

    public reset() {
        this.distances.fill(-1);
        this.vectors.fill(0);
        // We don't need to reset visited/queue as they use searchId/pointers
    }

    /**
     * Generates the Flow Field (Dijkstra Map + Vector Field)
     * Zero-Allocation implementation.
     */
    public generate(grid: Cell[][], target: { x: number; y: number }) {
        this.target = target;
        this.version++;
        this.searchId++;

        // Overflow protection for searchId
        if (this.searchId >= 65000) {
            this.searchId = 1;
            this.visited.fill(0);
        }

        // Initialize Search
        const targetIdx = target.y * this.cols + target.x;

        // Reset buffers logic
        // We can't use fill(-1) on distances efficiently every time?
        // Actually, for FlowField we overwrite reachable values. 
        // But unreachable ones must remain -1.
        // Option: Track 'touched' indices or just fill(-1) since generate is not per-frame.
        // Since generate happens only on build/dirty, fill(-1) is acceptable safety.
        this.distances.fill(-1);
        this.vectors.fill(0);

        // BFS params
        let head = 0;
        let tail = 0;

        // Push Target
        this.queue[tail++] = targetIdx;
        this.visited[targetIdx] = this.searchId;
        this.distances[targetIdx] = 0;

        const cols = this.cols;
        const rows = this.rows;

        // Directions: Up, Right, Down, Left
        // Optimization: Pre-calc neighbor offsets? 
        // For strict grid: -cols, +1, +cols, -1
        const offsets = [-cols, 1, cols, -1];
        const dxs = [0, 1, 0, -1];
        const dys = [-1, 0, 1, 0];

        while (head < tail) {
            const currentIdx = this.queue[head++];
            const dist = this.distances[currentIdx];

            // Reconstruct x,y only if needed for boundary checks
            // Optimization: checking boundaries using 1D index is tricky without x,y
            const cx = currentIdx % cols;
            // const cy = (currentIdx / cols) | 0;

            for (let i = 0; i < 4; i++) {
                const offset = offsets[i];
                const neighborIdx = currentIdx + offset;

                // Simple 1D boundary checks
                // 1. Array bounds
                if (neighborIdx < 0 || neighborIdx >= this.distances.length) continue;

                // 2. Wrap-around checks (e.g. Right edge to Left edge)
                // If moving Right (+1), make sure we didn't jump to x=0
                if (i === 1 && (neighborIdx % cols) === 0) continue;
                // If moving Left (-1), make sure we didn't jump to x=cols-1
                if (i === 3 && ((neighborIdx + 1) % cols) === 0) continue;

                // Valid neighbor
                const nx = cx + dxs[i];
                const ny = (neighborIdx / cols) | 0;

                // Game Logic Rule: Only walk on PATH (type === 1)
                const cell = grid[ny][nx];

                if (cell.type === 1) {
                    if (this.visited[neighborIdx] !== this.searchId) {
                        this.visited[neighborIdx] = this.searchId;
                        this.distances[neighborIdx] = dist + 1;
                        this.queue[tail++] = neighborIdx;
                    }
                }
            }
        }

        // 2. Generate Vectors
        // Iterate only reachable cells? Or all?
        // Can utilize the queue 'touched' cells? No, queue is empty now.
        // We iterate all cells.
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = y * cols + x;
                const dist = this.distances[idx];

                if (dist === -1) continue; // Unreachable

                let minDist = dist;
                let bestDirIndex = -1;

                // Check neighbors
                for (let i = 0; i < 4; i++) {
                    const offset = offsets[i];
                    const neighborIdx = idx + offset;

                    if (neighborIdx < 0 || neighborIdx >= this.distances.length) continue;
                    // Wrap/Boundary checks
                    if (i === 1 && (neighborIdx % cols) === 0) continue;
                    if (i === 3 && ((neighborIdx + 1) % cols) === 0) continue;

                    const nDist = this.distances[neighborIdx];
                    if (nDist !== -1 && nDist < minDist) {
                        minDist = nDist;
                        bestDirIndex = i;
                    }
                }

                if (bestDirIndex !== -1) {
                    this.vectors[idx * 2] = dxs[bestDirIndex]; // x
                    this.vectors[idx * 2 + 1] = dys[bestDirIndex]; // y
                }
            }
        }
    }

    /**
     * Gets movement vector. Optimized for flat array.
     */
    public getVector(worldX: number, worldY: number, out: { x: number; y: number }): void {
        const col = Math.floor(worldX / CONFIG.TILE_SIZE);
        const row = Math.floor(worldY / CONFIG.TILE_SIZE);

        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            out.x = 0;
            out.y = 0;
            return;
        }

        const idx = row * this.cols + col;
        const vecIndex = idx * 2;
        const vx = this.vectors[vecIndex];
        const vy = this.vectors[vecIndex + 1];

        if (vx === 0 && vy === 0) {
            out.x = 0;
            out.y = 0;
            return;
        }

        // Steering Logic (Centering)
        const TS = CONFIG.TILE_SIZE;
        const centerX = col * TS + TS / 2;
        const centerY = row * TS + TS / 2;

        let steerX = vx;
        let steerY = vy;

        const centerThreshold = 4.0;
        const steerStrength = 1.5;

        // If moving Horizontal, correct Y
        if (vx !== 0) {
            const dy = centerY - worldY;
            if (Math.abs(dy) > centerThreshold) {
                steerY += Math.sign(dy) * steerStrength;
            }
        }

        // If moving Vertical, correct X
        if (vy !== 0) {
            const dx = centerX - worldX;
            if (Math.abs(dx) > centerThreshold) {
                steerX += Math.sign(dx) * steerStrength;
            }
        }

        // Normalize
        const lenSq = steerX * steerX + steerY * steerY;
        if (lenSq > 0.000001 && Math.abs(lenSq - 1) > 0.01) {
            const len = Math.sqrt(lenSq);
            steerX /= len;
            steerY /= len;
        }

        out.x = steerX;
        out.y = steerY;
    }

    /**
     * Optimized CheckBuildability.
     * Uses SearchId to reuse buffers without allocation.
     */
    public checkBuildability(grid: Cell[][], ox: number, oy: number, spawns: { x: number; y: number }[]): boolean {
        if (!this.target) return true;

        // MAZE RULE OPTIMIZATION:
        // If the tile is a Path (type=1), we can NEVER build there.
        // This is enforced by isBuildable, but we check here for robustness.
        const tile = grid[oy][ox];
        if (tile && tile.type === 1) return false;

        // If we are strictly "Forbidden Maze", we theoretically don't need BFS if we assume
        // the map is valid and we only build on Grass.
        // However, if we built on Grass that somehow blocked a specialized path (e.g. cutting corner?), 
        // we keep BFS for safety but it is super fast now.

        this.searchId++;
        if (this.searchId >= 65000) {
            this.searchId = 1;
            this.visited.fill(0);
        }

        const targetIdx = this.target.y * this.cols + this.target.x;

        let head = 0;
        let tail = 0;

        // Push spawns (Reverse BFS: Spawns -> Target? Or Forward?)
        // Previous logic was Spawns -> Target.

        for (const spawn of spawns) {
            const idx = spawn.y * this.cols + spawn.x;
            this.queue[tail++] = idx;
            this.visited[idx] = this.searchId;
        }

        const cols = this.cols;
        const offsets = [-cols, 1, cols, -1];

        // We only need to find Target.
        while (head < tail) {
            const currentIdx = this.queue[head++];

            if (currentIdx === targetIdx) return true; // Reached target!

            const cx = currentIdx % cols;

            for (let i = 0; i < 4; i++) {
                const neighborIdx = currentIdx + offsets[i];

                if (neighborIdx < 0 || neighborIdx >= this.distances.length) continue;
                if (i === 1 && (neighborIdx % cols) === 0) continue;
                if (i === 3 && ((neighborIdx + 1) % cols) === 0) continue;

                // Check blockage
                const ny = (neighborIdx / cols) | 0;
                const nx = neighborIdx % cols;

                if (nx === ox && ny === oy) continue; // The phantom block

                const cell = grid[ny][nx];
                // Walkability check - STRICT: Only Path (type === 1)
                if (cell.type === 1) {
                    if (this.visited[neighborIdx] !== this.searchId) {
                        this.visited[neighborIdx] = this.searchId;
                        this.queue[tail++] = neighborIdx;
                    }
                }
            }
        }

        return false;
    }
}
