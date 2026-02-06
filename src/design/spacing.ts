/**
 * UI Design Tokens - Spacing System
 * Consistent spacing scale for layouts
 */

export const UI_SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
} as const;

// Helper function
export const getSpacing = (size: keyof typeof UI_SPACING): string => {
    return `${UI_SPACING[size]}px`;
};
