import { CONFIG } from './Config';
import { IMapData, Cell } from './MapData';
import { Assets } from './Assets';
import { Pathfinder } from './Pathfinder';

export class MapManager {
    public cols!: number;
    public rows!: number;

    public grid: Cell[][] = [];

    public tiles: number[][] = [];
    public waypoints: { x: number; y: number }[] = [];

    constructor(data: IMapData) {
        this.loadMap(data);
    }

    public loadMap(data: IMapData) {
        this.cols = data.width;
        this.rows = data.height;
        this.tiles = data.tiles;
        this.waypoints = data.waypoints;

        // Генерация объекта grid для совместимости с редактором
        this.grid = [];
        for (let y = 0; y < this.rows; y++) {
            const row: Cell[] = [];
            for (let x = 0; x < this.cols; x++) {
                const type = this.tiles[y][x];
                let decor = null;
                // Восстанавливаем декор визуально
                if (type === 2) decor = Math.random() > 0.5 ? 'tree' : 'rock';
                row.push({ type, x, y, decor });
            }
            this.grid.push(row);
        }

        // If waypoints only contain start and end, expand to full path
        if (this.waypoints.length === 2) {
            const fullPath = Pathfinder.findPath(this.grid, this.waypoints[0], this.waypoints[1]);
            if (fullPath.length > 0) {
                this.waypoints = fullPath;
            }
        }
    }

    public isBuildable(col: number, row: number): boolean {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        return this.tiles[row][col] === 0;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const TS = CONFIG.TILE_SIZE;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const type = this.tiles[y][x];
                const px = x * TS;
                const py = y * TS;

                // Рисуем тайл
                if (type === 1) {
                    // PATH
                    this.drawTile(ctx, 'path', px, py);
                } else if (type === 2) {
                    // DECOR
                    this.drawTile(ctx, 'grass', px, py);
                    const cellDecor = this.grid[y] && this.grid[y][x] ? this.grid[y][x].decor : 'tree';
                    const decorKey = cellDecor === 'rock' ? 'decor_rock' : 'decor_tree';

                    const decorImg = Assets.get(decorKey);
                    if (decorImg) ctx.drawImage(decorImg, px, py);
                } else {
                    // GRASS (0)
                    this.drawTile(ctx, 'grass', px, py);
                    // Сетка
                    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, py, TS, TS);
                }
            }
        }

        if (this.waypoints.length > 0) {
            const start = this.waypoints[0];
            const end = this.waypoints[this.waypoints.length - 1];
            this.drawIcon(ctx, '☠️', start.x, start.y);
            this.drawIcon(ctx, '🏰', end.x, end.y);
        }
    }

    private drawTile(ctx: CanvasRenderingContext2D, key: string, x: number, y: number) {
        const img = Assets.get(key);
        if (img) {
            ctx.drawImage(img, x, y);
        } else {
            ctx.fillStyle = key === 'path' ? '#ded29e' : '#8bc34a';
            ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    private drawIcon(ctx: CanvasRenderingContext2D, icon: string, col: number, row: number) {
        const halfTile = CONFIG.TILE_SIZE / 2;
        const x = col * CONFIG.TILE_SIZE + halfTile;
        const y = row * CONFIG.TILE_SIZE + halfTile;
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
    }

    public validatePath(_start: { x: number; y: number }, _end: { x: number; y: number }): { x: number; y: number }[] {
        return [];
    }
}
