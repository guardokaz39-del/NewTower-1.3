import { IWaveConfig, SpawnPattern } from '../MapData';
import { EnemyRegistry } from './EnemyRegistry';

export class ThreatService {

    /**
     * Multipliers for different spawn patterns.
     * Swarms are more dangerous due to burst density.
     */
    private static PATTERN_MULTIPLIERS: Record<SpawnPattern, number> = {
        'normal': 1.0,
        'random': 1.1,
        'swarm': 1.3
    };

    /**
     * Calculates the threat level of a single enemy group.
     */
    public static calculateGroupThreat(group: { type: string; count: number; spawnPattern?: SpawnPattern }): number {
        const powerPerUnit = EnemyRegistry.getPowerRating(group.type);
        const patternMult = this.PATTERN_MULTIPLIERS[group.spawnPattern || 'normal'] || 1.0;

        return powerPerUnit * group.count * patternMult;
    }

    /**
     * Calculates the total threat level of a wave.
     */
    public static calculateWaveThreat(wave: IWaveConfig): number {
        if (!wave.enemies) return 0;

        return wave.enemies.reduce((total, group) => {
            return total + this.calculateGroupThreat(group);
        }, 0);
    }

    /**
     * Returns a color code representing the threat level.
     * Green -> Yellow -> Orange -> Red -> Purple
     */
    public static getThreatColor(threat: number): string {
        if (threat < 300) return '#4caf50'; // Green (Easy)
        if (threat < 800) return '#ffd700'; // Gold (Warning)
        if (threat < 1500) return '#ff9800'; // Orange (Hard)
        if (threat < 2500) return '#f44336'; // Red (Very Hard)
        return '#9c27b0'; // Purple (Insane)
    }

    /**
     * Returns a human-readable label for the threat level.
     */
    public static getThreatLabel(threat: number): string {
        if (threat < 300) return 'SAFE';
        if (threat < 800) return 'NORMAL';
        if (threat < 1500) return 'DANGEROUS';
        if (threat < 2500) return 'LETHAL';
        return 'NIGHTMARE';
    }
}
