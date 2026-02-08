/**
 * PerformanceMonitor - Real-time FPS and metrics tracking
 * @performance Lightweight overlay for debugging performance issues
 */
export class PerformanceMonitor {
    private static enabled = false;
    private static frameCount = 0;
    private static fpsTimer = performance.now();    // For FPS calculation (per second)
    private static lastFrameTime = performance.now(); // For frame delta (per frame)
    private static fps = 0;
    // PERF: Ring Buffer instead of array with shift() - O(1) vs O(n)
    private static frameTimes = new Float64Array(60);
    private static frameIndex = 0;
    private static frameCount60 = 0; // How many samples in ring buffer

    // Metrics
    private static peakFps = 0;
    private static minFps = 999;
    private static profiling = false;
    private static profileData: { timestamp: number; fps: number; entities: number }[] = [];

    // Advanced Metrics for Stutter Detection
    private static worstFrameTime = 0;       // Max frame time in current session
    private static spikeCount = 0;           // Frames > 33ms (below 30 FPS)
    private static lastSpikeTime = 0;        // When last spike occurred
    private static onePercentLowFps = 60;    // 1% low FPS (worst 1%)

    /**
     * Call this at the start of each frame
     */
    public static beginFrame(): void {
        const now = performance.now();

        // Frame delta calculation (per-frame)
        const frameDelta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // PERF: Ring buffer - O(1) write, no shift()
        this.frameTimes[this.frameIndex] = frameDelta;
        this.frameIndex = (this.frameIndex + 1) % 60;
        if (this.frameCount60 < 60) this.frameCount60++;

        // Track worst frame time and spikes (for stutter detection)
        if (frameDelta > this.worstFrameTime) this.worstFrameTime = frameDelta;
        if (frameDelta > 33.33) { // Below 30 FPS
            this.spikeCount++;
            this.lastSpikeTime = now;
        }

        // FPS calculation (per second)
        this.frameCount++;
        const fpsElapsed = now - this.fpsTimer;
        if (fpsElapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / fpsElapsed);
            this.frameCount = 0;
            this.fpsTimer = now;

            // Track min/max
            if (this.fps > this.peakFps) this.peakFps = this.fps;
            if (this.fps < this.minFps && this.fps > 0) this.minFps = this.fps;

            // Calculate 1% low FPS (worst 1% of frame times)
            this.calculateOnePercentLow();
        }
    }

    /**
     * Calculate 1% low FPS from worst frame times
     */
    private static calculateOnePercentLow(): void {
        if (this.frameCount60 < 10) return;
        // Copy and sort frameTimes to find worst 1%
        const sorted: number[] = [];
        for (let i = 0; i < this.frameCount60; i++) {
            sorted.push(this.frameTimes[i]);
        }
        sorted.sort((a, b) => b - a); // Descending
        // Take worst 1% (at least 1 sample)
        const worstCount = Math.max(1, Math.floor(this.frameCount60 * 0.01));
        let sum = 0;
        for (let i = 0; i < worstCount; i++) {
            sum += sorted[i];
        }
        const avgWorstFrameTime = sum / worstCount;
        this.onePercentLowFps = Math.round(1000 / avgWorstFrameTime);
    }

    /**
     * Get current FPS
     */
    public static getFps(): number {
        return this.fps;
    }

    /**
     * Get average frame time in ms
     */
    public static getAvgFrameTime(): number {
        if (this.frameCount60 === 0) return 0;
        let sum = 0;
        for (let i = 0; i < this.frameCount60; i++) {
            sum += this.frameTimes[i];
        }
        return sum / this.frameCount60;
    }

    /**
     * Toggle overlay visibility
     */
    public static toggle(): void {
        this.enabled = !this.enabled;
    }

    /**
     * Check if overlay is enabled
     */
    public static isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Start profiling session
     */
    public static startProfile(durationMs: number = 5000): void {
        this.profiling = true;
        this.profileData = [];
        this.minFps = 999;
        this.peakFps = 0;

        setTimeout(() => {
            this.profiling = false;
            console.log('[PerformanceMonitor] Profile complete');
            console.log(`FPS Range: ${this.minFps} - ${this.peakFps}`);
            console.log(`Avg Frame Time: ${this.getAvgFrameTime().toFixed(2)}ms`);
        }, durationMs);
    }

    /**
     * Record current state for profiling
     */
    public static recordFrame(entityCount: number): void {
        if (!this.profiling) return;
        this.profileData.push({
            timestamp: performance.now(),
            fps: this.fps,
            entities: entityCount
        });
    }

    /**
     * Get profile results
     */
    public static getProfileResults(): string {
        if (this.profileData.length === 0) return 'No profile data';

        const avgFps = this.profileData.reduce((a, b) => a + b.fps, 0) / this.profileData.length;
        const avgEntities = this.profileData.reduce((a, b) => a + b.entities, 0) / this.profileData.length;

        return `Samples: ${this.profileData.length}\nAvg FPS: ${avgFps.toFixed(1)}\nAvg Entities: ${avgEntities.toFixed(0)}\nFPS Range: ${this.minFps}-${this.peakFps}`;
    }

    /**
     * Draw overlay on canvas
     */
    public static draw(ctx: CanvasRenderingContext2D, stats: {
        enemies: number;
        towers: number;
        projectiles: number;
        effects: number;
    }): void {
        if (!this.enabled) return;

        const x = 10;
        const y = 10;
        const lineHeight = 14;

        ctx.save();

        // Background - taller to fit more stats
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(x - 5, y - 5, 180, lineHeight * 9 + 10);

        // FPS color based on performance
        let fpsColor = '#0f0'; // Green
        if (this.fps < 45) fpsColor = '#ff0'; // Yellow
        if (this.fps < 30) fpsColor = '#f00'; // Red

        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';

        // FPS + 1% Low
        ctx.fillStyle = fpsColor;
        ctx.fillText(`FPS: ${this.fps} | 1%Low: ${this.onePercentLowFps}`, x, y + lineHeight);

        // Frame time + Worst
        ctx.fillStyle = this.worstFrameTime > 50 ? '#f44' : '#8f8';
        ctx.fillText(`Frame: ${this.getAvgFrameTime().toFixed(1)}ms | Max: ${this.worstFrameTime.toFixed(0)}ms`, x, y + lineHeight * 2);

        // Spike indicator
        const timeSinceSpike = performance.now() - this.lastSpikeTime;
        if (timeSinceSpike < 1000) {
            ctx.fillStyle = '#f44';
            ctx.fillText(`⚠️ SPIKE! (${this.spikeCount} total)`, x, y + lineHeight * 3);
        } else {
            ctx.fillStyle = '#666';
            ctx.fillText(`Spikes: ${this.spikeCount}`, x, y + lineHeight * 3);
        }

        // Entity counts
        ctx.fillStyle = '#8f8';
        ctx.fillText(`Enemies: ${stats.enemies}`, x, y + lineHeight * 4);
        ctx.fillText(`Towers: ${stats.towers}`, x, y + lineHeight * 5);
        ctx.fillText(`Projectiles: ${stats.projectiles}`, x, y + lineHeight * 6);
        ctx.fillText(`Effects: ${stats.effects}`, x, y + lineHeight * 7);

        // Memory (if available)
        const mem = (performance as any).memory;
        if (mem) {
            const usedMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(1);
            const totalMB = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
            ctx.fillStyle = '#88f';
            ctx.fillText(`Mem: ${usedMB}MB / ${totalMB}MB`, x, y + lineHeight * 8);
        }

        // Profile indicator
        if (this.profiling) {
            ctx.fillStyle = '#f00';
            ctx.fillText('● PROFILING', x, y + lineHeight * 9);
        }

        ctx.restore();
    }

    /**
     * Get advanced statistics for DevConsole
     */
    public static getAdvancedStats(): {
        fps: number;
        avgFrameTime: number;
        worstFrameTime: number;
        onePercentLow: number;
        spikeCount: number;
        minFps: number;
        peakFps: number;
        memoryMB: number | null;
    } {
        const mem = (performance as any).memory;
        return {
            fps: this.fps,
            avgFrameTime: this.getAvgFrameTime(),
            worstFrameTime: this.worstFrameTime,
            onePercentLow: this.onePercentLowFps,
            spikeCount: this.spikeCount,
            minFps: this.minFps,
            peakFps: this.peakFps,
            memoryMB: mem ? mem.usedJSHeapSize / 1024 / 1024 : null
        };
    }

    /**
     * Reset spike counter only (for fresh measurement sessions)
     */
    public static resetSpikes(): void {
        this.spikeCount = 0;
        this.worstFrameTime = 0;
    }

    /**
     * Reset all metrics
     */
    public static reset(): void {
        this.frameCount = 0;
        this.fpsTimer = performance.now();
        this.lastFrameTime = performance.now();
        this.fps = 0;
        this.frameTimes.fill(0); // PERF: Reset ring buffer in-place
        this.frameIndex = 0;
        this.frameCount60 = 0;
        this.peakFps = 0;
        this.minFps = 999;
        this.profileData = [];
        this.worstFrameTime = 0;
        this.spikeCount = 0;
        this.onePercentLowFps = 60;
    }
}

