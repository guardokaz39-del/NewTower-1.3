import { IUpgradeCard } from './CardType';

/**
 * Minigun Card Upgrades (BUFFED)
 *
 * Role: Sustained DPS monster, rewards commitment
 * Trade-off: Needs ramp-up time, vulnerable to overheat
 *
 * Level 1: 55% base, x2.65 speed, +4 DPS/s, 5s to overheat
 * Level 2: 65% base, x2.75 speed, +5 DPS/s, +2% crit/s, 6s overheat
 * Level 3: 80% base, stepped damage up to +40, extended overheat
 */
export const MINIGUN_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damageMultiplier: 0.55, // Buffed from 0.50
            attackSpeedMultiplier: 2.65,
        },
        effects: [
            {
                type: 'spinup',
                spinupDamagePerSecond: 4, // Buffed from 3
                spinupSpeedBonus: 1.5, // NEW: Ramps up speed by +1.5x
                maxSpinupSeconds: 5,
                overheatDuration: 1.2, // Slightly reduced from 1.5
                overheatExtensionWithIce: 2.5,
            },
        ],
        visualOverrides: {
            projectileType: 'minigun',
            projectileColor: '#fff',
            projectileSpeed: 720,
        },
    },
    2: {
        level: 2,
        modifiers: {
            damageMultiplier: 0.65, // Buffed from 0.60
            attackSpeedMultiplier: 2.8, // Buffed from 2.75
        },
        effects: [
            {
                type: 'spinup',
                spinupDamagePerSecond: 5, // Buffed from 3
                spinupCritPerSecond: 0.025, // Buffed from 0.02
                spinupSpeedBonus: 1.8, // NEW: +1.8x speed at max
                maxSpinupSeconds: 6, // Extended from 5
                overheatDuration: 1.0, // Reduced from 1.5
                overheatExtensionWithIce: 2.5,
            },
        ],
    },
    3: {
        level: 3,
        modifiers: {
            damageMultiplier: 0.8, // Buffed from 0.75
            attackSpeedMultiplier: 2.75, // Buffed from 2.65
        },
        effects: [
            {
                type: 'spinup',
                spinupSteps: [
                    { threshold: 1, damage: 6 }, // Buffed
                    { threshold: 2, damage: 14 }, // Buffed
                    { threshold: 3, damage: 22 }, // Buffed
                    { threshold: 4, damage: 32 }, // Buffed
                    { threshold: 5, damage: 45 }, // Buffed from 30
                ],
                spinupCritPerSecond: 0.03,
                spinupSpeedBonus: 2.0, // NEW: +2.0x speed at max
                maxSpinupSeconds: 6, // Extended
                overheatDuration: 1.2, // Reduced
                overheatExtensionWithIce: 3,
            },
        ],
    },
};
