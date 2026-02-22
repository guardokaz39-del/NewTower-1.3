import { AssetCache } from './AssetCache';
import { UnitRenderer } from '../renderers/units/UnitRenderer';
import { Enemy } from '../Enemy';

export class SpriteBaker {
    private static readonly WALK_FRAMES = 32; // Higher framerate for smoothness (32 frames)
    private static readonly IDLE_FRAMES = 12; // Lower framerate for breathing/idle (12 frames)
    private static readonly SIZE = 96;   // 1.5x Tile Size (64) -> 96 for extra detail/weapons

    /**
     * Bakes the animations for a specific renderer.
     * Generates individual frames in cache for both 'walk' and 'idle' states.
     * Output keys: 'unit_orc_walk_0', 'unit_orc_idle_0'...
     */
    public static bakeWalkCycle(typeId: string, renderer: UnitRenderer) {
        console.log(`[SpriteBaker] Baking ${this.WALK_FRAMES} walk and ${this.IDLE_FRAMES} idle frames for "${typeId}"...`);

        const mockEnemyWalk = {
            typeId: typeId,
            x: 0,
            y: 0,
            currentHealth: 100,
            maxHealth: 100,
            speed: 1,
            baseSpeed: 1,
            finished: false,
            hitFlashTimer: 0,
            isMoving: true // Signal to renderer
        } as any;

        const mockEnemyIdle = {
            ...mockEnemyWalk,
            isMoving: false // Signal for idle breathing/pulsing
        } as any;

        const facings = renderer.getBakeFacings ? renderer.getBakeFacings() : ['SIDE'] as const;

        for (const facing of facings) {
            // 1. Bake Walk Cycle
            this.bakeSet(typeId, facing, renderer, mockEnemyWalk, 'walk', this.WALK_FRAMES);

            // 2. Bake Idle Cycle
            this.bakeSet(typeId, facing, renderer, mockEnemyIdle, 'idle', this.IDLE_FRAMES);
        }
    }

    private static bakeSet(
        typeId: string,
        facing: 'SIDE' | 'UP' | 'DOWN',
        renderer: UnitRenderer,
        mockEnemy: any,
        animSet: 'walk' | 'idle',
        frameCount: number
    ) {
        // Compatibility check: if only SIDE is supported and we bake WALK, use legacy key format.
        // Otherwise, use explicit DIR3 + AnimSet format.
        const facingsCount = renderer.getBakeFacings ? renderer.getBakeFacings().length : 1;
        const useLegacyKey = (facingsCount === 1 && facing === 'SIDE' && animSet === 'walk');

        for (let i = 0; i < frameCount; i++) {
            let frameKey: string;
            if (useLegacyKey) {
                frameKey = `unit_${typeId}_walk_${i}`;
            } else {
                frameKey = `unit_${typeId}_${facing.toLowerCase()}_${animSet}_${i}`;
            }

            // Normalized time (0.0 -> 1.0)
            const t = i / frameCount;

            AssetCache.get(frameKey, (ctx, w, h) => {
                ctx.translate(w / 2, h / 2);

                if (renderer.drawFrameDirectional) {
                    renderer.drawFrameDirectional(ctx, mockEnemy, t, facing);
                } else if (renderer.drawFrame) {
                    renderer.drawFrame(ctx, mockEnemy, t);
                }
            }, this.SIZE, this.SIZE);

            // Generate White Silhouette for Hit Flash (Pre-baked)
            const sprite = AssetCache.peek(frameKey);
            if (sprite) {
                const silhouetteKey = frameKey + '_white';
                AssetCache.get(silhouetteKey, (ctxS, w, h) => {
                    ctxS.drawImage(sprite, 0, 0);
                    ctxS.globalCompositeOperation = 'source-in';
                    ctxS.fillStyle = '#ffffff';
                    ctxS.fillRect(0, 0, w, h);
                }, this.SIZE, this.SIZE);
            }
        }
    }

    /**
     * Retrieves a specific frame from the cache based on game time and state.
     */
    public static getFrame(
        typeId: string,
        gameTime: number,
        cycleDuration: number,
        animSet: 'walk' | 'idle' = 'walk',
        facing: 'SIDE' | 'UP' | 'DOWN' = 'SIDE'
    ): HTMLCanvasElement | undefined {

        const frameCount = animSet === 'walk' ? this.WALK_FRAMES : this.IDLE_FRAMES;
        const t = (gameTime % cycleDuration) / cycleDuration;
        const frameIndex = Math.floor(t * frameCount);

        // Legacy fallback check: if asking for SIDE walk without specific renderer knowledge,
        // we assume the key might be in legacy format 'unit_orc_walk_0'.
        // To be safe, try new format first, then fallback.
        const explicitKey = `unit_${typeId.toLowerCase()}_${facing.toLowerCase()}_${animSet}_${frameIndex}`;
        let sprite = AssetCache.peek(explicitKey);

        if (!sprite && animSet === 'walk' && facing === 'SIDE') {
            const legacyKey = `unit_${typeId.toLowerCase()}_walk_${frameIndex}`;
            sprite = AssetCache.peek(legacyKey);
        }

        return sprite;
    }
}
