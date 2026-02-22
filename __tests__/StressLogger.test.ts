import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StressLogger } from '../src/utils/StressLogger';

describe('StressLogger Analytics', () => {
    beforeEach(() => {
        StressLogger.reset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should correctly calculate p01 (1% low) and p05 (5% low) percentiles', () => {
        StressLogger.startPhase('TestPhase');

        for (let i = 1; i <= 100; i++) {
            StressLogger.logFrame(16, i, i * 10);
            // Internal metrics are accumulated differently now, we'll mock them later if needed.
        }

        StressLogger.finishPhase();

        const jsonStr = StressLogger.generateJson();
        const data = JSON.parse(jsonStr);
        const phase = data.phases[0];

        console.log("StressLogger Phase JSON:", JSON.stringify(phase));

        // Expections: 100 elements sorted 1..100
        // 1% of 100 = 1, Math.floor(1) = 1 -> index 1 is value 2.
        // wait, Math.floor(100 * 0.01) = 1.
        expect(phase.p01Fps).toBe(2);

        // 5% of 100 = 5 -> index 5 is value 6
        expect(phase.p05Fps).toBe(6);

        // 50% = 50 -> index 50 is value 51
        expect(phase.medianFps).toBe(51);

        // Min = index 0 = 1
        expect(phase.minFps).toBe(1);
    });

    it('should safely handle empty phases without zero-division errors', () => {
        StressLogger.startPhase('EmptyPhase');
        // No frames logged!
        StressLogger.finishPhase();

        const data = JSON.parse(StressLogger.generateJson());
        const phase = data.phases[0];

        expect(phase.avgFps).toBe(0);
        expect(phase.minFps).toBe(0);
        expect(phase.p01Fps).toBe(0);
        expect(phase.p05Fps).toBe(0);
        expect(phase.medianFps).toBe(0);
        expect(phase.stddevFps).toBe(0);
        expect(phase.avgLogic).toBe(0); // Testing the count/div protection
    });

    it('should track maximum entities correctly across frames', () => {
        StressLogger.startPhase('EntitiesTest');

        StressLogger.logFrame(16, 60, 10);
        StressLogger.logFrame(16, 60, 50); // Max hit here
        StressLogger.logFrame(16, 60, 20);

        StressLogger.finishPhase();

        const data = JSON.parse(StressLogger.generateJson());
        expect(data.phases[0].maxEntities).toBe(50);
    });
});
