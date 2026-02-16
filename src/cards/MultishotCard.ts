import { IUpgradeCard } from './CardType';
import { EVOLUTION_UPGRADES } from './CardEvolutions';

/**
 * Multishot Card Upgrades
 *
 * Level 1: 2 projectiles at 60% damage each
 * Level 2: 2 projectiles at 70% damage each
 * Level 3: 3 projectiles at 55% damage each
 *
 * Note: Multishot is handled differently - it modifies projectile count
 * and damage multiplier rather than using effects system
 */
export const MULTISHOT_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {},
        effects: [],
        // Projectile count: 2, damage multiplier: 0.60
    },
    2: {
        level: 2,
        modifiers: {},
        effects: [],
        // Projectile count: 2, damage multiplier: 0.70
    },
    3: {
        level: 3,
        modifiers: {},
        effects: [],
        // Projectile count: 3, damage multiplier: 0.55
    },
};

// Lookup tables for Multishot Evolutions
const EVOLUTION_PROJECTILE_COUNTS: Record<string, number> = {
    barrage: 4,
    spread: 2,
    storm: 6,
    volley: 4,
    homing: 3,
    twin: 2,
};

const EVOLUTION_SPREADS: Record<string, number> = {
    barrage: 0.35,
    spread: 0.12,
    storm: 0.52,
    volley: 0.3,
    homing: 0.2,
    twin: 0.1,
};

/**
 * Get multishot configuration for a given level
 */
export function getMultishotConfig(
    level: number,
    evolutionPath?: string,
): { projectileCount: number; damageMultiplier: number; spread: number } {
    // Check for evolution first
    if (evolutionPath && evolutionPath !== 'classic') {
        // We use local lookup tables and hardcoded damage multipliers
        // to avoid circular dependency issues with EVOLUTION_UPGRADES if imported from index.
        // We DO NOT use EVOLUTION_UPGRADES here to affect the config directly yet,
        // to match the previous Safe implementation step.

        const damageMultipliers: Record<string, number> = {
            barrage: 0.4,
            spread: 0.85,
            storm: 0.3,
            volley: 0.45,
            homing: 0.7,
            twin: 1.0,
        };

        const count = EVOLUTION_PROJECTILE_COUNTS[evolutionPath] || 2;
        const spread = EVOLUTION_SPREADS[evolutionPath] || 0.3;
        const dmgMult = damageMultipliers[evolutionPath] || 0.6;

        return { projectileCount: count, damageMultiplier: dmgMult, spread: spread };
    }

    // Classic path
    switch (level) {
        case 1:
            return { projectileCount: 2, damageMultiplier: 0.6, spread: 0.3 };
        case 2:
            return { projectileCount: 2, damageMultiplier: 0.7, spread: 0.2 };
        case 3:
            return { projectileCount: 3, damageMultiplier: 0.55, spread: 0.25 };
        default:
            return { projectileCount: 1, damageMultiplier: 1.0, spread: 0 };
    }
}
