/**
 * PerformanceProfiler - Granular code instrumentation
 * Optimized for zero-allocation during runtime to avoid GC noise.
 */
export class PerformanceProfiler {
    private static enabled = false;
    private static readonly forceEnableViaFlag =
        (globalThis as any).ENABLE_STRESS_PROFILING === true ||
        ((import.meta as any).env?.VITE_ENABLE_STRESS_PROFILING === 'true');
    private static startTimes = new Map<string, number>();
    private static durations = new Map<string, number>();
    private static counts = new Map<string, number>();

    // Sampling strategy: only measure every Nth frame
    private static readonly SAMPLE_RATE = 5;
    private static frameCount = 0;
    private static isActiveFrame = false;

    public static enable(forceForStressTest: boolean = false) {
        if (!forceForStressTest && !this.forceEnableViaFlag) {
            return;
        }
        this.enabled = true;
        this.reset();
    }

    public static reset() {
        this.startTimes.clear();
        this.durations.clear();
        this.counts.clear();
        this.frameCount = 0;
        this.isActiveFrame = false;
    }

    public static disable() {
        this.enabled = false;
    }

    public static beginFrame() {
        if (!this.enabled) return;

        this.frameCount++;
        this.isActiveFrame = this.frameCount % this.SAMPLE_RATE === 0;

        if (this.isActiveFrame) {
            // Clear maps without allocating new ones if possible,
            // but Map.clear() is efficient enough.
            this.durations.clear();
            this.counts.clear();
            this.startTimes.clear();
        }
    }

    public static start(label: string) {
        if (!this.enabled || !this.isActiveFrame) return;
        this.startTimes.set(label, performance.now());
    }

    public static end(label: string) {
        if (!this.enabled || !this.isActiveFrame) return;

        const startTime = this.startTimes.get(label);
        if (startTime === undefined) return;

        const duration = performance.now() - startTime;
        const currentTotal = this.durations.get(label) || 0;
        this.durations.set(label, currentTotal + duration);
    }


    public static inc(label: string, value: number = 1) {
        if (!this.enabled || !this.isActiveFrame) return;

        const current = this.counts.get(label) || 0;
        this.counts.set(label, current + value);
    }

    public static getFrameData(): Record<string, number> {
        // Return 0s if not active frame, or return cached last frame data?
        // For simplicity, we return the current map as object.
        // In a strict zero-alloc system we wouldn't return an object,
        // but for reporting we need to serialize eventually.
        const result: Record<string, number> = {};

        // Return 0 if we skipped this frame (or maybe return null/empty)
        if (!this.isActiveFrame) return result;

        this.durations.forEach((val, key) => {
            result[key] = val;
        });
        this.counts.forEach((val, key) => {
            result[key] = (result[key] || 0) + val;
        });
        return result;
    }
}
