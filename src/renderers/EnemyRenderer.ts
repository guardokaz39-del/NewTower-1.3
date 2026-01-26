import { Assets } from '../Assets';
import { CONFIG, getEnemyType } from '../Config';
import type { Enemy } from '../Enemy';

export class EnemyRenderer {
    static draw(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        const safeType = enemy.typeId ? enemy.typeId.toLowerCase() : 'grunt';
        const typeConf = getEnemyType(safeType.toUpperCase()) || getEnemyType('GRUNT');

        // Defaults
        const scale = typeConf?.scale || 1.0;
        const archetype = typeConf?.archetype || 'SKELETON';
        const props = typeConf?.props || [];
        const baseColor = typeConf?.color || '#fff';
        const tint = typeConf?.tint;

        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // === ANIMATIONS ===

        // 1. Rotation towards movement - simplified, relies on enemy internal state or passed as argument if needed, 
        // but here we calculate it from enemy path data if available, or just use existing logic.
        // Enemy class exposes 'path', 'pathIndex'.

        // Wait, 'path' is private in Enemy? No, I saw it was used in draw() in Enemy.ts so it must be accessible or local logic.
        // In Enemy.ts logic: "if (this.pathIndex < this.path.length - 1)"
        // But 'path' is private in the Enemy class definition I saw in step 12.
        // Wait... in step 12 output:
        // "private path: { x: number; y: number }[];" (Line 34)
        // BUT "public draw(ctx)" (Line 168) uses "this.path". Private members are accessible inside the class.
        // If I move this to Renderer, I cannot access 'path' if it is private!

        // CRITICAL FIX: I need to change access modifiers in Enemy.ts or expose a getter.
        // Since I am already planning to modify Enemy.ts, I will make 'path' public there.
        // For now, I will assume it is accessible (I will update Enemy.ts in the next step).

        // @ts-ignore - access private for now, will fix in Enemy.ts
        const path = enemy['path'];
        const pathIndex = enemy.pathIndex;

        if (path && pathIndex < path.length - 1) {
            const next = path[pathIndex];
            const dx = next.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - enemy.x;
            const dy = next.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - enemy.y;
            const moveAngle = Math.atan2(dy, dx);
            ctx.rotate(moveAngle + Math.PI / 2); // Rotate sprite to face movement direction
        }

        // 2. Breathing (pulsation)
        const breathePhase = (Date.now() * 0.001) + (parseInt(enemy.id.slice(-3), 36) * 0.5);
        const breatheScale = 1.0 + Math.sin(breathePhase) * 0.03;
        ctx.scale(breatheScale, breatheScale);

        // 3. Movement arc (vertical bob)
        const walkCycle = (Date.now() * 0.01) % (Math.PI * 2);
        const verticalBob = Math.abs(Math.sin(walkCycle)) * 2;
        ctx.translate(0, -verticalBob);

        // -- VISUAL STACK --

        // 0. RIM LIGHT
        EnemyRenderer.drawRimLight(ctx, tint || baseColor, scale);

        // 1. Shadow Layer
        EnemyRenderer.drawShadow(ctx, scale);

        // 2. Body Layer
        EnemyRenderer.drawBody(ctx, archetype, scale, tint, enemy);

        // 3. Props Layer
        if (props.length > 0) {
            props.forEach(propId => {
                const propImg = Assets.get(propId);
                if (propImg) {
                    const pSize = 32 * scale;
                    const pHalf = pSize / 2;
                    ctx.drawImage(propImg, -pHalf, -pHalf, pSize, pSize);
                }
            });
        }

        // 3.5. Status Particles Layer
        EnemyRenderer.drawStatusEffects(ctx, enemy);

        // 4. UI Layer (HP Bar)
        EnemyRenderer.drawHealthBar(ctx, enemy, scale);

        ctx.restore();
    }

    private static drawRimLight(ctx: CanvasRenderingContext2D, color: string, scale: number) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;

        const rimSize = (48 * scale) * 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, rimSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    private static drawShadow(ctx: CanvasRenderingContext2D, scale: number) {
        const shadowImg = Assets.get('shadow_small');
        if (shadowImg) {
            const shadowW = 32 * scale;
            const shadowH = 16 * scale;
            ctx.drawImage(shadowImg, -shadowW / 2, -shadowH / 2 + 10 * scale, shadowW, shadowH);
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            const shadowW = 16 * scale;
            const shadowH = 8 * scale;
            ctx.ellipse(0, 10 * scale, shadowW, shadowH, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private static drawBody(ctx: CanvasRenderingContext2D, archetype: string, scale: number, tint: string | undefined, enemy: Enemy) {
        const bodyImgName = `enemy_${archetype.toLowerCase()}`;
        const bodyImg = Assets.get(bodyImgName);

        if (bodyImg) {
            const size = 48 * scale;
            const half = size / 2;

            ctx.drawImage(bodyImg, -half, -half, size, size);

            if (tint) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = tint;
                ctx.globalAlpha = 0.5;
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }

            // Hit Flash
            if (enemy.hitFlashTimer > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.8;
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }

            // Status Tints
            if (enemy.statuses.some(s => s.type === 'slow')) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = CONFIG.AMBIENT.LIGHTING.ICE || '#00e5ff';
                ctx.globalAlpha = 0.4;
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }
            if (enemy.statuses.some(s => s.type === 'burn')) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = CONFIG.AMBIENT.LIGHTING.FIRE || '#ff3d00';
                ctx.globalAlpha = 0.4;
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }
        } else {
            // Fallback
            ctx.fillStyle = tint || '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 16 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private static drawStatusEffects(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        if (enemy.statuses.some(s => s.type === 'slow')) {
            for (let i = 0; i < 3; i++) {
                const angle = (Date.now() * 0.003) + (i * Math.PI * 2 / 3);
                const orbX = Math.cos(angle) * 20;
                const orbY = Math.sin(angle) * 20;
                ctx.fillStyle = '#4fc3f7';
                ctx.beginPath();
                ctx.arc(orbX, orbY, 3, 0, Math.PI * 2);
                ctx.fill();
                // Inner glow
                ctx.fillStyle = '#e1f5fe';
                ctx.beginPath();
                ctx.arc(orbX, orbY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private static drawHealthBar(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number) {
        if (enemy.currentHealth < enemy.maxHealth) {
            const barWidth = CONFIG.UI.HP_BAR_WIDTH;
            const barHeight = CONFIG.UI.HP_BAR_HEIGHT;
            const barY = -30 * scale;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

            // Health bar
            const hpPercent = enemy.currentHealth / enemy.maxHealth;
            let hpColor = '#4caf50'; // green
            if (hpPercent < 0.3) hpColor = '#f44336'; // red
            else if (hpPercent < 0.6) hpColor = '#ff9800'; // orange

            ctx.fillStyle = hpColor;
            ctx.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
        }
    }
}
