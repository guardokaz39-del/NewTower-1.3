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
        enemy.applySlow(1.0, 0.2, 1.1);

        expect(enemy.slowPower).toBe(0.2);
        expect(enemy.damageModifier).toBe(1.1);

        // Apply stronger slow (50% slow, +20% dmg bonus)
        enemy.applySlow(1.0, 0.5, 1.2);

        expect(enemy.slowPower).toBe(0.5); // 1 - 0.5
        expect(enemy.damageModifier).toBe(1.2);

        // Apply weaker slow again (should NOT override the strong one)
        enemy.applySlow(1.0, 0.3, 1.15);

        expect(enemy.slowPower).toBe(0.5);
        expect(enemy.damageModifier).toBe(1.2);
    });

    it('should trigger ENEMY_DIED strictly ONE time when dying from Burn tick', () => {
        const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

        enemy.currentHealth = 5; // Low health

        // Apply burn doing 10 dmg per second
        enemy.applyBurn(2.0, 10, 3, 1, 101);

        // Fast forward 1 second (this will apply 10 burn damage, enemy dies)
        enemy.update(1.0);

        expect(enemy.currentHealth).toBeLessThanOrEqual(0);
        expect(emitSpy).toHaveBeenCalledWith(Events.ENEMY_DIED, expect.objectContaining({ enemy: enemy, cardId: 101 }));
        expect(emitSpy).toHaveBeenCalledTimes(1);

        // Fast forward another 1 second, making sure it doesn't emit again
        emitSpy.mockClear();
        enemy.update(1.0);

        expect(emitSpy).not.toHaveBeenCalledWith(Events.ENEMY_DIED, expect.anything());
    });

    it('Kill Credit Precision: DOT kill credits right tower', () => {
        enemy.currentHealth = 100;

        // Tower 1 hits enemy (direct)
        enemy.takeDamage(10, 1, 101, 0);
        expect(enemy.lastHitTowerId).toBe(1);

        // Tower 2 applies Burn (Primary Applier)
        enemy.applyBurn(5.0, 10, 3, 2, 202);

        // Tower 3 applies Burn (Stack Extension)
        enemy.applyBurn(5.0, 10, 3, 3, 303);

        const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

        // Fast forward so Burn kills the enemy (5 secs of 10 dps per stack (2 stacks) = 100 dmg)
        enemy.update(5.0);

        expect(enemy.currentHealth).toBeLessThanOrEqual(0);
        // Should emit with towerId=2, cardId=202 (via GlobalEnemyDeathEvent)
        expect(emitSpy).toHaveBeenCalledWith(Events.ENEMY_DIED, expect.objectContaining({ towerId: 2, cardId: 202 }));
    });

    it('OnDeath Max Wins Constraint: Stores max radius', () => {
        enemy.setOnDeathExplode(50, 10, 1);
        enemy.setOnDeathExplode(80, 20, 2);
        enemy.setOnDeathExplode(30, 5, 3);

        expect(enemy.onDeathExplodeRadius).toBe(80);
        expect(enemy.onDeathExplodeDamage).toBe(20);
        expect(enemy.onDeathExplodeSourceId).toBe(2);
    });
});
