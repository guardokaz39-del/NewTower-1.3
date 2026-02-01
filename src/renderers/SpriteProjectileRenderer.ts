import { Assets } from '../Assets';
import { Projectile } from '../Projectile';

export class SpriteProjectileRenderer {
    static draw(ctx: CanvasRenderingContext2D, projectile: Projectile) {
        if (!projectile.alive) return;

        // Enhanced visual for critical hits
        if (projectile.isCrit) {
            // Enhanced visual for critical hits (kept dynamic for glow intensity)
            ctx.save();
            // Outer glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff3300'; // Orange-red glow
            ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius + 6, 0, Math.PI * 2);
            ctx.fill();

            // Inner core glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffff00';
            ctx.fillStyle = '#ffffaa';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Inner bright core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // --- BAKED PROJECTILES ---
            const type = projectile.projectileType || 'standard';
            const img = Assets.get(`projectile_${type}`);

            if (img) {
                const size = 16;
                ctx.save();
                ctx.translate(projectile.x, projectile.y);

                // Rotate if needed (always rotate towards velocity for correct orientation)
                const angle = Math.atan2(projectile.vy, projectile.vx);
                ctx.rotate(angle);

                ctx.drawImage(img, -size / 2, -size / 2);

                // Level-based trail effects
                if (projectile.towerLevel >= 2) {
                    const angle = Math.atan2(projectile.vy, projectile.vx);

                    // Fade in trail over first 30 frames (0.5 seconds)
                    const trailOpacity = Math.min(1, (120 - projectile.life) / 30);

                    ctx.save();
                    ctx.rotate(angle);

                    if (projectile.towerLevel === 2) {
                        // LVL 2: Light trail
                        ctx.strokeStyle = projectile.color;
                        ctx.globalAlpha = 0.4 * trailOpacity;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-size * 1.2, 0);
                        ctx.stroke();
                    } else if (projectile.towerLevel === 3) {
                        // LVL 3: Bright trail with glow
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = projectile.color;
                        ctx.strokeStyle = projectile.color;
                        ctx.globalAlpha = 0.7 * trailOpacity;
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-size * 2, 0);
                        ctx.stroke();

                        // Inner bright core trail
                        ctx.shadowBlur = 5;
                        ctx.strokeStyle = '#fff';
                        ctx.globalAlpha = 0.9 * trailOpacity;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-size * 1.5, 0);
                        ctx.stroke();
                    }

                    ctx.restore();
                }

                // Sniper Trail (original, still works)
                if (type === 'sniper') {
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = projectile.color;
                    // Draw line relative to rotated context (backing up)
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-size * 1.5, 0);
                    ctx.stroke();
                }

                ctx.restore();
            } else {
                // Fallback
                ctx.fillStyle = projectile.color;
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
