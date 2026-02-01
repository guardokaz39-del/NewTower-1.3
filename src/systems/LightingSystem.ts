import { CONFIG } from '../Config';

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
    private scale: number; // Phase 6: Performance optimization

    private lights: ILight[] = [];
    public ambientLight: number = 0.9; // 0 = Pitch Black, 1 = Full Brightness

    constructor(width: number, height: number, optimization: boolean = false) {
        this.width = width;
        this.height = height;

        // Phase 6: 2x scale optimization for performance
        this.scale = optimization ? 2 : 1;

        // Create offscreen canvas for light map (at reduced resolution if optimized)
        this.canvas = document.createElement('canvas');
        this.canvas.width = Math.floor(width / this.scale);
        this.canvas.height = Math.floor(height / this.scale);
        this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    }

    public resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.canvas.width = Math.floor(width / this.scale);
        this.canvas.height = Math.floor(height / this.scale);
    }

    public clear() {
        this.lights = [];
    }

    public addLight(x: number, y: number, radius: number, color: string, intensity: number = 1.0) {
        // Standard system
        this.lights.push({
            x: x / this.scale,
            y: y / this.scale,
            radius: radius / this.scale,
            color,
            intensity
        });
    }

    /**
     * Phase 6: Enable global darkness (nighttime mode)
     */
    public enableGlobalDarkness(darknessLevel: number = 0.7) {
        this.ambientLight = 1 - darknessLevel; // e.g., 0.7 darkness = 0.3 ambient
    }

    /**
     * Phase 6: Add light from a tower
     */
    public addTowerLight(x: number, y: number, tileSize: number) {
        this.addLight(x + tileSize / 2, y + tileSize / 2, tileSize * 2.5, '#ffaa00', 0.8);
    }

    public render(targetCtx: CanvasRenderingContext2D) {
        // Logic for SPRITE style (Original)
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 0. Clear previous frame
        this.ctx.clearRect(0, 0, w, h);

        // 1. Fill light map with "Darkness"
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.ambientLight})`;
        this.ctx.fillRect(0, 0, w, h);

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

        // Draw the darkness overlay first (scaled up if using optimization)
        targetCtx.save();
        targetCtx.drawImage(this.canvas, 0, 0, this.width, this.height);

        // Now draw colored lights on TOP using 'lighter' (or 'screen')
        targetCtx.globalCompositeOperation = 'lighter'; // Additive blending

        this.lights.forEach(light => {
            if (light.color === '#000000') return; // Skip black lights

            // Scale back to target resolution
            const x = light.x * this.scale;
            const y = light.y * this.scale;
            const r = light.radius * this.scale;

            const g = targetCtx.createRadialGradient(x, y, 0, x, y, r);
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
