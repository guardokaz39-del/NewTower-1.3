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
    avgPathfinding: number;
    avgCollision: number;
    avgDrawParticles: number;

    // Advanced Metrics
    medianFps: number;
    p95Fps: number;
    p99Fps: number;
    stddevFps: number;

    avgFrameMs?: number;
    p95FrameMs?: number;
    p99FrameMs?: number;

    // Counters
    avgDrawCalls: number;
    avgDrawImage: number;
    avgFillRect: number;
    avgPathOps: number;
    avgTextOps: number;
    avgSaveRestore: number;
    avgTransform: number;
    avgGradientOps: number;
    avgStateChanges: number;

    avgParticlesDrawn: number;
    avgGridQueries: number;
    avgPairsChecked: number;

    // Memory
    memoryStart: number;
    memoryEnd: number;
}

export class StressLogger {
    private static phases: StressPhaseStats[] = [];
    private static currentPhase: StressPhaseStats | null = null;

    // Accumulators for current phase
    private static frameCount = 0;
    private static totalFps = 0;
    private static fpsSamples: number[] = [];
    private static frameMsSamples: number[] = [];
    private static phaseStartTime = 0;

    private static totalLogic = 0;
    private static totalRender = 0;
    private static totalPath = 0;
    private static totalCollision = 0;
    private static totalParticles = 0;
    private static samplesCount = 0; // Distinct from frameCount because of sampling

    private static totalDrawCalls = 0;
    private static totalDrawImage = 0;
    private static totalFillRect = 0;
    private static totalPathOps = 0;
    private static totalTextOps = 0;
    private static totalSaveRestore = 0;
    private static totalTransform = 0;
    private static totalGradientOps = 0;
    private static totalStateChanges = 0;

