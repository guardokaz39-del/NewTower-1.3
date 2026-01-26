import { FogStructure } from '../FogStructure';
import { CONFIG } from '../Config';
import { InkUtils } from './InkUtils';
import { INK_CONFIG } from './InkConfig';

/**
 * Ink Fog Renderer - Draws fog as "scribbled out" areas on top of the map.
 * OPTIMIZED: Uses pre-rendered Hatch Pattern to avoid thousands of line draws per frame.
 */
export class InkFogRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private patternCanvas: HTMLCanvasElement;
    private pattern: CanvasPattern | null = null;

    constructor(width: number, height: number, seed?: number) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        const context = this.canvas.getContext('2d');
        if (!context) throw new Error('Failed to create ink fog render context');
        this.ctx = context;

        // Create the hatch pattern once (64x64 tileableish)
        this.patternCanvas = document.createElement('canvas');
        this.patternCanvas.width = 64;
        this.patternCanvas.height = 64;
        this.generateHatchPattern();
    }

    private generateHatchPattern() {
        const pCtx = this.patternCanvas.getContext('2d')!;
        pCtx.strokeStyle = INK_CONFIG.PALETTE.INK;
        pCtx.lineWidth = 1.5;
        pCtx.lineCap = 'round';

        // Clear
        pCtx.clearRect(0, 0, 64, 64);

        // Draw dense scribbles
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 64;
            const y = Math.random() * 64;
            const len = 10 + Math.random() * 20;
            const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.5; // Mostly diagonal

            pCtx.beginPath();
            pCtx.moveTo(x, y);
            pCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            pCtx.stroke();
        }

        this.pattern = this.ctx.createPattern(this.patternCanvas, 'repeat');
    }

    public render(structures: FogStructure[], time: number): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const TS = CONFIG.TILE_SIZE;

        if (!this.pattern) return;

        ctx.save();
        ctx.fillStyle = this.pattern;

        // We can shift the pattern slightly with time to make it feel alive without redrawing lines
        // Translate matrix for pattern
        const matrix = new DOMMatrix();
        // Slow drift or jitter
        matrix.translateSelf(Math.sin(time * 0.05) * 5, Math.cos(time * 0.03) * 5);
        this.pattern.setTransform(matrix);

        ctx.beginPath();
        for (const structure of structures) {
            for (const tile of structure.tiles) {
                if (tile.density === 0) continue;

                const cx = tile.x * TS;
                const cy = tile.y * TS;

                // Draw a rect for the tile
                // We overlap slightly to avoid gaps
                ctx.rect(cx - 2, cy - 2, TS + 4, TS + 4);
            }
        }
        ctx.fill();
        ctx.restore();
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }
}
