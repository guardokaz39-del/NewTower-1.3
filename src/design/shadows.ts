/**
 * UI Design Tokens - Shadows
 * Box shadow definitions for depth
 */

export const UI_SHADOWS = {
    none: 'none',
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.2)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.3)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.4)',
    glass: '0 8px 32px rgba(0, 0, 0, 0.3)',

    // Glow effects
    glow: {
        primary: '0 4px 15px rgba(0, 255, 255, 0.4)',
        success: '0 4px 15px rgba(76, 175, 80, 0.4)',
        danger: '0 4px 15px rgba(211, 47, 47, 0.5)',
    },
} as const;
