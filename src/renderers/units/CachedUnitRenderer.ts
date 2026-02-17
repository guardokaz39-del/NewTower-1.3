import { UnitRenderer } from './UnitRenderer';
import { Assets } from '../../Assets';
import { FrameClock } from '../../utils/FrameClock';
import { PerformanceProfiler } from '../../utils/PerformanceProfiler';
import { BakedSpriteRegistry } from './BakedSpriteRegistry';
import type { Enemy } from '../../Enemy';
import { normalizeUnitTypeId } from './unitTypeIdNormalization';

export type SpriteOrientationMode = 'ROTATE' | 'FLIP' | 'DIR3';
export type SpriteFacing = 'SIDE' | 'UP' | 'DOWN';

/**
 * Base class for UnitRenderers that supports Sprite Baking.
 * Automatically handles sprite lookup, rotation, and basic hit flash.
 * Falls back to abstract `drawFrame` (procedural) if sprite is missing.
 */
export abstract class CachedUnitRenderer implements UnitRenderer {
    private static readonly MAX_DEBUG_LOGS_PER_TYPE = 3;
    private static missingRegistryLogCountByType: Map<string, number> = new Map();

    // Multiplier for walk cycle speed.
    // Orc: 0.1, Goblin: 0.25, etc.
    // Default: 0.15
    protected walkCycleMultiplier: number = 0.15;

    // Sprite size (default 96 for baked sprites)
    protected spriteSize: number = 96;

    // Orientation of baked sprites
    // Default: 'ROTATE' for backward compatibility (Top-Down units, Projectiles)
    protected orientationMode: SpriteOrientationMode = 'ROTATE';

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
    public drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = FrameClock.nowSec;
        const walkCycle = time * (enemy.baseSpeed * this.walkCycleMultiplier);

        // Calculate normalized time t (0..1) for the cycle
        const t = (walkCycle % (Math.PI * 2)) / (Math.PI * 2);

        // Try to get Cached Sprite
        // We assume 32 frames for the walk cycle (standard in SpriteBaker)
        const frameIdx = Math.floor(t * 32) % 32;

        // Determine facing for key generation (needed for DIR3)
        const facing = this.getFacing(rotation);
        const runtimeTypeId = enemy.typeId;
        const baseTypeId = normalizeUnitTypeId(runtimeTypeId, enemy);
        const expectedKey = this.getSpriteKey(baseTypeId, frameIdx, facing);
        const runtimeKey = this.getSpriteKey(runtimeTypeId, frameIdx, facing);

        let sprite: HTMLCanvasElement | HTMLImageElement | undefined = BakedSpriteRegistry.get(baseTypeId, facing, frameIdx);

        if (!sprite && baseTypeId !== runtimeTypeId) {
            sprite = BakedSpriteRegistry.get(runtimeTypeId, facing, frameIdx);
        }

        if (!sprite) {
            this.logMissingBakedFrame(runtimeTypeId, facing, frameIdx, expectedKey, baseTypeId);
        }

        if (!sprite) {
            sprite = Assets.get(runtimeKey);
            if ((globalThis as any).ENABLE_STRESS_PROFILING === true || (import.meta as any).env?.DEV) {
                PerformanceProfiler.inc('unitSpriteFallback');
            }
        }

        if (sprite) {
            ctx.save();
            const size = this.spriteSize * scale;

            // --- ORIENTATION LOGIC ---
            if (this.orientationMode === 'ROTATE') {
                // Classic Top-Down: Rotate the context match direction
                ctx.rotate(rotation + this.baseRotationOffset);
            } else if (this.orientationMode === 'FLIP') {
                // Side-View: Flip horizontally if moving left. NEVER rotate.
                if (this.isFacingLeft(enemy, rotation)) {
                    ctx.scale(-1, 1);
                }
            } else {
                // DIR3: 3-Directional (SIDE / UP / DOWN)
                // SIDE: Flip if left
                // UP/DOWN: No flip, no rotate
                if (facing === 'SIDE' && this.isFacingLeft(enemy, rotation)) {
                    ctx.scale(-1, 1);
                }
            }

            // Draw Centered
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
            ctx.save();

            if (this.orientationMode === 'ROTATE') {
                ctx.rotate(rotation + this.baseRotationOffset);
                this.drawFrame(ctx, enemy, t);
            } else if (this.orientationMode === 'FLIP') {
                if (this.isFacingLeft(enemy, rotation)) ctx.scale(-1, 1);
                this.drawFrame(ctx, enemy, t);
            } else {
                // DIR3 Fallback
                if (facing === 'SIDE' && this.isFacingLeft(enemy, rotation)) ctx.scale(-1, 1);
                this.drawFrameDirectional(ctx, enemy, t, facing);
            }

            ctx.restore();

            // Draw effects for fallback too
            this.drawEffects(ctx, enemy, scale);
        }
    }

    protected getFacing(rotation: number): SpriteFacing {
        // Normalize rotation to -PI..PI if needed, but usually it is.
        // Canvas angles: 0=Right, PI/2=Down, -PI/2=Up
        if (rotation > -Math.PI / 4 * 3 && rotation < -Math.PI / 4) return 'UP'; // Approx -135 to -45 deg
        if (rotation > Math.PI / 4 && rotation < Math.PI / 4 * 3) return 'DOWN'; // Approx 45 to 135 deg
        return 'SIDE';
    }

    protected isFacingLeft(enemy: Enemy, rotation: number): boolean {
        // PREFERRED: Use persistent state to avoid jitter (walking backwards)
        return enemy.lastFacingLeft;
    }

    protected getSpriteKey(enemyTypeId: string, frameIdx: number, facing: SpriteFacing): string {
        // Compatibility: ROTATE and FLIP modes use the legacy "walk_N" keys (side view baked)
        if (this.orientationMode !== 'DIR3') return `unit_${enemyTypeId}_walk_${frameIdx}`;
        // DIR3 uses directional keys
        return `unit_${enemyTypeId}_${facing.toLowerCase()}_walk_${frameIdx}`;
    }

    private logMissingBakedFrame(runtimeTypeId: string, facing: SpriteFacing, frameIdx: number, expectedKey: string, normalizedTypeId: string): void {
        const isDebugEnabled = (globalThis as any).ENABLE_STRESS_PROFILING === true || (import.meta as any).env?.DEV;
        if (!isDebugEnabled) return;

        PerformanceProfiler.inc('unitSpriteMissing');
        PerformanceProfiler.inc(`unitSpriteMissingByType:${runtimeTypeId}`);

        const loggedCount = CachedUnitRenderer.missingRegistryLogCountByType.get(runtimeTypeId) || 0;
        if (loggedCount >= CachedUnitRenderer.MAX_DEBUG_LOGS_PER_TYPE) return;

        CachedUnitRenderer.missingRegistryLogCountByType.set(runtimeTypeId, loggedCount + 1);
        console.warn('[CachedUnitRenderer] Missing baked registry frame', {
            typeId: runtimeTypeId,
            normalizedTypeId,
            facing,
            frameIdx,
            expectedKey,
        });
    }

    /**
     * Directional draw hook for baking/fallback in DIR3 mode.
     * Default: just call drawFrame (side).
     */
    public drawFrameDirectional(
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
