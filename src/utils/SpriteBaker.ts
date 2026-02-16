import { AssetCache } from './AssetCache';
import { UnitRenderer } from '../renderers/units/UnitRenderer';
import { Enemy } from '../Enemy';

export class SpriteBaker {
    private static readonly FRAMES = 32; // Higher framerate for smoothness (32 frames)
    private static readonly SIZE = 96; // 1.5x Tile Size (64) -> 96 for extra detail/weapons

    /**
     * Bakes the walk cycle for a specific renderer.
     * Generates a sprite sheet or individual frames in cache.
     * We use individual frames in AssetCache for simplicity: 'unit_orc_walk_0', 'unit_orc_walk_1'...
     */
    public static bakeWalkCycle(typeId: string, renderer: UnitRenderer) {
        console.log(`[SpriteBaker] Baking ${this.FRAMES} frames for "${typeId}"...`);

        // Mock enemy for rendering context (Plain object to avoid side effects)
        const mockEnemy = {
            typeId: typeId, // Some renderers use typeId
            x: 0,
            y: 0,
            currentHealth: 100,
            maxHealth: 100,
            speed: 1,
            baseSpeed: 1,
            finished: false,
            hitFlashTimer: 0,
            // Add other necessary properties as mocks if renderers crash
        } as any;

        const facings = renderer.getBakeFacings ? renderer.getBakeFacings() : (['SIDE'] as const);

        for (const facing of facings) {
            for (let i = 0; i < this.FRAMES; i++) {
                // Key generation: 'walk' for legacy/SIDE-only, or 'facing_walk' for UP/DOWN/SIDE if DIR3
                // We keep 'unit_orc_walk_i' for SIDE if it's the only facing, OR if we want strict compatibility?
                // The plan says: if facings == ['SIDE'] -> unit_${type}_walk_${i}
                // else -> unit_${type}_${facing.toLowerCase()}_walk_${i}

                let frameKey: string;
                if (facings.length === 1 && facings[0] === 'SIDE') {
                    frameKey = `unit_${typeId}_walk_${i}`;
                } else {
                    frameKey = `unit_${typeId}_${facing.toLowerCase()}_walk_${i}`;
                }

                // Normalized time (0.0 -> 1.0)
                const t = i / this.FRAMES;

                AssetCache.get(
                    frameKey,
                    (ctx, w, h) => {
                        ctx.translate(w / 2, h / 2);

                        // Invoke renderer
                        if (renderer.drawFrameDirectional) {
                            renderer.drawFrameDirectional(ctx, mockEnemy, t, facing);
                        } else if (renderer.drawFrame) {
                            // Fallback to standard drawFrame (usually SIDE)
                            renderer.drawFrame(ctx, mockEnemy, t);
                        }
                    },
                    this.SIZE,
                    this.SIZE,
                );

                // [NEW] Generate White Silhouette for Hit Flash (Pre-baked)
                const sprite = AssetCache.peek(frameKey);
                if (sprite) {
                    const silhouetteKey = frameKey + '_white';
                    // Only bake if not exists (or implement a force-bake/peek check inside)
                    // AssetCache.get checks existence, so we just provide the factory.
                    AssetCache.get(
                        silhouetteKey,
                        (ctxS, w, h) => {
                            // Draw the original sprite
                            ctxS.drawImage(sprite, 0, 0);

                            // Composite white on top, keeping alpha
                            ctxS.globalCompositeOperation = 'source-in';
                            ctxS.fillStyle = '#ffffff';
                            ctxS.fillRect(0, 0, w, h);
                        },
                        this.SIZE,
                        this.SIZE,
                    );
                }
            }
        }
    }

    public static getFrame(typeId: string, gameTime: number, cycleDuration: number): HTMLCanvasElement | undefined {
        // Calculate frame index
        const t = (gameTime % cycleDuration) / cycleDuration;
        const frameIndex = Math.floor(t * this.FRAMES);
        const key = `unit_${typeId}_walk_${frameIndex}`;

        // Fixed: Use peek() to avoid creating 1x1 empty canvases
        return AssetCache.peek(key);
    }
}
