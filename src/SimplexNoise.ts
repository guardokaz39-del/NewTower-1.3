/**
 * Simple Simplex Noise implementation for fog animation
 * Based on Stefan Gustavson's SimplexNoise
 */
export class SimplexNoise {
    private perm: number[] = [];
    private grad3: number[][] = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    constructor(seed: number = Math.random()) {
        // Initialize permutation table with seed
        const p: number[] = [];
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }

        // Shuffle using seed-based random
        let n, q;
        for (let i = 255; i > 0; i--) {
            seed = (seed * 9301 + 49297) % 233280;
            n = Math.floor((seed / 233280.0) * (i + 1));
            q = p[i];
            p[i] = p[n];
            p[n] = q;
        }

        // Extend to 512 for wrapping
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
    }

    private dot(g: number[], x: number, y: number): number {
        return g[0] * x + g[1] * y;
    }

    /**
     * 2D Simplex Noise
     * @param x X coordinate
     * @param y Y coordinate
     * @returns value between -1 and 1
     */
    public noise2D(x: number, y: number): number {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

        // Skew the input space
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);

        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        // Determine simplex
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        // Hash coordinates
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

        // Calculate contributions
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        let n0 = 0.0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        let n1 = 0.0;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        let n2 = 0.0;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }

        // Sum and scale to [-1, 1]
        return 70.0 * (n0 + n1 + n2);
    }
}
