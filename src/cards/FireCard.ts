import { IUpgradeCard } from './CardType';

/**
 * Fire Card Upgrades
 * 
 * Level 1: Area damage, +15 damage, -15% attack speed
 * Level 2: Larger area, +30 damage, -10% attack speed
 * Level 3: Same as level 2 + enemies explode on death (50% tower damage)
 */
export const FIRE_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damage: 15,
            attackSpeedMultiplier: 0.85, // -15% attack speed
        },
        effects: [
            {
                type: 'splash',
                splashRadius: 50,
            }
        ]
    },
    2: {
        level: 2,
        modifiers: {
            damage: 30,
            attackSpeedMultiplier: 0.90, // -10% attack speed
        },
        effects: [
            {
                type: 'splash',
                splashRadius: 85,
            }
        ]
    },
    3: {
        level: 3,
        modifiers: {
            damage: 30,
            attackSpeedMultiplier: 0.90, // -10% attack speed
        },
        effects: [
            {
                type: 'splash',
                splashRadius: 90,
            },
            {
                type: 'explodeOnDeath',
                explosionDamagePercent: 0.5, // 50% of tower damage
                explosionRadius: 40,
            }
        ]
    }
};
