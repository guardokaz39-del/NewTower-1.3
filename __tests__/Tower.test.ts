import { describe, it, expect, beforeEach } from 'vitest';
import { Tower } from '../src/Tower';
import { mergeCardsWithStacking } from '../src/CardStackingSystem';
import { TargetingSystem } from '../src/systems/TargetingSystem';
import { Enemy } from '../src/Enemy';
import { SpatialGrid } from '../src/SpatialGrid';
import { ICard } from '../src/CardSystem';

describe('Tower & Card Stacking', () => {
    it('should correctly calculate damage multipliers via mergeCardsWithStacking', () => {
        // We use real card types (fire, ice) so getCardUpgrade doesn't fail
        const mockCards: ICard[] = [
            { type: { id: 'fire' } as any, level: 3, id: '1', isDragging: false },
            { type: { id: 'ice' } as any, level: 1, id: '2', isDragging: false }
        ];

        const merged = mergeCardsWithStacking(mockCards);

        // Expect modifiers to combine appropriately based on the system's mathematics
        expect(merged).toBeDefined();

        // Fire level 3 gives +25 flat damage
        // Ice level 1 gives +1 flat damage (with 0.35 stacking multiplier)
        // Total should be strictly greater than 25
        expect(merged.modifiers.damage).not.toBeUndefined();
        expect(merged.modifiers.damage).toBeGreaterThan(25);
    });

    it('should target correctly based on "strongest" vs "closest" mode', () => {
        // Canvas mock is handled by __tests__/setup.ts
        const tower = new Tower(0, 0); // At origin
        tower.targetingMode = 'closest';

        const grid = new SpatialGrid<Enemy>(1000, 1000, 64);

        // Create strong enemy far away
        const eStrong = new Enemy();
        eStrong.init({ health: 500, speed: 100, path: [] } as any);
        eStrong.x = 100;
        eStrong.y = 100;
        eStrong.currentHealth = 500;
        eStrong.id = 1;

        // Create weak enemy close
        const eWeak = new Enemy();
        eWeak.init({ health: 50, speed: 100, path: [] } as any);
        eWeak.x = 10;
        eWeak.y = 10;
        eWeak.currentHealth = 50;
        eWeak.id = 2;

        grid.register(eStrong);
        grid.register(eWeak);

        // Closest should pick eWeak
        const targetClosest = TargetingSystem.findTarget(tower, grid, null as any);
        expect(targetClosest).toBe(eWeak);

        // Strongest should pick eStrong
        tower.targetingMode = 'strongest';
        const targetStrongest = TargetingSystem.findTarget(tower, grid, null as any);
        expect(targetStrongest).toBe(eStrong);
    });
});
