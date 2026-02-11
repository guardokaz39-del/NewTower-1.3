import { AssetCache } from './AssetCache';
import { UnitRenderer } from '../renderers/units/UnitRenderer';
import { Enemy } from '../Enemy';

export class SpriteBaker {
    private static readonly FRAMES = 32; // Higher framerate for smoothness (32 frames)
    private static readonly SIZE = 96;   // 1.5x Tile Size (64) -> 96 for extra detail/weapons

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

        for (let i = 0; i < this.FRAMES; i++) {
            const frameKey = `unit_${typeId}_walk_${i}`;

            // Normalized time (0.0 -> 1.0)
            const t = i / this.FRAMES;

            AssetCache.get(frameKey, (ctx, w, h) => {
                ctx.translate(w / 2, h / 2);

                // Invoke renderer
                if (renderer.drawFrame) {
                    renderer.drawFrame(ctx, mockEnemy, t);
                }
            }, this.SIZE, this.SIZE);
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
