import { SimplexNoise } from './SimplexNoise';

/**
 * Procedural Pattern Generation Library
 * Provides algorithms for creating organic and technical textures
 * Used by Assets.ts for layered texture generation
 */
export class ProceduralPatterns {
    private static noise = new SimplexNoise();

    /**
     * Perlin Noise overlay (uses existing SimplexNoise)
     * Adds subtle texture variation to surfaces
     */
    static perlinNoise(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        scale: number = 0.05,
        opacity: number = 0.1
    ): void {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const value = this.noise.noise2D(x * scale, y * scale); // -1 to 1
                const brightness = Math.floor(value * 25); // -25 to 25

                const idx = (y * width + x) * 4;
                // Darken/lighten based on noise
                data[idx] = Math.max(0, Math.min(255, data[idx] + brightness));     // R
                data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + brightness)); // G
                data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + brightness)); // B
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Organic Veins (Dark Fantasy)
     * Draws wandering lines like roots or cracks
     */
    static organicVeins(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        density: number = 0.3,
        seed: number = 0
    ): void {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        const veinCount = Math.floor(width * height * density / 1000);

        for (let i = 0; i < veinCount; i++) {
            // Pseudo-random based on seed + index
            const s = seed + i * 137;

            // Simple deterministic random function for this scope
            const rnd = (mod: number) => {
                const x = Math.sin(s + mod) * 10000;
                return x - Math.floor(x);
            };

            let x = rnd(1) * width;
            let y = rnd(2) * height;
            let angle = rnd(3) * Math.PI * 2;

            ctx.beginPath();
            ctx.moveTo(x, y);

            // Wandering path
            const steps = 15 + Math.floor(rnd(4) * 10);
            for (let step = 0; step < steps; step++) {
                angle += (rnd(step * 5) - 0.5) * 0.6; // Slight turns
                x += Math.cos(angle) * 3;
                y += Math.sin(angle) * 3;

                // Keep within bounds
                if (x < 0 || x > width || y < 0 || y > height) break;

                ctx.lineTo(x, y);
            }

            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Voronoi Grid (Techno)
     * Creates cell-like patterns mimicking circuits/microchips
     */
    static voronoiGrid(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        cellCount: number = 10
    ): void {
        // Generate random points
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < cellCount; i++) {
            points.push({
                x: Math.random() * width,
                y: Math.random() * height
            });
        }

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // For each pixel, find closest point
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let minDist = Infinity;
                let closestIdx = 0;

                for (let i = 0; i < points.length; i++) {
                    const dist = Math.hypot(points[i].x - x, points[i].y - y);
                    if (dist < minDist) {
                        minDist = dist;
                        closestIdx = i;
                    }
                }

                // Color by cell index
                const idx = (y * width + x) * 4;
                const shade = 30 + (closestIdx % 5) * 15; // Subtle variation
                data[idx] = Math.max(0, Math.min(255, data[idx] + shade));
                data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + shade));
                data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + shade));
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Draw cell borders
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;

        for (let y = 0; y < height; y += 2) { // Sample every 2 pixels for performance
            for (let x = 0; x < width - 1; x++) {
                let minDist1 = Infinity, minDist2 = Infinity;
                let closest1 = 0, closest2 = 0;

                // Find closest point for current and next pixel
                for (let i = 0; i < points.length; i++) {
                    const dist1 = Math.hypot(points[i].x - x, points[i].y - y);
                    const dist2 = Math.hypot(points[i].x - (x + 1), points[i].y - y);

                    if (dist1 < minDist1) {
                        minDist1 = dist1;
                        closest1 = i;
                    }
                    if (dist2 < minDist2) {
                        minDist2 = dist2;
                        closest2 = i;
                    }
                }

                // Draw border if different cells
                if (closest1 !== closest2) {
                    ctx.beginPath();
                    ctx.moveTo(x + 0.5, y);
                    ctx.lineTo(x + 0.5, y + 1);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }

    /**
     * Bioluminescent Spots (Dark Fantasy accent)
     * Adds glowing spots using deterministic seed
     */
    static biolumSpots(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        color: string,
        density: number = 0.2,
        seed: number = 0
    ): void {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowBlur = 3;  // Reduced from 8 for subtler glow
        ctx.shadowColor = color;

        // Deterministic spot placement (замечание аналитика #3!)
        const spotCount = Math.floor(width * height * density / 1000);

        for (let i = 0; i < spotCount; i++) {
            // Pseudo-random но детерминированный
            const pseudoX = ((seed + i) * 73) % width;
            const pseudoY = ((seed + i) * 137) % height;
            const size = 0.5 + ((seed + i) % 2) * 0.5;  // Reduced from 1-3px to 0.5-1.5px

            ctx.beginPath();
            ctx.arc(pseudoX, pseudoY, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
