import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceProfiler } from '../src/utils/PerformanceProfiler';

describe('PerformanceProfiler Contracts', () => {

    beforeEach(() => {
        PerformanceProfiler.enable();
        PerformanceProfiler.reset();
    });

    it('should enforce the SAMPLE_RATE constraint and only gather data on active frames', () => {
        // By default SAMPLE_RATE is 5.
        // Frame 0: Not active (0 % 5 === 0 is true, but starts at 1 usually? Code says frameCount % SAMPLE_RATE === 0)
        // Let's trace it. beginFrame() increments frameCount.
        // So beginFrame 1st time: frameCount = 1, 1 % 5 !== 0 -> false
        // beginFrame 5th time: frameCount = 5, 5 % 5 === 0 -> true

        // Simulate 4 dummy frames
        for (let i = 1; i <= 4; i++) {
            PerformanceProfiler.beginFrame();
            PerformanceProfiler.start('logic');
            PerformanceProfiler.end('logic');
            PerformanceProfiler.count('pathOps', 10);

            // Should be empty on non-sample frames
            const data = PerformanceProfiler.getFrameData();
            const counts = PerformanceProfiler.getFrameCounts();
            expect(data['logic']).toBeUndefined();
            expect(counts['pathOps']).toBeUndefined();
        }

        // Frame 5 - Sample Frame!
        PerformanceProfiler.beginFrame();

        // Mock performance.now to force duration
        vi.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(150);
        PerformanceProfiler.start('logic');
        PerformanceProfiler.end('logic'); // Duration 50

        PerformanceProfiler.count('pathOps', 10);

        const data = PerformanceProfiler.getFrameData();
        const counts = PerformanceProfiler.getFrameCounts();

        expect(data['logic']).toBe(50);
        expect(counts['pathOps']).toBe(10);

        vi.restoreAllMocks();
    });

    it('should correctly accumulate counts and durations recursively within the active frame', () => {
        // Fast forward to active frame (Frame 5)
        for (let i = 1; i <= 4; i++) {
            PerformanceProfiler.beginFrame();
        }

        PerformanceProfiler.beginFrame();

        // Simulate 3 calls to start/end for the same tag
        let time = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => time);

        // Call 1 (10ms)
        time = 0; PerformanceProfiler.start('render');
        time = 10; PerformanceProfiler.end('render');

        // Call 2 (5ms)
        time = 10; PerformanceProfiler.start('render');
        time = 15; PerformanceProfiler.end('render');

        // Call 3 (20ms)
        time = 15; PerformanceProfiler.start('render');
        time = 35; PerformanceProfiler.end('render');

        const data = PerformanceProfiler.getFrameData();
        // Total expected = 10 + 5 + 20 = 35ms
        expect(data['render']).toBe(35);

        vi.restoreAllMocks();
    });

    it('should cleanly reset internal maps', () => {
        // Reach active frame
        for (let i = 1; i <= 5; i++) {
            PerformanceProfiler.beginFrame();
            PerformanceProfiler.start('foo'); PerformanceProfiler.end('foo');
            PerformanceProfiler.count('bar', 1);
        }

        expect(Object.keys(PerformanceProfiler.getFrameData()).length).toBeGreaterThan(0);

        PerformanceProfiler.reset();

        expect(Object.keys(PerformanceProfiler.getFrameData()).length).toBe(0);
        expect(Object.keys(PerformanceProfiler.getFrameCounts()).length).toBe(0);
    });
});
