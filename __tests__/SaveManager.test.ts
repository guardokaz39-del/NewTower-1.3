import { SaveManager } from '../src/SaveManager';

describe('SaveManager Data Integrity', () => {
    beforeEach(() => {
        (global as any).localStorage = {
            store: {} as Record<string, string>,
            getItem(key: string) { return this.store[key] || null; },
            setItem(key: string, val: string) { this.store[key] = val; }
        };
    });

    it('should accumulate progress correctly with deltas', () => {
        // First session delta
        SaveManager.updateProgress({ money: 100, kills: 50, waves: 5, maxWave: 5 });

        let state = SaveManager.load();
        expect(state.totalMoneyEarned).toBe(100);
        expect(state.enemiesKilled).toBe(50);

        // Second session delta
        SaveManager.updateProgress({ money: 200, kills: 10, waves: 1, maxWave: 6 });

        state = SaveManager.load();
        expect(state.totalMoneyEarned).toBe(300); // 100 + 200
        expect(state.enemiesKilled).toBe(60);  // 50 + 10
        expect(state.maxWaveReached).toBe(6);
    });
});
