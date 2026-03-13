export const TOWER_CONFIG = {
    BASE_RANGE: 100,
    BASE_DMG: 4,
    BASE_CD: 0.9, // 54 / 60 = 0.9 seconds
    BUILD_TIME: 1.0, // 60 / 60 = 1.0 second
    MAX_CARDS: 3,
    BARREL_LENGTH: 22,
    TURN_SPEED: 18.0, // Increased for smoother tracking
    AIM_TOLERANCE: 0.1,
};

export const TARGETING_MODES = {
    FIRST: { id: 'first', name: 'Первый', icon: '🏃', desc: 'Ближе к цели' },
    CLOSEST: { id: 'closest', name: 'Ближайший', icon: '📍', desc: 'Рядом с башней' },
    STRONGEST: { id: 'strongest', name: 'Сильный', icon: '💪', desc: 'Макс. здоровье' },
    LAST: { id: 'last', name: 'Последний', icon: '🐢', desc: 'Дальше от цели' },
};
