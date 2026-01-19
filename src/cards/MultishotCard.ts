import { IUpgradeCard } from './CardType';

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
        effects: []
        // Projectile count: 2, damage multiplier: 0.60
    },
    2: {
        level: 2,
        modifiers: {},
        effects: []
        // Projectile count: 2, damage multiplier: 0.70
    },
    3: {
        level: 3,
        modifiers: {},
        effects: []
        // Projectile count: 3, damage multiplier: 0.55
    }
};

/**
 * Get multishot configuration for a given level
 */
export function getMultishotConfig(level: number): { projectileCount: number; damageMultiplier: number; spread: number } {
    switch (level) {
        case 1:
            return { projectileCount: 2, damageMultiplier: 0.60, spread: 0.30 };
        case 2:
            return { projectileCount: 2, damageMultiplier: 0.70, spread: 0.20 };
        case 3:
            return { projectileCount: 3, damageMultiplier: 0.55, spread: 0.25 };
        default:
            return { projectileCount: 1, damageMultiplier: 1.0, spread: 0 };
    }
}
