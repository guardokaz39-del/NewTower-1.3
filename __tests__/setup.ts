/**
 * Global Test Setup for Vitest
 * 
 * Centralizes all browser API mocks so individual tests don't need
 * to re-create them. Runs before every test file via setupFiles in vitest.config.ts.
 * 
 * Environment: jsdom (provides window, document, localStorage natively)
 * This file adds MISSING APIs that jsdom doesn't provide (Canvas, Image, performance.memory).
 */

// --- Canvas Mock ---
// jsdom doesn't implement HTMLCanvasElement.getContext()
// We provide a minimal stub so any code that creates offscreen canvases won't crash.
const canvasContextMock: Record<string, unknown> = {
    fillRect: (): void => { },
    clearRect: (): void => { },
    strokeRect: (): void => { },
    fillText: (): void => { },
    strokeText: (): void => { },
    measureText: (): object => ({ width: 0 }),
    beginPath: (): void => { },
    closePath: (): void => { },
    moveTo: (): void => { },
    lineTo: (): void => { },
    arc: (): void => { },
    fill: (): void => { },
    stroke: (): void => { },
    save: (): void => { },
    restore: (): void => { },
    translate: (): void => { },
    rotate: (): void => { },
    scale: (): void => { },
    setTransform: (): void => { },
    resetTransform: (): void => { },
    drawImage: (): void => { },
    createLinearGradient: (): object => ({
        addColorStop: (): void => { },
    }),
    createRadialGradient: (): object => ({
        addColorStop: (): void => { },
    }),
    createPattern: (): null => null,
    getImageData: (): object => ({ data: new Uint8ClampedArray(4) }),
    putImageData: (): void => { },
    canvas: { width: 800, height: 600 },
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
};

// Patch HTMLCanvasElement.prototype.getContext to return our mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(HTMLCanvasElement.prototype as any).getContext = function (): unknown {
    return canvasContextMock;
};

// --- Image Mock ---
// jsdom's Image constructor doesn't fire onload. We provide one that does.
if (typeof globalThis.Image === 'undefined' || !globalThis.Image) {
    (globalThis as any).Image = class MockImage {
        src = '';
        width = 0;
        height = 0;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
    };
}

// --- performance.memory Mock ---
// Chrome-only API used by StressLogger. Stub to prevent crashes.
if (!(performance as any).memory) {
    (performance as any).memory = {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
    };
}

// --- SoundManager safety ---
// Prevent any actual audio playback in tests.
// Web Audio API is not available in jsdom; we just ensure no crash.
if (typeof globalThis.AudioContext === 'undefined') {
    (globalThis as any).AudioContext = class MockAudioContext {
        createGain() { return { connect: () => { }, gain: { value: 1 } }; }
        createOscillator() { return { connect: () => { }, start: () => { }, stop: () => { }, frequency: { value: 440 } }; }
        get destination() { return {}; }
        close() { }
    };
}

// --- navigator.userAgent ---
// StressLogger.generateJson() uses navigator.userAgent
if (!navigator.userAgent) {
    Object.defineProperty(navigator, 'userAgent', {
        value: 'vitest-jsdom',
        writable: false,
    });
}

export { };
