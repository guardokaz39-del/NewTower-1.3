import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Enemy } from '../src/Enemy';
import { EventBus, Events } from '../src/EventBus';

describe('Enemy mechanics', () => {
    let enemy: Enemy;

    beforeEach(() => {
        // Canvas/Image mocks are handled by __tests__/setup.ts
        EventBus.getInstance().clear();
        enemy = new Enemy();
        enemy.init({ health: 100, speed: 100, path: [{ x: 0, y: 0 }, { x: 10, y: 10 }] } as any);
        enemy.baseSpeed = 100;
        enemy.currentHealth = 100;
        enemy.maxHealth = 100;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should correctly stack MULTIPLE slow statuses choosing the strongest', () => {
        // Apply weak slow (20% slow, +10% dmg bonus)
        enemy.applyStatus('slow', 1.0, 0.2, 1.1);

        let slow = enemy.statuses.find(s => s.type === 'slow');
        expect(slow?.power).toBe(0.2);
        expect(enemy.damageModifier).toBe(1.1);

        // Apply stronger slow (50% slow, +20% dmg bonus)
        enemy.applyStatus('slow', 1.0, 0.5, 1.2);

        slow = enemy.statuses.find(s => s.type === 'slow');
        expect(slow?.power).toBe(0.5); // 1 - 0.5
        expect(enemy.damageModifier).toBe(1.2);

        // Apply weaker slow again (should NOT override the strong one)
        enemy.applyStatus('slow', 1.0, 0.3, 1.15);

        slow = enemy.statuses.find(s => s.type === 'slow');
        expect(slow?.power).toBe(0.5);
        expect(enemy.damageModifier).toBe(1.2);
    });

    it('should trigger ENEMY_DIED strictly ONE time when dying from Burn tick', () => {
        const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

        enemy.currentHealth = 5; // Low health

        // Apply burn doing 10 dmg per second
        enemy.applyStatus('burn', 2.0, 10, 1.0);

        // Fast forward 1 second (this will apply 10 burn damage, enemy dies)
        enemy.update(1.0);

        expect(enemy.currentHealth).toBeLessThanOrEqual(0);
        expect(emitSpy).toHaveBeenCalledWith(Events.ENEMY_DIED, expect.objectContaining({ enemy }));
        expect(emitSpy).toHaveBeenCalledTimes(1);

        // Fast forward another 1 second, making sure it doesn't emit again
        emitSpy.mockClear();
        enemy.update(1.0);

        expect(emitSpy).not.toHaveBeenCalledWith(Events.ENEMY_DIED, expect.anything());
    });
});
