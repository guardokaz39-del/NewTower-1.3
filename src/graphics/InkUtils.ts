import { INK_CONFIG } from './InkConfig';

export class InkUtils {
    /**
     * Draws a line that "wobbles" organically.
     * @param ctx Canvas Context
     * @param x1 Start X
     * @param y1 Start Y
     * @param x2 End X
     * @param y2 End Y
     * @param time Global time for animation (optional, defaults to 0 for static)
     */
    static drawWobbleLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, time: number = 0) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.ceil(dist / INK_CONFIG.WOBBLE.SEGMENT_LENGTH);

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const tx = x1 + (x2 - x1) * t;
            const ty = y1 + (y2 - y1) * t;

            // Simple noise simulation using sine waves
            // In a real AA production, we might use Perlin Noise, but this is efficient
            const offset = Math.sin(t * 10 + time * INK_CONFIG.WOBBLE.FREQUENCY)
                * Math.cos(t * 5 + time * 0.5)
                * INK_CONFIG.WOBBLE.AMPLITUDE;

            // Perpendicular vector for offset
            const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
            const ox = Math.cos(angle) * offset;
            const oy = Math.sin(angle) * offset;

            ctx.lineTo(tx + ox, ty + oy);
        }

        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /**
     * Draws a rough circle/blob outline
     */
    static drawWobbleCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number = 0) {
        const steps = 12; // Number of points
        ctx.beginPath();

        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;

            // Wobble radius
            const rOffset = Math.sin(angle * 3 + time * INK_CONFIG.WOBBLE.FREQUENCY) * INK_CONFIG.WOBBLE.AMPLITUDE;
            const r = radius + rOffset;

            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * Simulates watercolor fill
     */
    static drawWatercolorFill(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;

        // Base blob
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Second uneven layer for "pooling" effect
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x + 2, y + 3, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draws a dynamic ink splat
     */
    static drawInkSplat(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, time: number = 0) {
        ctx.save();
        ctx.fillStyle = color;

        const numBlobs = 5;
        const baseRadius = radius * 0.6;

        ctx.beginPath();
        // Central sloppy circle
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);

        // Random droplets around
        // Use pseudo-random based on position to keep it deterministic per frame if needed, 
        // or let it jitter if time is used.
        for (let i = 0; i < numBlobs; i++) {
            const angle = (i / numBlobs) * Math.PI * 2 + time;
            const dist = radius * (0.8 + Math.sin(i * 132 + x) * 0.3);
            const r = baseRadius * (0.4 + Math.cos(i * 23 + y) * 0.2);

            ctx.moveTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
            ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, r, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
    /**
     * Draws a polygon with wobbly lines
     */
    static drawSketchPoly(ctx: CanvasRenderingContext2D, points: { x: number, y: number }[], close: boolean = true, time: number = 0) {
        if (points.length < 2) return;

        for (let i = 0; i < points.length; i++) {
            if (i === points.length - 1 && !close) break;

            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            this.drawWobbleLine(ctx, p1.x, p1.y, p2.x, p2.y, time);
        }
    }
}
