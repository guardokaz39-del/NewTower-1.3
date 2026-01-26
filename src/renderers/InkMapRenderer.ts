import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { INK_CONFIG } from '../graphics/InkConfig';
import { InkUtils } from '../graphics/InkUtils';
import { PaperTexture } from '../graphics/PaperTexture';
import { InkWatercolor } from '../graphics/InkWatercolor';
import { InkDecorRenderer } from './InkDecorRenderer';

export class InkMapRenderer {
    private static cacheCanvas: HTMLCanvasElement | null = null;
    private static cacheCtx: CanvasRenderingContext2D | null = null;
    private static cachedMapId: string = '';

    /**
     * Draws the map in Ink style. Uses caching to avoid rebuilding the shaky lines every frame.
     */
    static draw(ctx: CanvasRenderingContext2D, map: MapManager) {
        // Init cache if needed
        if (!this.cacheCanvas) {
            this.initCache(map);
            this.redrawCache(map);
        }

        // Draw cached version
        if (this.cacheCanvas) {
            // Draw background (Paper)
            ctx.drawImage(this.cacheCanvas, 0, 0);
        }
    }

    private static initCache(map: MapManager) {
        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = map.cols * CONFIG.TILE_SIZE;
        this.cacheCanvas.height = map.rows * CONFIG.TILE_SIZE;
        this.cacheCtx = this.cacheCanvas.getContext('2d');
    }

    /**
     * Generates the static ink map (heavy operation, runs once)
     */
    private static redrawCache(map: MapManager) {
        if (!this.cacheCtx || !this.cacheCanvas) return;

        const ctx = this.cacheCtx;
        const width = this.cacheCanvas.width;
        const height = this.cacheCanvas.height;
        const TS = CONFIG.TILE_SIZE;

        // 1. Paper Background (Procedural Texture)
        const paperPattern = PaperTexture.generate(width, height);
        ctx.drawImage(paperPattern, 0, 0);

        // 2. Watercolor Biomes (Ground)
        // We iterate tiles and apply washes.
        // To avoid excessive overlap darkness, we could group tiles, but for now tile-by-tile is fine for "chaotic" organic look.

        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                if (map.tiles[y][x] !== 1) { // Ground
                    const seed = x * 101 + y * 13;

                    // Wash effect (Greenish for grass)
                    InkWatercolor.drawRectWash(
                        ctx,
                        x * TS, y * TS, TS, TS,
                        INK_CONFIG.PALETTE.WASH_GREEN,
                        seed
                    );

                    // Details
                    if ((seed % 15) === 0) {
                        this.drawGroundDetail(ctx, x * TS, y * TS, TS, seed);
                    }
                }
            }
        }

        // 3. Grid (Very faint pencil lines)
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(45, 27, 14, 0.03)'; // Even fainter

        for (let x = 0; x <= map.cols; x++) {
            InkUtils.drawWobbleLine(ctx, x * TS, 0, x * TS, height);
        }
        for (let y = 0; y <= map.rows; y++) {
            InkUtils.drawWobbleLine(ctx, 0, y * TS, width, y * TS);
        }

        // 4. Path (Thick ink outlines + Coffee Wash)
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK_CONFIG.PALETTE.INK;

        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                if (map.tiles[y][x] === 1) { // PATH
                    const px = x * TS;
                    const py = y * TS;
                    const seed = x * 59 + y * 97;

                    // Coffee Wash for path (Brownish/Sepia)
                    // We use a custom color derived from shadow/ink for the 'beaten path' look
                    InkWatercolor.drawRectWash(
                        ctx,
                        px, py, TS, TS,
                        '#8d6e63', // Light Brown 
                        seed
                    );

                    // Borders
                    const top = y > 0 && map.tiles[y - 1][x] !== 1;
                    const bottom = y < map.rows - 1 && map.tiles[y + 1][x] !== 1;
                    const left = x > 0 && map.tiles[y][x - 1] !== 1;
                    const right = x < map.cols - 1 && map.tiles[y][x + 1] !== 1;

                    ctx.beginPath();
                    if (top) InkUtils.drawWobbleLine(ctx, px, py, px + TS, py);
                    if (bottom) InkUtils.drawWobbleLine(ctx, px, py + TS, px + TS, py + TS);
                    if (left) InkUtils.drawWobbleLine(ctx, px, py, px, py + TS);
                    if (right) InkUtils.drawWobbleLine(ctx, px + TS, py, px + TS, py + TS);
                    ctx.stroke();
                }
            }
        }

        // 5. Decorations
        if (map.objects) {
            for (const obj of map.objects) {
                const px = obj.x * TS;
                const py = obj.y * TS;
                InkDecorRenderer.draw(ctx, obj.type, px, py, obj.size || 1);
            }
        }

        // 6. Start/End
        if (map.waypoints.length > 0) {
            const start = map.waypoints[0];
            const end = map.waypoints[map.waypoints.length - 1];

            ctx.font = '30px MedievalSharp, cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = INK_CONFIG.PALETTE.INK;
            ctx.fillText('⚡', start.x * TS + TS / 2, start.y * TS + TS / 2);
            ctx.fillText('X', end.x * TS + TS / 2, end.y * TS + TS / 2);
        }

        // 7. Torches
        ctx.fillStyle = '#5d4037';
        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                if (map.tiles[y][x] === 1) {
                    if (y > 0 && map.tiles[y - 1][x] !== 1 && (x + y * 7) % 4 === 0) {
                        ctx.fillRect(x * TS + TS / 2 - 2, y * TS, 4, 8);
                        ctx.beginPath();
                        ctx.strokeStyle = '#e65100';
                        ctx.lineWidth = 1;
                        ctx.arc(x * TS + TS / 2, y * TS + 2, 3, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    private static drawGroundDetail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) {
        const cx = x + size / 2 + ((seed % 10) - 5);
        const cy = y + size / 2 + ((seed % 11) - 5);

        ctx.beginPath();
        if ((seed % 2) === 0) {
            // Grass Tuft (v shape)
            ctx.moveTo(cx - 2, cy);
            ctx.lineTo(cx, cy - 3);
            ctx.lineTo(cx + 2, cy);
        } else {
            // Pebble (small circle)
            ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        }
        ctx.stroke();
    }

    /**
     * Force a cache rebuild (e.g. on resize or level load)
     */
    static invalidateCache() {
        this.cacheCanvas = null;
        this.cacheCtx = null;
    }
}
