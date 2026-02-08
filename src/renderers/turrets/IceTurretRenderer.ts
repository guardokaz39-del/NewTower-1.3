import { ITurretRenderer } from './TurretRenderer';
import { Tower } from '../../Tower';

/**
 * Ice Turret Renderer
 * Features:
 * - Orbiting ice shards with sparkle
 * - Frost aura (cold mist effect)
 * - Crystal pulse glow
 */
export class IceTurretRenderer implements ITurretRenderer {
    readonly cardId = 'ice';

    getTurretAsset(level: number): string {
        return `turret_ice_${level}`;
    }

    getModuleAsset(): string {
        return 'mod_ice';
    }

    getMuzzleOffset(): number {
        return 28;
    }

    update(dt: number, tower: Tower): void {
        // Shard orbit
        if (tower.visualState.shardAngle === undefined) {
            tower.visualState.shardAngle = 0;
        }
        tower.visualState.shardAngle += dt * 1.2;
        tower.visualState.shardAngle %= Math.PI * 2;

        // Frost pulse
        if (tower.visualState.frostPulse === undefined) {
            tower.visualState.frostPulse = 0;
        }
        tower.visualState.frostPulse += dt * 2;
        tower.visualState.frostPulse %= Math.PI * 2;

        // Sparkle timer
        if (tower.visualState.sparkleTime === undefined) {
            tower.visualState.sparkleTime = 0;
        }
        tower.visualState.sparkleTime += dt;
    }

    drawEffects(ctx: CanvasRenderingContext2D, tower: Tower): void {
        const level = Math.max(1, Math.max(...tower.cards.map(c => c.level)));

        // Frost aura (always visible, subtle)
        this.drawFrostAura(ctx, tower, level);

        // Orbiting shards (level 2+)
        if (level >= 2) {
            this.drawOrbitingShards(ctx, tower, level);
        }

        // Sparkles
        this.drawSparkles(ctx, tower);
    }

    private drawFrostAura(ctx: CanvasRenderingContext2D, tower: Tower, level: number): void {
        const pulse = tower.visualState.frostPulse || 0;
        const radius = 18 + level * 2 + Math.sin(pulse) * 2;
        const alpha = 0.15 + level * 0.05;

        const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, radius);
        grad.addColorStop(0, `rgba(77,208,225,${alpha})`);
        grad.addColorStop(0.6, `rgba(128,222,234,${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawOrbitingShards(ctx: CanvasRenderingContext2D, tower: Tower, level: number): void {
        const angle = tower.visualState.shardAngle || 0;
        const shardCount = level; // 2 or 3 shards
        const radius = 22 + level * 2;

        for (let i = 0; i < shardCount; i++) {
            const shardAngle = angle + (i * Math.PI * 2 / shardCount);
            const x = Math.cos(shardAngle) * radius;
            const y = Math.sin(shardAngle) * radius * 0.6; // Squished orbit

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(shardAngle);

            // Shard glow
            ctx.fillStyle = 'rgba(77,208,225,0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();

            // Shard body (diamond)
            const grad = ctx.createLinearGradient(0, -4, 0, 4);
            grad.addColorStop(0, '#e0f7fa');
            grad.addColorStop(0.5, '#4dd0e1');
            grad.addColorStop(1, '#00acc1');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(2.5, 0);
            ctx.lineTo(0, 4);
            ctx.lineTo(-2.5, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    }

    private drawSparkles(ctx: CanvasRenderingContext2D, tower: Tower): void {
        const time = tower.visualState.sparkleTime || 0;
        const sparkleCount = 3;

        ctx.fillStyle = '#fff';

        for (let i = 0; i < sparkleCount; i++) {
            const t = ((time * 0.8 + i * 1.5) % 2) / 2;
            const angle = i * 2.1 + time * 0.3;
            const dist = 10 + t * 15;

            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const alpha = (1 - t) * 0.8;
            const size = (1 - t) * 2;

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
