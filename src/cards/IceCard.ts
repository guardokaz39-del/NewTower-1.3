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
            rangeMultiplier: 0.90, // -10% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.30, // 30% slow
                slowDuration: 180, // 3 seconds at 60 FPS
            }
        ],
        visualOverrides: {
            projectileType: 'ice',
            projectileColor: '#00bcd4',
            projectileSpeed: 10,
        }
    },
    2: {
        level: 2,
        modifiers: {
            damage: 3,
            rangeMultiplier: 0.80, // -20% range
        },
        effects: [
            {
                type: 'slow',
                slowPower: 0.45, // 45% slow
                slowDuration: 270, // 4.5 seconds at 60 FPS
                damageToSlowed: 1.20, // +20% damage to slowed enemies
            }
        ]
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
                slowDuration: 360, // 6 seconds at 60 FPS
                damageToSlowed: 1.40, // +40% damage to slowed enemies
            },
            {
                type: 'chainSlowOnDeath',
                chainRadius: 80,
            }
        ]
    }
};
