import { describe, it, expect, vi } from 'vitest';
import { Enemy } from '../src/Enemy';
import { Tower } from '../src/Tower';
import { TargetingSystem } from '../src/systems/TargetingSystem';
import { CollisionSystem } from '../src/CollisionSystem';
import { SpatialGrid } from '../src/SpatialGrid';
import { FlowField } from '../src/FlowField';
import { EffectSystem } from '../src/EffectSystem';

describe('Phase 1 & 2 Regressions', () => {

    describe('Enemy: Fixed-Step DOT Accumulator', () => {
        it('should correctly apply exact total damage regardless of dt (Determinism)', () => {
            const enemy1 = new Enemy({ health: 1000, speed: 100, path: [] });
            const enemy2 = new Enemy({ health: 1000, speed: 100, path: [] });

            // Apply 10 dps for 2 seconds (total 20 dmg)
            enemy1.applyBurn(2, 10, 3, 1, 1);
            enemy2.applyBurn(2, 10, 3, 1, 1);

            // Enemy 1: 120 frames of fast rendering (16ms)
            for (let i = 0; i < 120; i++) enemy1.update(0.0166);

            // Enemy 2: 1 mega lag frame (2 full seconds)
            enemy2.update(2.0);

            // Using Math.round to mitigate JS floating point quirks 
            expect(Math.round(enemy1.currentHealth)).toBe(980);
            expect(Math.round(enemy2.currentHealth)).toBe(980);
        });

        it('should strictly clear all state symmetrically when burn ends', () => {
            const enemy = new Enemy({ health: 1000, speed: 100, path: [] });
            enemy.applyBurn(1, 10, 3, 1, 1);
            enemy.update(1.1); // Tick past duration

            // Variables should be zeroed out
            expect(enemy.burnDuration).toBe(0);
            expect(enemy.burnStacks).toBe(0);
            expect(enemy.totalBurnDps).toBe(0);
            expect((enemy as any).burnTickAcc).toBe(0);
        });
    });

    describe('Tower: Architectural Caches & Readonly', () => {
        it('should return same _frameStats reference when cache is clean (Zero-Alloc)', () => {
            const tower = new Tower(0, 0);
            const stats1 = tower.getStats();
            const stats2 = tower.getStats();

            // Must be same object reference — no new allocations
            expect(stats1).toBe(stats2);
        });

        it('should increment statsVersion only on dirty cache flush', () => {
            const tower = new Tower(0, 0);
            const initialVersion = tower.statsVersion;

            tower.getStats();
            expect(tower.statsVersion).toBeGreaterThan(initialVersion);

            const versionAfterGet = tower.statsVersion;
            tower.getStats(); // shouldn't increment
            tower.getStats();
            expect(tower.statsVersion).toBe(versionAfterGet);

            tower.invalidateCache();
            expect(tower.statsVersion).toBeGreaterThan(versionAfterGet);
        });
    });

    describe('TargetingSystem: Zero-Call Range Guard', () => {
        it('should use currentRangeSq and NOT invoke heavy getStats() repeatedly', () => {
            const tower = new Tower(0, 0);
            const grid = new SpatialGrid<Enemy>(1000, 1000, 128);
            const flowField = new FlowField(10, 10);

            // Force initial hydrate
            tower.getStats();

            // Spy on getStats
            const spy = vi.spyOn(tower, 'getStats');

            // Run targeting 100 times (simulate 100 frames)
            for (let i = 0; i < 100; i++) {
                TargetingSystem.findTarget(tower, grid, flowField);
            }

            // Ensure no extra calculations triggered
            expect(spy).toHaveBeenCalledTimes(0);
        });
    });

    describe('CollisionSystem: Double Buffering Allocations', () => {
        it('should queue explosions via public static API without allocating new arrays', () => {
            // Reset static state
            CollisionSystem.explosionQueue.length = 0;
            CollisionSystem.standbyQueue.length = 0;

            // Verify queueExplosion pushes into flat array (5 values per explosion)
            CollisionSystem.queueExplosion(10, 20, 50, 100, 42);
            expect(CollisionSystem.explosionQueue.length).toBe(5);
            expect(CollisionSystem.explosionQueue[0]).toBe(10);  // x
            expect(CollisionSystem.explosionQueue[1]).toBe(20);  // y
            expect(CollisionSystem.explosionQueue[2]).toBe(50);  // radius
            expect(CollisionSystem.explosionQueue[3]).toBe(100); // damage
            expect(CollisionSystem.explosionQueue[4]).toBe(42);  // sourceId

            // Multiple queues should append, not allocate
            const ptrBefore = CollisionSystem.explosionQueue;
            CollisionSystem.queueExplosion(0, 0, 10, 10, 1);
            expect(CollisionSystem.explosionQueue).toBe(ptrBefore); // Same reference
            expect(CollisionSystem.explosionQueue.length).toBe(10); // 2 explosions * 5
        });

        it('should have standbyQueue ready for double-buffer swap', () => {
            // Standby queue should exist and be a separate array
            expect(CollisionSystem.standbyQueue).toBeDefined();
            expect(CollisionSystem.standbyQueue).not.toBe(CollisionSystem.explosionQueue);
        });
    });
});
