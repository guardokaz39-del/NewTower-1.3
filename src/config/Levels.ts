export const ECONOMY_CONFIG = {
    WAVE_CLEAR_REWARD: 2,
    WAVE_BASE_REWARD: 20, // NEW: Base reward for completing a wave
    WAVE_SCALING_FACTOR: 2, // NEW: Additional reward per wave number (+2 per wave)
    DROP_CHANCE: 0.15,
    EARLY_WAVE_BONUS: 15, // Reduced from 30 to 15
    PERFECT_WAVE_BONUS: 10, // NEW: Bonus for no enemy leaks
    TOWER_COST: 55,
    FORGE_COST_LVL1: 50, // LVL1→2 forge cost
    FORGE_COST_LVL2: 65, // LVL2→3 forge cost (was FORGE_COST: 50)
    SHOP_COST: 100,
    SHOP_REROLL_COST: 25, // Increased from 15 to 25
    SELL_REFUND: 0.5,
    CARD_SELL_PRICES: [0, 5, 10, 25], // Index = level (0 unused, 1-3 are actual prices)
};

export const WAVE_CONFIG = [
    // Волна 1: Обычный режим для обучения
    {
        enemies: [{ type: 'GRUNT', count: 10, spawnPattern: 'normal' }],
    },
    // Волна 2: Рандомный режим для непредсказуемости
    {
        enemies: [{ type: 'SCOUT', count: 12, spawnPattern: 'random' }],
    },
    // Волна 3: Комбинация обычного и роя
    {
        enemies: [
            { type: 'GRUNT', count: 15, spawnPattern: 'normal' },
            { type: 'TANK', count: 2, spawnPattern: 'normal' },
        ],
    },
    // Волна 4: Рой скаутов + танки рандомно
    {
        enemies: [
            { type: 'SCOUT', count: 20, spawnPattern: 'swarm' },
            { type: 'TANK', count: 3, spawnPattern: 'random' },
        ],
    },
    // Волна 5: Финальная волна с боссом
    {
        enemies: [
            { type: 'GRUNT', count: 25, spawnPattern: 'random' },
            { type: 'BOSS', count: 1, spawnPattern: 'normal' },
        ],
    },
];
