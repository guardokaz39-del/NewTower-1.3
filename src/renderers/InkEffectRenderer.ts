import { IEffect } from '../EffectSystem';
import { InkUtils } from '../graphics/InkUtils';
import { INK_CONFIG } from '../graphics/InkConfig';
import { Assets } from '../Assets';

export class InkEffectRenderer {
    static draw(ctx: CanvasRenderingContext2D, effect: IEffect) {
        const progress = effect.life / (effect.maxLife || 1);

        ctx.save();
        ctx.globalAlpha = progress;

        if (effect.type === 'text') {
            const fontSize = effect.fontSize || 16;
            ctx.fillStyle = effect.color || INK_CONFIG.PALETTE.INK;
            // Use a handwriting-style font if loaded, or serif
            ctx.font = `bold ${fontSize}px "MedievalSharp", "Courier New", serif`;
            ctx.textAlign = 'center';
            ctx.fillText(effect.text || '', effect.x, effect.y);
            // No heavy stroke, maybe slight shadow
            // ctx.shadowBlur = 2;
            // ctx.shadowColor = '#fff';
            // ctx.strokeText(effect.text || '', effect.x, effect.y);

        } else if (effect.type === 'particle') {
            // Ink dot
            ctx.fillStyle = effect.color || INK_CONFIG.PALETTE.INK;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius || 2, 0, Math.PI * 2);
            ctx.fill();

        } else if (effect.type === 'debris') {
            // Paper scrap
            ctx.translate(effect.x, effect.y);
            if (effect.rotation) ctx.rotate(effect.rotation);
            ctx.fillStyle = effect.color || '#fff';
            ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
            ctx.lineWidth = 1;
            const s = effect.size || 4;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.strokeRect(-s / 2, -s / 2, s, s);

        } else if (effect.type === 'muzzle_flash') {
            // Quick scratch
            const r = effect.radius || 12;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(effect.x, effect.y);
            ctx.lineTo(effect.x + (Math.random() - 0.5) * r * 2, effect.y + (Math.random() - 0.5) * r * 2);
            ctx.stroke();

        } else if (effect.type === 'scale_pop') {
            // DEATH POOF (Smoke Cloud)
            // Instead of scaling sprite, we draw a disappearing smoke cloud
            const smokeRadius = (effect.radius || 20) * (1 + progress * 0.5);
            const alpha = 1 - progress;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#111'; // Dark smoke
            ctx.beginPath();
            InkUtils.drawWobbleCircle(ctx, effect.x, effect.y, smokeRadius, Date.now() * 0.001);
            ctx.fill();

            // Internal turbulence lines
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const time = Date.now() * 0.005;
            InkUtils.drawWobbleLine(ctx, effect.x - 10, effect.y, effect.x + 10, effect.y, time);
            InkUtils.drawWobbleLine(ctx, effect.x, effect.y - 10, effect.x, effect.y + 10, time + 1);
            ctx.stroke();

        } else if (effect.type === 'explosion') {
            // Enhanced Ink Splat
            const splatRadius = effect.radius || 30;
            const color = effect.color === 'orange' ? INK_CONFIG.PALETTE.INK : (effect.color || '#000');

            // 1. Main blot
            InkUtils.drawInkSplat(ctx, effect.x, effect.y, splatRadius * progress, color, Date.now() * 0.001);

            // 2. Secondary droplets (flying out)
            if (progress < 0.5) {
                const dropletCount = 6;
                ctx.fillStyle = color;
                for (let i = 0; i < dropletCount; i++) {
                    const angle = (i / dropletCount) * Math.PI * 2 + Math.random();
                    const dist = splatRadius * (1 + progress * 4);
                    const r = 2 * (1 - progress * 2);
                    if (r > 0) {
                        ctx.beginPath();
                        ctx.arc(effect.x + Math.cos(angle) * dist, effect.y + Math.sin(angle) * dist, r, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

        } else if (effect.type === 'screen_flash') {
            // Paper burn from edges? Or just tint.
            // Let's stick to tint for safety.
            const flashAlpha = progress * 0.4;
            ctx.fillStyle = effect.flashColor || 'rgba(255,0,0,1)';
            ctx.globalAlpha = flashAlpha;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        ctx.restore();
    }
}
