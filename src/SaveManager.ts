import { ICard } from './CardSystem';
import { CONFIG } from './Config';

export interface IGlobalSaveData {
    totalMoneyEarned: number;
    enemiesKilled: number;
    wavesCleared: number;
    unlockedCards: string[]; // keys like 'FIRE', 'ICE'
    maxWaveReached: number;
}

export const DEFAULT_SAVE_DATA: IGlobalSaveData = {
    totalMoneyEarned: 0,
    enemiesKilled: 0,
    wavesCleared: 0,
    unlockedCards: ['FIRE', 'ICE', 'SNIPER'], // Default starters
    maxWaveReached: 0,
};

export class SaveManager {
    private static STORAGE_KEY = 'NEWTOWER_CAMPAIGN';

    public static load(): IGlobalSaveData {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                return { ...DEFAULT_SAVE_DATA, ...data };
            }
        } catch (e) {
            console.error('Failed to load save', e);
        }
        return { ...DEFAULT_SAVE_DATA };
    }

    public static save(data: IGlobalSaveData) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save progress', e);
        }
    }

    public static updateProgress(stats: { money: number; kills: number; waves: number; maxWave: number }) {
        const data = this.load();
        data.totalMoneyEarned += stats.money;
        data.enemiesKilled += stats.kills;
        data.wavesCleared += stats.waves;
        if (stats.maxWave > data.maxWaveReached) {
            data.maxWaveReached = stats.maxWave;
        }
        this.save(data);
        console.log('Campaign Progress Saved', data);
    }
}
