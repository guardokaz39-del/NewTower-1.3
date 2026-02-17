import { PerformanceProfiler } from './PerformanceProfiler';

export interface StressPhaseStats {
    phaseName: string;
    duration: number;
    avgFps: number;
    minFps: number; // 1% low
    maxEntities: number;

    // Avg timings per frame
    avgLogic: number;
    avgRender: number;
    avgRenderUnitsMs: number;
    avgRenderProjectilesMs: number;
    avgRenderParticlesMs: number;
    avgRenderTilesOrBackgroundMs: number;
    avgRenderUiMs: number;
    avgRenderDebugMs: number;
    avgPathfinding: number;
    avgCollision: number;
    avgDrawParticles: number;
    avgDrawCalls: number;
    avgVisibleEntities: number;
    avgParticlesRendered: number;
    avgUnitSpriteFallback: number;

    // Memory
    memoryStart: number;
    memoryEnd: number;
}

export interface StressFrameCounters {
    drawCalls: number;
    visibleEntities: number;
    particlesRendered: number;
}

export class StressLogger {
    private static phases: StressPhaseStats[] = [];
    private static currentPhase: StressPhaseStats | null = null;
    private static phaseStartTs = 0;
    private static phaseEndTs = 0;

    // Accumulators for current phase
    private static frameCount = 0;
    private static totalFps = 0;
    private static fpsSamples: number[] = [];

    private static totalLogic = 0;
    private static totalRender = 0;
    private static totalPath = 0;
    private static totalCollision = 0;
    private static totalParticles = 0;
    private static totalRenderUnits = 0;
    private static totalRenderProjectiles = 0;
    private static totalRenderParticles = 0;
    private static totalRenderTilesOrBackground = 0;
    private static totalRenderUi = 0;
    private static totalRenderDebug = 0;
    private static totalDrawCalls = 0;
    private static totalVisibleEntities = 0;
    private static totalParticlesRendered = 0;
    private static totalUnitSpriteFallback = 0;
    private static samplesCount = 0; // Distinct from frameCount because of sampling

    private static safeAverage(sum: number, count: number): number {
        if (count === 0) return 0;
        const value = sum / count;
        return Number.isNaN(value) ? 0 : value;
    }

    public static startPhase(name: string) {
        this.finishPhase(); // Finish previous if exists

        const mem = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;

        this.currentPhase = {
            phaseName: name,
            duration: 0,
            avgFps: 0,
            minFps: 999,
            maxEntities: 0,
            avgLogic: 0,
            avgRender: 0,
            avgRenderUnitsMs: 0,
            avgRenderProjectilesMs: 0,
            avgRenderParticlesMs: 0,
            avgRenderTilesOrBackgroundMs: 0,
            avgRenderUiMs: 0,
            avgRenderDebugMs: 0,
            avgPathfinding: 0,
            avgCollision: 0,
            avgDrawParticles: 0,
            avgDrawCalls: 0,
            avgVisibleEntities: 0,
            avgParticlesRendered: 0,
            avgUnitSpriteFallback: 0,
            memoryStart: mem,
            memoryEnd: 0,
        };

        this.phaseStartTs = performance.now();
        this.phaseEndTs = this.phaseStartTs;

        this.frameCount = 0;
        this.totalFps = 0;
        this.fpsSamples = [];
        this.totalLogic = 0;
        this.totalRender = 0;
        this.totalPath = 0;
        this.totalCollision = 0;
        this.totalParticles = 0;
        this.totalRenderUnits = 0;
        this.totalRenderProjectiles = 0;
        this.totalRenderParticles = 0;
        this.totalRenderTilesOrBackground = 0;
        this.totalRenderUi = 0;
        this.totalRenderDebug = 0;
        this.totalDrawCalls = 0;
        this.totalVisibleEntities = 0;
        this.totalParticlesRendered = 0;
        this.totalUnitSpriteFallback = 0;
        this.samplesCount = 0;

        console.log(`[StressTest] Starting Phase: ${name}`);
    }

