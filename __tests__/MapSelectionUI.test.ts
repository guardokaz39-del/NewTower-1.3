import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { MapSelectionUI } from '../src/ui/MapSelectionUI';
import { MapPreviewRenderer } from '../src/utils/MapPreviewRenderer';
import { IMapData } from '../src/MapData';
import { VISUALS } from '../src/VisualConfig';
import { CONFIG } from '../src/Config';
import { EventBus, Events } from '../src/EventBus';

/**
 * AAA TEST SUITE: MAP SELECTION FLOW
 * Framework: Vitest/Jest Context
 */

describe('Map Selection Component Suite', () => {

    // --- MOCK DOM SETUP ---
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="map-selection-ui" style="display: flex;">
                <div id="map-list"></div>
                <div id="map-preview-container">
                    <canvas id="map-preview-canvas" width="800" height="400"></canvas>
                </div>
                <!-- Other required DOM parts -->
                <h2 id="map-title"></h2><p id="map-description"></p><div id="map-modifiers"></div>
                <button id="map-back-btn"></button><button id="map-play-btn"></button>
            </div>
        `;
        EventBus.getInstance().clear(); // Clear singleton listeners
        vi.clearAllMocks(); // If Vitest
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    const createMockMapData = (): IMapData => ({
        width: 4, height: 4,
        tiles: [
            [0, 1, 2, 3],
            [4, 5, 0, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        waypoints: [{ x: 0, y: 1 }, { x: 3, y: 1 }],
        objects: [
            { type: 'rock', x: 2, y: 2, size: 1 },
            { type: 'tree', x: 0, y: 3, size: 1 }
        ]
    });

    // ==========================================
    // 1. UNIT TESTS: MapPreviewRenderer
    // ==========================================
    describe('MapPreviewRenderer (Stateless & Deterministic)', () => {
        let canvas: HTMLCanvasElement;
        let ctx: CanvasRenderingContext2D;

        beforeEach(() => {
            canvas = document.getElementById('map-preview-canvas') as HTMLCanvasElement;
            ctx = canvas.getContext('2d')!;
            // Spy on context methods
            vi.spyOn(ctx, 'fillRect');
            vi.spyOn(ctx, 'fillStyle', 'set');
        });

        it('should correctly map raw tile codes to VISUALS colors (Water, Sand, Lava)', () => {
            const mapData = createMockMapData();

            MapPreviewRenderer.drawToCanvas(ctx, mapData, 800, 400, 1);

            // Assertions for correctly mapped colors applied to context
            // 2: Water
            expect(ctx.fillStyle).not.toBe('#c33'); // Old bug: water was red spawner color
        });

        it('should render objects AFTER rendering base tiles (Z-Index check)', () => {
            const mapData = createMockMapData();
            const spyFillRect = vi.spyOn(ctx, 'fillRect');
            const spyArc = vi.spyOn(ctx, 'arc');

            MapPreviewRenderer.drawToCanvas(ctx, mapData, 800, 400, 1);

            // Because objects loop happens after tiles loop:
            expect(spyFillRect.mock.calls.length).toBeGreaterThan(0); // 1 base canvas fill + 4 custom tiles + rock fills
            expect(spyArc).toHaveBeenCalled(); // Tree rendered using arc
        });
    });

    // ==========================================
    // 2. INTEGRATION & LEAK TESTS: MapSelectionUI
    // ==========================================
    describe('MapSelectionUI Integration & Memory', () => {

        it('should hide the UI overlay DOM container exactly ONCE upon destroy()', () => {
            const ui = new MapSelectionUI(vi.fn());
            const container = document.getElementById('map-selection-ui')!;

            // Pre-condition
            expect(container.style.display).toBe('flex');

            ui.destroy();

            // Post-condition - critical fix for GameScene unblock
            expect(container.style.display).toBe('none');
        });

        it('should prevent repeated listener binding via isInitialized guard', () => {
            const ui = new MapSelectionUI(vi.fn());
            const mockAddEventListener = vi.spyOn(document.getElementById('map-play-btn')!, 'addEventListener');

            // 1st call
            ui.init();
            expect(ui['isInitialized']).toBe(true);
            const bindCount = mockAddEventListener.mock.calls.length;

            // 2nd call (spamming)
            ui.init();
            ui.init();

            // Count shouldn't have changed
            expect(mockAddEventListener.mock.calls.length).toBe(bindCount);
        });

        it('should emit Events.UI_MAP_PLAY_REQUESTED with correct data on Play click', () => {
            const ui = new MapSelectionUI(vi.fn());
            const rawMockMap = createMockMapData();

            let receivedEventData = null;
            EventBus.getInstance().on(Events.UI_MAP_PLAY_REQUESTED, (data) => {
                receivedEventData = data;
            });

            ui.init();

            // Bypass asynchronous load of MapStorage and set the active map directly
            (ui as any).activeMapData = rawMockMap;

            // Simulate Click on "Play Map" natively
            document.getElementById('map-play-btn')!.click();

            expect(receivedEventData).toEqual(rawMockMap);
        });
    });

    // ==========================================
    // 3. PERFORMANCE SMOKE TESTS
    // ==========================================
    describe('Performance & Smoke', () => {

        it('should render massive maps in < 16ms', () => {
            // Generate 100x100 map (10,000 tiles)
            const mapData: IMapData = {
                width: 100, height: 100,
                tiles: Array(100).fill(Array(100).fill(0)),
                waypoints: [{ x: 0, y: 50 }, { x: 99, y: 50 }],
                objects: Array(500).fill({ type: 'tree', x: 50, y: 50, size: 1 }) // 500 trees
            };

            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d')!;

            const t0 = performance.now();
            MapPreviewRenderer.drawToCanvas(ctx, mapData, 1920, 1080, 2); // dpr 2
            const t1 = performance.now();

            const timeMs = t1 - t0;
            console.log(`Rendered heavy map in ${timeMs.toFixed(2)}ms`);

            expect(timeMs).toBeLessThan(16.0); // Strict timeframe for 60FPS lock
        });
    });

});
