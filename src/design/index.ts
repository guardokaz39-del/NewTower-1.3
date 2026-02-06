/**
 * Design System - Main Export
 * Centralizes all UI design tokens
 */

export { UI_COLORS } from './colors';
export { UI_SPACING, getSpacing } from './spacing';
export { UI_TRANSITIONS, getTransition } from './transitions';
export { UI_BORDERS } from './borders';
export { UI_SHADOWS } from './shadows';
export { UI_FONTS } from './fonts';

// Re-export as single UI object for convenience
import { UI_COLORS } from './colors';
import { UI_SPACING } from './spacing';
import { UI_TRANSITIONS } from './transitions';
import { UI_BORDERS } from './borders';
import { UI_SHADOWS } from './shadows';
import { UI_FONTS } from './fonts';

export const UI = {
    COLORS: UI_COLORS,
    SPACING: UI_SPACING,
    TRANSITIONS: UI_TRANSITIONS,
    BORDERS: UI_BORDERS,
    SHADOWS: UI_SHADOWS,
    FONTS: UI_FONTS
} as const;
