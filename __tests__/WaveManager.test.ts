import { WaveManager } from '../src/WaveManager';
import { CONFIG } from '../src/Config';
import { GameScene } from '../src/scenes/GameScene';
import { Enemy } from '../src/Enemy';

interface TestSceneState {
    wave: number;
    enemies: Enemy[];
    money: number;
    lives: number;
}

function createScene(overrides?: Partial<GameScene>): GameScene {
    const state: TestSceneState = {
        wave: 0,
        enemies: [],
        money: 0,
        lives: 20,
    };

    const scene = {
        get wave() { return state.wave; },
        set wave(value: number) { state.wave = value; },
        get enemies() { return state.enemies; },
        set enemies(value: Enemy[]) { state.enemies = value; },
        get money() { return state.money; },
        get lives() { return state.lives; },
        mapData: {
            width: 5,
            height: 5,
            tiles: [[0]],
            waypoints: [{ x: 0, y: 0 }],
            objects: [],
            waves: [],
        },
        game: { width: 800 },
        metrics: {
            trackWaveReached: jest.fn(),
            trackMoneyEarned: jest.fn(),
        },
        spawnEnemy: jest.fn((type: string) => {
            const enemy = new Enemy();
            enemy.typeId = type.toLowerCase();
            state.enemies.push(enemy);
        }),
        addMoney: jest.fn((amount: number) => {
            state.money += amount;
        }),
        showFloatingText: jest.fn(),
        giveRandomCard: jest.fn(),
        ...overrides,
    } as unknown as GameScene;

    return scene;
}

describe('WaveManager - deterministic schedule and spawn rules', () => {
    test('wave spawn timestamps are monotonic (no backward time jumps)', () => {
        const scene = createScene({
            mapData: {
                width: 5,
                height: 5,
                tiles: [[0]],
                waypoints: [{ x: 0, y: 0 }],
                objects: [],
                waves: [{ enemies: [{ type: 'GRUNT', count: 3, pattern: 'normal', baseInterval: 0.5 }] }],
            } as any,
        });

        const waveManager = new WaveManager(scene, 123456);
        waveManager.startWave();

        const spawnTimes: number[] = [];
        let elapsed = 0;
        const spawnMock = scene.spawnEnemy as jest.Mock;

        for (let i = 0; i < 40; i++) {
            elapsed += 0.1;
            waveManager.update(0.1);
            if (spawnMock.mock.calls.length > spawnTimes.length) {
                spawnTimes.push(Number(elapsed.toFixed(2)));
            }
        }

        expect(spawnTimes).toHaveLength(3);
        for (let i = 1; i < spawnTimes.length; i++) {
            expect(spawnTimes[i]).toBeGreaterThanOrEqual(spawnTimes[i - 1]);
        }
    });

    test('early-started next wave does not spawn before queued previous wave enemies', () => {
        const scene = createScene({
            mapData: {
                width: 5,
                height: 5,
                tiles: [[0]],
                waypoints: [{ x: 0, y: 0 }],
                objects: [],
                waves: [
                    { enemies: [{ type: 'GRUNT', count: 1, pattern: 'normal', baseInterval: 1.0 }] },
                    { enemies: [{ type: 'SCOUT', count: 1, pattern: 'normal', baseInterval: 0.05 }] },
                ],
            } as any,
        });

        const waveManager = new WaveManager(scene, 7);
        waveManager.startWave();
        waveManager.startWave();

        const spawnMock = scene.spawnEnemy as jest.Mock;

        waveManager.update(0.06);
        expect(spawnMock).toHaveBeenCalledTimes(0);

        waveManager.update(0.94);
        expect(spawnMock).toHaveBeenCalledTimes(1);
        expect(spawnMock.mock.calls[0][0]).toBe('GRUNT');

        waveManager.update(0.05);
        expect(spawnMock).toHaveBeenCalledTimes(2);
        expect(spawnMock.mock.calls[1][0]).toBe('SCOUT');
    });

    test('empty wave table ends cleanly without spawns', () => {
        const scene = createScene({
            mapData: {
                width: 5,
                height: 5,
                tiles: [[0]],
                waypoints: [{ x: 0, y: 0 }],
                objects: [],
                waves: [{ enemies: [] }],
            } as any,
        });

        const waveManager = new WaveManager(scene, 99);
        waveManager.startWave();
        waveManager.update(0.1);

        expect(scene.spawnEnemy).not.toHaveBeenCalled();
        expect(waveManager.isWaveActive).toBe(false);
    });

    test('respects max active enemy limit by deferring spawns until slot is free', () => {
        const scene = createScene({
            mapData: {
                width: 5,
                height: 5,
                tiles: [[0]],
                waypoints: [{ x: 0, y: 0 }],
                objects: [],
                waves: [{ enemies: [{ type: 'GRUNT', count: 2, pattern: 'normal', baseInterval: 0.1 }] }],
            } as any,
        });

        const waveManager = new WaveManager(scene, 1);
        waveManager.startWave();

        const activeLimit = CONFIG.ENEMY.MAX_ACTIVE_ENEMIES;
        for (let i = 0; i < activeLimit; i++) {
            scene.enemies.push(new Enemy());
        }
        for (let i = 0; i < 20; i++) {
            waveManager.update(0.1);
        }

        expect(scene.spawnEnemy).toHaveBeenCalledTimes(0);

        scene.enemies.length = 0;
        waveManager.update(0.1);

        expect(scene.spawnEnemy).toHaveBeenCalledTimes(1);
    });

    test('wave composition is deterministic and unknown type is passed through to spawner contract', () => {
        const scene = createScene({
            mapData: {
                width: 5,
                height: 5,
                tiles: [[0]],
                waypoints: [{ x: 0, y: 0 }],
                objects: [],
                waves: [
                    {
                        enemies: [
                            { type: 'GRUNT', count: 2, pattern: 'normal', baseInterval: 0.1 },
                            { type: 'UNKNOWN_BLOB', count: 1, pattern: 'normal', baseInterval: 0.1 },
                        ],
                    },
                ],
            } as any,
        });

        const waveManager = new WaveManager(scene, 2024);
        waveManager.startWave();

        for (let i = 0; i < 50; i++) {
            waveManager.update(0.1);
        }

        const calls = (scene.spawnEnemy as jest.Mock).mock.calls.map((entry) => entry[0]);
        expect(calls).toHaveLength(3);
        expect(calls.filter((type) => type === 'GRUNT')).toHaveLength(2);
        expect(calls.filter((type) => type === 'UNKNOWN_BLOB')).toHaveLength(1);
    });
});
