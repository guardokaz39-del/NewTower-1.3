import { SimplexNoise } from './SimplexNoise';
import { FogStructure } from './FogStructure';
import { CONFIG } from './Config';

/**
 * Fog Renderer - handles animated procedural fog rendering
 */
export class FogRenderer {
    private noise: SimplexNoise;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // Animation parameters - increased for more visible movement
    private readonly DRIFT_SPEED = 0.0012; // 4x faster (was 0.0003)
    private readonly ROTATION_SPEED = 0.0004; // 4x faster (was 0.0001)
    private readonly NOISE_SCALE = 0.01;
    private readonly MAX_DRIFT = CONFIG.TILE_SIZE * 0.3; // Increased from 0.2
    private readonly MAX_ROTATION = 0.08; // Increased from 0.05 (~4.5°)

    // Visual parameters
    private readonly FOG_COLOR = { r: 200, g: 215, b: 230 };
    private readonly BASE_ALPHA = 0.18;

    constructor(width: number, height: number, seed?: number) {
        this.noise = new SimplexNoise(seed);
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        const context = this.canvas.getContext('2d');
        if (!context) throw new Error('Failed to create fog render context');
        this.ctx = context;
    }

    /**
     * Render fog structures
     */
    /**
     * Render fog structures with dual-layer noise and light masking
     */
    public render(structures: FogStructure[], time: number, lights: { x: number, y: number, radius: number }[] = []): void {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // 1. Draw Dual-Layer Fog
        for (let i = 0; i < structures.length; i++) {
            this.renderStructure(structures[i], time);
        }

        // 2. Apply Light Masks (Cut holes)
        if (lights.length > 0) {
            this.applyLightMasks(lights);
        }
    }

    private renderStructure(structure: FogStructure, time: number): void {
        const TS = CONFIG.TILE_SIZE;
        const ctx = this.ctx;

        for (let t = 0; t < structure.tiles.length; t++) {
            const tile = structure.tiles[t];
            if (tile.density === 0) continue;

            const cx = tile.x * TS + TS / 2;
            const cy = tile.y * TS + TS / 2;
            const baseRadius = TS * 1.5; // Larger radius for volumetric feel

            // Base opacity based on density (0.2 to 1.0)
            const densityAlpha = Math.min(tile.density * 0.2, 1.0);

            ctx.save();
            ctx.translate(cx, cy);

            // --- Layer 1: Base Fog (Slow, Heavy) ---
            // Scale 1.0, Speed 0.5x
            const drift1X = this.noise.noise2D(time * 0.0006 + structure.noiseOffsetX, 0) * (TS * 0.4);
            const drift1Y = this.noise.noise2D(0, time * 0.0006 + structure.noiseOffsetY) * (TS * 0.4);
            const rot1 = this.noise.noise2D(time * 0.0002, tile.x * 0.01) * 0.1;

            ctx.save();
            ctx.translate(drift1X, drift1Y);
            ctx.rotate(rot1);

            const grad1 = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
            grad1.addColorStop(0, `rgba(${this.FOG_COLOR.r}, ${this.FOG_COLOR.g}, ${this.FOG_COLOR.b}, ${densityAlpha * 0.6})`);
            grad1.addColorStop(1, `rgba(${this.FOG_COLOR.r}, ${this.FOG_COLOR.g}, ${this.FOG_COLOR.b}, 0)`);

            ctx.fillStyle = grad1;
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // --- Layer 2: Mist (Fast, Light) ---
            // Scale 0.5, Speed 1.5x, Opposite direction
            const drift2X = this.noise.noise2D(time * 0.0018 + structure.noiseOffsetX + 100, 100) * (TS * 0.2) * -1;
            const drift2Y = this.noise.noise2D(100, time * 0.0018 + structure.noiseOffsetY + 100) * (TS * 0.2) * -1;
            // Higher frequency rotation
            const rot2 = this.noise.noise2D(time * 0.0008, tile.y * 0.02) * 0.2;

            ctx.save();
            ctx.translate(drift2X, drift2Y);
            ctx.rotate(rot2);

            // Smaller, more transparent mist patches
            const mistRadius = baseRadius * 0.7;
            const mistAlpha = densityAlpha * 0.3;

            const grad2 = ctx.createRadialGradient(0, 0, 0, 0, 0, mistRadius);
            grad2.addColorStop(0, `rgba(${this.FOG_COLOR.r + 20}, ${this.FOG_COLOR.g + 20}, ${this.FOG_COLOR.b + 20}, ${mistAlpha})`);
            grad2.addColorStop(1, `rgba(${this.FOG_COLOR.r}, ${this.FOG_COLOR.g}, ${this.FOG_COLOR.b}, 0)`);

            ctx.fillStyle = grad2;
            ctx.beginPath();
            ctx.arc(0, 0, mistRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.restore();
        }
    }

    private applyLightMasks(lights: { x: number, y: number, radius: number }[]): void {
        const ctx = this.ctx;

        ctx.save();
        // Cut out holes in the fog
        ctx.globalCompositeOperation = 'destination-out';

        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            // Flicker effect: radius +/- 5%
            const flicker = 0.95 + Math.random() * 0.1;
            const r = light.radius * flicker;

            // Soft cutout using gradient
            const grad = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, r);
            // Inner: completely transparent (removed fog)
            // Outer: fade to original fog
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(light.x, light.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Get the rendered canvas
     */
    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Resize the render canvas
     */
    public resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }
}
