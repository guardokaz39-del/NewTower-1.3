import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WaveManager } from '../src/WaveManager';
import { CONFIG } from '../src/Config';
import { Events, EventBus } from '../src/EventBus';

describe('WaveManager Advanced Edge Cases', () => {
    let waveManager: WaveManager;
    let mockScene: any;

    beforeEach(() => {
        EventBus.getInstance().clear();

        mockScene = {
            wave: 0,
            lives: 10,
            addMoney: vi.fn(),
            metrics: { trackMoneyEarned: vi.fn(), trackWaveReached: vi.fn() },
            showFloatingText: vi.fn(),
            spawnEnemy: vi.fn(),
            giveRandomCard: vi.fn(),
            enemies: [], // No enemies alive by default
            game: { width: 800 },
            mapData: {
                // Mock mapping data for 2 waves
                waves: [
                    { enemies: [{ type: 'orc', count: 1, baseInterval: 1, pattern: 'normal' }] },
                    { enemies: [{ type: 'goblin', count: 2, baseInterval: 1, pattern: 'normal' }] }
                ]
            },
        };

        // Use fake timers to control Date.now() for cooldown testing
        vi.useFakeTimers();
        vi.setSystemTime(1000); // Start at T=1000ms

        waveManager = new WaveManager(mockScene, 12345);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should correctly stack waves, applying EARLY_WAVE_BONUS only if 500ms cooldown passed', () => {
        // First wave (Fresh Start)
        waveManager.startWave();
        expect(waveManager.isWaveActive).toBe(true);
        expect(mockScene.wave).toBe(1);
        expect(mockScene.addMoney).not.toHaveBeenCalled(); // No bonus for the very first wave

        // Immediate second wave (Early Start, within 500ms cooldown)
        vi.setSystemTime(1200); // T=1200, only 200ms passed
        waveManager.startWave();

        expect(mockScene.wave).toBe(2);
        // Cooldown didn't pass, so EARLY_WAVE_BONUS should NOT be added
        expect(mockScene.addMoney).not.toHaveBeenCalled();

        // Third wave (Early Start, cooldown passed)
        vi.setSystemTime(2000); // T=2000, 800ms passed since last bonus attempt
        waveManager.startWave();

        expect(mockScene.wave).toBe(3);
        expect(mockScene.addMoney).toHaveBeenCalledWith(CONFIG.ECONOMY.EARLY_WAVE_BONUS);
    });

    it('should award PERFECT_WAVE_BONUS if no lives were lost during the wave', () => {
        waveManager.startWave();
        // At start, lives=10

        // Simulate wave ending (queue empty, enemies empty)
        waveManager['spawnQueue'] = [];
        mockScene.enemies = [];

        // No lives lost
        waveManager.update(1.0); // Triggers endWave()

        expect(waveManager.isWaveActive).toBe(false);
        // Regular reward + Perfect Wave Bonus
        expect(mockScene.addMoney).toHaveBeenCalledWith(expect.any(Number)); // Base reward
        expect(mockScene.addMoney).toHaveBeenCalledWith(CONFIG.ECONOMY.PERFECT_WAVE_BONUS);
    });

    it('should NOT award PERFECT_WAVE_BONUS if lives were lost during the wave', () => {
        waveManager.startWave();
        // At start, lives=10

        // Lose a life during the wave
        mockScene.lives = 9;

        // Simulate wave ending
        waveManager['spawnQueue'] = [];
        mockScene.enemies = [];

        waveManager.update(1.0); // Triggers endWave()

        expect(waveManager.isWaveActive).toBe(false);
        // Regular reward should be given
        expect(mockScene.addMoney).toHaveBeenCalledWith(expect.any(Number));
        // Perfect wave bonus should NOT be given
        expect(mockScene.addMoney).not.toHaveBeenCalledWith(CONFIG.ECONOMY.PERFECT_WAVE_BONUS);
    });

    it('should grant ONE card reward correctly based on completed waves since last card', () => {
        // Start and finish Wave 1
        waveManager.startWave();
        waveManager['spawnQueue'] = [];
        waveManager.update(1.0); // Ends Wave 1

        expect(mockScene.giveRandomCard).toHaveBeenCalledTimes(1);
        mockScene.giveRandomCard.mockClear();

        // Start and finish Wave 2
        waveManager.startWave();
        waveManager['spawnQueue'] = [];
        waveManager.update(1.0); // Ends Wave 2

        expect(mockScene.giveRandomCard).toHaveBeenCalledTimes(1);
    });
});
