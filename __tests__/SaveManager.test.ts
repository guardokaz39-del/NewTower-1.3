import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager, DEFAULT_SAVE_DATA } from '../src/SaveManager';

describe('SaveManager Data Integrity', () => {
    beforeEach(() => {
        // jsdom provides localStorage; clear it
        localStorage.clear();
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

    it('should return DEFAULT_SAVE_DATA when localStorage is empty', () => {
        const state = SaveManager.load();
        expect(state).toEqual(DEFAULT_SAVE_DATA);
    });

    it('should safely fallback on corrupted JSON in localStorage', () => {
        localStorage.setItem('NEWTOWER_CAMPAIGN', '{BROKEN_JSON!!!');
        const state = SaveManager.load();
        expect(state).toEqual(DEFAULT_SAVE_DATA);
    });

    it('should migrate old save data missing new fields', () => {
        // Simulate old save without unlockedCards
        const oldSave = { totalMoneyEarned: 500, enemiesKilled: 100, wavesCleared: 10 };
        localStorage.setItem('NEWTOWER_CAMPAIGN', JSON.stringify(oldSave));

        const state = SaveManager.load();
        expect(state.totalMoneyEarned).toBe(500); // Preserved
        expect(state.unlockedCards).toEqual(DEFAULT_SAVE_DATA.unlockedCards); // Migrated
        expect(state.schemaVersion).toBe(1); // Forced to current
    });
});
