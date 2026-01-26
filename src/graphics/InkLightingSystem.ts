import { INK_CONFIG } from './InkConfig';

/**
 * Ink Lighting System - Atmospheric lighting for the Paper world.
 * 
 * Philosophy:
 * - Day: Paper is natural color.
 * - Night: Paper is tinted "Moonlight Blue" (Multiply blend).
 * - Torch/Light: Paper is bleached/warmed (Soft Light / Screen blend).
 * 
 * We do NOT use a black overlay. We dye the paper.
 */
export class InkLightingSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    // Ambient darkness level (0 = glorious day, 1 = pitch black ink)
    public ambientLight: number = 1.0;

    // Lights list
    private lights: { x: number, y: number, radius: number, color: string, intensity: number }[] = [];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        const context = this.canvas.getContext('2d');
        if (!context) throw new Error('Failed to create ink light context');
        this.ctx = context;
    }

    public resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    public clear() {
        this.lights = [];
    }

    public addLight(x: number, y: number, radius: number, color: string, intensity: number = 1.0) {
        this.lights.push({ x, y, radius, color, intensity });
    }

    public render(targetCtx: CanvasRenderingContext2D) {
        // If it's full day (ambientLight ~ 1.0), we might skip rendering for performance,
        // UNLESS there are colored lights that need to be seen.
        // But in Ink mode, lights are visible even in day (like ink blooming).

        const w = this.width;
        const h = this.height;

        this.ctx.clearRect(0, 0, w, h);

        // 1. NIGHT TINT (Multiply)
        // Unlike standard mode where ambientLight 1.0 means "No darkness", 
        // here we map ambient to tint opacity.
        // ambientLight 0.0 -> Darkness (Full tint)
        // ambientLight 1.0 -> Daylight (No tint)

        const nightOpacity = 1.0 - Math.max(0, Math.min(1, this.ambientLight));

        if (nightOpacity > 0.05) {
            targetCtx.save();
            targetCtx.globalCompositeOperation = 'multiply';
            targetCtx.fillStyle = `rgba(10, 20, 40, ${nightOpacity * 0.6})`; // Deep Navy Ink
            targetCtx.fillRect(0, 0, w, h);
            targetCtx.restore();
        }

        // 2. LIGHT SOURCES (Soft Light / Screen)
        // We render lights to our offscreen canvas first to blend them

        // Draw lights
        this.lights.forEach(light => {
            // Gradient for soft edges
            const g = this.ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);

            // "Bleach" effect: White center -> Transparent
            // Use tinted color for magic lights
            g.addColorStop(0, light.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');

            this.ctx.save();
            this.ctx.globalAlpha = light.intensity * 0.7;
            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Composite lights onto the game world
        targetCtx.save();
        targetCtx.globalCompositeOperation = 'screen';
        targetCtx.drawImage(this.canvas, 0, 0);
        targetCtx.restore();

        // 3. VIGNETTE (Subtle dark corners)
        // User requested to "reduce" it (assuming they saw the global tint as vignette or wanted a new one)
        // We add a subtle one now for depth.
        const gradient = targetCtx.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, h * 0.8);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(10, 5, 0, 0.3)'); // Reduced opacity (was likely too dark in user's mind)

        targetCtx.save();
        targetCtx.fillStyle = gradient;
        targetCtx.globalCompositeOperation = 'multiply'; // Ink darkening
        targetCtx.fillRect(0, 0, w, h);
        targetCtx.restore();
    }
}
