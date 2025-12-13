import { IUpgradeCard } from './CardType';

/**
 * Sniper Card Upgrades
 * 
 * Level 1: +80 range, +12 damage, -50% attack speed, 15% crit chance
 * Level 2: +160 range, +24 damage, -50% attack speed, 15% crit chance
 * Level 3: +240 range, +36 damage, -30% attack speed, 15% crit chance, pierce 2 enemies (15% damage loss each)
 */
export const SNIPER_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damage: 12,
            range: 80,
            attackSpeedMultiplier: 0.50, // -50% attack speed (slower)
            critChance: 0.15, // 15% crit chance
        },
        effects: []
    },
    2: {
        level: 2,
        modifiers: {
            damage: 24,
            range: 160,
            attackSpeedMultiplier: 0.50, // -50% attack speed
            critChance: 0.15,
        },
        effects: []
    },
    3: {
        level: 3,
        modifiers: {
            damage: 36,
            range: 240,
            attackSpeedMultiplier: 0.70, // -30% attack speed (improved from level 2)
            critChance: 0.15,
        },
        effects: [
            {
                type: 'pierce',
                pierceCount: 2, // Pierce through 2 enemies
                pierceDamageLoss: 0.15, // Lose 15% damage per pierce
            }
        ]
    }
};
