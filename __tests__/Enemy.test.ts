import { Enemy } from '../src/Enemy';

describe('Enemy System', () => {

    test('Враг должен получать урон', () => {
        const orc = new Enemy({ id: 'orc1', health: 100, speed: 1 });

        orc.takeDamage(30);

        expect(orc.currentHealth).toBe(70); // 100 - 30
        expect(orc.isAlive()).toBe(true);
    });

    test('Враг должен умирать при 0 HP', () => {
        const goblin = new Enemy({ id: 'gob1', health: 10, speed: 2 });

        goblin.takeDamage(15); // Наносим больше урона, чем жизнь

        expect(goblin.currentHealth).toBe(0);
        expect(goblin.isAlive()).toBe(false);
    });

    test('Броня должна снижать урон', () => {
        // Создаем танка с броней 5
        const tank = new Enemy({ id: 'tank1', health: 100, speed: 0.5, armor: 5 });

        // Наносим 10 урона. 10 - 5 (броня) = 5 реального урона
        tank.takeDamage(10); 

        expect(tank.currentHealth).toBe(95);
    });
});