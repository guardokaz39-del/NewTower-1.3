import { Enemy } from '../Enemy';
import { CONFIG, getEnemyType } from '../Config';
import { InkUtils } from '../graphics/InkUtils';
import { INK_CONFIG } from '../graphics/InkConfig';
import { Assets } from '../Assets';

export class InkEnemyRenderer {
    static draw(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        if (!enemy.isAlive()) return;

        const safeType = enemy.typeId ? enemy.typeId.toLowerCase() : 'grunt';
        const typeConf = getEnemyType(safeType.toUpperCase()) || getEnemyType('GRUNT');

        const scale = typeConf?.scale || 1.0;
        const archetype = typeConf?.archetype || 'SKELETON';
        const baseColor = typeConf?.tint || typeConf?.color || '#000'; // Default ink is black/dark

        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // 1. Rotation (Face movement)
        const path = enemy.path;
        const pathIndex = enemy.pathIndex;
        if (path && pathIndex < path.length - 1) {
            const next = path[pathIndex];
            const dx = next.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - enemy.x;
            const dy = next.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - enemy.y;
            const moveAngle = Math.atan2(dy, dx);
            ctx.rotate(moveAngle + Math.PI / 2);
        }

        // 2. Breathing / Movement Wobble
        const time = Date.now() * 0.005;
        const breathe = 1.0 + Math.sin(time * 2 + parseInt(enemy.id.slice(-3), 36)) * 0.05;
        ctx.scale(scale * breathe, scale * breathe);

        // 3. Draw Body Sketch
        this.drawArchetypeSketch(ctx, archetype, baseColor, time, enemy);

        // 4. Status Effects
        this.drawStatusEffects(ctx, enemy);

        // 5. HP Bar (Ink Style) - Undo rotation first to keep bar horizontal? 
        // Actually, keeping it relative to enemy is fine for now, or we can restore context.
        // Let's restore for HP bar to be always horizontal-ish or relative to screen UP?
        // Standard game renders HP bar passing context. Usually we want HP bar above enemy regardless of rotation.
        ctx.restore();

        // HP Bar needs strictly horizontal alignment usually
        ctx.save();
        ctx.translate(enemy.x, enemy.y); // Translate back without rotation
        this.drawHealthBar(ctx, enemy, scale);
        ctx.restore();
    }

