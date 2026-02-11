import { UnitRenderer } from './UnitRenderer';
import { Assets } from '../../Assets';
import type { Enemy } from '../../Enemy';

export type SpriteOrientationMode = 'ROTATE' | 'FLIP' | 'DIR3';
export type SpriteFacing = 'SIDE' | 'UP' | 'DOWN';

/**
 * Base class for UnitRenderers that supports Sprite Baking.
 * Automatically handles sprite lookup, rotation, and basic hit flash.
 * Falls back to abstract `drawFrame` (procedural) if sprite is missing.
 */
export abstract class CachedUnitRenderer implements UnitRenderer {

    // Multiplier for walk cycle speed. 
    // Orc: 0.1, Goblin: 0.25, etc.
    // Default: 0.15
    protected walkCycleMultiplier: number = 0.15;

    // Sprite size (default 96 for baked sprites)
    protected spriteSize: number = 96;

    // Orientation of baked sprites
    protected orientationMode: SpriteOrientationMode = 'FLIP';

    /**
     * If your sprite is authored “facing up” instead of “facing right” etc.
     * Only used in ROTATE mode.
     */
    protected baseRotationOffset: number = 0;

    /**
     * Facing thresholds (radians). You can tweak per-project.
     */
    protected facingUpMin = -2.35;
    protected facingUpMax = -0.78;
    protected facingDownMin = 0.78;
    protected facingDownMax = 2.35;

    /**
     * Draws a single frame for baking or fallback.
     * @param t Normalized time (0..1)
     */
    abstract drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void;

    /**
     * Standard draw method called by EnemyRenderer.
     */
    /**
     * Standard draw method called by EnemyRenderer.
     */
    public drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.001;
        const walkCycle = time * (enemy.baseSpeed * this.walkCycleMultiplier);

        // Calculate normalized time t (0..1) for the cycle
        const t = (walkCycle % (Math.PI * 2)) / (Math.PI * 2);

        // Try to get Cached Sprite
        // We assume 32 frames for the walk cycle (standard in SpriteBaker)
        const frameIdx = Math.floor(t * 32) % 32;
        const frameKey = `unit_${enemy.typeId}_walk_${frameIdx}`;
        const sprite = Assets.get(frameKey);

        if (sprite) {
            ctx.save();
            ctx.rotate(rotation);
            const size = this.spriteSize * scale;
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);

            // Optimized Hit Flash (Source-Atop - extremely fast)
            if (enemy.hitFlashTimer > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
            ctx.restore();

            // Draw extra effects if implemented by subclass (e.g. Magma particles)
            this.drawEffects(ctx, enemy, scale);
        } else {
            // Fallback: Procedural Draw
            // We rotate the context so the procedural draw (usually Side view) matches direction
            ctx.save();
            ctx.rotate(rotation);
            this.drawFrame(ctx, enemy, t);
            ctx.restore();

            // Draw effects for fallback too
            this.drawEffects(ctx, enemy, scale);
        }
    }

    protected getFacing(rotation: number): SpriteFacing {
        if (rotation > this.facingUpMin && rotation < this.facingUpMax) return 'UP';
        if (rotation > this.facingDownMin && rotation < this.facingDownMax) return 'DOWN';
        return 'SIDE';
    }

    protected isFacingLeft(rotation: number): boolean {
        // cos < 0 => движение “влево”
        return Math.cos(rotation) < 0;
    }

    protected getSpriteKey(enemyTypeId: string, frameIdx: number, facing: SpriteFacing): string {
        // Backward compatible: old baked keys without facing
        if (this.orientationMode !== 'DIR3') return `unit_${enemyTypeId}_walk_${frameIdx}`;
        return `unit_${enemyTypeId}_${facing.toLowerCase()}_walk_${frameIdx}`;
    }

    /**
     * Directional draw hook for baking/fallback in DIR3 mode.
     * Default: just call drawFrame (side).
     */
    protected drawFrameDirectional(
        ctx: CanvasRenderingContext2D,
        enemy: Enemy,
        t: number,
        facing: SpriteFacing
    ): void {
        this.drawFrame(ctx, enemy, t);
    }

    /**
     * Optional hook for drawing effects (particles, etc.) on top of the body.
     * These are NOT baked into the sprite.
     */
    protected drawEffects(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number): void {
        // Override in subclasses
    }
}
