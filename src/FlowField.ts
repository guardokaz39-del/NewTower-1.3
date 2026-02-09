import { CONFIG } from './Config';
import { Cell } from './MapData';

export class FlowField {
    public cols: number;
    public rows: number;
    public target: { x: number; y: number } | null = null;

    // Dijkstra Map: Distance to target for each cell
    public distances: number[][] = [];

    // Vector Field: Direction to move for each cell
    public vectors: { x: number; y: number }[][] = [];

    constructor(cols: number, rows: number) {
        this.cols = cols;
        this.rows = rows;
        this.reset();
    }

    public reset() {
        this.distances = Array(this.rows).fill(0).map(() => Array(this.cols).fill(Infinity));
        this.vectors = Array(this.rows).fill(0).map(() => Array(this.cols).fill({ x: 0, y: 0 }));
    }

    /**
     * Generates the Flow Field (Dijkstra Map + Vector Field)
     * @param grid The game grid (0 = grass/buildable, 1 = path, others = obstacles)
     * @param target The target cell (Base)
     */
    public generate(grid: Cell[][], target: { x: number; y: number }) {
        this.target = target;
        this.reset();

        // 1. Calculate Distances (BFS / Dijkstra)
        const queue: { x: number; y: number; dist: number }[] = [];

        // Initialize target
        this.distances[target.y][target.x] = 0;
        queue.push({ x: target.x, y: target.y, dist: 0 });

        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 1, dy: 0 },  // Right
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }  // Left
        ];

        while (queue.length > 0) {
            const current = queue.shift()!;

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;

                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                    const cell = grid[ny][nx];
                    // Strict path following: Only type 1 is walkable for ground units
                    if (cell.type === 1) {
                        if (this.distances[ny][nx] === Infinity) {
                            this.distances[ny][nx] = current.dist + 1;
                            queue.push({ x: nx, y: ny, dist: current.dist + 1 });
                        }
                    }
                }
            }
        }

        // 2. Generate Vectors based on Distances
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.distances[y][x] === Infinity) continue; // Unreachable

                let minDist = this.distances[y][x];
                let bestDir = { dx: 0, dy: 0 };

                for (const dir of directions) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;

                    if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                        const dist = this.distances[ny][nx];
                        if (dist < minDist) {
                            minDist = dist;
                            bestDir = dir;
                        }
                    }
                }

                this.vectors[y][x] = { x: bestDir.dx, y: bestDir.dy };
            }
        }
    }

    /**
     * Gets the movement vector for a world position
     * Handles steering behavior to keep entities centered on tiles
     * @param out The vector to write results into (avoid allocation)
     */
    public getVector(worldX: number, worldY: number, out: { x: number; y: number }): void {
        const col = Math.floor(worldX / CONFIG.TILE_SIZE);
        const row = Math.floor(worldY / CONFIG.TILE_SIZE);

        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            out.x = 0;
            out.y = 0;
            return;
        }

        // Basic vector from field
        const vector = this.vectors[row][col];

        // If we represent the "Target" (Base), vector is 0,0. 
        if (vector.x === 0 && vector.y === 0) {
            out.x = 0;
            out.y = 0;
            return;
        }

        // Steering / Centering logic
        // If moving Horizontal, align Y to center of tile
        // If moving Vertical, align X to center of tile

        const centerX = col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const centerY = row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        let steerX = vector.x;
        let steerY = vector.y;

        const centerThreshold = 4.0; // Increased threshold
        const steerStrength = 1.5; // Strong steering to force center alignment

        if (vector.x !== 0) {
            // Moving horizontally, correct Y
            const dy = centerY - worldY;
            if (Math.abs(dy) > centerThreshold) {
                // Additive steering
                steerY += Math.sign(dy) * steerStrength;
            }
        }

        if (vector.y !== 0) {
            // Moving vertically, correct X
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
     * Checks if placing an obstacle at (ox, oy) blocks the path to target for ANY spawn point.
     * @param grid The grid state *before* placement
     * @param spawns List of spawn points
     * @returns True if buildable (path exists), False if blocked
     */
    public checkBuildability(grid: Cell[][], ox: number, oy: number, spawns: { x: number; y: number }[]): boolean {
        if (!this.target) return true;

        // Simple BFS for validation
        const q: { x: number, y: number }[] = [];
        const visited = new Set<string>();

        // Add target to Q (reverse search) or Spawns to Q (forward).
        // Let's do Spawns -> Target.
        for (const spawn of spawns) {
            q.push(spawn);
            visited.add(`${spawn.x},${spawn.y}`);
        }

        // Standard BFS
        let found = false;

        while (q.length > 0) {
            const cur = q.shift()!;
            if (cur.x === this.target.x && cur.y === this.target.y) {
                found = true;
                break;
            }

            const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
            for (const d of dirs) {
                const nx = cur.x + d.x;
                const ny = cur.y + d.y;

                // Check bounds
                if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;

                // Check blockage
                if (nx === ox && ny === oy) continue;

                // Check grid walkability (using same logic as generator)
                const cell = grid[ny][nx];
                if (cell.type === 1 || cell.type === 0) { // Allow grass if mazing?
                    const key = `${nx},${ny}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        q.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return found;
    }
}
