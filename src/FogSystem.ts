import { Assets } from './Assets';
import { CONFIG } from './Config';
import { IMapData } from './MapData';

export class FogSystem {
    private cacheCanvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dirty: boolean = true;
    private mapData: IMapData;

    // For optimization, we can track partial updates, but currently we redraw whole cache if dirty
    // which is fine for editor usage or infrequent runtime updates.

    constructor(mapData: IMapData) {
        this.mapData = mapData;
        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = mapData.width * CONFIG.TILE_SIZE;
        this.cacheCanvas.height = mapData.height * CONFIG.TILE_SIZE;

        const context = this.cacheCanvas.getContext('2d');
        if (!context) throw new Error('Failed to get fog cache context');
        this.ctx = context;

        // Initialize fog data if missing
        if (!this.mapData.fogData) {
            this.mapData.fogData = Array(mapData.width * mapData.height).fill(0);
        } else if (this.mapData.fogData.length !== mapData.width * mapData.height) {
            // Resize protection (simplistic)
            const newData = Array(mapData.width * mapData.height).fill(0);
            // Copy old data? Not worrying about complex resize now.
            this.mapData.fogData = newData;
        }

        this.dirty = true;
    }

    public update() {
        if (!this.dirty) return;

        this.ctx.clearRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height);

        const width = this.mapData.width;
        const height = this.mapData.height;
        const fog = this.mapData.fogData!;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;

                // If this tile is not fog, skip drawing (it's transparent/visible)
                // UNLESS we want "FOG OF WAR" where default is fog.
                // Plan says: 1 = Fog (Hidden), 0 = Visible.
                if (fog[index] === 0) continue;

                // It is fog. Calculate bitmask.
                const mask = this.calculateBitmask(x, y);
                const tile = Assets.get(`fog_${mask}`);

                if (tile) {
                    this.ctx.drawImage(tile, x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE);
                }
            }
        }

        this.dirty = false;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        // Draw the cached fog layer over the game
        // We might want to use some transparency if it's "Semi-transparent editor mode"
        // but for now draw as is.
        ctx.drawImage(this.cacheCanvas, 0, 0);
    }

    public setFog(x: number, y: number, value: number) {
        if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return;

        const index = y * this.mapData.width + x;
        if (this.mapData.fogData![index] !== value) {
            this.mapData.fogData![index] = value;
            this.dirty = true;
        }
    }

    public toggleFog(col: number, row: number) {
        if (col < 0 || col >= this.mapData.width || row < 0 || row >= this.mapData.height) return;

        const index = row * this.mapData.width + col;
        const newVal = this.mapData.fogData![index] === 1 ? 0 : 1;
        this.setFog(col, row, newVal);
    }

    private calculateBitmask(x: number, y: number): number {
        const w = this.mapData.width;
        const h = this.mapData.height;
        const fog = this.mapData.fogData!;

        // 1 = Fog, 0 = Empty
        const check = (cx: number, cy: number): number => {
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) return 1; // Edge of map counts as fog? Or empty?
            // Usually edge of map acts as connected for aesthetics (so fog continues offscreen)
            // Let's assume edge is fog (1)
            const idx = cy * w + cx;
            return fog[idx] === 1 ? 1 : 0;
        };

        let mask = 0;
        if (check(x, y - 1)) mask |= 1; // North
        if (check(x - 1, y)) mask |= 2; // West
        if (check(x + 1, y)) mask |= 4; // East
        if (check(x, y + 1)) mask |= 8; // South

        return mask;
    }
}
