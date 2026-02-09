import { Assets } from '../Assets';
import { CONFIG, getEnemyType } from '../Config';
import type { Enemy } from '../Enemy';
import { UnitRenderer, DefaultUnitRenderer } from './units/UnitRenderer';
import { SkeletonUnitRenderer } from './units/SkeletonUnitRenderer';
import { HellhoundUnitRenderer } from './units/HellhoundUnitRenderer';
import { OrcUnitRenderer } from './units/OrcUnitRenderer';
import { WraithUnitRenderer } from './units/WraithUnitRenderer';
import { GoblinUnitRenderer } from './units/GoblinUnitRenderer';

import { SpiderUnitRenderer } from './units/SpiderUnitRenderer';
import { SkeletonCommanderUnitRenderer } from './units/SkeletonCommanderUnitRenderer';

import { TrollUnitRenderer } from './units/TrollUnitRenderer';
import { RatUnitRenderer } from './units/RatUnitRenderer';
import { MagmaUnitRenderer } from './units/MagmaUnitRenderer';
import { FleshUnitRenderer } from './units/FleshUnitRenderer';

export class EnemyRenderer {
    // Registry of specific renderers (Singleton/Stateless instances)
    private static defaultRenderer: UnitRenderer = new DefaultUnitRenderer();
    private static renderers: Record<string, UnitRenderer> = {
        'SKELETON': new SkeletonUnitRenderer(),
        'WOLF': new DefaultUnitRenderer(),
        'TROLL': new TrollUnitRenderer(),
        'SPIDER': new SpiderUnitRenderer(),
        'HELLHOUND': new HellhoundUnitRenderer(),
        'ORC': new OrcUnitRenderer(),
        'WRAITH': new WraithUnitRenderer(),
        'GOBLIN': new GoblinUnitRenderer(),
        'SKELETON_COMMANDER': new SkeletonCommanderUnitRenderer(),
        'RAT': new RatUnitRenderer(),
        'MAGMA': new MagmaUnitRenderer(),
        'FLESH': new FleshUnitRenderer(),
    };

    static drawSprite(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        // PERF: Use cached typeConfig instead of getEnemyType() per frame
        const typeConf = enemy.typeConfig || { scale: 1.0, archetype: 'SKELETON', props: [], color: '#fff' };

        // Defaults
        const scale = typeConf.scale || 1.0;
        const archetype = typeConf.archetype || 'SKELETON';
        const props = typeConf.props || [];

        ctx.save();
        ctx.translate((enemy.x | 0), (enemy.y | 0));

        // PERF: Use cached moveAngle from enemy.move()
        const moveAngle = enemy.moveAngle || 0;

        // 2. Breathing (pulsation) - PERF: use performance.now() instead of Date.now()
        // FIXED: enemy.id is number now, so we use modulo for variation
        const breathePhase = (performance.now() * 0.001) + ((enemy.id % 100) * 0.5);
        const breatheScale = 1.0 + Math.sin(breathePhase) * 0.03;
        ctx.scale(breatheScale, breatheScale);

        // -- VISUAL STACK --

        // 1. Shadow Layer
        EnemyRenderer.drawShadow(ctx, scale);

        // 2. Body Layer (STRATEGY PATTERN DELEGATION)
        const renderer = EnemyRenderer.renderers[archetype] || EnemyRenderer.defaultRenderer;
        try {
            renderer.drawBody(ctx, enemy, scale, moveAngle);
        } catch (e) {
            console.error(`Renderer failed for ${archetype}`, e);
            EnemyRenderer.defaultRenderer.drawBody(ctx, enemy, scale, moveAngle);
        }

        // 3. Props Layer
        if (props.length > 0) {
            for (let i = 0; i < props.length; i++) {
                const propImg = Assets.get(props[i]);
                if (propImg) {
                    const pSize = 32 * scale;
                    const pHalf = pSize / 2;
                    ctx.drawImage(propImg, -pHalf, -pHalf, pSize, pSize);
                }
            }
        }

        // 3.5. Status Particles Layer
        EnemyRenderer.drawStatusEffects(ctx, enemy);

        ctx.restore();
    }

    static drawUI(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        // PERF: Use cached typeConfig
        const typeConf = enemy.typeConfig || { scale: 1.0 };
        const scale = typeConf.scale || 1.0;

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
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
            // PERF: use performance.now() instead of Date.now()
            const time = performance.now() * 0.003;
            for (let i = 0; i < 3; i++) {
                const angle = time + (i * Math.PI * 2 / 3);
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

            if (enemy.isInvulnerable) {
                hpColor = '#ffd700'; // Gold if immune
            } else if (hpPercent < 0.3) {
                hpColor = '#f44336'; // red
            } else if (hpPercent < 0.6) {
                hpColor = '#ff9800'; // orange
            }

            ctx.fillStyle = hpColor;
            ctx.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
        }
    }
    static drawEmissive(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        // PERF: Use cached typeConfig
        const typeConf = enemy.typeConfig || { scale: 1.0, archetype: 'SKELETON' };
        const scale = typeConf.scale || 1.0;
        const archetype = typeConf.archetype || 'SKELETON';

        const renderer = EnemyRenderer.renderers[archetype] || EnemyRenderer.defaultRenderer;
        if (renderer.drawEmissive) {
            ctx.save();
            ctx.translate(enemy.x, enemy.y);

            // PERF: Use cached moveAngle instead of recalculating
            const moveAngle = enemy.moveAngle || 0;

            renderer.drawEmissive(ctx, enemy, scale, moveAngle);
            ctx.restore();
        }
    }
}
