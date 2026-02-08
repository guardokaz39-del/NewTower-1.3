/**
 * PerformanceMonitor - Real-time FPS and metrics tracking
 * @performance Lightweight overlay for debugging performance issues
 */
export class PerformanceMonitor {
    private static enabled = false;
    private static frameCount = 0;
    private static lastTime = performance.now();
    private static fps = 0;
    private static frameTimes: number[] = [];
    private static maxFrameTimes = 60;

    // Metrics
    private static peakFps = 0;
    private static minFps = 999;
    private static profiling = false;
    private static profileData: { timestamp: number; fps: number; entities: number }[] = [];

    /**
     * Call this at the start of each frame
     */
    public static beginFrame(): void {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastTime;

        if (this.frameTimes.length >= this.maxFrameTimes) {
            this.frameTimes.shift();
        }
        this.frameTimes.push(delta);

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastTime = now;

            // Track min/max
            if (this.fps > this.peakFps) this.peakFps = this.fps;
            if (this.fps < this.minFps && this.fps > 0) this.minFps = this.fps;
        }
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
        if (this.frameTimes.length === 0) return 0;
        const sum = this.frameTimes.reduce((a, b) => a + b, 0);
        return sum / this.frameTimes.length;
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

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 5, y - 5, 140, lineHeight * 6 + 10);

        // FPS color based on performance
        let fpsColor = '#0f0'; // Green
        if (this.fps < 45) fpsColor = '#ff0'; // Yellow
        if (this.fps < 30) fpsColor = '#f00'; // Red

        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';

        // FPS
        ctx.fillStyle = fpsColor;
        ctx.fillText(`FPS: ${this.fps} (${this.getAvgFrameTime().toFixed(1)}ms)`, x, y + lineHeight);

        // Entity counts
        ctx.fillStyle = '#8f8';
        ctx.fillText(`Enemies: ${stats.enemies}`, x, y + lineHeight * 2);
        ctx.fillText(`Towers: ${stats.towers}`, x, y + lineHeight * 3);
        ctx.fillText(`Projectiles: ${stats.projectiles}`, x, y + lineHeight * 4);
        ctx.fillText(`Effects: ${stats.effects}`, x, y + lineHeight * 5);

        // Profile indicator
        if (this.profiling) {
            ctx.fillStyle = '#f00';
            ctx.fillText('● PROFILING', x, y + lineHeight * 6);
        }

        ctx.restore();
    }

    /**
     * Reset all metrics
     */
    public static reset(): void {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameTimes = [];
        this.peakFps = 0;
        this.minFps = 999;
        this.profileData = [];
    }
}
