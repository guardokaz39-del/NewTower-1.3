import { INK_CONFIG } from './InkConfig';

/**
 * Generates a procedural paper texture for the game background.
 * Uses noise and vignette to simulate aged parchment.
 */
export class PaperTexture {
    private static cacheCanvas: HTMLCanvasElement | null = null;

    /**
     * returns a pattern or canvas capable of being drawn as the background
     */
    static generate(width: number, height: number): HTMLCanvasElement {
        if (this.cacheCanvas && this.cacheCanvas.width === width && this.cacheCanvas.height === height) {
            return this.cacheCanvas;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // 1. Base Paper Color
        ctx.fillStyle = INK_CONFIG.PALETTE.PAPER;
        ctx.fillRect(0, 0, width, height);

        // 2. Grain / Noise
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const grainStrength = INK_CONFIG.PAPER_TEXTURE.GRAIN_INTENSITY * 255;

        for (let i = 0; i < data.length; i += 4) {
            // Random offset: -strength to +strength
            const noise = (Math.random() - 0.5) * grainStrength;

            // Apply to RGB, keep Alpha
            data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
        }
        ctx.putImageData(imageData, 0, 0);

        // 3. Subtle Vignette
        const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.8);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, `rgba(45, 27, 14, ${INK_CONFIG.PAPER_TEXTURE.VIGNETTE_STRENGTH})`);

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        // 4. Stains (Optional: Adding a few random coffee stains)
        this.drawStains(ctx, width, height);

        this.cacheCanvas = canvas;
        return canvas;
    }

    private static drawStains(ctx: CanvasRenderingContext2D, w: number, h: number) {
        // Simple ring stains
        const count = 3;
        ctx.strokeStyle = 'rgba(60, 40, 20, 0.05)';
        ctx.lineWidth = 4;

        for (let i = 0; i < count; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = 30 + Math.random() * 50;

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
