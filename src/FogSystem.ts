import { Assets } from './Assets';
import { CONFIG } from './Config';
import { IMapData } from './MapData';

export class FogSystem {
    private cacheCanvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dirty: boolean = true;
    private mapData: IMapData;
    private time: number = 0;

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
            const newData = Array(mapData.width * mapData.height).fill(0);
            this.mapData.fogData = newData;
        }

        this.dirty = true;
    }

    public update(dt: number = 0) {
        this.time += dt;
        // Always redraw for animation
        this.renderProceduralFog();
    }

    private renderProceduralFog() {
        this.ctx.clearRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height);

        const width = this.mapData.width;
        const height = this.mapData.height;
        const fog = this.mapData.fogData!;
        const TS = CONFIG.TILE_SIZE;

        const time = this.time;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;

                // 1 = Fog (Hidden), 0 = Visible.
                if (fog[index] === 0) continue;

                // Drift / Wobble
                // Slow random movement: Sine waves based on position + time
                const driftX = Math.sin(time * 0.3 + y * 0.5) * (TS * 0.15);
                const driftY = Math.cos(time * 0.2 + x * 0.4) * (TS * 0.15);

                const cx = x * TS + TS / 2 + driftX;
                const cy = y * TS + TS / 2 + driftY;

                // Draw Fog Cloud as Soft Circle
                // Radius > 0.5 TS to ensure overlap
                const radius = TS * 0.85;

                const gradient = this.ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
                gradient.addColorStop(0, 'rgba(200, 215, 230, 0.9)');
                gradient.addColorStop(1, 'rgba(200, 215, 230, 0)');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        // Draw the cached fog layer over the game
        ctx.save();
        ctx.drawImage(this.cacheCanvas, 0, 0);
        ctx.restore();
    }

    public setFog(x: number, y: number, value: number) {
        if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return;

        const index = y * this.mapData.width + x;
        if (this.mapData.fogData![index] !== value) {
            this.mapData.fogData![index] = value;
            this.dirty = true;
        }
    }

    public getFogData(): number[] {
        return this.mapData.fogData || [];
    }

    public toggleFog(col: number, row: number) {
        if (col < 0 || col >= this.mapData.width || row < 0 || row >= this.mapData.height) return;

        const index = row * this.mapData.width + col;
        const newVal = this.mapData.fogData![index] === 1 ? 0 : 1;
        this.setFog(col, row, newVal);
    }
}
