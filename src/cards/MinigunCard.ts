import { IUpgradeCard } from './CardType';

/**
 * Minigun Card Upgrades
 * 
 * Level 1: Percentage damage modifier (-70%), +3 dmg/sec, overheat after 5s (1.5s lockout)
 * Level 2: Same as level 1 (-60%) + 2% crit chance per second
 * Level 3: Stepped damage ramp (-45%), + crit, overheat 3s lockout
 */
export const MINIGUN_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damageMultiplier: 0.50, // 50% of base damage (50% reduction)
            attackSpeedMultiplier: 2.65, // 45 / 17 = 2.65x faster attacks
        },
        effects: [
            {
                type: 'spinup',
                spinupDamagePerSecond: 3, // +3 damage per second
                maxSpinupSeconds: 5, // 5 seconds
                overheatDuration: 1.5, // 90 / 60
                overheatExtensionWithIce: 2, // 120 / 60
            }
        ],
        visualOverrides: {
            projectileType: 'minigun',
            projectileColor: '#fff',
            projectileSpeed: 720, // 12 * 60
        }
    },
    2: {
        level: 2,
        modifiers: {
            damageMultiplier: 0.60, // 60% of base damage (40% reduction)
            attackSpeedMultiplier: 2.75,
        },
        effects: [
            {
                type: 'spinup',
                spinupDamagePerSecond: 3,
                spinupCritPerSecond: 0.02, // +2% crit chance per second
                maxSpinupSeconds: 5,
                overheatDuration: 1.5,
                overheatExtensionWithIce: 2,
            }
        ]
    },
    3: {
        level: 3,
        modifiers: {
            damageMultiplier: 0.75, // 75% of base damage (25% reduction)
            attackSpeedMultiplier: 2.65,
        },
        effects: [
            {
                type: 'spinup',
                // Stepped damage: 5 steps over 5 seconds
                spinupSteps: [
                    { threshold: 1, damage: 5 },   // 0-1 sec: +5 dmg
                    { threshold: 2, damage: 10 },  // 1-2 sec: +10 dmg
                    { threshold: 3, damage: 15 },  // 2-3 sec: +15 dmg
                    { threshold: 4, damage: 20 },  // 3-4 sec: +20 dmg
                    { threshold: 5, damage: 30 },  // 4-5 sec: +30 dmg (max)
                ],
                spinupCritPerSecond: 0.02, // +2% crit chance per second
                maxSpinupSeconds: 5,
                overheatDuration: 1.5,
                overheatExtensionWithIce: 2,
            }
        ]
    }
};
