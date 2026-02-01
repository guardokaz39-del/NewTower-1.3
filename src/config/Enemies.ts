import { IEnemyTypeConfig } from '../types';

export const ENEMY_CONFIG = {
    BASE_HP: 25,
    HP_GROWTH: 1.2
};

export const ENEMY_TYPES: Record<string, IEnemyTypeConfig> = {
    GRUNT: {
        id: 'grunt',
        name: 'Скелет',
        symbol: '💀',
        hpMod: 1.2,
        speed: 90, // 1.5 * 60 = 90
        reward: 4,
        color: '#e0e0e0',
        desc: 'Обычный скелет',
        archetype: 'SKELETON',
        scale: 1.0,
    },
    SCOUT: {
        id: 'scout',
        name: 'Волк',
        symbol: '🐺',
        hpMod: 0.85,
        speed: 168, // 2.8 * 60 = 168
        reward: 2,
        color: '#795548',
        desc: 'Быстрый хищник',
        archetype: 'WOLF',
        scale: 0.9,
    },
    TANK: {
        id: 'tank',
        name: 'Тролль',
        symbol: '👹',
        hpMod: 3.65,
        speed: 48, // 0.8 * 60 = 48
        reward: 10,
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
        speed: 36, // 0.6 * 60 = 36
        reward: 175,
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
        speed: 96, // 1.6 * 60 = 96
        reward: 8,
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
        hpMod: 1.4,
        speed: 132, // 2.2 * 60 = 132
        reward: 6,
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
        hpMod: 7.0,
        speed: 42, // 0.7 * 60 = 42
        reward: 15,
        color: '#424242',
        desc: 'Бронированный тролль',
        archetype: 'TROLL',
        scale: 1.3,
        props: ['prop_shield'],
        tint: '#616161'
    }
};
