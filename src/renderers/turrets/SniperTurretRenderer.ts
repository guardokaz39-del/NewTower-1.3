import { ITurretRenderer } from './TurretRenderer';
import type { Tower } from '../../Tower';
import { VISUALS } from '../../VisualConfig';

/**
 * Sniper Card Turret Renderer
 * Includes laser sight effect
 */
export class SniperTurretRenderer implements ITurretRenderer {
    readonly cardId = 'sniper';

    getTurretAsset(): string {
        return 'turret_sniper';
    }

    getModuleAsset(): string {
        return 'mod_sniper';
    }

    /**
     * Draw laser sight
     * Called INSIDE rotated+recoiled context — laser moves with barrel
     */
    drawEffects(ctx: CanvasRenderingContext2D, tower: Tower): void {
        const stats = tower.getStats();
        // Pulse effect
        const opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = VISUALS.TOWER.LASER;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(10, 0); // Start from end of barrel
        ctx.lineTo(stats.range, 0); // Extend to max range
        ctx.stroke();

        // Dot at the end
        ctx.fillStyle = VISUALS.TOWER.LASER;
        ctx.globalAlpha = opacity * 1.5;
        ctx.beginPath();
        ctx.arc(stats.range, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
