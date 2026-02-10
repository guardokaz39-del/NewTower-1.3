/**
 * Simple Linear Congruential Generator (LCG) for deterministic randomness.
 * Allows reproducible stress tests.
 */
export class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    /**
     * Returns a float between 0 and 1
     */
    public next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    /**
     * Returns float between min and max
     */
    public rangeFloat(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /**
     * Returns integer between min and max (inclusive min, inclusive max)
     */
    public range(min: number, max: number): number {
        return Math.floor(min + this.next() * (max - min + 1));
    }

    /**
     * Returns true with probability p (0-1)
     */
    public chance(p: number): boolean {
        return this.next() < p;
    }
}
