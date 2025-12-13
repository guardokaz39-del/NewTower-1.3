import { IUpgradeCard } from './CardType';

/**
 * Ice Card Upgrades
 * 
 * Level 1: 20% slow, -10% range, +3 damage
 * Level 2: 35% slow, -15% range, +6 damage, +20% damage to slowed enemies
 * Level 3: 65% slow, -15% range, +9 damage, +25% damage to slowed, chain slow on death
 */
export const ICE_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damage: 3,
            rangeMultiplier: 0.90, // -10% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.20, // 20% slow
                slowDuration: 60, // 1 second at 60 FPS
            }
        ]
    },
    2: {
        level: 2,
        modifiers: {
            damage: 6,
            rangeMultiplier: 0.85, // -15% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.35, // 35% slow
                slowDuration: 90,
                damageToSlowed: 1.20, // +20% damage to slowed enemies
            }
        ]
    },
    3: {
        level: 3,
        modifiers: {
            damage: 9,
            rangeMultiplier: 0.85, // -15% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.65, // 65% slow
                slowDuration: 120,
                damageToSlowed: 1.25, // +25% damage to slowed enemies
            },
            {
                type: 'chainSlowOnDeath',
                chainRadius: 60,
            }
        ]
    }
};
