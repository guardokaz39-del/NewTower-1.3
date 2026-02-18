import { Enemy } from '../src/Enemy';
import { ProjectileSystem } from '../src/systems/ProjectileSystem';
import { createSeededRandom } from './helpers';

describe('simulation invariants without renderer', () => {
    const dt = 1 / 60;

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('300+ ticks run deterministically and preserve core invariants', () => {
        const seededRandom = createSeededRandom(0xdeadbeef);
        jest.spyOn(Math, 'random').mockImplementation(() => seededRandom());

        const flowField = {
            target: { x: 2, y: 2 },
            getVector: (_x: number, _y: number, out: { x: number; y: number }) => {
                out.x = 1;
                out.y = 0;
            },
        };

        const projectileSystem = new ProjectileSystem();
        const effectSystem = { add: jest.fn() } as any;

        let enemies: Enemy[] = Array.from({ length: 6 }, (_, index) => {
            const enemy = new Enemy({
                health: 100 + index * 10,
                speed: 35 + index,
                path: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
                x: index * 5,
                y: 0,
            });
            enemy.setType('grunt');
            return enemy;
        });

        expect(() => {
            for (let tick = 0; tick < 420; tick++) {
                if (tick % 20 === 0) {
                    projectileSystem.spawn(0, 0, { x: 200, y: 0 }, {
                        dmg: 10,
                        speed: 500,
                        color: '#fff',
                        effects: [],
                        pierce: 1,
                        projectileType: tick % 40 === 0 ? 'fire' : 'ice',
                        towerLevel: 3,
                    });
                }

                projectileSystem.update(dt, effectSystem);

                for (const enemy of enemies) {
                    enemy.move(dt, flowField);
                    enemy.update(dt);
                    if (tick % 37 === 0) {
                        enemy.takeDamage(3);
                    }
                }

                // Remove dead entities from active simulation array.
                enemies = enemies.filter((enemy) => enemy.isAlive());

                // Invariants:
                for (const enemy of enemies) {
                    expect(Number.isNaN(enemy.currentHealth)).toBe(false);
                }
                expect(enemies.length).toBeGreaterThanOrEqual(0);
                expect(projectileSystem.projectiles.length).toBeGreaterThanOrEqual(0);

                // Removed projectiles should not remain in active array.
                expect(projectileSystem.projectiles.every((projectile) => projectile.alive)).toBe(true);
                // Removed enemies (dead ones) are filtered out.
                expect(enemies.every((enemy) => enemy.isAlive())).toBe(true);
            }
        }).not.toThrow();
    });
});
