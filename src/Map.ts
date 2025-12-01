import { CONFIG } from './Config';
import { IMapData } from './MapData';
import { Assets } from './Assets';

export interface Cell {
    type: number; // 0=Grass, 1=Path, 2=Decor
    x: number;
    y: number;
    decor?: string | null; 
}

export class MapManager {
    public cols: number;
    public rows: number;
    
    // ИСПРАВЛЕНИЕ: Добавляем grid
    public grid: Cell[][] = []; 
    
    public tiles: number[][] = []; 
    public waypoints: {x: number, y: number}[] = [];

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
        for(let y=0; y<this.rows; y++) {
            const row: Cell[] = [];
            for(let x=0; x<this.cols; x++) {
                const type = this.tiles[y][x];
                let decor = null;
                // Восстанавливаем декор визуально
                if (type === 2) decor = Math.random() > 0.5 ? 'tree' : 'rock';
                row.push({ type, x, y, decor });
            }
            this.grid.push(row);
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
                if (type === 1) { // PATH
                    this.drawTile(ctx, 'path', px, py);
                } 
                else if (type === 2) { // DECOR
                    this.drawTile(ctx, 'grass', px, py);
                    // Пробуем взять декор из grid, если есть, или рандомно
                    const cellDecor = this.grid[y] && this.grid[y][x] ? this.grid[y][x].decor : 'tree';
                    const decorKey = cellDecor === 'rock' ? 'decor_rock' : 'decor_tree';
                    
                    const decorImg = Assets.get(decorKey);
                    if (decorImg) ctx.drawImage(decorImg as any, px, py);
                } 
                else { // GRASS (0)
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
            ctx.drawImage(img as any, x, y);
        } else {
            ctx.fillStyle = key === 'path' ? '#ded29e' : '#8bc34a';
            ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    private drawIcon(ctx: CanvasRenderingContext2D, icon: string, col: number, row: number) {
        const x = col * CONFIG.TILE_SIZE + 32;
        const y = row * CONFIG.TILE_SIZE + 32;
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
    }
}