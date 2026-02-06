/**
 * UI Design Tokens - Color System
 * Centralized color definitions for consistent theming
 */

export const UI_COLORS = {
    // Primary palette
    primary: '#00ffff',      // Cyan - для акцентов, выбора
    secondary: '#ff6b6b',    // Coral Red
    success: '#4caf50',      // Green
    warning: '#ff9800',      // Orange
    danger: '#f44336',       // Red
    info: '#2196f3',         // Blue

    // Glass-morphism effects
    glass: {
        bg: 'rgba(30, 30, 40, 0.85)',
        bgLight: 'rgba(30, 30, 40, 0.6)',
        bgDark: 'rgba(20, 20, 30, 0.95)',
        border: 'rgba(255, 255, 255, 0.1)',
        borderHover: 'rgba(255, 255, 255, 0.2)',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    },

    // Text colors
    text: {
        primary: '#ffffff',
        secondary: '#b0b0b0',
        disabled: '#666666',
        hint: '#888888'
    },

    // Neutral palette (для кнопок, фонов)
    neutral: {
        dark: '#222',
        medium: '#333',
        light: '#555',
        lighter: '#777'
    },

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.8)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',
} as const;
