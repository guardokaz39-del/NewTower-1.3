export interface ILight {
    x: number;
    y: number;
    radius: number;
    color: string; // Hex or rgba
    intensity: number; // 0 to 1
}

export class LightingSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    private lights: ILight[] = [];
    public ambientLight: number = 0.9; // 0 = Pitch Black, 1 = Full Brightness

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        // Create offscreen canvas for light map
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { alpha: true })!;
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
        // 0. Clear previous frame
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Fill light map with "Darkness"
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.ambientLight})`; // e.g., 0.7 alpha black
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Punch holes / Add lights (Visibility)
        this.ctx.globalCompositeOperation = 'destination-out';

        this.lights.forEach(light => {
            const g = this.ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
            g.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`); // Full erase
            g.addColorStop(1, 'rgba(0, 0, 0, 0)'); // No erase

            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 3. Draw colored glows (Additive Pass)
        // We render this DIRECTLY to the target context to add glow on top of game + darkness
        // OR we render to a separate canvas. 
        // Rendering to targetCtx directly is better for performance and visual control.

        // Draw the darkness overlay first
        targetCtx.save();
        targetCtx.drawImage(this.canvas, 0, 0);

        // Now draw colored lights on TOP using 'lighter' (or 'screen')
        targetCtx.globalCompositeOperation = 'lighter'; // Additive blending

        this.lights.forEach(light => {
            if (light.color === '#000000') return; // Skip black lights

            const g = targetCtx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
            // Convert hex to rgb for gradient? Or just use hex if browser supports (it does usually)
            // But we need alpha falloff.

            // Helper to get RGBA from potentially hex string would be nice, but simple fix:
            // Let's assume color is a valid CSS color string. 
            // We'll use a simple approximation or just draw with lower opacity at center.

            g.addColorStop(0, light.color); // Color at center
            g.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade to transparent

            targetCtx.fillStyle = g;
            targetCtx.globalAlpha = light.intensity * 0.6; // Scale down glow intensity
            targetCtx.beginPath();
            targetCtx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
            targetCtx.fill();
        });

        targetCtx.restore();
    }
}
