import { WaveManager } from '../../WaveManager';
import { CONFIG } from '../../Config';
import { ENEMY_TYPES } from '../../config/Enemies';

export interface IWaveSummary {
    waveNumber: number;
    enemies: Array<{
        type: string;
        count: number;
        icon: string;
        name: string;
        isNew: boolean; // Is this the first time this enemy appears?
    }>;
    totalCount: number;
    totalReward: number;
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    threatScore: number;
}

export class WaveAnalyst {
    private waveManager: WaveManager;
    private unlockedEnemies: Set<string>;

    constructor(waveManager: WaveManager, unlockedEnemies: Set<string>) {
        this.waveManager = waveManager;
        this.unlockedEnemies = unlockedEnemies;
    }

    public getWaveIntel(waveNum: number): IWaveSummary {
        const config = this.waveManager.getWaveConfig(waveNum);

        let totalCount = 0;
        let totalReward = 0;
        let totalHP = 0;
        const enemyMap = new Map<string, number>();

        if (config && config.enemies) {
            config.enemies.forEach(group => {
                const count = group.count;
                const type = group.type;

                totalCount += count;
                enemyMap.set(type, (enemyMap.get(type) || 0) + count);

                const stats = ENEMY_TYPES[type.toUpperCase()];
                if (stats) {
                    const hp = CONFIG.ENEMY.BASE_HP * stats.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, waveNum - 1);
                    totalHP += hp * count;
                    totalReward += stats.reward * count;
                }
            });
        }

        // Add base reward
        totalReward += CONFIG.ECONOMY.WAVE_BASE_REWARD + (waveNum * CONFIG.ECONOMY.WAVE_SCALING_FACTOR);

        // Convert map to array
        const enemiesList: IWaveSummary['enemies'] = [];
        enemyMap.forEach((count, type) => {
            const stats = ENEMY_TYPES[type.toUpperCase()];
            const isUnlocked = this.unlockedEnemies.has(type.toLowerCase());

            enemiesList.push({
                type: type,
                count: count,
                icon: isUnlocked ? stats?.symbol || '?' : '?',
                name: isUnlocked ? stats?.name || 'Unknown' : '???',
                isNew: !isUnlocked
            });
        });

        // Threat Calculation
        // Base threat usually increases by ~1.3x per wave in power
        // Simple heuristic: Total HP / Standard Tower DPS (approx 5)
        const dpsBenchmark = 5 * Math.max(1, waveNum * 0.5); // Expected DPS grows with wave
        const timeToKill = totalHP / dpsBenchmark;

        // Normalize threat
        let threat: IWaveSummary['threatLevel'] = 'LOW';
        if (timeToKill > 60) threat = 'MEDIUM';
        if (timeToKill > 120) threat = 'HIGH';
        if (timeToKill > 200) threat = 'EXTREME';

        return {
            waveNumber: waveNum,
            enemies: enemiesList,
            totalCount,
            totalReward: Math.floor(totalReward),
            threatLevel: threat,
            threatScore: Math.floor(timeToKill)
        };
    }
}
