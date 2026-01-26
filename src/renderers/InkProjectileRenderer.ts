import { Projectile } from '../Projectile';
import { InkUtils } from '../graphics/InkUtils';
import { INK_CONFIG } from '../graphics/InkConfig';

export class InkProjectileRenderer {
    static draw(ctx: CanvasRenderingContext2D, projectile: Projectile) {
        if (!projectile.alive) return;

        const type = projectile.projectileType || 'standard';

        // --- Critical Hit Halo ---
        if (projectile.isCrit) {
            ctx.save();
            ctx.strokeStyle = '#ffd700'; // Gold ink
            ctx.lineWidth = 2;
            ctx.beginPath();
            // A quick scribbled circle
            const r = projectile.radius + 5;
            InkUtils.drawWobbleCircle(ctx, projectile.x, projectile.y, r, Date.now() * 0.01);
            ctx.restore();
        }

        // --- Projectile Body ---
        ctx.save();
        ctx.translate(projectile.x, projectile.y);

        if (type === 'fire') {
            // Watercolor Wash (Orange/Red)
            // Wet, undefined edges
            InkUtils.drawWatercolorFill(ctx, 0, 0, projectile.radius * 2, 'rgba(255, 87, 34, 0.8)');
            // Darker core
            InkUtils.drawInkSplat(ctx, 0, 0, projectile.radius, 'rgba(191, 54, 12, 0.9)');

        } else if (type === 'ice') {
            // Sharp Crystal Shards (Cyan)
            // Rotate to face movement
            const angle = Math.atan2(projectile.vy, projectile.vx);
            ctx.rotate(angle);

            ctx.strokeStyle = '#00acc1'; // Cyan ink
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Diamond shape sketch
            const len = 12;
            const wid = 6;
            ctx.moveTo(len, 0);
            ctx.lineTo(0, wid);
            ctx.lineTo(-len, 0);
            ctx.lineTo(0, -wid);
            ctx.closePath();
            ctx.stroke();

            // Inner hatching
            ctx.beginPath();
            ctx.moveTo(-4, -2);
            ctx.lineTo(4, 2);
            ctx.stroke();

        } else if (type === 'sniper') {
            // Pencil Line (Green/Black)
            const angle = Math.atan2(projectile.vy, projectile.vx);
            ctx.rotate(angle);

            ctx.strokeStyle = '#2e7d32'; // Green pencil
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // Long, thin stroke
            InkUtils.drawWobbleLine(ctx, -20, 0, 10, 0);

        } else if (type === 'minigun') {
            // Small fast dots
            ctx.fillStyle = '#9c27b0';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            // Motion blur line
            const angle = Math.atan2(projectile.vy, projectile.vx);
            ctx.rotate(angle);
            ctx.strokeStyle = 'rgba(156, 39, 176, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-10, 0);
            ctx.stroke();

        } else {
            // Standard / Multi: Ink Blob
            // Black/Sepia ink
            InkUtils.drawInkSplat(ctx, 0, 0, projectile.radius, INK_CONFIG.PALETTE.INK);
        }

        ctx.restore();
    }
}
