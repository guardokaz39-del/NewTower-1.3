import type { ICardTypeConfig, IEnemyTypeConfig } from './types';
import { ENEMY_CONFIG, ENEMY_TYPES } from './config/Enemies';
import { TOWER_CONFIG, TARGETING_MODES } from './config/Towers';
import { WAVE_CONFIG, ECONOMY_CONFIG } from './config/Levels';

export const CONFIG = {
    // Configuration flags for safe refactoring
    USE_NEW_RENDERER: true, // Toggle this to enable new modular renderers

    TILE_SIZE: 64,

    AMBIENT: {
        DAY_SPEED: 0.0005,
        NIGHT_SPEED_MULTIPLIER: 1.5,
        LIGHTING: {
            FIRE: '#ff5722',
            ICE: '#00bcd4',
            SNIPER: '#4caf50',
            MINIGUN: '#e040fb',
            STANDARD: '#ffeb3b',
        }
    },

    PLAYER: {
        START_MONEY: 250,
        START_LIVES: 20,
        HAND_LIMIT: 7,
    },

    ECONOMY: {
        ...ECONOMY_CONFIG,
        SLOT_UNLOCK_COST: [0, 150, 350], // Cost to unlock Slot 1 (0), Slot 2, Slot 3
    },

    TOWER: TOWER_CONFIG,

    TARGETING_MODES: TARGETING_MODES,

    UI: {
        HP_BAR_WIDTH: 40,
        HP_BAR_HEIGHT: 4,
        HP_BAR_OFFSET: -30,
        FLOATING_TEXT_LIFE: 1.0, // 1 second
    },

    CARD_TYPES: {
        FIRE: { id: 'fire', name: 'Мортира', icon: '🔥', color: '#f44336', desc: 'Урон по площади', turretAsset: 'turret_fire', moduleAsset: 'mod_fire' },
        ICE: { id: 'ice', name: 'Стужа', icon: '❄️', color: '#00bcd4', desc: 'Замедляет врагов', turretAsset: 'turret_ice', moduleAsset: 'mod_ice' },
        SNIPER: { id: 'sniper', name: 'Снайпер', icon: '🎯', color: '#4caf50', desc: 'Дальняя стрельба', turretAsset: 'turret_sniper', moduleAsset: 'mod_sniper' },
        MULTISHOT: { id: 'multi', name: 'Залп', icon: '💥', color: '#ff9800', desc: '+1 снаряд, -урон', turretAsset: 'turret_split', moduleAsset: 'mod_split' },
        MINIGUN: { id: 'minigun', name: 'Пулемёт', icon: '⚡', color: '#9c27b0', desc: 'Быстрая стрельба, урон растёт', turretAsset: 'turret_minigun', moduleAsset: 'mod_minigun' },
    } as Readonly<Record<string, ICardTypeConfig>>,

    ENEMY: ENEMY_CONFIG,

    ENEMY_TYPES: ENEMY_TYPES,

    WAVES: WAVE_CONFIG,
};

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
    // Try exact match first, then uppercase
    // @ts-ignore
    return CONFIG.ENEMY_TYPES[key] || CONFIG.ENEMY_TYPES[key.toUpperCase()];
}
