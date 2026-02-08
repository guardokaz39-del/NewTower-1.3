import { ITurretRenderer } from './TurretRenderer';
import { Tower } from '../../Tower';
import { Assets } from '../../Assets';

/**
 * Void Prism v4.0 — Correct Top-Down Perspective
 * 
 * The crystal STANDS VERTICALLY on the pedestal.
 * In top-down view, we see the TOP of the crystal (looking down at it).
 * 
 * Visual: Glowing octagram/star shape with directional aiming indicator
 * Rotation: Crystal spins around its vertical axis (center stays fixed)
 */
export class MinigunTurretRenderer implements ITurretRenderer {
    readonly cardId = 'minigun';

    getTurretAsset(level: number): string {
        return `turret_minigun_${level}`;
    }

    getModuleAsset(): string {
        return 'mod_minigun';
    }

    getMuzzleOffset(): number {
        return 18;
    }

    update(dt: number, tower: Tower): void {
        // Pulse phase for glow effects
        if (tower.visualState.pulsePhase === undefined) {
            tower.visualState.pulsePhase = 0;
        }
        const pulseSpeed = 2 + (tower.spinupTime || 0) * 4;
        tower.visualState.pulsePhase += dt * pulseSpeed;
        tower.visualState.pulsePhase %= Math.PI * 2;

        // Inner rotation (slow ambient spin when idle)
        if (tower.visualState.innerSpin === undefined) {
            tower.visualState.innerSpin = 0;
        }
        tower.visualState.innerSpin += dt * 0.5;
        tower.visualState.innerSpin %= Math.PI * 2;
    }

    drawTurret(ctx: CanvasRenderingContext2D, tower: Tower): void {
        const level = Math.max(1, Math.max(...tower.cards.map(c => c.level)));
        const heat = tower.heatLevel || 0;
        const spinup = tower.spinupTime || 0;
        const isOverheated = tower.isOverheated;

        // === 1. PEDESTAL (Counter-rotate to stay static) ===
        ctx.save();
        ctx.rotate(-tower.angle);

        const pedestalImg = Assets.get(this.getTurretAsset(level));
        if (pedestalImg) {
            ctx.drawImage(pedestalImg, -24, -24);
        }

        // === 2. CRYSTAL (Top-down view, rotates with aim) ===
        // We're still in counter-rotated context, so rotate BY tower.angle
        // to get the crystal pointing at target
        ctx.rotate(tower.angle);

        this.drawCrystalTopDown(ctx, tower, level, heat, spinup, isOverheated);

        ctx.restore();
    }

    private drawCrystalTopDown(
        ctx: CanvasRenderingContext2D,
        tower: Tower,
        level: number,
        heat: number,
        spinup: number,
        isOverheated: boolean
    ): void {
        const baseRadius = 10 + level * 2; // 12-16px
        const pulse = tower.visualState.pulsePhase || 0;
        const innerSpin = tower.visualState.innerSpin || 0;

        const colors = this.getColors(heat, isOverheated);
        const glowIntensity = 0.2 + spinup * 0.25 + Math.sin(pulse) * 0.08;

        // === OUTER GLOW (aura around crystal) ===
        const glowRadius = baseRadius + 6 + spinup * 3;
        const glowGrad = ctx.createRadialGradient(0, 0, baseRadius * 0.5, 0, 0, glowRadius);
        glowGrad.addColorStop(0, colors.glow.replace('1)', `${glowIntensity * 0.7})`));
        glowGrad.addColorStop(0.6, colors.glow.replace('1)', `${glowIntensity * 0.2})`));
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // === CRYSTAL BODY (Top view = octagonal star) ===
        // This represents looking DOWN at the top facet of the crystal
        ctx.save();
        ctx.rotate(innerSpin * 0.3); // Subtle ambient shimmer

        // Outer octagon (main crystal top)
        ctx.fillStyle = colors.main;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4) - Math.PI / 8;
            const r = baseRadius;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Inner facet (lighter center)
        ctx.fillStyle = colors.highlight;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4);
            const r = baseRadius * 0.5;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Edge highlights (facet reflections)
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + innerSpin * 0.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * baseRadius * 0.9, Math.sin(angle) * baseRadius * 0.9);
            ctx.stroke();
        }

        ctx.restore();

        // === INNER CORE (pulsing center) ===
        const corePulse = 0.6 + Math.sin(pulse) * 0.4;
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 0.4);
        coreGrad.addColorStop(0, `rgba(255,255,255,${corePulse})`);
        coreGrad.addColorStop(0.5, colors.core);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // === AIMING INDICATOR (points toward target) ===
        // This shows which direction the crystal is "facing"
        ctx.fillStyle = colors.highlight;
        ctx.beginPath();
        ctx.moveTo(baseRadius + 4, 0); // Tip
        ctx.lineTo(baseRadius - 2, -4); // Back left
        ctx.lineTo(baseRadius - 2, 4); // Back right
        ctx.closePath();
        ctx.fill();

        // Glow on indicator
        ctx.fillStyle = colors.glow.replace('1)', '0.6)');
        ctx.beginPath();
        ctx.arc(baseRadius + 2, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // === CRACKS (overheat only) ===
        if (isOverheated) {
            ctx.strokeStyle = 'rgba(30,30,30,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-baseRadius * 0.3, -baseRadius * 0.5);
            ctx.lineTo(baseRadius * 0.1, 0);
            ctx.lineTo(-baseRadius * 0.2, baseRadius * 0.4);
            ctx.stroke();
        }

        // === ENERGY PARTICLES (when active) ===
        if (spinup > 0.3) {
            this.drawEnergyParticles(ctx, tower, spinup, baseRadius, colors);
        }
    }

    private drawEnergyParticles(
        ctx: CanvasRenderingContext2D,
        tower: Tower,
        spinup: number,
        radius: number,
        colors: ReturnType<typeof this.getColors>
    ): void {
        const phase = tower.visualState.pulsePhase || 0;
        const count = Math.floor(2 + spinup * 4);

        ctx.fillStyle = colors.glow.replace('1)', '0.7)');

        for (let i = 0; i < count; i++) {
            const t = ((phase * 0.8 + i * 1.2) % Math.PI) / Math.PI;
            const angle = (i * 1.7) + phase * 0.5;
            const dist = radius * 1.2 + t * 8;

            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const size = (1 - t) * 2 + 0.5;

            ctx.globalAlpha = (1 - t) * 0.8;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    private getColors(heat: number, isOverheated: boolean) {
        if (isOverheated) {
            return {
                main: '#757575',
                highlight: '#9e9e9e',
                shadow: '#424242',
                core: 'rgba(158,158,158,0.6)',
                glow: 'rgba(120,120,120,1)'
            };
        }

        if (heat < 0.25) {
            return {
                main: '#5e35b1',
                highlight: '#9575cd',
                shadow: '#4527a0',
                core: 'rgba(179,136,255,0.8)',
                glow: 'rgba(103,58,183,1)'
            };
        } else if (heat < 0.6) {
            return {
                main: '#8e24aa',
                highlight: '#ce93d8',
                shadow: '#6a1b9a',
                core: 'rgba(234,128,252,0.85)',
                glow: 'rgba(156,39,176,1)'
            };
        } else {
            return {
                main: '#ab47bc',
                highlight: '#f3e5f5',
                shadow: '#7b1fa2',
                core: 'rgba(255,255,255,0.9)',
                glow: 'rgba(224,64,251,1)'
            };
        }
    }

    drawEffects(ctx: CanvasRenderingContext2D, tower: Tower): void {
        // All effects integrated in drawTurret
    }
}
