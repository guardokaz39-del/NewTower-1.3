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
    public render(structures: FogStructure[], time: number): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const structure of structures) {
            this.renderStructure(structure, time);
        }
    }

    private renderStructure(structure: FogStructure, time: number): void {
        const TS = CONFIG.TILE_SIZE;
        const ctx = this.ctx;

        for (const tile of structure.tiles) {
            if (tile.density === 0) continue;

            // Calculate drift offset using noise
            const noiseX = this.noise.noise2D(
                time * this.DRIFT_SPEED + structure.noiseOffsetX,
                0
            );
            const noiseY = this.noise.noise2D(
                0,
                time * this.DRIFT_SPEED + structure.noiseOffsetY
            );

            const driftX = noiseX * this.MAX_DRIFT;
            const driftY = noiseY * this.MAX_DRIFT;

            // Calculate rotation (subtle swirl effect)
            const rotation = this.noise.noise2D(
                time * this.ROTATION_SPEED + structure.noiseOffsetRot,
                tile.x * this.NOISE_SCALE + tile.y * this.NOISE_SCALE
            ) * this.MAX_ROTATION;

            // Tile center with drift
            const cx = tile.x * TS + TS / 2 + driftX;
            const cy = tile.y * TS + TS / 2 + driftY;

            // Calculate alpha based on density (1-5 -> 20%-100%)
            const alpha = tile.density * this.BASE_ALPHA;

            // Draw fog cloud with gradient
            // Increased radius for better overlap and blending
            const radius = TS * 1.1; // Increased from 0.85 to 1.1

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.translate(-cx, -cy);

            // Outer gradient (soft edges, wider spread)
            const gradient = ctx.createRadialGradient(
                cx, cy, 0,
                cx, cy, radius
            );

            gradient.addColorStop(0, `rgba(${this.FOG_COLOR.r}, ${this.FOG_COLOR.g}, ${this.FOG_COLOR.b}, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(${this.FOG_COLOR.r}, ${this.FOG_COLOR.g}, ${this.FOG_COLOR.b}, ${alpha * 0.8})`);
            gradient.addColorStop(0.8, `rgba(${this.FOG_COLOR.r}, ${this.FOG_COLOR.g}, ${this.FOG_COLOR.b}, ${alpha * 0.4})`);
            gradient.addColorStop(1, `rgba(${this.FOG_COLOR.r}, ${this.FOG_COLOR.g}, ${this.FOG_COLOR.b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Add detail layer for higher densities
            if (tile.density >= 3) {
                const detailNoise = this.noise.noise2D(
                    cx * 0.02 + time * 0.0002,
                    cy * 0.02
                );
                const detailAlpha = (detailNoise * 0.5 + 0.5) * alpha * 0.3;

                ctx.fillStyle = `rgba(${this.FOG_COLOR.r - 20}, ${this.FOG_COLOR.g - 20}, ${this.FOG_COLOR.b - 20}, ${detailAlpha})`;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
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
