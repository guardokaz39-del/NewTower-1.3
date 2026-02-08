import { ITurretRenderer } from './TurretRenderer';
import type { Tower } from '../../Tower';

/**
 * Sniper Turret Renderer
 * Features:
 * - Pulsing laser sight
 * - Scope lens flare
 * - Charging glow when targeting
 */
export class SniperTurretRenderer implements ITurretRenderer {
    readonly cardId = 'sniper';

    getTurretAsset(level: number): string {
        return `turret_sniper_${level}`;
    }

    getModuleAsset(): string {
        return 'mod_sniper';
    }

    getMuzzleOffset(): number {
        return 38;
    }

    update(dt: number, tower: Tower): void {
        // Laser pulse
        if (tower.visualState.laserPhase === undefined) {
            tower.visualState.laserPhase = 0;
        }
        tower.visualState.laserPhase += dt * 5;
        tower.visualState.laserPhase %= Math.PI * 2;

        // Lens flare
        if (tower.visualState.lensFlare === undefined) {
            tower.visualState.lensFlare = 0;
        }
        tower.visualState.lensFlare += dt * 3;
    }

    drawEffects(ctx: CanvasRenderingContext2D, tower: Tower): void {
        const level = Math.max(1, Math.max(...tower.cards.map(c => c.level)));
        const stats = tower.getStats();

        // Laser sight
        this.drawLaserSight(ctx, tower, stats.range, level);

        // Scope lens flare
        if (level >= 2) {
            this.drawLensFlare(ctx, tower, level);
        }

        // Energy rails glow (level 3)
        if (level === 3) {
            this.drawEnergyRails(ctx, tower);
        }
    }

    private drawLaserSight(
        ctx: CanvasRenderingContext2D,
        tower: Tower,
        range: number,
        level: number
    ): void {
        const phase = tower.visualState.laserPhase || 0;
        const opacity = 0.3 + Math.sin(phase) * 0.15;
        const muzzle = this.getMuzzleOffset();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Main laser line
        ctx.strokeStyle = '#ff1744';
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1 + level * 0.3;

        ctx.beginPath();
        ctx.moveTo(muzzle, 0);
        ctx.lineTo(range, 0);
        ctx.stroke();

        // Targeting dot
        ctx.fillStyle = '#ff1744';
        ctx.globalAlpha = opacity * 1.5;
        ctx.beginPath();
        ctx.arc(range, 0, 2 + level * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Dot glow
        const dotGrad = ctx.createRadialGradient(range, 0, 0, range, 0, 6);
        dotGrad.addColorStop(0, 'rgba(255,23,68,0.5)');
        dotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(range, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawLensFlare(ctx: CanvasRenderingContext2D, tower: Tower, level: number): void {
        const flare = tower.visualState.lensFlare || 0;
        const intensity = 0.3 + Math.sin(flare) * 0.2;

        // Scope position (on turret body, offset for scope)
        const scopeX = 6;
        const scopeY = -10;

        ctx.fillStyle = `rgba(77,208,225,${intensity})`;
        ctx.beginPath();
        ctx.arc(scopeX, scopeY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Reflection highlight
        ctx.fillStyle = `rgba(255,255,255,${intensity * 0.8})`;
        ctx.beginPath();
        ctx.arc(scopeX - 1, scopeY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawEnergyRails(ctx: CanvasRenderingContext2D, tower: Tower): void {
        const phase = tower.visualState.laserPhase || 0;
        const intensity = 0.3 + Math.sin(phase * 1.5) * 0.2;

        ctx.strokeStyle = `rgba(105,240,174,${intensity})`;
        ctx.lineWidth = 1.5;

        // Energy arc along rails
        const arcLen = 20 + Math.sin(phase) * 5;

        ctx.beginPath();
        ctx.moveTo(10, -4);
        ctx.lineTo(10 + arcLen, -3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(10, 4);
        ctx.lineTo(10 + arcLen, 3);
        ctx.stroke();
    }
}
