import { Tower } from '../Tower';
import { Enemy } from '../Enemy';
import { SpatialGrid } from '../SpatialGrid';
import { FlowField } from '../FlowField';

/**
 * Optimized Targeting System
 * - Zero Allocation (uses static buffer)
 * - O(1) Spatial Lookups
 * - Supports Taunt (Threat Priority)
 * - Implements Modes: FIRST, LAST, CLOSEST, STRONGEST
 */
export class TargetingSystem {
    // Shared buffer to avoid Garbage Collection
    private static buffer: Enemy[] = [];

    /**
     * Finds the best target for a tower based on its mode and range.
     */
    public static findTarget(tower: Tower, grid: SpatialGrid<Enemy>, flowField: FlowField): Enemy | null {
        const tx = tower.x;
        const ty = tower.y;
        const range = tower.getRange(); // Assuming Tower has getRange or access to stats
        const rangeSq = range * range;

        // 1. Fill buffer with potential targets
        // Note: queryInRadius is zero-alloc and clears the buffer internally
        grid.queryInRadius(tx, ty, range, this.buffer);

        if (this.buffer.length === 0) {
            return null;
        }

        // 2. Check for Taunt (High Threat Priority)
        // Enemies with threatPriority > 0 (like Magma Statue) force attention
        let highestPriority = 0;

        // First pass: Determine highest priority in range
        // Also validate range (since grid query is approximate/padded)
        for (let i = 0; i < this.buffer.length; i++) {
            const e = this.buffer[i];
            if (!e.isAlive()) continue;

            const dx = e.x - tx;
            const dy = e.y - ty;
            const distSq = dx * dx + dy * dy;

            if (distSq <= rangeSq) {
                if (e.threatPriority > highestPriority) {
                    highestPriority = e.threatPriority;
                }
            }
        }

        // 3. Select Best Target
        let bestTarget: Enemy | null = null;
        let bestScore = -Infinity; // For maximization (Strongest, Last)
        let minScore = Infinity;   // For minimization (Closest, First)

        const mode = tower.targetingMode;
        const currentTarget = tower.target; // HYSTERESIS: Prefer current target

        // Optimization: Single loop through buffer
        for (let i = 0; i < this.buffer.length; i++) {
            const e = this.buffer[i];

            // Skip dead or undefined
            if (!e || !e.isAlive()) continue;

            // Strict Range Check
            const dx = e.x - tx;
            const dy = e.y - ty;
            const distSq = dx * dx + dy * dy;

            if (distSq > rangeSq) continue;

            // TAUNT LOGIC: If we found a high priority enemy, ignore lower priority ones
            if (e.threatPriority < highestPriority) continue;

            // HYSTERESIS BIAS
            // We want to stick to the current target unless a new one is significantly better.
            const isCurrent = (e === currentTarget);

            // Mode Logic
            switch (mode) {
                case 'closest':
                    {
                        // Score is distance squared (Minimize)
                        // Bias: Current target appears 20% closer
                        let score = distSq;
                        if (isCurrent) score *= 0.8;

                        if (score < minScore) {
                            minScore = score;
                            bestTarget = e;
                        }
                    }
                    break;

                case 'strongest':
                    {
                        // Score is Current Health (Maximize)
                        // Bias: Current target appears 20% stronger
                        let score = e.currentHealth;
                        if (isCurrent) score *= 1.2;

                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = e;
                        }
                    }
                    break;

                case 'first':
                    {
                        // Score is Flow Dist (Minimize). 0 = Base.
                        let dist = this.getFlowDistance(e, flowField);

                        // Treat Infinity as "Very Far" (but valid for targeting if nothing else?)
                        // No, Infinity means "unreachable" or "wall".
                        // Use a large number instead of Infinity to compare.
                        if (dist === Infinity) dist = 999999;

                        // Bias: Current target appears 5 units closer to base (better)
                        if (isCurrent) dist -= 5;

                        if (dist < minScore) {
                            minScore = dist;
                            bestTarget = e;
                        }
                    }
                    break;

                case 'last':
                    {
                        // Score is Flow Dist (Maximize). 
                        let dist = this.getFlowDistance(e, flowField);

                        // Infinity (unreachable) should probably be ignored or treated as far?
                        // If we can't reach base, we are "furthest"? 
                        // Let's treat valid path as priority.
                        if (dist === Infinity) dist = -1;

                        // Bias: Current target appears 5 units further (better)
                        if (isCurrent) dist += 5;

                        if (dist > bestScore) {
                            bestScore = dist;
                            bestTarget = e;
                        }
                    }
                    break;

                // Fallback / Default
                default:
                    {
                        let dist = this.getFlowDistance(e, flowField);
                        if (dist === Infinity) dist = 999999;
                        if (isCurrent) dist -= 5;
                        if (dist < minScore) {
                            minScore = dist;
                            bestTarget = e;
                        }
                    }
                    break;
            }
        }

        return bestTarget;
    }

    /**
     * Safe FlowField lookup
     */
    private static getFlowDistance(e: Enemy, flowField: FlowField): number {
        // Optimization: Access flowField array directly if possible, or use helper
        // Assuming flowField has a way to get distance for float coordinates
        const col = Math.floor(e.x / 32); // Assuming 32 is flowfield cell size, or use flowField.cellSize
        const row = Math.floor(e.y / 32);

        // Boundary checks
        if (row >= 0 && row < flowField.distances.length &&
            col >= 0 && col < flowField.distances[0].length) {
            return flowField.distances[row][col];
        }
        return Infinity; // Unknown position
    }
}
