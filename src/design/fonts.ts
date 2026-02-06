/**
 * UI Design Tokens - Typography
 * Font family, size, and weight definitions
 */

export const UI_FONTS = {
    family: {
        primary: 'Segoe UI, sans-serif',
        mono: 'Consolas, monospace'
    },

    size: {
        xs: '11px',
        sm: '12px',
        md: '14px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
        huge: '42px',
        massive: '60px'
    },

    weight: {
        normal: '400',
        medium: '500',
        bold: '700'
    }
} as const;
