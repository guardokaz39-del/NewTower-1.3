import { IUpgradeCard } from './CardType';

/**
 * Sniper Card Upgrades
 * 
 * Level 1: +80 range, +14 damage, -50% attack speed, 10% crit chance
 * Level 2: +160 range, +24 damage, -35% attack speed, 15% crit chance
 * Level 3: +240 range, +46 damage, -15% attack speed, 20% crit chance, pierce 2 enemies (15% damage loss each)
 */
export const SNIPER_UPGRADES: Record<number, IUpgradeCard> = {
    1: {
        level: 1,
        modifiers: {
            damage: 14,
            range: 80,
            attackSpeedMultiplier: 0.50, // -50% attack speed (slower)
            critChance: 0.15, // 15% crit chance
        },
        effects: [],
        visualOverrides: {
            projectileType: 'sniper',
            projectileColor: '#4caf50',
            projectileSpeed: 15,
        }
    },
    2: {
        level: 2,
        modifiers: {
            damage: 24,
            range: 160,
            attackSpeedMultiplier: 0.65, // -35% attack speed
            critChance: 0.15,
        },
        effects: []
    },
    3: {
        level: 3,
        modifiers: {
            damage: 46,
            range: 240,
            attackSpeedMultiplier: 0.85, // -15% attack speed (improved from level 2)
            critChance: 0.20,
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