    private static totalParticlesDrawn = 0;
    private static totalGridQueries = 0;
    private static totalPairsChecked = 0;

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
            avgPathfinding: 0,
            avgCollision: 0,
            avgDrawParticles: 0,
            medianFps: 0,
            p95Fps: 0,
            p99Fps: 0,
            stddevFps: 0,
            avgDrawCalls: 0,
            avgDrawImage: 0,
            avgFillRect: 0,
            avgPathOps: 0,
            avgTextOps: 0,
            avgSaveRestore: 0,
            avgTransform: 0,
            avgGradientOps: 0,
            avgStateChanges: 0,
            avgParticlesDrawn: 0,
            avgGridQueries: 0,
            avgPairsChecked: 0,
            memoryStart: mem,
            memoryEnd: 0
        };

        this.frameCount = 0;
        this.totalFps = 0;
        this.fpsSamples = [];
        this.frameMsSamples = [];
        this.phaseStartTime = performance.now();
        this.totalLogic = 0;
        this.totalRender = 0;
        this.totalPath = 0;
        this.totalCollision = 0;
        this.totalParticles = 0;
        this.samplesCount = 0;

        this.totalDrawCalls = 0;
        this.totalDrawImage = 0;
        this.totalFillRect = 0;
        this.totalPathOps = 0;
        this.totalTextOps = 0;
        this.totalSaveRestore = 0;
        this.totalTransform = 0;
        this.totalGradientOps = 0;
        this.totalStateChanges = 0;

        this.totalParticlesDrawn = 0;
        this.totalGridQueries = 0;
        this.totalPairsChecked = 0;

        console.log(`[StressTest] Starting Phase: ${name}`);
    }

    public static logFrame(dt: number, currentFps: number, entityCount: number) {
        if (!this.currentPhase) return;

        this.frameCount++;
        this.totalFps += currentFps;
        this.fpsSamples.push(currentFps);
        this.frameMsSamples.push(dt * 1000);

        if (entityCount > this.currentPhase.maxEntities) {
            this.currentPhase.maxEntities = entityCount;
        }

        // Get Profiler Data
        const data = PerformanceProfiler.getFrameData();
        // Check if data is not empty (it returns empty object on skipped frames)
        if (Object.keys(data).length > 0) {
            this.samplesCount++;
            this.totalLogic += (data['Logic'] || 0);
            this.totalRender += (data['Render'] || 0);
            this.totalPath += (data['Pathfinding'] || 0);
            this.totalCollision += (data['Collision'] || 0);
            // Assuming 'Render' includes particles, but if we have specific 'DrawParticles' label:
            this.totalParticles += (data['DrawParticles'] || 0);

            const counts = PerformanceProfiler.getFrameCounts();
            this.totalDrawCalls += (counts['drawCalls'] || 0);
            this.totalDrawImage += (counts['drawImage'] || 0);
            this.totalFillRect += (counts['fillRect'] || 0);
            this.totalPathOps += (counts['pathOps'] || 0);
            this.totalTextOps += (counts['textOps'] || 0);
            this.totalSaveRestore += (counts['saveRestore'] || 0);
            this.totalTransform += (counts['transform'] || 0);
            this.totalGradientOps += (counts['gradientOps'] || 0);
            this.totalStateChanges += (counts['stateChanges'] || 0);

            this.totalParticlesDrawn += (counts['particlesDrawn'] || 0);
            this.totalGridQueries += (counts['gridQueries'] || 0);
            this.totalPairsChecked += (counts['pairsChecked'] || 0);
        }
    }

    public static finishPhase() {
        if (!this.currentPhase) return;

        const mem = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        this.currentPhase.memoryEnd = mem;

        // Averages
        this.currentPhase.avgFps = this.frameCount > 0 ? this.totalFps / this.frameCount : 0;

        // 1% Low FPS, p95, median, stddev
        this.fpsSamples.sort((a, b) => a - b);
        const l01 = Math.floor(this.fpsSamples.length * 0.01);
        const l05 = Math.floor(this.fpsSamples.length * 0.05);
        const l50 = Math.floor(this.fpsSamples.length * 0.50);

        this.currentPhase.minFps = this.fpsSamples[0] || 0;
        this.currentPhase.p99Fps = this.fpsSamples[l01] || 0;
        this.currentPhase.p95Fps = this.fpsSamples[l05] || 0;
        this.currentPhase.medianFps = this.fpsSamples[l50] || 0;

        // Frame MS metrics
        this.frameMsSamples.sort((a, b) => a - b);
        const t01 = Math.floor(this.frameMsSamples.length * 0.99); // Worst 1% time
        const t05 = Math.floor(this.frameMsSamples.length * 0.95);

        let sumMs = 0;
        for (let i = 0; i < this.frameMsSamples.length; i++) sumMs += this.frameMsSamples[i];

        this.currentPhase.avgFrameMs = this.frameMsSamples.length > 0 ? sumMs / this.frameMsSamples.length : 0;
        this.currentPhase.p95FrameMs = this.frameMsSamples[t05] || 0;
        this.currentPhase.p99FrameMs = this.frameMsSamples[t01] || 0;
        this.currentPhase.duration = performance.now() - this.phaseStartTime;

        // Stddev (Jitter)
        if (this.frameCount > 0) {
            const mean = this.currentPhase.avgFps;
            const variance = this.fpsSamples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / this.fpsSamples.length;
            this.currentPhase.stddevFps = Math.sqrt(variance);
        }

        // Timing Averages
        const div = this.samplesCount > 0 ? this.samplesCount : 1;
        this.currentPhase.avgLogic = this.totalLogic / div;
        this.currentPhase.avgRender = this.totalRender / div;
        this.currentPhase.avgPathfinding = this.totalPath / div;
        this.currentPhase.avgCollision = this.totalCollision / div;
        this.currentPhase.avgDrawParticles = this.totalParticles / div;

        this.currentPhase.avgDrawCalls = this.totalDrawCalls / div;
        this.currentPhase.avgDrawImage = this.totalDrawImage / div;
        this.currentPhase.avgFillRect = this.totalFillRect / div;
        this.currentPhase.avgPathOps = this.totalPathOps / div;
        this.currentPhase.avgTextOps = this.totalTextOps / div;
        this.currentPhase.avgSaveRestore = this.totalSaveRestore / div;
        this.currentPhase.avgTransform = this.totalTransform / div;
        this.currentPhase.avgGradientOps = this.totalGradientOps / div;
        this.currentPhase.avgStateChanges = this.totalStateChanges / div;

        this.currentPhase.avgParticlesDrawn = this.totalParticlesDrawn / div;
        this.currentPhase.avgGridQueries = this.totalGridQueries / div;
        this.currentPhase.avgPairsChecked = this.totalPairsChecked / div;

        this.phases.push(this.currentPhase);
        this.currentPhase = null;
    }

    public static generateReport(): string {
        this.finishPhase(); // Ensure last phase is saved

        let md = `# 🧪 NewTower Deep Stress Test Report\n`;
        md += `Date: ${new Date().toLocaleString()}\n\n`;

        md += `## 🔬 Phase Breakdown\n`;
        md += `| Phase | Dur(s) | FPS(Med|Avg) | P95 | P99 | FrameMs(Avg/P95) | Jitter | Ents | Core(ms) | Rend(ms) | Draws (Img/Rect/Path) | Tx/S/State |\n`;
        md += `|-------|--------|--------------|-----|-----|------------------|--------|------|----------|----------|-----------------------|------------|\n`;

        this.phases.forEach(p => {
            const memStart = (p.memoryStart / 1024 / 1024).toFixed(0);
            const memEnd = (p.memoryEnd / 1024 / 1024).toFixed(0);
            const memStr = `${memStart} -> ${memEnd}`;

            const coreMs = (p.avgLogic + p.avgPathfinding + p.avgCollision).toFixed(2);
            const durationSec = (p.duration / 1000).toFixed(1);

            const frameMetrics = `${(p.avgFrameMs || 0).toFixed(1)} / ${(p.p95FrameMs || 0).toFixed(1)}`;
            const fpsStr = `${p.medianFps.toFixed(0)}|${p.avgFps.toFixed(0)}`;

            const drawBreakdown = `${p.avgDrawImage.toFixed(0)}/${p.avgFillRect.toFixed(0)}/${p.avgPathOps.toFixed(0)}`;
            const stateBreakdown = `${p.avgTransform.toFixed(0)}/${p.avgSaveRestore.toFixed(0)}/${p.avgStateChanges.toFixed(0)}`;

            md += `| ${p.phaseName} | ${durationSec} | ${fpsStr} | ${p.p95Fps.toFixed(0)} | ${p.p99Fps.toFixed(0)} | ${frameMetrics} | ${p.stddevFps.toFixed(1)} | ${p.maxEntities} | ${coreMs} | ${p.avgRender.toFixed(2)} | ${drawBreakdown} | ${stateBreakdown} |\n`;
        });

        md += `\n## 🚨 Analysis\n`;
        // Simple heuristic analysis
        this.phases.forEach(p => {
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
        return JSON.stringify({
            date: new Date().toISOString(),
            phases: this.phases,
            userAgent: navigator.userAgent
        }, null, 2);
    }

    public static reset() {
        this.phases = [];
        this.currentPhase = null;
    }
}
