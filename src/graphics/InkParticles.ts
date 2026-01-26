import { INK_CONFIG } from './InkConfig';

/**
 * Handles "Living Ink" particle effects.
 */
export class InkParticles {

    /**
     * Draws an expanding ink splatter (explosion).
     * @param ctx 
     * @param x Center X
     * @param y Center Y
     * @param radius Current radius
     * @param lifePct 0.0 to 1.0 (1.0 = full life/birth, 0.0 = dead)
     * @param color Ink color
     */
    static drawSplatter(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, lifePct: number, color: string = INK_CONFIG.PALETTE.INK) {
        ctx.save();
        ctx.fillStyle = color;

        // Ink dries (= opacity drops)
        ctx.globalAlpha = Math.min(1, lifePct * 1.5);

        // Draw main blob
        const r = radius;

        // Use a static seed based on position to make the shape consistent over frames
        // (Simulate per-particle shape without storing it, assuming x/y doesn't change much for explosion center)
        const seed = Math.floor(x * y);

        ctx.beginPath();
        const spikes = 8 + (seed % 5);
        const rotation = (seed % 360) * Math.PI / 180;

        for (let i = 0; i <= spikes * 2; i++) {
            const angle = rotation + (i / (spikes * 2)) * Math.PI * 2;
            const isSpike = i % 2 === 0;
            // Spikes are longer when fresh (explosive force), then retract? 
            // Better: Spikes are just irregular.
            const len = isSpike ? r : r * 0.4;
            // Add some "wobble" based on life to make it boil
            const wobble = Math.sin(lifePct * 10 + i) * (r * 0.1);

            const px = x + Math.cos(angle) * (len + wobble);
            const py = y + Math.sin(angle) * (len + wobble);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Droplets (Satellites)
        if (lifePct > 0.5) {
            const dropletCount = 4 + (seed % 4);
            for (let i = 0; i < dropletCount; i++) {
                const angle = rotation + (i / dropletCount) * Math.PI * 2 + 0.5;
                const dist = r * 1.5 + (1 - lifePct) * r; // Move outward
                const size = r * 0.15 * lifePct;

                const dx = x + Math.cos(angle) * dist;
                const dy = y + Math.sin(angle) * dist;

                ctx.beginPath();
                ctx.arc(dx, dy, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
