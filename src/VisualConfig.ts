/**
 * Centralized Visual Configuration
 * Stores colors, sizes, and other visual constants for procedural generation and rendering.
 */

export const VISUALS = {
    ENVIRONMENT: {
        GRASS: {
            // Dark Fantasy grass (чуть светлее для читаемости)
            MAIN: '#3d5233',      // Темно-зеленый (был #3a4a2f - слишком темный)
            VAR_1: '#4d6343',     // Вариация светлее
            VAR_2: '#2d4223',     // Вариация темнее
            BIOLUM: '#4dd0e1',    // Биолюминесценция (cyan) - акцент!
        },
        PATH: {
            // Techno Path (окисленный металл - ОСВЕТЛЕН для лучшей видимости)
            MAIN: '#5a5a62',      // Светлый металл (было #4a4a52 - слишком темный)
            GRID: '#222',         // Швы между плитами
            RIVET: '#6a6a70',     // Заклепки 
            GLOW: '#00ffcc',      // Неоновая подсветка
            BORDER: '#2a2a30',    // Darker border (almost black/grey) for flush look
            DETAIL: '#a1887f',    // Legacy 
        },
        DECOR: {
            TREE: {
                BASE: '#3a4a2f', // Match новую grass
                FOLIAGE_LIGHT: '#2e4d32',
                FOLIAGE_DARK: '#1b3e20',
            },
            ROCK: {
                BASE: '#3a4a2f',
                STONE: '#5a606c', // Темнее для Dark стиля
            }
        },
        FOG: {
            BASE: '#263238',
        }
    },
    // Глобальное направление света (критично для Фазы 5!)
    LIGHTING: {
        GLOBAL_LIGHT_ANGLE: Math.PI * 0.75,  // 135° (северо-запад → юго-восток)
        SHADOW_OFFSET_X: 3,   // px смещения тени
        SHADOW_OFFSET_Y: 3,
        HIGHLIGHT_OFFSET_X: -2,  // px блика (противоположно тени)
        HIGHLIGHT_OFFSET_Y: -2,
    },
    TOWER: {
        BASE: {
            PLATFORM: '#9e9e9e', // Grey 500
            RIM: '#616161',      // Grey 700
            RIVETS: '#424242',
        },
        TURRET: {
            STANDARD: {
                MAIN: '#616161',
                STROKE: '#212121',
                BARREL: '#616161',
            },
            ICE: {
                MAIN: '#00acc1', // Cyan 600
                STROKE: '#e0f7fa',
                SPIKE: '#4dd0e1', // Cyan 300
            },
            FIRE: {
                MAIN: '#f4511e', // Deep Orange 600
                STROKE: '#ffccbc',
                BARREL: '#ff7043',
                TIP: '#bf360c',
            },
            SNIPER: {
                MAIN: '#2e7d32', // Green 800
                BARREL: '#1b5e20', // Green 900
                MUZZLE: '#4caf50',
            },
            SPLIT: {
                MAIN: '#f57f17', // Yellow 900
                BARREL: '#fbc02d', // Yellow 700
            }
        },
        MODULES: {
            ICE: {
                BODY: '#0277bd',
                LIQUID: '#4fc3f7',
                CAP: '#eceff1',
            },
            FIRE: {
                BODY: '#c62828',
                SYMBOL: '#ffeb3b',
            },
            SNIPER: {
                BODY: '#212121',
                LENS: '#00e5ff',
            },
            SPLIT: {
                BODY: '#ff6f00',
                ACCENT: '#ffd54f',
            }
        },
        BUILDING: {
            BASE: 'rgba(158, 158, 158, 0.5)',
            BAR_BG: '#333',
            BAR_FILL: 'gold',
        },
        LASER: 'rgba(255, 0, 0, 0.3)',
        RANGE_CIRCLE: {
            FILL: 'rgba(0, 255, 255, 0.1)',
            STROKE: 'rgba(0, 255, 255, 0.4)',
        }
    },
    ENEMY: {
        SKELETON: {
            BONE: '#e0e0e0',
            EYES: '#212121',
        },
        WOLF: {
            BODY: '#5d4037',
            EYES: '#ff1744',
        },
        TROLL: {
            SKIN: '#558b2f',
            FEATURE: '#33691e',
        },
        SPIDER: {
            BODY: '#311b92',
            HEAD: '#4527a0',
            EYES: '#d50000',
        },
        PROPS: {
            SHIELD: { WOOD: '#8d6e63', METAL: '#bdbdbd' },
            HELMET: { GOLD: '#ffd700', HORN: '#e0e0e0' },
            BARRIER: { FILL: 'rgba(100, 255, 218, 0.4)', STROKE: 'rgba(255, 255, 255, 0.8)' },
            WEAPON: { HANDLE: '#5d4037', GUARD: '#ffd700', BLADE: '#cfd8dc' },
        }
    },
    PROJECTILES: {
        STANDARD: '#fff',
        ICE: '#00bcd4',
        FIRE: '#f44336',
        SNIPER: '#4caf50',
        SPLIT: '#ff9800',
    }
};
