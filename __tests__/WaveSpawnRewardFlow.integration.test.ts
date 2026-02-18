import { WaveManager } from '../src/WaveManager';
import { EntityManager } from '../src/scenes/EntityManager';
import { GameState } from '../src/scenes/GameState';

function createWaveScene(state: GameState) {
    return {
        get wave() { return state.wave; },
        set wave(value: number) { state.wave = value; },
        get enemies() { return state.enemies; },
        mapData: {
            width: 5,
            height: 5,
            tiles: [[0]],
            waypoints: [{ x: 0, y: 0 }],
            objects: [],
            waves: [{ enemies: [{ type: 'GRUNT', count: 3, pattern: 'normal', baseInterval: 0.1 }] }],
        },
        game: { width: 800 },
        metrics: {
            trackWaveReached: jest.fn(),
            trackMoneyEarned: jest.fn(),
            trackLifeLost: jest.fn(),
        },
        spawnEnemy: jest.fn(),
        addMoney: (amount: number) => state.addMoney(amount),
        showFloatingText: jest.fn(),
        giveRandomCard: jest.fn(),
        lives: state.lives,
        money: state.money,
    } as any;
}

describe('Integration: wave -> combat -> reward', () => {
    test('killed enemies pay reward exactly once and counters stay consistent', () => {
        const state = new GameState();
        state.money = 100;

        const effects = { add: jest.fn() } as any;
        const metrics = {
            trackEnemyKilled: jest.fn(),
            trackMoneyEarned: jest.fn(),
            trackLifeLost: jest.fn(),
        } as any;

        const entityManager = new EntityManager(state, effects, metrics);
        const scene = createWaveScene(state);
        const waveManager = new WaveManager(scene, 1337);

        scene.spawnEnemy.mockImplementation((type: string) => {
            entityManager.spawnEnemy(type, scene.mapData.waypoints);
        });

        waveManager.startWave();

        for (let i = 0; i < 100; i++) {
            waveManager.update(0.1);
        }

        expect(state.enemies).toHaveLength(3);

        const toKill = state.enemies.slice(0, 2);
        const expectedKillReward = toKill.reduce((sum, enemy) => sum + (enemy.reward || 5), 0);

        toKill.forEach((enemy) => {
            enemy.takeDamage(enemy.currentHealth + enemy.armor + 1000);
        });

        const flowField = {
            getVector: (_x: number, _y: number, out: { x: number; y: number }) => {
                out.x = 1;
                out.y = 0;
            },
            target: { x: 9999, y: 9999 },
        };

        entityManager.updateEnemies(0.016, flowField);

        expect(metrics.trackEnemyKilled).toHaveBeenCalledTimes(2);
        expect(metrics.trackMoneyEarned).toHaveBeenCalledTimes(2);

        const afterKillMoney = state.money;
        expect(afterKillMoney).toBe(100 + expectedKillReward);


        entityManager.updateEnemies(0.016, flowField);
        expect(state.money).toBe(afterKillMoney);

        expect(state.money).toBeGreaterThanOrEqual(0);
        expect(state.enemies.length).toBe(1);
    });
});
