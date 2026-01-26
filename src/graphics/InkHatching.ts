import { INK_CONFIG } from './InkConfig';

/**
 * Generates hatching (shading) patterns for objects.
 * Caches complex patterns to avoid per-frame generation.
 */
export class InkHatching {
    private static cache: Map<string, HTMLCanvasElement> = new Map();

    /**
     * Draws basic diagonal hatching (for shadows).
     * @param ctx - Canvas context
     * @param x - Top left X
     * @param y - Top left Y
     * @param w - Width
     * @param h - Height
     * @param density - Pixel spacing between lines
     * @param angle - Radians
     */
    static drawHatching(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, density: number = 4) {
        ctx.save();
        ctx.beginPath();
        // Clipping region is assumed to be set by caller before calling this, 
        // OR we just draw a rect of hatching.
        // Usually, you clip to a circle/shape, then call this.

        ctx.strokeStyle = INK_CONFIG.PALETTE.SHADOW;
        ctx.lineWidth = 1;

        // Simple 45 degree lines
        for (let i = -h; i < w; i += density) {
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i + h, y + h);
        }
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Generates a circular shadow layer with dynamic hatching based on light direction.
     * @param radius - Size of the circle
     * @param lightAngle - Direction of light (in radians)
     */
    static getCircularHatching(radius: number, lightAngle: number): HTMLCanvasElement {
        // Cache key based on radius and rough angle (quantized to 8 directions for efficiency)
        const angleStep = Math.PI / 4;
        const quantizedAngle = Math.round(lightAngle / angleStep) * angleStep;
        const key = `circle_${radius}_${quantizedAngle}`;

        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }

        // Create cached canvas
        const size = radius * 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const Cx = radius;
        const Cy = radius;

        // 1. Define Shadow Area (Crescent)
        // Everything opposite to light
        const shadowDir = lightAngle + Math.PI;

        ctx.save();
        ctx.beginPath();
        ctx.arc(Cx, Cy, radius, 0, Math.PI * 2);
        ctx.clip(); // Clip to circle

        // Draw hatching lines
        ctx.strokeStyle = INK_CONFIG.PALETTE.SHADOW;
        ctx.lineWidth = 1;

        // Rotate context to align with shadow direction for easier math
        // Actually, let's keep it simple: Draw lines perpendicular to shadow dir?
        // Standard cross-hatching is usually diagonal relative to page, not object.
        // Let's stick to standard 45 deg page-relative hatching for consistency.

        // We need to mask the "lit" side.
        // Simple dot product check? or a gradient mask?

        // Let's use a gradient opacity mask for smooth shadow falloff!
        const grad = ctx.createLinearGradient(
            Cx + Math.cos(lightAngle) * radius,
            Cy + Math.sin(lightAngle) * radius,
            Cx + Math.cos(shadowDir) * radius,
            Cy + Math.sin(shadowDir) * radius
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');   // Lit side - transparent
        grad.addColorStop(0.3, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');   // Shadow side - opaque

        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillRect(0, 0, size, size);

        // Now we have a gradient alpha mask. We want lines ONLY where alpha is high.
        // "source-in" keeps the source (new drawing) only where destination (existing gradient) is opaque.
        ctx.globalCompositeOperation = 'source-in';

        // Draw infinite hatching over the rect
        ctx.beginPath();
        const density = 4;
        for (let i = -size; i < size * 2; i += density) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i - size, size); // 135 deg slant
        }
        ctx.stroke();

        ctx.restore();

        this.cache.set(key, canvas);
        return canvas;
    }

    static clearCache() {
        this.cache.clear();
    }
}
