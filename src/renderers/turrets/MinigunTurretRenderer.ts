import { ITurretRenderer } from './TurretRenderer';
import type { Tower } from '../../Tower';

/**
 * Minigun Card Turret Renderer
 * Includes heat haze effect
 */
export class MinigunTurretRenderer implements ITurretRenderer {
    readonly cardId = 'minigun';

    getTurretAsset(): string {
        return 'turret_minigun';
    }

    getModuleAsset(): string {
        return 'mod_minigun';
    }

    /**
     * Draw heat haze when spinning up
     * Called INSIDE rotated context — effect is attached to barrel
     */
    drawEffects(ctx: CanvasRenderingContext2D, tower: Tower): void {
        if (tower.spinupTime > 0) {
            this.drawHeatHaze(ctx, tower);
        }
    }

    private drawHeatHaze(ctx: CanvasRenderingContext2D, tower: Tower): void {
        // Heat rises from the barrel tip
        // We're in rotated context, so barrel tip is at (barrelLen, 0)
        const barrelLen = 30;

        ctx.save();
        const time = Date.now() * 0.005;

        // Draw multiple rising heat puffs
        for (let i = 0; i < 3; i++) {
            const cycleDur = 50;
            const offset = (time * 20 + i * (cycleDur / 3)) % cycleDur;

            // Fade out as it rises
            const alpha = Math.max(0, (1 - (offset / cycleDur)) * 0.2);

            // Sway perpendicular to barrel (in rotated space, that's Y axis)
            const sway = Math.sin(time + i) * 5;
            const dist = offset;

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            const size = 5 + (offset * 0.2);
            // In rotated context: X is along barrel, Y is perpendicular
            ctx.arc(barrelLen + dist * 0.3, sway - dist * 0.5, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
