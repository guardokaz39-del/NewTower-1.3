import { VISUALS } from '../VisualConfig';
import { CONFIG } from '../Config';

export class TileRenderers {
    public static drawWaterFrame(ctx: CanvasRenderingContext2D, w: number, h: number, bitmask: number, frame: number) {
        // Base deep water
        ctx.fillStyle = '#1e88e5'; // Deep blue
        ctx.fillRect(0, 0, w, h);

        const NORTH = (bitmask & 1) !== 0;
        const WEST = (bitmask & 2) !== 0;
        const EAST = (bitmask & 4) !== 0;
        const SOUTH = (bitmask & 8) !== 0;

        // Draw animated waves (procedural shifts based on frame)
        ctx.fillStyle = '#64b5f6'; // Light blue wave accents
        const timeOffset = frame * 4;

        // Some random-ish looking waves based on coordinates
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const y = (i * 20 + timeOffset) % h;
            ctx.ellipse((w / 2) + Math.sin(y * 0.1) * 5, y, 12 + Math.cos(timeOffset * 0.1) * 2, 3, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // Edge blending (if NO water neighbor, draw sand/grass edge)
        // Since water is a tile and usually borders grass/sand.
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        const edgeSize = 4;
        if (!NORTH) ctx.fillRect(0, 0, w, edgeSize);
        if (!SOUTH) ctx.fillRect(0, h - edgeSize, w, edgeSize);
        if (!WEST) ctx.fillRect(0, 0, edgeSize, h);
        if (!EAST) ctx.fillRect(w - edgeSize, 0, edgeSize, h);
    }

    public static drawLavaFrame(ctx: CanvasRenderingContext2D, w: number, h: number, bitmask: number, frame: number) {
        // Base dark red lava
        ctx.fillStyle = '#e65100'; // Dark orange/red
        ctx.fillRect(0, 0, w, h);

        const NORTH = (bitmask & 1) !== 0;
        const WEST = (bitmask & 2) !== 0;
        const EAST = (bitmask & 4) !== 0;
        const SOUTH = (bitmask & 8) !== 0;

        // Drawing magma cracks and bubbles
        ctx.fillStyle = '#ffb300'; // Bright magma
        const timeOffset = frame * 3;

        ctx.beginPath();
        for (let i = 0; i < 2; i++) {
            const px = ((i + 1) * 20 + timeOffset) % w;
            const py = (i * 30 + (h - timeOffset)) % h;
            ctx.arc(px, py, 4 + Math.sin(frame) * 2, 0, Math.PI * 2);
        }
        ctx.fill();

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        const edgeSize = 6;
        if (!NORTH) ctx.fillRect(0, 0, w, edgeSize);
        if (!SOUTH) ctx.fillRect(0, h - edgeSize, w, edgeSize);
        if (!WEST) ctx.fillRect(0, 0, edgeSize, h);
        if (!EAST) ctx.fillRect(w - edgeSize, 0, edgeSize, h);
    }

    public static drawSandTile(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
        ctx.fillStyle = '#edd19c'; // Warm sand base
        ctx.fillRect(0, 0, w, h);

        // Pattern: small darker/lighter specs
        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = (i % 2 === 0) ? '#d7be8c' : '#f5daaa';
            const px = (Math.sin(seed * (i + 1)) * 1000) % w;
            const py = (Math.cos(seed * (i + 2)) * 1000) % h;
            ctx.fillRect(Math.abs(px), Math.abs(py), 2, 2);
        }

        // Draw small dune waves
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const yOffset = Math.abs((Math.sin(seed) * 1000) % (h / 2));
        ctx.moveTo(0, yOffset);
        ctx.quadraticCurveTo(w / 2, yOffset + 10, w, yOffset);
        ctx.stroke();
    }

    public static drawBridgeTile(ctx: CanvasRenderingContext2D, w: number, h: number, isVertical: boolean) {
        ctx.fillStyle = '#4e342e'; // Dark brown base
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#6d4c41'; // Lighter plank color
        const plankSize = isVertical ? w : h;
        const plankCount = 5;
        const plankWidth = (isVertical ? h : w) / plankCount;

        for (let i = 0; i < plankCount; i++) {
            const gap = 2;
            if (isVertical) {
                ctx.fillRect(gap, i * plankWidth + gap / 2, w - gap * 2, plankWidth - gap);
                // Nail holes
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(6, i * plankWidth + 4, 2, 2);
                ctx.fillRect(w - 8, i * plankWidth + 4, 2, 2);
                ctx.fillStyle = '#6d4c41'; // Reset
            } else {
                ctx.fillRect(i * plankWidth + gap / 2, gap, plankWidth - gap, h - gap * 2);
                // Nail holes
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(i * plankWidth + 4, 6, 2, 2);
                ctx.fillRect(i * plankWidth + 4, h - 8, 2, 2);
                ctx.fillStyle = '#6d4c41'; // Reset
            }
        }
    }
}
