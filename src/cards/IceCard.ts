import { IUpgradeCard } from './CardType';

/**
 * Ice Card Upgrades
 *
 * Level 1: 30% slow, -10% range, +1 damage
 * Level 2: 45% slow, -20% range, +3 damage, +20% damage to slowed enemies
 * Level 3: 75% slow, -25% range, +6 damage, +40% damage to slowed, chain slow on death
 */
export const ICE_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damage: 1,
            rangeMultiplier: 0.9, // -10% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.3, // 30% slow
                slowDuration: 3, // 180 / 60
            },
        ],
        visualOverrides: {
            projectileType: 'ice',
            projectileColor: '#00bcd4',
            projectileSpeed: 600, // 10 * 60
        },
    },
    2: {
        level: 2,
        modifiers: {
            damage: 3,
            rangeMultiplier: 0.8, // -20% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.45, // 45% slow
                slowDuration: 4.5, // 270 / 60
                damageToSlowed: 1.2, // +20% damage to slowed enemies
            },
        ],
    },
    3: {
        level: 3,
        modifiers: {
            damage: 6,
            rangeMultiplier: 0.75, // -25% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.75, // 75% slow
                slowDuration: 6, // 360 / 60
                damageToSlowed: 1.4, // +40% damage to slowed enemies
            },
            {
                type: 'chainSlowOnDeath',
                chainRadius: 80,
            },
        ],
    },
};
