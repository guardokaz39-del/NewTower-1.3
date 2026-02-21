import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaveManager } from '../src/WaveManager';

describe('WaveManager Flow', () => {
    let waveManager: WaveManager;
    let mockScene: any;

    beforeEach(() => {
        mockScene = {
            wave: 0,
            lives: 10,
            addMoney: vi.fn(),
            metrics: { trackMoneyEarned: vi.fn(), trackWaveReached: vi.fn() },
            showFloatingText: vi.fn(),
            spawnEnemy: vi.fn(),
            giveRandomCard: vi.fn(),
            enemies: [],
            game: { width: 800 },
            mapData: null,
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
