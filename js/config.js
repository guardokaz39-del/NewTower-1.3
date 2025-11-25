export const CONFIG = {
    TILE_SIZE: 64,
    COLORS: { 
        GRASS: '#8bc34a', PATH: '#ded29e', BASE: '#3f51b5', SPAWN: '#d32f2f', 
        TOWER_BASE: '#9e9e9e', DECOR_BG: '#558b2f', DECOR_TREE: '#2e7d32', DECOR_ROCK: '#78909c'
    },
    
    PLAYER: {
        START_MONEY: 125, START_LIVES: 20, HAND_LIMIT: 7
    },
    
    FORGE: {
        COST: 50, ANIMATION_DURATION: 600
    },
    
    TOWER: {
        COST: 55, BASE_DMG: 10, BASE_RANGE: 150, BASE_CD: 40
    },
    
    ENEMY: {
        BASE_HP: 30, HP_GROWTH: 1.15, DROP_CHANCE: 0.08
    },

    ENEMY_TYPES: {
        GRUNT: { id: 'grunt', symbol: '👾', hpMod: 1.1, speed: 1.5, reward: 5, color: '#9c27b0' },
        SCOUT: { id: 'scout', symbol: '🦇', hpMod: 0.6, speed: 3.1, reward: 3, color: '#ffeb3b' },
        TANK:  { id: 'tank',  symbol: '🐗', hpMod: 2.5, speed: 1.2, reward: 10, color: '#795548' },
        BOSS:  { 
            id: 'boss', symbol: '👹', hpMod: 15.0, speed: 0.6, reward: 150, color: '#ff0000',
            ability: 'summon', summonType: 'SCOUT', summonCd: 180 
        }
    },
    
    WAVES: [
        [ { type: 'GRUNT', count: 15, interval: 80 } ],
        [ { type: 'GRUNT', count: 12, interval: 60 }, { type: 'SCOUT', count: 7, interval: 40 } ],
        [ { type: 'GRUNT', count: 30, interval: 25 } ],
        [ { type: 'GRUNT', count: 12, interval: 50 }, { type: 'TANK', count: 5, interval: 120 }, { type: 'GRUNT', count: 15, interval: 50 } ],
        [ { type: 'SCOUT', count: 18, interval: 30 }, { type: 'TANK', count: 6, interval: 100 } ],
        [ { type: 'TANK', count: 7, interval: 90 }, { type: 'SCOUT', count: 20, interval: 20 } ],
        [ { type: 'GRUNT', count: 30, interval: 20 }, { type: 'BOSS', count: 1, interval: 200 } ]
    ],

    CARD_TYPES: {
        FIRE: { id: 'fire', name: 'Сплэш', icon: '🔥', color: '#f44336' },
        ICE: { id: 'ice', name: 'Холод', icon: '❄️', color: '#00bcd4' },
        SNIPER: { id: 'sniper', name: 'Снайпер', icon: '🎯', color: '#4caf50' },
        // НОВАЯ КАРТА
        MULTISHOT: { id: 'multi', name: 'Залп', icon: '💥', color: '#ff9800' }
    }
};