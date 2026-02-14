/**
 * Deterministic Random Number Generator using Mulberry32 algorithm.
 * Fast, lightweight, and suitable for game logic stability.
 */
export class Rng {
    private state: number;

    constructor(seed: number) {
        // Ensure seed is a 32-bit integer
        this.state = seed >>> 0;
    }

    /**
     * Returns a float between 0 (inclusive) and 1 (exclusive).
     */
    public next(): number {
        this.state = (this.state + 0x6D2B79F5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Alias for next()
     */
    public nextFloat(): number {
        return this.next();
    }

    /**
     * Returns an integer between min (inclusive) and max (inclusive).
     */
    public nextInt(min: number, max: number): number {
        return Math.floor(min + this.next() * (max - min + 1));
    }

    /**
     * Shuffles an array in-place using Fisher-Yates algorithm.
     */
    public shuffle<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Returns true with probability p (0-1).
     */
    public chance(p: number): boolean {
        return this.next() < p;
    }
}
