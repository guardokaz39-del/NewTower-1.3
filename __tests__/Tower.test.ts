import { describe, it, expect } from 'vitest';
import { Tower } from '../src/Tower';
import { mergeCardsWithStacking } from '../src/CardStackingSystem';
import { TargetingSystem } from '../src/systems/TargetingSystem';
import { Enemy } from '../src/Enemy';
import { SpatialGrid } from '../src/SpatialGrid';
import { ICard } from '../src/CardSystem';
import { FlowField } from '../src/FlowField';

describe('Tower & Card Stacking', () => {
    it('should correctly calculate damage multipliers via mergeCardsWithStacking', () => {
        const mockCards: ICard[] = [
            { type: { id: 'fire' } as any, level: 3, id: '1', isDragging: false },
            { type: { id: 'ice' } as any, level: 1, id: '2', isDragging: false }
        ];

        const merged = mergeCardsWithStacking(mockCards);

        expect(merged).toBeDefined();
        expect(merged.modifiers.damage).not.toBeUndefined();
        expect(merged.modifiers.damage).toBeGreaterThan(25);
    });

    it('should target correctly based on "strongest" vs "closest" mode', () => {
        const tower = new Tower(0, 0); // At origin
        tower.targetingMode = 'closest';

        const grid = new SpatialGrid<Enemy>(1000, 1000, 64);
        const flowField = new FlowField(10, 10);

        const eStrong = new Enemy(); eStrong.init({ health: 500, speed: 100, path: [] } as any); eStrong.x = 100; eStrong.y = 100; eStrong.currentHealth = 500; eStrong.id = 1;
        const eWeak = new Enemy(); eWeak.init({ health: 50, speed: 100, path: [] } as any); eWeak.x = 10; eWeak.y = 10; eWeak.currentHealth = 50; eWeak.id = 2;

        grid.register(eStrong);
        grid.register(eWeak);

        const targetClosest = TargetingSystem.findTarget(tower, grid, flowField);
        expect(targetClosest).toBe(eWeak);

        tower.targetingMode = 'strongest';
        const targetStrongest = TargetingSystem.findTarget(tower, grid, flowField);
        expect(targetStrongest).toBe(eStrong);
    });
});

describe('TargetingSystem Advanced Edge Cases', () => {
    it('should prioritize the current target if scores are equal (Hysteresis Bias)', () => {
        const tower = new Tower(0, 0);
        tower.targetingMode = 'strongest';

        const grid = new SpatialGrid<Enemy>(1000, 1000, 64);
        const flowField = new FlowField(10, 10);

        // Two identical enemies
        const e1 = new Enemy(); e1.init({ health: 100, speed: 100, path: [] } as any); e1.x = 50; e1.y = 50; e1.currentHealth = 100; e1.id = 1;
        const e2 = new Enemy(); e2.init({ health: 100, speed: 100, path: [] } as any); e2.x = 50; e2.y = 50; e2.currentHealth = 100; e2.id = 2;

        grid.register(e1);
        grid.register(e2);

        // First target acquisition
        const initialTarget = TargetingSystem.findTarget(tower, grid, flowField);
        expect(initialTarget).not.toBeNull();

        // Let's manually set e1 as the tower's CURRENT target
        tower.target = e1;

        // Find target again. Since e1 is the current target, the hysteresis bias (score * 1.15) 
        // will make e1 definitively better than e2, avoiding flicker.
        const stickyTarget = TargetingSystem.findTarget(tower, grid, flowField);
        expect(stickyTarget).toBe(e1);

        // Now manually switch current target to e2.
        tower.target = e2;
        const swappedStickyTarget = TargetingSystem.findTarget(tower, grid, flowField);
        expect(swappedStickyTarget).toBe(e2);
    });

    it('should immediately swap targets when mode changes', () => {
        const tower = new Tower(0, 0);
        tower.targetingMode = 'closest';

        const grid = new SpatialGrid<Enemy>(1000, 1000, 64);
        const flowField = new FlowField(10, 10);

        const eStrong = new Enemy(); eStrong.init({ health: 500, speed: 100, path: [] } as any); eStrong.x = 100; eStrong.y = 100; eStrong.currentHealth = 500;
        const eWeak = new Enemy(); eWeak.init({ health: 50, speed: 100, path: [] } as any); eWeak.x = 10; eWeak.y = 10; eWeak.currentHealth = 50;

        grid.register(eStrong);
        grid.register(eWeak);

        tower.target = TargetingSystem.findTarget(tower, grid, flowField);
        expect(tower.target).toBe(eWeak); // Closest picked

        // Change mode
        tower.targetingMode = 'strongest';

        // Next tick target acquisition
        tower.target = TargetingSystem.findTarget(tower, grid, flowField);

        // EStrong should override EWeak despite hysteresis because 'strongest' scale difference (500 vs 50 * 1.15) is huge
        expect(tower.target).toBe(eStrong);
    });

    it('should not fire or change angle when idle (no targets in range)', () => {
        const tower = new Tower(0, 0);
        tower.angle = Math.PI; // Pointing left

        const grid = new SpatialGrid<Enemy>(1000, 1000, 64);
        const flowField = new FlowField(10, 10);

        // Enemy outside of range (range is usually ~250 default)
        const eFar = new Enemy(); eFar.init({ health: 100, speed: 100, path: [] } as any); eFar.x = 1000; eFar.y = 1000;
        grid.register(eFar);

        // Update loop step 1: seek target
        tower.target = TargetingSystem.findTarget(tower, grid, flowField);

        expect(tower.target).toBeNull();
        expect(tower.angle).toBe(Math.PI); // Angle remains unmodified
    });
});
