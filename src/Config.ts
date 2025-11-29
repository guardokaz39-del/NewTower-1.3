export const CONFIG = {
    TILE_SIZE: 64,
    
    COLORS: { 
        GRASS: '#8bc34a', PATH: '#ded29e', BASE: '#3f51b5', SPAWN: '#d32f2f', 
        TOWER_BASE: '#9e9e9e', DECOR_BG: '#558b2f', DECOR_TREE: '#2e7d32', DECOR_ROCK: '#78909c'
    },
    
    PLAYER: {
        START_MONEY: 250, 
        START_LIVES: 20, 
        HAND_LIMIT: 7
    },
    
    ECONOMY: {
        WAVE_CLEAR_REWARD: 2, 
        DROP_CHANCE: 0.15,    
        EARLY_WAVE_BONUS: 30, 
        TOWER_COST: 55, // Чуть поднял цену
        FORGE_COST: 50,
        SHOP_COST: 100,
        SELL_REFUND: 0.5 // Возврат 50% стоимости при продаже
    },
    
    TOWER: {
        BASE_RANGE: 120, BASE_DMG: 5, BASE_CD: 45,
        BUILD_TIME: 60
    },

    CARDS: {
        FIRE: { DAMAGE_PER_LVL: 15, CD_INCREASE: 10, SPLASH_RADIUS_BASE: 50, SPLASH_PER_LVL: 20 },
        ICE: { DAMAGE_PER_LVL: 3, SLOW_POWER: 0.6, SLOW_DUR_BASE: 40, SLOW_DUR_PER_LVL: 30 },
        SNIPER: { DAMAGE_PER_LVL: 12, RANGE_PER_LVL: 80, SPEED_SET: 18, PIERCE_LVL_REQ: 3 },
        MULTI: { DMG_PENALTY: 0.6 }
    },

    CARD_TYPES: {
        FIRE: { id: 'fire', name: 'Мортира', icon: '🔥', color: '#f44336', desc: 'Урон по площади' },
        ICE: { id: 'ice', name: 'Стужа', icon: '❄️', color: '#00bcd4', desc: 'Замедляет врагов' },
        SNIPER: { id: 'sniper', name: 'Снайпер', icon: '🎯', color: '#4caf50', desc: 'Дальняя стрельба' },
        MULTISHOT: { id: 'multi', name: 'Залп', icon: '💥', color: '#ff9800', desc: '+1 снаряд, -урон' }
    } as Record<string, any>,

    ENEMY: { BASE_HP: 25, HP_GROWTH: 1.2 },

    ENEMY_TYPES: {
        GRUNT: { id: 'grunt', name: 'Гоблин', symbol: '👾', hpMod: 1.0, speed: 1.5, reward: 5, color: '#9c27b0', desc: 'Обычный пехотинец' },
        SCOUT: { id: 'scout', name: 'Летучая мышь', symbol: '🦇', hpMod: 0.5, speed: 3.5, reward: 3, color: '#ffeb3b', desc: 'Быстрый, но слабый' },
        TANK:  { id: 'tank',  name: 'Кабан', symbol: '🐗', hpMod: 3.0, speed: 1.0, reward: 12, color: '#795548', desc: 'Толстая броня' },
        BOSS:  { id: 'boss',  name: 'Демон', symbol: '👹', hpMod: 20.0, speed: 0.5, reward: 200, color: '#ff0000', desc: 'Очень опасен' }
    } as Record<string, any>,
    
    WAVES: [
        [ { type: 'GRUNT', count: 10, interval: 90 } ],
        [ { type: 'SCOUT', count: 10, interval: 40 } ], 
        [ { type: 'GRUNT', count: 15, interval: 30 }, { type: 'TANK', count: 2, interval: 150 } ],
        [ { type: 'TANK', count: 5, interval: 100 }, { type: 'SCOUT', count: 15, interval: 20 } ],
        [ { type: 'GRUNT', count: 30, interval: 20 }, { type: 'BOSS', count: 1, interval: 300 } ]
    ]
};