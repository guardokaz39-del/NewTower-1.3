/**
 * PerformanceMonitor - Real-time FPS and metrics tracking
 * @performance Lightweight overlay for debugging performance issues
 */
export class PerformanceMonitor {
    private static enabled = false;
    private static frameCount = 0;
    private static fpsTimer = performance.now(); // For FPS calculation (per second)
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
    private static worstFrameTime = 0; // Max frame time in current session
    private static spikeCount = 0; // Frames > 33ms (below 30 FPS)
    private static lastSpikeTime = 0; // When last spike occurred
    private static onePercentLowFps = 60; // 1% low FPS (worst 1%)

    // Custom Timers & Counters (Per Frame)
    private static timers: Map<string, number> = new Map();
    private static metrics: Map<string, number> = new Map();
    private static timerStartTimes: Map<string, number> = new Map();

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
        if (frameDelta > 33.33) {
            // Below 30 FPS
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

        // Reset per-frame metrics
        this.metrics.clear();
        this.timers.clear();
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
            entities: entityCount,
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
    /**
     * Draw overlay on canvas (Smart HUD)
     * Layout:
     * FPS: 45 (Min: 19) | Frame: 22.2ms 🔴 (Budget: 16.6ms)
     * -----------------------------------------------------
     * CPU (Logic):  18.5ms 🔴
     *    ├─ Pathfinding: 12.0ms (200 calls)
     *    ├─ Collision:    4.2ms (Checks: 4500)
     *    ├─ Entities:     2.1ms (Update: 350)
     *
     * GPU (Render):  3.5ms 🟢
     *    ├─ Main:         3.0ms
     */
    public static draw(
        ctx: CanvasRenderingContext2D,
        stats: {
            enemies: number;
            towers: number;
            projectiles: number;
            effects: number;
        },
    ): void {
        if (!this.enabled) return;

        const x = 10;
        const y = 10;
        const lineHeight = 14;
        const width = 260; // Wider for detailed info
        const height = 240;

        ctx.save();
        ctx.font = 'bold 12px monospace';

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(x - 5, y - 5, width, height);

        // --- HEADER ---
        let currentY = y + lineHeight;

        // FPS Colors
        const fpsColor = this.fps < 30 ? '#f00' : this.fps < 50 ? '#ff0' : '#0f0';
        const budgetColor = this.getAvgFrameTime() > 16.6 ? '#f00' : '#0f0';

        ctx.fillStyle = fpsColor;
        ctx.fillText(`FPS: ${this.fps} (Min: ${this.minFps})`, x, currentY);

        ctx.fillStyle = budgetColor;
        const frameTimeStr = `Frame: ${this.getAvgFrameTime().toFixed(1)}ms`;
        const budgetStr = `(Limit: 16.6ms)`;
        const frameTextWidth = ctx.measureText(frameTimeStr).width;
        ctx.fillText(frameTimeStr, x + 120, currentY);

        ctx.fillStyle = '#888';
        ctx.fillText(budgetStr, x + 120 + frameTextWidth + 5, currentY);

        currentY += 8;
        ctx.fillStyle = '#444';
        ctx.fillRect(x, currentY, width - 10, 1); // Separator
        currentY += lineHeight + 5;

        // --- CPU (LOGIC) ---
        const logicTime = this.timers.get('Logic') || 0;
        const logicColor = logicTime > 10 ? '#f44' : '#8f8'; // Warn if logic > 10ms (leaving 6ms for render)

        ctx.fillStyle = logicColor;
        ctx.fillText(`CPU (Logic):  ${logicTime.toFixed(1)}ms ${logicTime > 10 ? '🔴' : '🟢'}`, x, currentY);
        currentY += lineHeight;

        // Sub-systems
        this.drawSubMetric(ctx, x, currentY, 'Pathfinding', 'PathCalls', 'calls');
        currentY += lineHeight;
        this.drawSubMetric(ctx, x, currentY, 'Collision', 'CollisionChecks', 'checks');
        currentY += lineHeight;
        this.drawSubMetric(ctx, x, currentY, 'Entities', 'EntityCount', 'active'); // Helper method needed? Or just inline?
        currentY += lineHeight;
        this.drawSubMetric(ctx, x, currentY, 'Projectiles', null, '');
        currentY += lineHeight;
        // Check for Spawn spikes
        const spawnTime = this.timers.get('Spawn') || 0;
        if (spawnTime > 1.0) {
            ctx.fillStyle = '#f88';
            ctx.fillText(`   ├─ Spawn:      ${spawnTime.toFixed(1)}ms ⚠️`, x, currentY);
            currentY += lineHeight;
        } else {
            currentY += 5; // spacing
        }

        // --- GPU (RENDER) ---
        const renderTime = this.timers.get('Render') || 0;
        const renderColor = renderTime > 10 ? '#f44' : '#8f8';

        ctx.fillStyle = renderColor;
        ctx.fillText(`GPU (Render): ${renderTime.toFixed(1)}ms ${renderTime > 10 ? '🔴' : '🟢'}`, x, currentY);
        currentY += lineHeight;

        this.drawSubMetric(ctx, x, currentY, 'RenderEntities', null, ''); // render entities
        currentY += lineHeight;

        // Entity Counts
        ctx.fillStyle = '#8f8';
        ctx.fillText(`   ├─ Particles: ${stats.effects}`, x, currentY);
        currentY += lineHeight + 5;

        // --- MEMORY ---
        const mem = (performance as any).memory;
        if (mem) {
            const usedMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(1);
            const totalMB = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
            ctx.fillStyle = '#88f';
            ctx.fillText(`Memory: ${usedMB} MB / ${totalMB} MB`, x, currentY);
            currentY += lineHeight;
        }

        // Pools (Visual estimate)
        ctx.fillStyle = '#888';
        ctx.fillText(`Enemies: ${stats.enemies} | Proj: ${stats.projectiles}`, x, currentY);

        ctx.restore();
    }

    private static drawSubMetric(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        timerName: string,
        countName: string | null,
        countLabel: string,
    ) {
        const time = this.timers.get(timerName) || 0;
        const count = countName ? this.metrics.get(countName) || 0 : null;

        ctx.fillStyle = '#ccc';
        let text = `   ├─ ${timerName}: ${time.toFixed(1)}ms`;
        if (count !== null) {
            text += ` (${count} ${countLabel})`;
            // Highlight high counts
            if (count > 1000) ctx.fillStyle = '#f88';
        }
        ctx.fillText(text, x, y);
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
            memoryMB: mem ? mem.usedJSHeapSize / 1024 / 1024 : null,
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
        this.metrics.clear();
        this.timers.clear();
    }

    /**
     * Start a named timer
     */
    public static startTimer(label: string): void {
        if (!this.enabled) return;
        this.timerStartTimes.set(label, performance.now());
    }

    /**
     * End a named timer and add to the cumulative time for this frame
     */
    public static endTimer(label: string): void {
        if (!this.enabled) return;
        const startTime = this.timerStartTimes.get(label);
        if (startTime !== undefined) {
            const duration = performance.now() - startTime;
            const current = this.timers.get(label) || 0;
            this.timers.set(label, current + duration);
        }
    }

    /**
     * Increment a named counter
     */
    public static addCount(label: string, value: number = 1): void {
        if (!this.enabled) return;
        const current = this.metrics.get(label) || 0;
        this.metrics.set(label, current + value);
    }

    /**
     * Get value of a timer (ms)
     */
    public static getTimer(label: string): number {
        return this.timers.get(label) || 0;
    }

    /**
     * Get value of a metric
     */
    public static getMetric(label: string): number {
        return this.metrics.get(label) || 0;
    }
}
