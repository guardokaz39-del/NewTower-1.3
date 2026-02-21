import { WaveManager } from '../src/WaveManager';

describe('WaveManager Flow', () => {
    let waveManager: WaveManager;
    let mockScene: any;

    beforeEach(() => {
        mockScene = {
            wave: 0,
            lives: 10,
            addMoney: jest.fn(),
            metrics: { trackMoneyEarned: jest.fn(), trackWaveReached: jest.fn() },
            showFloatingText: jest.fn(),
            spawnEnemy: jest.fn(),
            game: { width: 800 }
        };
        waveManager = new WaveManager(mockScene, 12345);
    });

    it('should correctly toggle isWaveActive on first start and append early starts', () => {
        expect(waveManager.isWaveActive).toBe(false);

        // First start
        waveManager.startWave();
        expect(waveManager.isWaveActive).toBe(true);
        expect(mockScene.wave).toBe(1);

        // Early start
        waveManager.startWave();
        expect(waveManager.isWaveActive).toBe(true);
        expect(mockScene.wave).toBe(2);

        // We do not check internal pendingWaveStarts directly 
        // because it's private, but the wave counter reflects it.
    });
});
