import { CONFIG } from '../Config';
import { InkUtils } from '../graphics/InkUtils';
import { INK_CONFIG } from '../graphics/InkConfig';
import { ObjectType } from '../ObjectRenderer';

export class InkDecorRenderer {

    static draw(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, size: number = 1) {
        const TS = CONFIG.TILE_SIZE;
        const centerX = x + (TS * size) / 2;
        const centerY = y + (TS * size) / 2;
        const seed = x * 101 + y * 73; // Deterministic seed

        ctx.save();
        ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 1.5;

        // Add subtle constant wobble for "alive" feel
        const time = Date.now() * 0.001;

        if (type === 'tree') {
            this.drawTree(ctx, centerX, y + TS, seed, time);
        } else if (type === 'rock' || type === 'stone') {
            this.drawRock(ctx, centerX, centerY, size * TS, seed);
        } else if (type === 'wheat') {
            this.drawWheat(ctx, x, y, TS, seed, time);
        } else if (type === 'flowers') {
            this.drawFlowers(ctx, x, y, TS, seed, time);
        }

        ctx.restore();
    }

    private static drawTree(ctx: CanvasRenderingContext2D, x: number, bottomY: number, seed: number, time: number) {
        // STYLE: Architectural Sketch / Minimalist
        // Simple distinct trunk line, loose minimal loop for foliage.

        const trunkHeight = 20 + (seed % 10);

        ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#fff';

        // 1. Trunk: Single clean stroke (slightly thicker at bottom)
        ctx.beginPath();
        ctx.moveTo(x, bottomY);
        // Slight curve
        const bend = (seed % 5) - 2;
        ctx.quadraticCurveTo(x + bend, bottomY - trunkHeight / 2, x, bottomY - trunkHeight);
        ctx.stroke();

        // 2. Foliage: "Cloud on a stick" - Minimalist loop
        // Instead of many circles, one or two loose "sketchy" circles
        const radius = 14 + (seed % 6);
        const topY = bottomY - trunkHeight;

        ctx.beginPath();
        // Main foliage circle (wobbly but singular)
        InkUtils.drawWobbleCircle(ctx, x, topY - radius / 2, radius, 0);

        // Optional second offset circle for variety (50% chance)
        if (seed % 2 === 0) {
            InkUtils.drawWobbleCircle(ctx, x + (radius * 0.4), topY - radius * 0.2, radius * 0.7, 0);
        }

        // No fill, just outline, or maybe a very light hatch at the bottom of foliage
        // Hatching (Shadow side)
        ctx.lineWidth = 1;
        ctx.beginPath();
        const hatchY = topY + radius / 4;
        ctx.moveTo(x - radius / 2, hatchY);
        ctx.lineTo(x, hatchY + 5);
        ctx.stroke();
    }

    private static drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, diameter: number, seed: number) {
        // STYLE: Zen Garden Rock / Schematic
        // Less vertices, smoother but angular.

        const radius = diameter * 0.3;
        ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#fff'; // Paper inside

        ctx.beginPath();
        // 5-6 points for a simple stone shape
        const points = 5 + (seed % 2);
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            // Less random variance for cleaner look
            const r = radius + ((seed * (i + 1) * 13) % 4) - 2;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r * 0.8; // Flattened slightly
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill(); // Fill white to hide ground lines behind
        ctx.stroke();

        // Minimal hatching (just 2-3 lines on one side)
        ctx.lineWidth = 1;
        ctx.beginPath();
        const side = (seed % 2 === 0) ? 1 : -1;
        for (let i = 0; i < 3; i++) {
            const lx = x + (i * 3) * side;
            ctx.moveTo(lx, y + radius * 0.2);
            ctx.lineTo(lx, y + radius * 0.6);
        }
        ctx.stroke();
    }

    private static drawWheat(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number, time: number) {
        // Minimal vertical strokes
        const count = 3 + (seed % 3);
        const sway = Math.sin(time + seed) * 2;

        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const ox = x + size / 2 + ((seed * i * 7) % 20) - 10;
            const oy = y + size - 5;
            const h = 10 + ((seed * i) % 5);

            ctx.moveTo(ox, oy);
            ctx.lineTo(ox + sway, oy - h);
        }
        ctx.stroke();
    }

    private static drawFlowers(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number, time: number) {
        // Just small dots
        const count = 3 + (seed % 4);
        ctx.fillStyle = INK_CONFIG.PALETTE.INK; // Black dots like stiffle

        for (let i = 0; i < count; i++) {
            const fx = x + size / 2 + ((seed * i * 17) % 24) - 12;
            const fy = y + size / 2 + ((seed * i * 29) % 24) - 12;

            ctx.beginPath();
            ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); // Tiny dots
            ctx.fill();
        }
    }
}
