import { StressLogger } from '../src/utils/StressLogger';
import { PerformanceProfiler } from '../src/utils/PerformanceProfiler';

describe('StressLogger', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        StressLogger.reset();
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('startPhase + finishPhase records non-negative duration close to elapsed time', () => {
        const nowSpy = jest.spyOn(performance, 'now');
        nowSpy.mockReturnValueOnce(1_000);
        nowSpy.mockReturnValueOnce(1_250);

        StressLogger.startPhase('duration phase');
        StressLogger.finishPhase();

        const json = JSON.parse(StressLogger.generateJson());
        expect(json.phases).toHaveLength(1);

        const [phase] = json.phases;
        expect(phase.phaseName).toBe('duration phase');
        expect(phase.duration).toBeCloseTo(0.25, 5);
        expect(phase.duration).toBeGreaterThanOrEqual(0);
    });

    test('aggregates averages and keeps untouched buckets at 0', () => {
        jest.spyOn(performance, 'now').mockReturnValue(10);
        const frameDataSpy = jest.spyOn(PerformanceProfiler, 'getFrameData');
        frameDataSpy
            .mockReturnValueOnce({
                Logic: 10,
                Render: 20,
                Pathfinding: 4,
                Collision: 2,
                DrawParticles: 3,
                RenderUnits: 5,
                RenderProjectiles: 1,
                RenderParticles: 2,
                unitSpriteFallback: 2,
                unitSpriteMissing: 1,
                'unitSpriteMissingByType:orc': 2,
            })
            .mockReturnValueOnce({
                Logic: 14,
                Render: 24,
                Pathfinding: 6,
                Collision: 4,
                DrawParticles: 5,
                RenderUnits: 7,
                RenderProjectiles: 3,
                RenderParticles: 4,
                unitSpriteFallback: 4,
                unitSpriteMissing: 3,
                'unitSpriteMissingByType:orc': 1,
                'unitSpriteMissingByType:mage': 5,
            });

        StressLogger.startPhase('aggregation');
        StressLogger.logFrame(16, 60, 100, { drawCalls: 20, visibleEntities: 40, particlesRendered: 10 });
        StressLogger.logFrame(16, 30, 120, { drawCalls: 10, visibleEntities: 20, particlesRendered: 30 });
        StressLogger.finishPhase();

        const json = JSON.parse(StressLogger.generateJson());
        const [phase] = json.phases;

        expect(phase.avgFps).toBe(45);
        expect(phase.avgLogic).toBe(12);
        expect(phase.avgRender).toBe(22);
        expect(phase.avgPathfinding).toBe(5);
        expect(phase.avgCollision).toBe(3);
        expect(phase.avgRenderUnitsMs).toBe(6);
        expect(phase.avgRenderProjectilesMs).toBe(2);
        expect(phase.avgRenderParticlesMs).toBe(3);
        expect(phase.avgDrawCalls).toBe(15);
        expect(phase.avgVisibleEntities).toBe(30);
        expect(phase.avgParticlesRendered).toBe(20);

        // Fallback/missing counters are averaged on sample count.
        expect(phase.avgUnitSpriteFallback).toBe(3);
        expect(phase.avgUnitSpriteMissing).toBe(2);

        // untouched buckets must remain 0
        expect(phase.avgRenderTilesOrBackgroundMs).toBe(0);
        expect(phase.avgRenderUiMs).toBe(0);
        expect(phase.avgRenderDebugMs).toBe(0);

        expect(phase.missingBakedFramesByType).toEqual({ orc: 3, mage: 5 });
    });

    test('finishPhase without startPhase and empty phase are safe edge cases', () => {
        expect(() => StressLogger.finishPhase()).not.toThrow();

        jest.spyOn(performance, 'now').mockReturnValue(500);
        jest.spyOn(PerformanceProfiler, 'getFrameData').mockReturnValue({});

        StressLogger.startPhase('empty phase');
        StressLogger.finishPhase();

        const json = JSON.parse(StressLogger.generateJson());
        const [phase] = json.phases;

        expect(phase.avgFps).toBe(0);
        expect(phase.avgLogic).toBe(0);
        expect(phase.avgUnitSpriteFallback).toBe(0);
        expect(phase.missingBakedFramesByType).toEqual({});
    });

    test('framesCount > 0 with profiler samplesCount = 0 keeps sample-based averages at 0', () => {
        jest.spyOn(performance, 'now').mockReturnValue(42);
        jest.spyOn(PerformanceProfiler, 'getFrameData').mockReturnValue({});

        StressLogger.startPhase('no samples');
        StressLogger.logFrame(16, 50, 10, { drawCalls: 5, visibleEntities: 8, particlesRendered: 2 });
        StressLogger.logFrame(16, 70, 12, { drawCalls: 7, visibleEntities: 9, particlesRendered: 4 });
        StressLogger.finishPhase();

        const json = JSON.parse(StressLogger.generateJson());
        const [phase] = json.phases;

        expect(phase.avgFps).toBe(60);
        expect(phase.avgDrawCalls).toBe(6);
        expect(phase.avgLogic).toBe(0);
        expect(phase.avgUnitSpriteMissing).toBe(0);
    });

    test('json serialization and markdown generation include expected fields', () => {
        jest.spyOn(performance, 'now').mockReturnValue(100);
        jest.spyOn(PerformanceProfiler, 'getFrameData').mockReturnValue({ Logic: 1, Render: 2 });

        StressLogger.startPhase('serialization');
        StressLogger.logFrame(16, 55, 22, { drawCalls: 11, visibleEntities: 7, particlesRendered: 3 });
        StressLogger.finishPhase();

        const parsed = JSON.parse(StressLogger.generateJson());
        expect(typeof parsed.date).toBe('string');
        expect(Array.isArray(parsed.phases)).toBe(true);

        const [phase] = parsed.phases;
        expect(typeof phase.phaseName).toBe('string');
        expect(typeof phase.duration).toBe('number');
        expect(typeof phase.avgFps).toBe('number');

        const report = StressLogger.generateReport();
        expect(typeof report).toBe('string');
        expect(report).toContain('Phase Breakdown');
    });
});
