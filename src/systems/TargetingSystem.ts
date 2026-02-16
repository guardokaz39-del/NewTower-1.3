import { Tower } from '../Tower';
import { Enemy } from '../Enemy';
import { SpatialGrid } from '../SpatialGrid';
import { FlowField } from '../FlowField';
import { CONFIG } from '../Config';

/**
 * Optimized Targeting System
 * - Zero Allocation (uses static buffer)
 * - O(N) Single Pass Loop
 * - Supports Taunt (Threat Priority)
 * - Implements Modes: FIRST, LAST, CLOSEST, STRONGEST
 * - Sub-tile precision for smoother tracking
 */
export class TargetingSystem {
    // Shared buffer to avoid Garbage Collection
    private static buffer: Enemy[] = [];

    // Constants for Hysteresis (Sticky Targeting)
    // Prevents rapid switching when a new target is marginally better
    private static readonly HYSTERESIS_FACTOR = 1.15; // 15% bias
    private static readonly CELL_SIZE = CONFIG.TILE_SIZE;

    /**
     * Finds the best target for a tower based on its mode and range.
     */
    public static findTarget(tower: Tower, grid: SpatialGrid<Enemy>, flowField: FlowField): Enemy | null {
        const tx = tower.x;
        const ty = tower.y;
        const range = tower.getRange();
        const rangeSq = range * range;

        // 1. Zero-Alloc Query
        grid.queryInRadius(tx, ty, range, this.buffer);

        if (this.buffer.length === 0) return null;

        const currentTarget = tower.target;
        const mode = tower.targetingMode;

        // State for Single-Pass Selection
        let bestTarget: Enemy | null = null;
        let bestScore = -Infinity; // We normalize all scores to "higher is better"
        let bestPriority = -1;

        // 2. Single Pass Loop (O(N))
        for (let i = 0; i < this.buffer.length; i++) {
            const e = this.buffer[i];

            // Basic Validity Checks
            if (!e.isAlive()) continue;

            const dx = e.x - tx;
            const dy = e.y - ty;
            const distSq = dx * dx + dy * dy;

            if (distSq > rangeSq) continue;

            // --- PRIORITY LOGIC (Taunt) ---
            // If this enemy has lower priority than the current best, skip it
            if (e.threatPriority < bestPriority) continue;

            // If we find an enemy with HIGHER priority, reset the best score
            if (e.threatPriority > bestPriority) {
                bestPriority = e.threatPriority;
                bestScore = -Infinity; // Reset score because priority overrides it
                bestTarget = null;
            }

            // --- SCORING LOGIC ---
            // Normalize scores so that "Higher = Better"
            let score = 0;
            const isCurrent = e === currentTarget;

            switch (mode) {
                case 'closest':
                    // Lower distance is better -> Invert: -distSq
                    score = -distSq;
                    break;

                case 'strongest':
                    // Higher health is better
                    score = e.currentHealth;
                    break;

                case 'first':
                    // Lower distance to base is better -> Invert: -dist
                    // Uses sub-tile precision for smoothness
                    score = -this.getPreciseFlowDistance(e, flowField);
                    break;

                case 'last':
                    // Higher distance to base is better
                    score = this.getPreciseFlowDistance(e, flowField);
                    break;
            }

            // --- HYSTERESIS BIAS ---
            // Apply bias to the current target to prevent "flickering"
            if (isCurrent && bestTarget !== null) {
                // If score is negative (distance based), division reduces magnitude (makes it "larger" / closer to 0)
                // If score is positive (health based), multiplication increases magnitude
                if (score < 0) score /= this.HYSTERESIS_FACTOR;
                else score *= this.HYSTERESIS_FACTOR;
            }

            // Update Champion
            if (score > bestScore) {
                bestScore = score;
                bestTarget = e;
            }
        }

        return bestTarget;
    }

    /**
     * Calculates precise distance to base using FlowField + Sub-tile position
     * Fixes the "stuttering" issue in First/Last modes.
     */
    private static getPreciseFlowDistance(e: Enemy, flowField: FlowField): number {
        const cellSize = this.CELL_SIZE;
        const col = (e.x / cellSize) | 0;
        const row = (e.y / cellSize) | 0;

        // 1. Grid Distance (Integer)
        let gridDist = 99999;

        // Safety Check & Grid Lookup
        if (row >= 0 && row < flowField.rows && col >= 0 && col < flowField.cols) {
            // Flattened 1D Access
            gridDist = flowField.distances[row * flowField.cols + col];
        }

        // 2. Sub-tile Precision (Float)
        if (gridDist !== -1 && gridDist !== 99999) {
            // -1 is unreachable in new FlowField
            // Use helper to get vector (handles array access transparently)
            // We reuse a static small buffer for vector retrieval to avoid allocation?
            // Actually getVector writes to an 'out' object. Let's create a temp static one.
            if (!this.tempVec) this.tempVec = { x: 0, y: 0 };

            // We need RAW vector from grid, not steering vector?
            // getPreciseFlowDistance logic relies on flow direction.
            // FlowField.getVector returns STEERING vector (centered).
            // We probably want the raw grid vector for distance calculation.

            const idx = row * flowField.cols + col;
            const vx = flowField.vectors[idx * 2];
            const vy = flowField.vectors[idx * 2 + 1];

            if (vx !== 0 || vy !== 0) {
                const cellCenterX = col * cellSize + cellSize / 2;
                const cellCenterY = row * cellSize + cellSize / 2;

                const dx = e.x - cellCenterX;
                const dy = e.y - cellCenterY;

                // Project position onto flow vector
                const progress = dx * vx + dy * vy;

                // Refined Distance
                return gridDist * cellSize - progress;
            }
        }

        return gridDist * cellSize;
    }

    private static tempVec: { x: number; y: number } | null = null;
}
