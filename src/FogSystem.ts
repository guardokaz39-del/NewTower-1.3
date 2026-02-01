import { IMapData } from './MapData';
import { FogRenderer } from './FogRenderer';
import { FogStructure, buildFogStructures } from './FogStructure';
import { CONFIG } from './Config';

/**
 * Fog System - manages layered fog with density and structure-based animation
 * @description
 * Supports 6 density levels:
 * - 0: No fog (visible)
 * - 1: 20% density
 * - 2: 40% density
 * - 3: 60% density
 * - 4: 80% density
 * - 5: 100% density
 */
export class FogSystem {
    private mapData: IMapData;
    private renderer: FogRenderer;
    private structures: FogStructure[] = [];
    private time: number = 0;
    private dirty: boolean = true;

    constructor(mapData: IMapData) {
        this.mapData = mapData;

        // Initialize fog data if missing
        if (!this.mapData.fogData) {
            this.mapData.fogData = Array(mapData.width * mapData.height).fill(0);
        } else if (this.mapData.fogData.length !== mapData.width * mapData.height) {
            const newData = Array(mapData.width * mapData.height).fill(0);
            this.mapData.fogData = newData;
        }

        // Create standard renderer
        this.renderer = new FogRenderer(
            mapData.width * 64, // Assuming TILE_SIZE = 64
            mapData.height * 64
        );

        this.buildStructures();
    }

    /**
     * Build fog structures from current fog data
     */
    private buildStructures(): void {
        this.structures = buildFogStructures(
            this.mapData.fogData!,
            this.mapData.width,
            this.mapData.height
        );
        this.dirty = false;

        console.log(`FogSystem: Found ${this.structures.length} fog structures`);
    }

    /**
     * Update fog animation
     */
    /**
     * Update fog animation
     */
    public update(dt: number = 0.016, lights: { x: number, y: number, radius: number }[] = []): void {
        // Rebuild structures if data changed
        if (this.dirty) {
            this.buildStructures();
        }

        const t = (dt > 0) ? (this.time += dt * 60) : 0;

        // Render Sprite logic
        if (dt > 0 || this.time === 0) {
            this.renderer.render(this.structures, this.time, lights);
        }
    }

    /**
     * Draw fog to main canvas
     */
    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.drawImage(this.renderer.getCanvas(), 0, 0);
        ctx.restore();
    }

    /**
     * Set fog density at specific tile
     * @param x Column
     * @param y Row
     * @param density 0-5 (0 = no fog, 5 = max density)
     */
    public setFog(x: number, y: number, density: number): void {
        if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return;
        if (density < 0 || density > 5) return;

        const index = y * this.mapData.width + x;
        if (this.mapData.fogData![index] !== density) {
            this.mapData.fogData![index] = density;
            this.dirty = true;
        }
    }

    /**
     * Get fog density at specific tile
     */
    public getFog(x: number, y: number): number {
        if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return 0;
        const index = y * this.mapData.width + x;
        return this.mapData.fogData![index] || 0;
    }

    /**
     * Cycle fog density (1 → 2 → 3 → 4 → 5 → 1)
     * For editor use - each click increases density
     */
    public cycleFogDensity(x: number, y: number): void {
        const current = this.getFog(x, y);
        let next: number;

        if (current === 0) {
            // First click on empty tile -> density 1
            next = 1;
        } else if (current >= 5) {
            // Max density -> back to 1
            next = 1;
        } else {
            // Increment density
            next = current + 1;
        }

        this.setFog(x, y, next);
    }

    /**
     * Get fog data array
     */
    public getFogData(): number[] {
        return this.mapData.fogData || [];
    }

    /**
     * Legacy method for compatibility
     * @deprecated Use setFog or cycleFogDensity instead
     */
    public toggleFog(col: number, row: number): void {
        this.cycleFogDensity(col, row);
    }
}