    public static logFrame(dt: number, currentFps: number, entityCount: number, counters?: StressFrameCounters) {
        if (!this.currentPhase) return;

        this.frameCount++;
        this.totalFps += currentFps;
        this.fpsSamples.push(currentFps);

        if (entityCount > this.currentPhase.maxEntities) {
            this.currentPhase.maxEntities = entityCount;
        }

        if (counters) {
            this.totalDrawCalls += counters.drawCalls;
            this.totalVisibleEntities += counters.visibleEntities;
            this.totalParticlesRendered += counters.particlesRendered;
        }

        // Get Profiler Data
        const data = PerformanceProfiler.getFrameData();
        // Check if data is not empty (it returns empty object on skipped frames)
        if (Object.keys(data).length > 0) {
            this.samplesCount++;
            this.totalLogic += data['Logic'] || 0;
            this.totalRender += data['Render'] || 0;
            this.totalPath += data['Pathfinding'] || 0;
            this.totalCollision += data['Collision'] || 0;
            // Assuming 'Render' includes particles, but if we have specific 'DrawParticles' label:
            this.totalParticles += data['DrawParticles'] || 0;
            this.totalRenderUnits += data['RenderUnits'] || 0;
            this.totalRenderProjectiles += data['RenderProjectiles'] || 0;
            this.totalRenderParticles += data['RenderParticles'] || 0;
            this.totalRenderTilesOrBackground += data['RenderTilesOrBackground'] || 0;
            this.totalRenderUi += data['RenderUi'] || 0;
            this.totalRenderDebug += data['RenderDebug'] || 0;
            this.totalUnitSpriteFallback += data['unitSpriteFallback'] || 0;
        }
    }

    public static finishPhase() {
        if (!this.currentPhase) return;

        this.phaseEndTs = performance.now();
        this.currentPhase.duration = Math.max(0, (this.phaseEndTs - this.phaseStartTs) / 1000);

        const mem = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        this.currentPhase.memoryEnd = mem;

        // Averages
        this.currentPhase.avgFps = this.frameCount > 0 ? this.totalFps / this.frameCount : 0;

        // 1% Low FPS
        this.fpsSamples.sort((a, b) => a - b);
        const lowIndex = Math.floor(this.fpsSamples.length * 0.01);
        this.currentPhase.minFps = this.fpsSamples[lowIndex] || 0;

        // Timing Averages
        this.currentPhase.avgLogic = this.safeAverage(this.totalLogic, this.samplesCount);
        this.currentPhase.avgRender = this.safeAverage(this.totalRender, this.samplesCount);
        this.currentPhase.avgPathfinding = this.safeAverage(this.totalPath, this.samplesCount);
        this.currentPhase.avgCollision = this.safeAverage(this.totalCollision, this.samplesCount);
        this.currentPhase.avgDrawParticles = this.safeAverage(this.totalParticles, this.samplesCount);
        this.currentPhase.avgRenderUnitsMs = this.safeAverage(this.totalRenderUnits, this.samplesCount);
        this.currentPhase.avgRenderProjectilesMs = this.safeAverage(this.totalRenderProjectiles, this.samplesCount);
        this.currentPhase.avgRenderParticlesMs = this.safeAverage(this.totalRenderParticles, this.samplesCount);
        this.currentPhase.avgRenderTilesOrBackgroundMs = this.safeAverage(this.totalRenderTilesOrBackground, this.samplesCount);
        this.currentPhase.avgRenderUiMs = this.safeAverage(this.totalRenderUi, this.samplesCount);
        this.currentPhase.avgRenderDebugMs = this.safeAverage(this.totalRenderDebug, this.samplesCount);

        this.currentPhase.avgDrawCalls = this.safeAverage(this.totalDrawCalls, this.frameCount);
        this.currentPhase.avgVisibleEntities = this.safeAverage(this.totalVisibleEntities, this.frameCount);
        this.currentPhase.avgParticlesRendered = this.safeAverage(this.totalParticlesRendered, this.frameCount);
        this.currentPhase.avgUnitSpriteFallback = this.safeAverage(this.totalUnitSpriteFallback, this.samplesCount);

        this.phases.push(this.currentPhase);
        this.currentPhase = null;
    }

