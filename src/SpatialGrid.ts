/**
 * Spatial Grid for efficient proximity queries
 * Reduces collision detection from O(P × E) to O(P × avgCandidates)
 * 
 * PERF V4.0: Refactored to use Flat 1D Array instead of Map<string, T[]>
 * - Eliminates string key allocation ("x,y") every frame
 * - Uses pre-allocated cell arrays that are cleared but not recreated
 * - Zero GC pressure during gameplay
 */

export interface IGridEntity {
    x: number;
    y: number;
}

export class SpatialGrid<T extends IGridEntity> {
    private cellSize: number;
    private cols: number;
    private rows: number;
    // PERF: Flat 1D array instead of Map<string, T[]>
    private cells: T[][];

    constructor(worldWidth: number, worldHeight: number, cellSize: number = 128) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);

        // Pre-allocate ALL cells at construction time (ZERO allocation in runtime)
        const totalCells = this.cols * this.rows;
        this.cells = new Array(totalCells);
        for (let i = 0; i < totalCells; i++) {
            this.cells[i] = [];
        }
    }

    /**
     * Clear all entities from the grid
     * PERF: Does NOT deallocate arrays - just resets length to 0
     */
    public clear(): void {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i].length = 0;
        }
    }

    /**
     * Get flat index from column and row
     * PERF: No string allocation
     */
    private getIndex(col: number, row: number): number {
        return col + row * this.cols;
    }

    /**
     * Get cell index for a world position
     * PERF: Returns -1 for out-of-bounds (no crash, no string)
     */
    private getCellIndex(x: number, y: number): number {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return -1;
        }
        return this.getIndex(col, row);
    }

    /**
     * Register an entity in the grid based on its position
     */
    public register(entity: T): void {
        const idx = this.getCellIndex(entity.x, entity.y);
        if (idx >= 0) {
            this.cells[idx].push(entity);
        }
    }

    /**
     * Get all entities within radius of the given position
     * Only checks cells that could contain entities within the radius
     */
    // PERF: Shared buffer for queries to avoid allocation
    private queryBuffer: T[] = [];

    /**
     * Get all entities within radius of the given position
     * Uses a shared buffer to avoid GC. CAUTION: Result is valid only until next call.
     */
    public getNearby(x: number, y: number, radius: number): T[] {
        this.queryBuffer.length = 0; // Clear without allocation

        // Calculate which cells to check
        const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

        // Check all relevant cells
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const cell = this.cells[this.getIndex(col, row)];
                for (let i = 0; i < cell.length; i++) {
                    this.queryBuffer.push(cell[i]);
                }
            }
        }

        return this.queryBuffer;
    }

    /**
     * Iterator pattern - NO ARRAY ALLOCATION
     * PERF: Use this when you don't need to store the results
     */
    public forEachNearby(x: number, y: number, radius: number, callback: (entity: T) => void): void {
        const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const cell = this.cells[this.getIndex(col, row)];
                for (let i = 0; i < cell.length; i++) {
                    callback(cell[i]);
                }
            }
        }
    }

    /**
     * Get all entities within radius of the given position
     * Fills the provided buffer to avoid allocation.
     * ZERO GC method.
     * @param x Center X
     * @param y Center Y
     * @param radius Search radius
     * @param outBuffer Buffer to fill (will be cleared)
     * @returns Number of entities found
     */
    public queryInRadius(x: number, y: number, radius: number, outBuffer: T[]): number {
        outBuffer.length = 0;

        // PADDING: Add extra range to catch large units (e.g. Bosses) whose center
        // might be in a neighbor cell but whose body overlaps into range.
        const PADDING = 64;
        const searchRadius = radius + PADDING;

        const minCol = Math.max(0, Math.floor((x - searchRadius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + searchRadius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((y - searchRadius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + searchRadius) / this.cellSize));

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const cell = this.cells[this.getIndex(col, row)];
                // Standard for loop for performance
                for (let i = 0; i < cell.length; i++) {
                    outBuffer.push(cell[i]);
                }
            }
        }

        return outBuffer.length;
    }

    /**
     * Debug: Get grid statistics
     */
    public getStats(): { totalCells: number; occupiedCells: number; totalEntities: number } {
        let totalEntities = 0;
        let occupiedCells = 0;

        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i].length > 0) {
                occupiedCells++;
                totalEntities += this.cells[i].length;
            }
        }

        return {
            totalCells: this.cols * this.rows,
            occupiedCells,
            totalEntities,
        };
    }
}
