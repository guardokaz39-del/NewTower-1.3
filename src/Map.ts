import { CONFIG } from './Config';
import { IMapData } from './MapData';
import { Assets } from './Assets';

export class MapManager {
    public cols: number;
    public rows: number;
    
    // ВАЖНО: Делаем публичными
    public tiles: number[][] = []; 
    public waypoints: {x: number, y: number}[] = [];

    // Геттер для совместимости (GameScene ищет .path, EditorScene ищет .waypoints)
    public get path() {
        return this.waypoints;
    }

    public set path(val: {x: number, y: number}[]) {
        this.waypoints = val;
    }

    constructor(data: IMapData) {
        this.loadMap(data);
    }

    public loadMap(data: IMapData) {
        this.cols = data.width;
        this.rows = data.height;
        this.tiles = data.tiles;
        this.waypoints = data.waypoints || [];
    }

    public isBuildable(col: number, row: number): boolean {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        // 0 = Трава (можно строить)
        return this.tiles[row][col] === 0;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const TS = CONFIG.TILE_SIZE;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const tile = this.tiles[y][x];
                const px = x * TS;
                const py = y * TS;

                // Отрисовка тайлов
                if (tile === 0) {
                    this.drawTile(ctx, 'grass', px, py);
                    // Сетка
                    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, py, TS, TS);
                } else if (tile === 1) {
                    this.drawTile(ctx, 'path', px, py);
                } else if (tile === 2) { 
                    this.drawTile(ctx, 'grass', px, py);
                    this.drawTile(ctx, 'decor_tree', px, py);
                } else if (tile === 3) {
                    this.drawTile(ctx, 'grass', px, py);
                    this.drawTile(ctx, 'decor_rock', px, py);
                }
            }
        }
        
        // Рисуем иконки Старта и Финиша
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
        const x = col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
        const y = row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2 + 5;
        ctx.fillStyle = '#fff';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
    }
}