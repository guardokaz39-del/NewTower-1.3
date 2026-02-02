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
        name: 'Адская Гончая',
        symbol: '🐕',
        hpMod: 0.85,
        speed: 168, // 2.8 * 60 = 168
        reward: 2,
        color: '#212121', // Dark fur color
        desc: 'Быстрый хищник из преисподней',
        archetype: 'HELLHOUND',
        scale: 0.9,
    },
    TANK: {
        id: 'tank',
        name: 'Воевода Орков',
        symbol: '👹', // Or maybe 🛡️? Sticking with ogre/oni usually works for Orcs, or use custom unicode if preferred.
        hpMod: 3.65,
        speed: 68, // Decreased by ~20% from 48
        reward: 10,
        color: '#558b2f',
        desc: 'Живой таран в тяжелой броне',
        archetype: 'ORC',
        scale: 1.3,
    },
    BOSS: {
        id: 'boss',
        name: 'Призрак Пустоты',
        symbol: '👻',
        hpMod: 30.0,
        speed: 40,
        reward: 300,
        color: '#1a0b2e',
        desc: 'Неуязвимая сущность',
        archetype: 'WRAITH',
        scale: 1.2,
    },
    // --- NEW VARIANTS ---
    SKELETON_COMMANDER: {
        id: 'skeleton_commander',
        name: 'Командир Скелетов',
        symbol: '👑',
        hpMod: 3.0,
        speed: 72, // Heavy (1.2 * 60)
        reward: 12,
        color: '#ffd700',
        desc: 'Становится сильнее от смертей союзников',
        archetype: 'SKELETON_COMMANDER',
        scale: 1.3,
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
        desc: 'Оставляет лечащую лужу после смерти',
        archetype: 'SPIDER',
        scale: 1.15,
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
    },
    GOBLIN: {
        id: 'goblin',
        name: 'Гоблин',
        symbol: '👺',
        hpMod: 0.8,
        speed: 76, // 15% slower than Skeleton (90 * 0.85)
        reward: 3,
        color: '#689f38', // Detailed Olive
        desc: 'Жадный мародер с мешком',
        archetype: 'GOBLIN',
        scale: 1.35, // 40% larger than 0.95
    }
};
