import type { ICardTypeConfig, IEnemyTypeConfig } from './types';

export const CONFIG = {
    TILE_SIZE: 64,

    COLORS: {
        GRASS: '#8bc34a',
        PATH: '#ded29e',
        BASE: '#3f51b5',
        SPAWN: '#d32f2f',
        TOWER_BASE: '#9e9e9e',
        DECOR_BG: '#558b2f',
        DECOR_TREE: '#2e7d32',
        DECOR_ROCK: '#78909c',
    },

    PLAYER: {
        START_MONEY: 250,
        START_LIVES: 20,
        HAND_LIMIT: 7,
    },

    ECONOMY: {
        WAVE_CLEAR_REWARD: 2,
        WAVE_BASE_REWARD: 20,          // NEW: Base reward for completing a wave
        WAVE_SCALING_FACTOR: 2,        // NEW: Additional reward per wave number (+2 per wave)
        DROP_CHANCE: 0.15,
        EARLY_WAVE_BONUS: 30,
        TOWER_COST: 55,
        FORGE_COST: 50,
        SHOP_COST: 100,
        SELL_REFUND: 0.5,
        CARD_SELL_PRICES: [0, 5, 10, 25], // Index = level (0 unused, 1-3 are actual prices)
    },

    TOWER: {
        BASE_RANGE: 120,
        BASE_DMG: 5,
        BASE_CD: 54, // Increased for balance (was 45)
        BUILD_TIME: 60,
        MAX_CARDS: 3,
        BARREL_LENGTH: 22,
        TURN_SPEED: 0.15, // Radians per frame (~8.5 degrees)
        AIM_TOLERANCE: 0.1, // ~5 degrees error allowed to shoot
    },

    TARGETING_MODES: {
        FIRST: { id: 'first', name: 'Первый', icon: '🏃', desc: 'Ближе к цели' },
        CLOSEST: { id: 'closest', name: 'Ближайший', icon: '📍', desc: 'Рядом с башней' },
        STRONGEST: { id: 'strongest', name: 'Сильный', icon: '💪', desc: 'Макс. здоровье' },
        WEAKEST: { id: 'weakest', name: 'Слабый', icon: '💔', desc: 'Мин. здоровье' },
        LAST: { id: 'last', name: 'Последний', icon: '🐢', desc: 'Дальше от цели' },
    },

    UI: {
        HP_BAR_WIDTH: 40,
        HP_BAR_HEIGHT: 4,
        HP_BAR_OFFSET: -30,
        FLOATING_TEXT_LIFE: 60,
    },

    CARD_TYPES: {
        FIRE: { id: 'fire', name: 'Мортира', icon: '🔥', color: '#f44336', desc: 'Урон по площади' },
        ICE: { id: 'ice', name: 'Стужа', icon: '❄️', color: '#00bcd4', desc: 'Замедляет врагов' },
        SNIPER: { id: 'sniper', name: 'Снайпер', icon: '🎯', color: '#4caf50', desc: 'Дальняя стрельба' },
        MULTISHOT: { id: 'multi', name: 'Залп', icon: '💥', color: '#ff9800', desc: '+1 снаряд, -урон' },
        MINIGUN: { id: 'minigun', name: 'Пулемёт', icon: '⚡', color: '#9c27b0', desc: 'Быстрая стрельба, урон растёт' },
    } as Readonly<Record<string, ICardTypeConfig>>,

    ENEMY: { BASE_HP: 25, HP_GROWTH: 1.2 },

    ENEMY_TYPES: {
        GRUNT: {
            id: 'grunt',
            name: 'Скелет',
            symbol: '💀',
            hpMod: 1.0,
            speed: 1.5,
            reward: 5,
            color: '#e0e0e0',
            desc: 'Обычный скелет',
            archetype: 'SKELETON',
            scale: 1.0,
        },
        SCOUT: {
            id: 'scout',
            name: 'Волк',
            symbol: '🐺',
            hpMod: 0.6,
            speed: 2.8,
            reward: 4,
            color: '#795548',
            desc: 'Быстрый хищник',
            archetype: 'WOLF',
            scale: 0.9,
        },
        TANK: {
            id: 'tank',
            name: 'Тролль',
            symbol: '👹',
            hpMod: 3.5,
            speed: 0.8,
            reward: 15,
            color: '#558b2f',
            desc: 'Тяжелый танк',
            archetype: 'TROLL',
            scale: 1.2,
        },
        BOSS: {
            id: 'boss',
            name: 'Паучиха',
            symbol: '🕷️',
            hpMod: 25.0,
            speed: 0.6,
            reward: 300,
            color: '#311b92',
            desc: 'Матка роя',
            archetype: 'SPIDER',
            scale: 1.8,
        },
        // --- NEW VARIANTS ---
        SKELETON_COMMANDER: {
            id: 'skeleton_commander',
            name: 'Командир',
            symbol: '👑',
            hpMod: 2.5,
            speed: 1.6,
            reward: 25,
            color: '#ffd700',
            desc: 'Лидер скелетов',
            archetype: 'SKELETON',
            scale: 1.2,
            props: ['prop_helmet', 'prop_weapon'],
            tint: '#ffd700'
        },
        SPIDER_POISON: {
            id: 'spider_poison',
            name: 'Ядовитый',
            symbol: '🧪',
            hpMod: 1.2,
            speed: 2.2,
            reward: 12,
            color: '#76ff03',
            desc: 'Ядовитый паук',
            archetype: 'SPIDER',
            scale: 0.7,
            tint: '#76ff03'
        },
        TROLL_ARMORED: {
            id: 'troll_armored',
            name: 'Латник',
            symbol: '🛡️',
            hpMod: 6.0,
            speed: 0.7,
            reward: 30,
            color: '#424242',
            desc: 'Бронированный тролль',
            archetype: 'TROLL',
            scale: 1.3,
            props: ['prop_shield'],
            tint: '#616161'
        }
    } as const,

    WAVES: [
        [{ type: 'GRUNT', count: 10, interval: 90 }],
        [{ type: 'SCOUT', count: 10, interval: 40 }],
        [
            { type: 'GRUNT', count: 15, interval: 30 },
            { type: 'TANK', count: 2, interval: 150 },
        ],
        [
            { type: 'TANK', count: 5, interval: 100 },
            { type: 'SCOUT', count: 15, interval: 20 },
        ],
        [
            { type: 'GRUNT', count: 30, interval: 20 },
            { type: 'BOSS', count: 1, interval: 300 },
        ],
    ],
} as const;

/**
 * Type-safe helper to get card type configuration
 */
export function getCardType(key: string): ICardTypeConfig | undefined {
    return CONFIG.CARD_TYPES[key];
}

/**
 * Type-safe helper to get enemy type configuration
 */
export function getEnemyType(key: string): IEnemyTypeConfig | undefined {
    // @ts-ignore
    return CONFIG.ENEMY_TYPES[key];
}
