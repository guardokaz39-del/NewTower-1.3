import { IWaveConfig, IWaveGroup, IWaveGroupRaw, SpawnPattern } from '../MapData';
import { EnemyRegistry } from './EnemyRegistry';
import { WaveManager } from '../WaveManager';

export class ThreatService {

    /**
     * Multipliers for different spawn patterns.
     */
    private static PATTERN_MULTIPLIERS: Record<SpawnPattern, number> = {
        'normal': 1.0,
        'random': 1.1, // Uncertainty factor
        'swarm': 1.5   // Burst density factor
    };

    /**
     * Calculates the threat level of a single enemy group.
     * Accepts Raw config but normalizes it first for accurate calculation.
     */
    public static calculateGroupThreat(rawGroup: IWaveGroupRaw): number {
        // 1. Normalize using the Runtime Truth (WaveManager)
        let group: IWaveGroup;
        try {
            group = WaveManager.normalizeWaveGroup(rawGroup);
        } catch (e) {
            // Fallback for invalid groups in editor (so it doesn't crash)
            console.warn('[ThreatService] Invalid group:', e);
            return 0;
        }

        // 2. Factors
        const powerPerUnit = EnemyRegistry.getPowerRating(group.type) || 1; // Default to 1 if unknown (e.g. invalid type)
        const patternMult = this.PATTERN_MULTIPLIERS[group.pattern] || 1.0;

        // 3. Density Multiplier (Continuous function)
        // Formula: k = 0.25; Density = 0.75 + (1 / interval) * k
        // 0.1s -> 3.25 (Clamped 2.0)
        // 1.0s -> 1.0
        // 2.0s -> 0.875
        const k = 0.25;
        let density = 0.75 + (1.0 / Math.max(0.05, group.baseInterval)) * k;

        // Clamp to sane limits [0.8, 2.0]
        density = Math.max(0.8, Math.min(density, 2.0));

        // 4. Final Calculation
        return (powerPerUnit * group.count) * patternMult * density;
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
     */
    public static getThreatColor(threat: number): string {
        if (threat < 300) return '#4caf50'; // Green
        if (threat < 800) return '#ffd700'; // Gold
        if (threat < 1500) return '#ff9800'; // Orange
        if (threat < 2500) return '#f44336'; // Red
        return '#9c27b0'; // Purple
    }

    public static getThreatLabel(threat: number): string {
        if (threat < 300) return 'SAFE';
        if (threat < 800) return 'NORMAL';
        if (threat < 1500) return 'DANGEROUS';
        if (threat < 2500) return 'LETHAL';
        return 'NIGHTMARE';
    }
}
