import { Assets } from '../../Assets';
import { CONFIG } from '../../Config';
import type { Enemy } from '../../Enemy';

/**
 * Interface for specific unit renderers (Strategy Pattern).
 * Draws ONLY the body/components of the unit. 
 * Coordinate system is already transformed to unit center (0,0) 
 * and rotated by the parent EnemyRenderer.
 */
export interface UnitRenderer {
    /**
     * Draw the unit body.
     * @param ctx Canvas context (pre-translated to 0,0)
     * @param enemy The enemy instance
     * @param scale Visual scale factor
     * @param rotation Rotation in radians (direction of movement)
     */
    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void;

    /**
     * Optional: Draw glowing parts (eyes, runes) that should pierce through fog/darkness.
     * Drawn in a separate pass after lighting.
     */
    drawEmissive?(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void;

    /**
     * Optional: Draw a specific frame of animation for baking.
     * @param t Normalized time (0.0 to 1.0) representing the animation cycle.
     */
    drawFrame?(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void;

    /**
     * Optional: Return supported facings for baking (SIDE, UP, DOWN).
     * If undefined, defaults to ['SIDE'].
     */
    getBakeFacings?(): ('SIDE' | 'UP' | 'DOWN')[];

    /**
     * Optional: Draw a specific frame for a specific facing.
     * Used by SpriteBaker if getBakeFacings includes UP/DOWN.
     */
    drawFrameDirectional?(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number, facing: 'SIDE' | 'UP' | 'DOWN'): void;
}

/**
 * Default renderer for generic enemies (fallback).
 * Implements the classic "Sprite or Circle" logic.
 */
export class DefaultUnitRenderer implements UnitRenderer {

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        // Legacy behavior: rotate sprite to face movement
        ctx.save();
        ctx.rotate(rotation + Math.PI / 2);

        const safeType = enemy.typeId ? enemy.typeId.toLowerCase() : 'grunt';

        // Lookup config using typeId
        const typeConf = Object.values(CONFIG.ENEMY_TYPES).find(t => t.id === safeType);

        const archetype = typeConf?.archetype || 'GRUNT';
        // @ts-ignore - tint is optional in IEnemyTypeConfig but union type might confuse TS
        const tint = typeConf?.tint;

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
            // Fallback (Circle)
            ctx.fillStyle = tint || '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 16 * scale, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
