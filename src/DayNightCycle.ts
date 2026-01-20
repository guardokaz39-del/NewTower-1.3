/**
 * Day/Night cycle system - simple and configurable
 */
export interface IDayNightConfig {
    cycleDuration: number; // seconds for full cycle
    startTime: number; // 0-1, where to start (0=dawn, 0.5=dusk, 1=midnight)
}

export class DayNightCycle {
    private time: number = 0; // 0-1
    private config: IDayNightConfig;

    constructor(config?: Partial<IDayNightConfig>) {
        this.config = {
            cycleDuration: 240, // 4 minutes default (was reduced from original by 30%)
            startTime: 0.15, // Start closer to dawn for brighter initial lighting
            ...config
        };

        this.time = this.config.startTime;
    }

    /**
     * Update the cycle
     * @param deltaTime - time in seconds since last update
     */
    public update(deltaTime: number): void {
        const increment = deltaTime / this.config.cycleDuration;
        this.time = (this.time + increment) % 1;
    }

    /**
     * Get current time of day
     * @returns 0-1 value (0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight, 1=dawn again)
     */
    public getTimeOfDay(): number {
        return this.time;
    }

    /**
     * Check if it's currently day time
     */
    public isDay(): boolean {
        return this.time < 0.5;
    }

    /**
     * Check if it's currently night time
     */
    public isNight(): boolean {
        return this.time >= 0.5;
    }

    /**
     * Set time manually (for testing/debugging)
     */
    public setTime(time: number): void {
        this.time = Math.max(0, Math.min(1, time));
    }

    /**
     * Get human-readable time string
     */
    public getTimeString(): string {
        if (this.time < 0.25) return 'Morning';
        if (this.time < 0.5) return 'Afternoon';
        if (this.time < 0.75) return 'Evening';
        return 'Night';
    }

    /**
     * Update configuration at runtime
     */
    public updateConfig(newConfig: Partial<IDayNightConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}
