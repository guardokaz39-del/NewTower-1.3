export const CONFIG = {
    TILE_SIZE: 64,
    
    // Визуальные настройки
    COLORS: { 
        GRASS: '#8bc34a', PATH: '#ded29e', BASE: '#3f51b5', SPAWN: '#d32f2f', 
        TOWER_BASE: '#9e9e9e', DECOR_BG: '#558b2f', DECOR_TREE: '#2e7d32', DECOR_ROCK: '#78909c'
    },
    
    // Игрок
    PLAYER: {
        START_MONEY: 150, // Чуть больше денег на старт
        START_LIVES: 20, 
        HAND_LIMIT: 7
    },
    
    // Экономика и Лут (Важно!)
    ECONOMY: {
        WAVE_CLEAR_REWARD: 2, // Сколько карт даем за прохождение волны
        DROP_CHANCE: 0.15,    // 15% шанс выпадения карты с врага
        EARLY_WAVE_BONUS: 30, // Золото за вызов волны досрочно
        TOWER_COST: 55,
        FORGE_COST: 50
    },
    
    // --- БАЛАНС КАРТ И БАШЕН ---
    TOWER: {
        BASE_RANGE: 120, BASE_DMG: 5, BASE_CD: 45
    },

    CARDS: {
        // 🔥 ОГОНЬ (Мортира: Медленная, мощная, сплэш)
        FIRE: {
            DAMAGE_PER_LVL: 15,
            CD_INCREASE: 10,    // Замедляет стрельбу (чем больше число, тем медленнее)
            SPLASH_RADIUS_BASE: 50,
            SPLASH_PER_LVL: 20
        },
        // ❄️ ЛЕД (Контроль: Слабый урон, сильное замедление)
        ICE: {
            DAMAGE_PER_LVL: 3,
            SLOW_POWER: 0.6,    // 60% замедления (было 0.4)
            SLOW_DUR_BASE: 40,  // Кадров
            SLOW_DUR_PER_LVL: 30
        },
        // 🎯 СНАЙПЕР (ДД: Далеко, больно, пробивает)
        SNIPER: {
            DAMAGE_PER_LVL: 12,
            RANGE_PER_LVL: 80,  // Очень сильно растет радиус
            SPEED_SET: 18,      // Скорость полета пули
            PIERCE_LVL_REQ: 3   // С какого уровня пробивает насквозь
        },
        // 💥 ЗАЛП (Мультишот)
        MULTI: {
            DMG_PENALTY: 0.6    // Штраф к урону (60% от базы)
        }
    },

    // Описание типов карт
    CARD_TYPES: {
        FIRE: { id: 'fire', name: 'Мортира', icon: '🔥', color: '#f44336' },
        ICE: { id: 'ice', name: 'Стужа', icon: '❄️', color: '#00bcd4' },
        SNIPER: { id: 'sniper', name: 'Снайпер', icon: '🎯', color: '#4caf50' },
        MULTISHOT: { id: 'multi', name: 'Залп', icon: '💥', color: '#ff9800' }
    } as Record<string, any>,

    // Враги
    ENEMY: {
        BASE_HP: 25, HP_GROWTH: 1.2, // Враги растут на 20% каждую волну
    },

    ENEMY_TYPES: {
        GRUNT: { id: 'grunt', symbol: '👾', hpMod: 1.0, speed: 1.5, reward: 5, color: '#9c27b0' },
        SCOUT: { id: 'scout', symbol: '🦇', hpMod: 0.5, speed: 3.5, reward: 3, color: '#ffeb3b' },
        TANK:  { id: 'tank',  symbol: '🐗', hpMod: 3.0, speed: 1.0, reward: 12, color: '#795548' },
        BOSS:  { 
            id: 'boss', symbol: '👹', hpMod: 20.0, speed: 0.5, reward: 200, color: '#ff0000',
            ability: 'summon', summonType: 'SCOUT', summonCd: 180 
        }
    } as Record<string, any>,
    
    // Волны
    WAVES: [
        [ { type: 'GRUNT', count: 10, interval: 90 } ],
        [ { type: 'SCOUT', count: 10, interval: 40 } ], // Быстрые
        [ { type: 'GRUNT', count: 15, interval: 30 }, { type: 'TANK', count: 2, interval: 150 } ],
        [ { type: 'TANK', count: 5, interval: 100 }, { type: 'SCOUT', count: 15, interval: 20 } ],
        [ { type: 'GRUNT', count: 30, interval: 20 }, { type: 'BOSS', count: 1, interval: 300 } ]
    ]
};