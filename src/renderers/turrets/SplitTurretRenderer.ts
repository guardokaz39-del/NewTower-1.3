import { ITurretRenderer } from './TurretRenderer';
import type { Tower } from '../../Tower';

/**
 * Split/Volley Turret Renderer
 * Features:
 * - Rocket exhaust glow on tubes
 * - Targeting arcs showing spread
 * - Energy buildup effect
 */
export class SplitTurretRenderer implements ITurretRenderer {
    readonly cardId = 'multi';

    getTurretAsset(level: number): string {
        return `turret_split_${level}`;
    }

    getModuleAsset(): string {
        return 'mod_split';
    }

    getMuzzleOffset(): number {
        return 26;
    }

    update(dt: number, tower: Tower): void {
        // Exhaust pulse
        if (tower.visualState.exhaustPulse === undefined) {
            tower.visualState.exhaustPulse = 0;
        }
        tower.visualState.exhaustPulse += dt * 4;
        tower.visualState.exhaustPulse %= Math.PI * 2;

        // Arc animation
        if (tower.visualState.arcPhase === undefined) {
            tower.visualState.arcPhase = 0;
        }
        tower.visualState.arcPhase += dt * 2;
    }

    drawEffects(ctx: CanvasRenderingContext2D, tower: Tower): void {
        const level = Math.max(1, Math.max(...tower.cards.map(c => c.level)));

        // Targeting spread arcs
        this.drawTargetingArcs(ctx, tower, level);

        // Tube exhaust glow
        this.drawExhaustGlow(ctx, tower, level);
    }

    private drawTargetingArcs(ctx: CanvasRenderingContext2D, tower: Tower, level: number): void {
        const barrelCount = level + 1;
        const spreadAngle = 0.25;
        const startAngle = -spreadAngle * (barrelCount - 1) / 2;
        const arcPhase = tower.visualState.arcPhase || 0;

        ctx.strokeStyle = 'rgba(255,143,0,0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        const pulseOffset = Math.sin(arcPhase) * 5;
        const arcLength = 40 + pulseOffset;

        for (let i = 0; i < barrelCount; i++) {
            const angle = startAngle + i * spreadAngle;

            ctx.save();
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(25, 0);
            ctx.lineTo(arcLength, 0);
            ctx.stroke();

            ctx.restore();
        }

        ctx.setLineDash([]);
    }

    private drawExhaustGlow(ctx: CanvasRenderingContext2D, tower: Tower, level: number): void {
        const barrelCount = level + 1;
        const spreadAngle = 0.25;
        const startAngle = -spreadAngle * (barrelCount - 1) / 2;
        const pulse = tower.visualState.exhaustPulse || 0;

        const glowIntensity = 0.15 + Math.sin(pulse) * 0.1;

        for (let i = 0; i < barrelCount; i++) {
            const angle = startAngle + i * spreadAngle;
            const tubeEnd = 23 + level * 3;

            ctx.save();
            ctx.rotate(angle);

            // Small exhaust glow at tube end
            const grad = ctx.createRadialGradient(tubeEnd, 0, 0, tubeEnd, 0, 6);
            grad.addColorStop(0, `rgba(255,171,0,${glowIntensity})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(tubeEnd, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}
