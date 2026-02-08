import { ITurretRenderer } from './TurretRenderer';
import { Tower } from '../../Tower';

/**
 * Fire Card Turret Renderer
 */
export class FireTurretRenderer implements ITurretRenderer {
    readonly cardId = 'fire';

    getTurretAsset(level: number): string {
        return `turret_fire_${level}`;
    }

    getModuleAsset(): string {
        return 'mod_fire';
    }

    getMuzzleOffset(): number {
        return 15; // Short barrel for Mortar/Fire
    }

    update(dt: number, tower: Tower): void {
        // Initialize visual state if needed
        if (!tower.visualState.magmaPhase) tower.visualState.magmaPhase = 0;

        // Animate magma pulse (sine wave phase)
        tower.visualState.magmaPhase += dt * 3; // Speed of pulse
    }

    drawEffects(ctx: CanvasRenderingContext2D, tower: Tower): void {
        // Draw Magma Glow in center
        const phase = tower.visualState.magmaPhase || 0;
        const glow = 0.5 + Math.sin(phase) * 0.3; // 0.2 to 0.8 opacity

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#ff5722'; // Deep Orange
        ctx.globalAlpha = glow;

        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Heat rising (simple particles if card level > 1)
        // Note: For full particle system we'd use EffectSystem, but small local effects can be drawn here
        ctx.restore();
    }
}
