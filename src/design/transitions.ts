/**
 * UI Design Tokens - Transitions
 * Standard animation timings and easing curves
 */

export const UI_TRANSITIONS = {
    // Duration values
    duration: {
        instant: '0ms',
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
    },

    // Easing curves (Material Design)
    easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
    },

    // Preset combinations (duration + easing)
    presets: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)'
    }
} as const;

// Helper function
export const getTransition = (preset: keyof typeof UI_TRANSITIONS.presets): string => {
    return UI_TRANSITIONS.presets[preset];
};
