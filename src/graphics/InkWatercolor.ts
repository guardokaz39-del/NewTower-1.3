import { INK_CONFIG } from './InkConfig';

/**
 * Handles watercolor "wash" effects.
 * Simulates liquid paint spreading on paper with irregular edges.
 */
export class InkWatercolor {

    /**
     * Draws a rectangular wash effect (e.g. for tiles).
     * @param ctx Context to draw on
     * @param x Top-left x
     * @param y Top-left y
     * @param w Width
     * @param h Height
     * @param color Base color string (hex or rgba)
     * @param seed Random seed for edge variation
     */
    static drawRectWash(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, seed: number) {
        const layers = INK_CONFIG.WATERCOLOR.LAYERS;
        const opacity = INK_CONFIG.WATERCOLOR.OPACITY_LOW;
        const spread = INK_CONFIG.WATERCOLOR.SPREAD;

        // Convert strict hex to rgba with low opacity if needed, 
        // but it's easier to just use globalAlpha with the passed color.

        ctx.save();
        ctx.fillStyle = color;

        // Use multiply blend for "soaking in" effect
        ctx.globalCompositeOperation = 'multiply';

        for (let i = 0; i < layers; i++) {
            ctx.globalAlpha = opacity;

            // Each layer is slightly offset and has different noise
            const layerSeed = seed + i * 132;
            this.drawBlob(ctx, x, y, w, h, spread, layerSeed);
        }

        ctx.restore();
    }

    /**
     * Draws a single organic blob roughly fitting the rect
     */
    private static drawBlob(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spread: number, seed: number) {
        ctx.beginPath();

        // We'll draw a polygon with randomized points around the perimeter
        const points = [];
        const steps = 8; // Number of points per side roughly

        // Top
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const nx = x + w * t;
            const ny = y + (Math.sin(t * 10 + seed) * spread * 0.5) - (Math.random() * spread * 0.5);
            points.push({ x: nx, y: ny });
        }
        // Right
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const nx = x + w + (Math.cos(t * 10 + seed) * spread * 0.5) + (Math.random() * spread * 0.5);
            const ny = y + h * t;
            points.push({ x: nx, y: ny });
        }
        // Bottom
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const nx = x + w - (w * t); // going back
            const ny = y + h + (Math.sin(t * 12 + seed) * spread * 0.5) + (Math.random() * spread * 0.5);
            points.push({ x: nx, y: ny });
        }
        // Left
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const nx = x - (Math.cos(t * 8 + seed) * spread * 0.5) - (Math.random() * spread * 0.5);
            const ny = y + h - (h * t); // going up
            points.push({ x: nx, y: ny });
        }

        if (points.length > 0) {
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                // Use quadratic curves for smoother liquid look
                const p = points[i];
                const prev = points[i - 1];
                const midX = (prev.x + p.x) / 2;
                const midY = (prev.y + p.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
            ctx.closePath();
        }

        ctx.fill();
    }
}
