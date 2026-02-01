import { Assets } from '../Assets';
import { CONFIG, getEnemyType } from '../Config';
import type { Enemy } from '../Enemy';
import { UnitRenderer, DefaultUnitRenderer } from './units/UnitRenderer';
import { SkeletonUnitRenderer } from './units/SkeletonUnitRenderer';

export class EnemyRenderer {
    // Registry of specific renderers (Singleton/Stateless instances)
    private static defaultRenderer: UnitRenderer = new DefaultUnitRenderer();
    private static renderers: Record<string, UnitRenderer> = {
        'SKELETON': new SkeletonUnitRenderer(),
    };

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

        // 1. Rotation towards movement
        const path = enemy.path;
        const pathIndex = enemy.pathIndex;
        let moveAngle = 0;

        if (path && pathIndex < path.length - 1) {
            const next = path[pathIndex];
            const dx = next.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - enemy.x;
            const dy = next.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - enemy.y;
            moveAngle = Math.atan2(dy, dx);
            // ctx.rotate moved to individual renderers to support Upright perspective
        }

        // 2. Breathing (pulsation)
        const breathePhase = (Date.now() * 0.001) + (parseInt(enemy.id.slice(-3), 36) * 0.5);
        const breatheScale = 1.0 + Math.sin(breathePhase) * 0.03;
        ctx.scale(breatheScale, breatheScale);

        // 3. Movement arc (vertical bob)
        const walkCycle = (Date.now() * 0.005) % (Math.PI * 2);
        const verticalBob = Math.abs(Math.sin(walkCycle)) * 2;
        ctx.translate(0, -verticalBob);

        // -- VISUAL STACK --

        // 0. RIM LIGHT
        // Disabled per user request (white circle issue)
        // EnemyRenderer.drawRimLight(ctx, tint || baseColor, scale);

        // 1. Shadow Layer
        EnemyRenderer.drawShadow(ctx, scale);

        // 2. Body Layer (STRATEGY PATTERN DELEGATION)
        const renderer = EnemyRenderer.renderers[archetype] || EnemyRenderer.defaultRenderer;
        try {
            renderer.drawBody(ctx, enemy, scale, moveAngle);
        } catch (e) {
            // Fail-safe: fallback to default if custom renderer crashes
            console.error(`Renderer failed for ${archetype}`, e);
            EnemyRenderer.defaultRenderer.drawBody(ctx, enemy, scale, moveAngle);
        }

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
