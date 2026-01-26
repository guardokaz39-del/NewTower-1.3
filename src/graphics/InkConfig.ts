export const INK_CONFIG = {
    PALETTE: {
        INK: '#2d1b0e',      // Dark Sepia (Main contours)
        PAPER: '#f4e4bc',    // Aged Parchment (Background)
        WASH_RED: '#c62828', // Fire/Enemy
        WASH_BLUE: '#0288d1',// Ice/Magic
        WASH_GREEN: '#558b2f',// Nature/Poison
        WASH_GOLD: '#ffb300', // Gold/Special
        SHADOW: 'rgba(45, 27, 14, 0.2)', // Hatching/Shadow color
    },
    LINE_WIDTH: {
        THIN: 1,
        NORMAL: 2,
        THICK: 3,
    },
    WOBBLE: {
        FREQUENCY: 0.1,    // How fast the line boils
        AMPLITUDE: 1.5,    // How far it deviates
        SEGMENT_LENGTH: 5, // Pixels between wobble points
    }
};
