/**
 * UI Design Tokens - Borders
 * Border radius, width, and style definitions
 */

export const UI_BORDERS = {
    radius: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px'
    },

    width: {
        none: '0',
        thin: '1px',
        normal: '2px',
        thick: '3px',
        bold: '4px'
    },

    style: {
        solid: 'solid',
        dashed: 'dashed',
        dotted: 'dotted'
    }
} as const;
