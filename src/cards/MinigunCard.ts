import { IUpgradeCard } from './CardType';

/**
 * Minigun Card Upgrades
 * 
 * Level 1: Linear damage ramp-up, +3 dmg/sec, overheat after 5s (1.5s lockout)
 * Level 2: Same as level 1 + 3% crit chance per second
 * Level 3: Stepped damage ramp (5 steps), + crit, overheat 3s lockout
 */
export const MINIGUN_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damage: -2.5, // FIXED: Base 5 - 2.5 = 2.5 final damage (50% of standard)
            attackSpeedMultiplier: 2.65, // 45 / 17 = 2.65x faster attacks
        },
        effects: [
            {
                type: 'spinup',
                spinupDamagePerSecond: 3, // +3 damage per second
                maxSpinupSeconds: 5, // 5 seconds
                overheatDuration: 90, // 1.5 seconds (lockout)
                overheatExtensionWithIce: 120, // +2 seconds with Ice card
            }
        ]
    },
    2: {
        level: 2,
        modifiers: {
            damage: -2.0, // FIXED: Same as level 1
            attackSpeedMultiplier: 2.75,
        },
        effects: [
            {
                type: 'spinup',
                spinupDamagePerSecond: 3,
                spinupCritPerSecond: 0.02, // +3% crit chance per second
                maxSpinupSeconds: 5,
                overheatDuration: 90,
                overheatExtensionWithIce: 120,
            }
        ]
    },
    3: {
        level: 3,
        modifiers: {
            damage: -1.5, // FIXED: Same as level 1-2
            attackSpeedMultiplier: 2.65,
        },
        effects: [
            {
                type: 'spinup',
                // Stepped damage: 5 steps over 7 seconds -> Adjusted for 5s? 
                // We'll keep the steps but maybe compress them or just leave them as 'bonus later'
                spinupSteps: [
                    { threshold: 1, damage: 5 },   // 0-1 sec: +5 dmg
                    { threshold: 2, damage: 10 },  // 1-2 sec: +10 dmg
                    { threshold: 3, damage: 15 },  // 2-3 sec: +15 dmg
                    { threshold: 4, damage: 20 },  // 3-4 sec: +20 dmg
                    { threshold: 5, damage: 30 },  // 4-5 sec: +30 dmg (max)
                ],
                spinupCritPerSecond: 0.02, // +4% crit chance per second
                maxSpinupSeconds: 5,
                overheatDuration: 90,
                overheatExtensionWithIce: 120,
            }
        ]
    }
};
