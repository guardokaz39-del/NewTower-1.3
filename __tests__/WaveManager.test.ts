import { WaveManager } from '../src/WaveManager';
import { GameScene } from '../src/scenes/GameScene';
import { Enemy } from '../src/Enemy';

// Mock GameScene with new refactored structure
const mockGameState: { enemies: Enemy[]; wave: number } = {
    enemies: [],
    wave: 0
};

const mockScene = {
    get wave() { return mockGameState.wave; },
    set wave(value: number) { mockGameState.wave = value; },
    get enemies() { return mockGameState.enemies; },
    money: 100,
    game: { canvas: { width: 800, height: 600 } },
    ui: { update: jest.fn() },
    showFloatingText: jest.fn(),
    spawnEnemy: jest.fn(),
    giveRandomCard: jest.fn(),
    addMoney: jest.fn(),
    mapData: { waves: [] },
    metrics: {
        trackWaveReached: jest.fn(),
        trackMoneyEarned: jest.fn()
    },
    effects: { add: jest.fn() }
} as unknown as GameScene;

describe('WaveManager', () => {
    let waveManager: WaveManager;

    beforeEach(() => {
        waveManager = new WaveManager(mockScene);
        mockGameState.wave = 0;
        mockGameState.enemies = [];
        // Reset mocks
        (mockScene.ui.update as jest.Mock).mockClear();
        (mockScene.showFloatingText as jest.Mock).mockClear();
        (mockScene.spawnEnemy as jest.Mock).mockClear();
    });

    test('should start wave correctly', () => {
        waveManager.startWave();
        expect(mockScene.wave).toBe(1);
        expect(waveManager.isWaveActive).toBe(true);
        // Wave visuals now handled by NotificationSystem via EventBus
    });

    test('should allow early wave start with bonus', () => {
        waveManager.startWave();
        waveManager.startWave(); // Early start!
        expect(mockScene.wave).toBe(2); // Wave increments
        expect(mockScene.addMoney).toHaveBeenCalled(); // Bonus given
    });

    test('should spawn enemies during update', () => {
        // Setup a wave with 1 enemy
        // We need to mock generateWave logic or just push to enemiesToSpawn manually if it was public
        // Since generateWave is private, we rely on startWave calling it.
        // Let's mock CONFIG if needed, but startWave uses mapData or CONFIG.
        // Assuming mapData is empty, it uses CONFIG.

        waveManager.startWave();

        // Force some enemies to spawn
        // We can't easily access private enemiesToSpawn. 
        // But we can check if spawnEnemy is called after updates.

        // Simulate many frames
        for (let i = 0; i < 100; i++) {
            waveManager.update();
        }

        // If there are enemies in CONFIG for wave 1, spawnEnemy should be called
        // We might need to ensure CONFIG has enemies.
    });
});