    public static generateReport(): string {
        this.finishPhase(); // Ensure last phase is saved

        let md = `# 🧪 NewTower Deep Stress Test Report\n`;
        md += `Date: ${new Date().toLocaleString()}\n\n`;

        md += `## 🔬 Phase Breakdown\n`;
        md += `| Phase | Duration (s) | Avg FPS | Min FPS | Entities | Logic (ms) | Path (ms) | Col (ms) | CPU Render (ms) | Overhead/GPU (ms) | Mem (MB) |\n`;
        md += `|-------|--------------|---------|---------|----------|------------|-----------|----------|-----------------|-------------------|----------|\n`;

        this.phases.forEach((p) => {
            const memStart = (p.memoryStart / 1024 / 1024).toFixed(0);
            const memEnd = (p.memoryEnd / 1024 / 1024).toFixed(0);
            const memDelta = p.memoryEnd - p.memoryStart;
            const memSign = memDelta >= 0 ? '+' : '';
            const memStr = `${memStart} -> ${memEnd}`;

            const frameTime = 1000 / (p.avgFps || 60);
            const measured = p.avgLogic + p.avgRender; // Render is already CPU Render
            const overhead = Math.max(0, frameTime - measured);

            md += `| ${p.phaseName} | ${p.duration.toFixed(2)} | ${p.avgFps.toFixed(0)} | ${p.minFps.toFixed(0)} | ${p.maxEntities} | ${p.avgLogic.toFixed(2)} | ${p.avgPathfinding.toFixed(2)} | ${p.avgCollision.toFixed(2)} | ${p.avgRender.toFixed(2)} | ${overhead.toFixed(2)} | ${memStr} |\n`;
        });

        md += `\n## 🎨 Render breakdown\n`;
        md += `| Phase | Units (ms) | Projectiles (ms) | Particles (ms) | Tiles/BG (ms) | UI (ms) | Debug (ms) | Draw Calls | Visible Entities | Particles Rendered | unitSpriteFallback |\n`;
        md += `|-------|------------|------------------|----------------|---------------|---------|------------|------------|------------------|--------------------|--------------------|\n`;

        this.phases.forEach((p) => {
            md += `| ${p.phaseName} | ${p.avgRenderUnitsMs.toFixed(2)} | ${p.avgRenderProjectilesMs.toFixed(2)} | ${p.avgRenderParticlesMs.toFixed(2)} | ${p.avgRenderTilesOrBackgroundMs.toFixed(2)} | ${p.avgRenderUiMs.toFixed(2)} | ${p.avgRenderDebugMs.toFixed(2)} | ${p.avgDrawCalls.toFixed(0)} | ${p.avgVisibleEntities.toFixed(0)} | ${p.avgParticlesRendered.toFixed(0)} | ${p.avgUnitSpriteFallback.toFixed(2)} |\n`;
        });

        md += `\n## 🚨 Analysis\n`;
        // Simple heuristic analysis
        this.phases.forEach((p) => {
            if (p.avgFps < 30) {
                md += `- **${p.phaseName}**: Low FPS (${p.avgFps.toFixed(0)}). `;
                if (p.avgLogic > p.avgRender) {
                    md += `Bottleneck: CPU Logic. `;
                    if (p.avgPathfinding > 5) md += `Major Load: Pathfinding. `;
                    if (p.avgCollision > 5) md += `Major Load: Collision. `;
                } else {
                    md += `Bottleneck: GPU/Render. `;
                }
                md += `\n`;
            }
        });

        return md;
    }

    public static generateJson(): string {
        return JSON.stringify(
            {
                date: new Date().toISOString(),
                phases: this.phases,
                userAgent: navigator.userAgent,
            },
            null,
            2,
        );
    }

    public static reset() {
        this.phases = [];
        this.currentPhase = null;
        this.phaseStartTs = 0;
        this.phaseEndTs = 0;
    }
}
