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

        // STYLE: Top-Down Shadow Puppets
        // View from above. Distinct silhouettes.

        if (enemy.hitFlashTimer > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#ff0000';
            ctx.globalAlpha = 0.8;
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.strokeStyle = '#1a1a1a';
            // Slight tint for variety
            if (color && color !== '#e0e0e0') {
                // Optional tint logic if needed
            }
        }

        ctx.lineWidth = 2;

        if (archetype === 'SKELETON') {
            // TOP-DOWN: Skull + Shoulders + Weapon poking out
            ctx.beginPath();
            // Head (Skull) - prominent circle
            ctx.arc(4, 0, 7, 0, Math.PI * 2);
            ctx.fill();

            // Commander Crown
            if (enemy.typeId === 'skeleton_commander') {
                ctx.strokeStyle = '#ffd700'; // Gold
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -7);
                ctx.lineTo(2, -12);
                ctx.lineTo(4, -7);
                ctx.lineTo(6, -12);
                ctx.lineTo(8, -7);
                ctx.stroke();
            }

            // Shoulders (Line/Bar)
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.moveTo(4, -8); ctx.lineTo(4, 8);
            ctx.stroke();

            // Weapon (Spear/Sword) held forward (left side relative to rotation)
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(4, -8); // Shoulder
            ctx.lineTo(20, -10); // Tip forward
            ctx.stroke();

            // Shield/Arm on other side
            ctx.beginPath();
            ctx.moveTo(4, 8);
            ctx.lineTo(12, 10);
            ctx.stroke();

        } else if (archetype === 'WOLF' || archetype === 'SCOUT') {
            // TOP-DOWN: Dart / Wedge shape
            // Narrow nose forward, wide shoulders back
            ctx.beginPath();
            ctx.moveTo(20, 0);   // Nose
            ctx.lineTo(-5, 8);   // Back Left
            ctx.lineTo(-2, 0);   // Spine dip
            ctx.lineTo(-5, -8);  // Back Right
            ctx.closePath();
            ctx.fill();

            // Tail
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            const tailWag = Math.sin(time * 20) * 5;
            ctx.lineTo(-15, tailWag);
            ctx.stroke();
            ctx.stroke();

        } else if (archetype === 'TROLL') {
            // Heavy Blob Silhouette
            ctx.beginPath();
            // Head
            ctx.arc(0, -9, 8, 0, Math.PI * 2);
            // Body (Big circle)
            ctx.arc(0, 10, 16, 0, Math.PI * 2);
            ctx.fill();

            // Arms (thick stroke)
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-12, 0); ctx.lineTo(-24, 10); // Left Arm
            ctx.moveTo(12, 0); ctx.lineTo(24, 10);   // Right Arm
            ctx.stroke();

            // Armored Troll Shield?
            if (enemy.id.includes('armored') || enemy.typeId === 'troll_armored') {
                ctx.fillStyle = '#424242';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.rect(14, 0, 8, 18); // Shield on right arm
                ctx.fill();
                ctx.stroke();
            }

        } else if (archetype === 'SPIDER' || archetype === 'BOSS') {
            // Spider Silhouette
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2); // Body
            ctx.arc(0, -12, 6, 0, Math.PI * 2); // Head
            ctx.fill();

            // Legs (strokes)
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angleL = -Math.PI / 2 - (Math.PI / 6 * i);
                const angleR = -Math.PI / 2 + (Math.PI / 6 * i);
                const len = 28;

                // Left legs
                ctx.beginPath();
                ctx.moveTo(-5, 0);
                ctx.lineTo(Math.cos(angleL) * len, Math.sin(angleL) * len);
                ctx.stroke();

                // Right legs
                ctx.beginPath();
                ctx.moveTo(5, 0);
                ctx.lineTo(Math.cos(angleR) * len, Math.sin(angleR) * len);
                ctx.stroke();
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