    private static drawArchetypeSketch(ctx: CanvasRenderingContext2D, archetype: string, color: string, time: number, enemy: Enemy) {

        // STYLE: Top-Down Shadow Puppets using Ink Utils

        // Setup style
        if (enemy.hitFlashTimer > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#ff0000';
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.strokeStyle = '#1a1a1a';
        }
        ctx.lineWidth = 2;

        if (archetype === 'SKELETON') {
            // Head
            InkUtils.drawWobbleCircle(ctx, 4, 0, 7, time);
            ctx.fill();

            // Shoulders
            InkUtils.drawWobbleLine(ctx, 4, -8, 4, 8, time);

            // Commander Crown
            if (enemy.typeId === 'skeleton_commander') {
                ctx.strokeStyle = '#ffd700'; // Gold
                const crown = [{ x: 0, y: -7 }, { x: 2, y: -12 }, { x: 4, y: -7 }, { x: 6, y: -12 }, { x: 8, y: -7 }];
                InkUtils.drawSketchPoly(ctx, crown, false, time);
                ctx.strokeStyle = enemy.hitFlashTimer > 0 ? '#ff0000' : '#1a1a1a'; // Restore
            }

            // Weapon
            InkUtils.drawWobbleLine(ctx, 4, -8, 20, -10, time);

            // Shield arm
            InkUtils.drawWobbleLine(ctx, 4, 8, 12, 10, time);

        } else if (archetype === 'WOLF' || archetype === 'SCOUT') {
            const body = [
                { x: 20, y: 0 },
                { x: -5, y: 8 },
                { x: -2, y: 0 },
                { x: -5, y: -8 }
            ];

            // Fill
            ctx.beginPath();
            ctx.moveTo(body[0].x, body[0].y);
            body.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.fill();

            // Ink Outline
            InkUtils.drawSketchPoly(ctx, body, true, time);

            // Tail
            const tailWag = Math.sin(time * 20) * 5;
            InkUtils.drawWobbleLine(ctx, -5, 0, -15, tailWag, time);

        } else if (archetype === 'TROLL') {
            // Head
            ctx.beginPath();
            ctx.arc(0, -9, 8, 0, Math.PI * 2);
            ctx.fill();
            InkUtils.drawWobbleCircle(ctx, 0, -9, 8, time);

            // Body
            ctx.beginPath();
            ctx.arc(0, 10, 16, 0, Math.PI * 2);
            ctx.fill();
            InkUtils.drawWobbleCircle(ctx, 0, 10, 16, time + 1);

            // Arms (Thick)
            ctx.lineWidth = 4;
            InkUtils.drawWobbleLine(ctx, -12, 0, -24, 10, time);
            InkUtils.drawWobbleLine(ctx, 12, 0, 24, 10, time + 2);

            // Armored
            if (enemy.id.includes('armored') || enemy.typeId === 'troll_armored') {
                ctx.fillStyle = '#424242';
                ctx.strokeStyle = '#fff';
                const shield = [{ x: 14, y: 0 }, { x: 22, y: 0 }, { x: 22, y: 18 }, { x: 14, y: 18 }];
                ctx.fillRect(14, 0, 8, 18);
                InkUtils.drawSketchPoly(ctx, shield, true, time);
            }

        } else if (archetype === 'SPIDER' || archetype === 'BOSS') {
            // Body
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
            InkUtils.drawWobbleCircle(ctx, 0, 0, 12, time);

            // Head
            ctx.beginPath(); ctx.arc(0, -12, 6, 0, Math.PI * 2); ctx.fill();
            InkUtils.drawWobbleCircle(ctx, 0, -12, 6, time);

            // Legs
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angleL = -Math.PI / 2 - (Math.PI / 6 * i);
                const angleR = -Math.PI / 2 + (Math.PI / 6 * i);
                const len = 28;

                // Draw shaky legs
                const lx = Math.cos(angleL) * len;
                const ly = Math.sin(angleL) * len;
                InkUtils.drawWobbleLine(ctx, -5, 0, lx, ly, time + i);

                const rx = Math.cos(angleR) * len;
                const ry = Math.sin(angleR) * len;
                InkUtils.drawWobbleLine(ctx, 5, 0, rx, ry, time + i + 4);
            }
        }
    }

    private static drawStatusEffects(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        if (enemy.statuses.some(s => s.type === 'slow')) {
            // Ice crystals at feet
            ctx.strokeStyle = CONFIG.AMBIENT.LIGHTING.ICE;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, 10); ctx.lineTo(-15, 20);
            ctx.moveTo(10, 10); ctx.lineTo(15, 20);
            ctx.moveTo(0, 15); ctx.lineTo(0, 25);
            ctx.stroke();
        }

        if (enemy.statuses.some(s => s.type === 'burn')) {
            // Smoke rising
            ctx.strokeStyle = CONFIG.AMBIENT.LIGHTING.FIRE;
            ctx.lineWidth = 2;
            const time = Date.now() * 0.005;
            ctx.beginPath();
            InkUtils.drawWobbleLine(ctx, -5, -20, -10, -35, time);
            InkUtils.drawWobbleLine(ctx, 5, -20, 10, -35, time + 1);
            ctx.stroke();
        }
    }

    private static drawHealthBar(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number) {
        if (enemy.currentHealth < enemy.maxHealth) {
            const barWidth = 30 * scale;
            const barY = -35 * scale;

            // Background line
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-barWidth / 2, barY);
            ctx.lineTo(barWidth / 2, barY);
            ctx.stroke();

            // Health line
            const pct = enemy.currentHealth / enemy.maxHealth;
            let color = '#4caf50';
            if (pct < 0.3) color = '#f44336';
            else if (pct < 0.6) color = '#ff9800';

            ctx.strokeStyle = color; // Colored ink for HP? Or just black?
            // "Juice" rule: HP should be readable, so color is good.

            ctx.lineWidth = 3;
            ctx.beginPath();
            // Scribbly line for HP
            const endX = -barWidth / 2 + (barWidth * pct);
            ctx.moveTo(-barWidth / 2, barY);
            ctx.lineTo(endX, barY);
            ctx.stroke();
        }
    }
}
