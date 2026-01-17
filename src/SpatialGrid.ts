/**
 * Spatial Grid for efficient proximity queries
 * Reduces collision detection from O(P × E) to O(P × avgCandidates)
 */

export interface IGridEntity {
    x: number;
    y: number;
}

export class SpatialGrid<T extends IGridEntity> {
    private cellSize: number;
    private grid: Map<string, T[]>;
    private cols: number;
    private rows: number;

    constructor(worldWidth: number, worldHeight: number, cellSize: number = 128) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);
        this.grid = new Map();
    }

    /**
     * Clear all entities from the grid
     */
    public clear(): void {
        this.grid.clear();
    }

    /**
     * Register an entity in the grid based on its position
     */
    public register(entity: T): void {
        const cellKey = this.getCellKey(entity.x, entity.y);
        
        if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, []);
        }
        
        this.grid.get(cellKey)!.push(entity);
    }

    /**
     * Get all entities within radius of the given position
     * Only checks cells that could contain entities within the radius
     */
    public getNearby(x: number, y: number, radius: number): T[] {
        const results: T[] = [];
        
        // Calculate which cells to check
        const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

        // Check all relevant cells
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const cellKey = this.makeCellKey(col, row);
                const entities = this.grid.get(cellKey);
                
                if (entities) {
                    results.push(...entities);
                }
            }
        }

        return results;
    }

    /**
     * Get cell key for a position
     */
    private getCellKey(x: number, y: number): string {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return this.makeCellKey(col, row);
    }

    /**
     * Create cell key from column and row
     */
    private makeCellKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    /**
     * Debug: Get grid statistics
     */
    public getStats(): { totalCells: number; occupiedCells: number; totalEntities: number } {
        let totalEntities = 0;
        for (const entities of this.grid.values()) {
            totalEntities += entities.length;
        }

        return {
            totalCells: this.cols * this.rows,
            occupiedCells: this.grid.size,
            totalEntities,
        };
    }
}
