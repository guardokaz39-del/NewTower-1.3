import { IUpgradeCard } from './CardType';

/**
 * Fire Card Upgrades (BALANCED)
 *
 * Role: AoE damage dealer, good against groups
 * Trade-off: Lower single-target DPS for splash
 *
 * Level 1: +12 damage, splash 45px, -15% speed
 * Level 2: +22 damage, splash 70px, -10% speed
 * Level 3: +25 damage, splash 80px, explode on death
 */
export const FIRE_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damage: 12, // Nerfed from 15
            attackSpeedMultiplier: 0.85,
        },
        effects: [
            {
                type: 'splash',
                splashRadius: 45, // Nerfed from 50
            },
            {
                type: 'burn',
                burnDuration: 3,
                burnDps: 5,
            },
        ],
        visualOverrides: {
            projectileType: 'fire',
            projectileColor: '#f44336',
            projectileSpeed: 360,
        },
    },
    2: {
        level: 2,
        modifiers: {
            damage: 22, // Nerfed from 30
            attackSpeedMultiplier: 0.9,
        },
        effects: [
            {
                type: 'splash',
                splashRadius: 70, // Nerfed from 85
            },
            {
                type: 'burn',
                burnDuration: 4,
                burnDps: 8,
            },
        ],
    },
    3: {
        level: 3,
        modifiers: {
            damage: 25, // Nerfed from 30
            attackSpeedMultiplier: 0.9,
        },
        effects: [
            {
                type: 'splash',
                splashRadius: 80, // Nerfed from 90
            },
            {
                type: 'burn',
                burnDuration: 5,
                burnDps: 12,
            },
            {
                type: 'explodeOnDeath',
                explosionDamagePercent: 0.5,
                explosionRadius: 40,
            },
        ],
    },
};
