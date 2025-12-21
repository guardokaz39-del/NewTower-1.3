/**
 * Centralized Visual Configuration
 * Stores colors, sizes, and other visual constants for procedural generation and rendering.
 */

export const VISUALS = {
    ENVIRONMENT: {
        GRASS: {
            MAIN: '#4caf50',
            VAR_1: '#66bb6a', // Light
            VAR_2: '#388e3c', // Dark
        },
        PATH: {
            MAIN: '#d7ccc8',
            DETAIL: '#a1887f',
        },
        DECOR: {
            TREE: {
                BASE: '#4caf50', // Match grass
                FOLIAGE_LIGHT: '#2e7d32',
                FOLIAGE_DARK: '#1b5e20',
            },
            ROCK: {
                BASE: '#4caf50',
                STONE: '#78909c',
            }
        },
        FOG: {
            BASE: '#263238',
        }
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
