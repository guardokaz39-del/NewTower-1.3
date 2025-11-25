import { CONFIG } from './Config';

// Описываем, из чего состоит клетка карты
interface Cell {
    type: number; // 0=Grass, 1=Path, 2=Decor
    x: number;
    y: number;
    decor?: string | null; // 'tree', 'rock' или null
}

export class MapManager {
    public cols: number;
    public rows: number;
    public grid: Cell[][] = []; // Сетка карты
    public path: {x: number, y: number}[] = []; // Список координат пути

    constructor(width: number, height: number) {
        this.cols = Math.floor(width / CONFIG.TILE_SIZE);
        this.rows = Math.floor(height / CONFIG.TILE_SIZE);
        this.initMap();
    }

    private initMap() {
        // 1. Заливаем все декором (Лес)
        for(let y=0; y<this.rows; y++) {
            const row: Cell[] = []; 
            for(let x=0; x<this.cols; x++) {
                let decorType = 'grass';
                const r = Math.random();
                if(r < 0.3) decorType = 'tree';
                else if(r < 0.4) decorType = 'rock';
                
                // type: 2 = DECOR
                row.push({type: 2, x, y, decor: decorType});
            }
            this.grid.push(row);
        }

        // 2. Определяем АКТИВНУЮ ЗОНУ (Центр)
        const activeMarginX = 5; 
        const activeMarginY = 2; 
        
        for(let y=activeMarginY; y<this.rows-activeMarginY; y++) {
            for(let x=activeMarginX; x<this.cols-activeMarginX; x++) {
                this.grid[y][x].type = 0; // 0 = Buildable
            }
        }

        // 3. Генерация Пути (Ваша логика змейки)
        let curX = 0;
        let curY = Math.floor(this.rows / 2);
        
        const addToPath = (x: number, y: number) => {
            if(x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                this.path.push({x,y});
                this.grid[y][x].type = 1; // 1 = Road
                this.grid[y][x].decor = null;
            }
        };

        addToPath(curX, curY);

        while(curX < activeMarginX) { curX++; addToPath(curX, curY); }

        let goingUp = true;
        const zigZagWidth = 3;
        
        while(curX < this.cols - activeMarginX) {
            const targetY = goingUp ? activeMarginY + 1 : this.rows - activeMarginY - 2;
            const dir = goingUp ? -1 : 1;
            while(curY !== targetY) { curY += dir; addToPath(curX, curY); }
            for(let i=0; i<zigZagWidth && curX < this.cols - activeMarginX; i++) { curX++; addToPath(curX, curY); }
            goingUp = !goingUp;
        }

        while(curX < this.cols) { curX++; addToPath(curX, curY); }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.lineWidth = 1;
        const TS = CONFIG.TILE_SIZE;

        for(let y=0; y<this.rows; y++) for(let x=0; x<this.cols; x++) {
            const c = this.grid[y][x]; 
            const px=x*TS, py=y*TS;
            
            if (c.type === 2) { // DECOR
                ctx.fillStyle = CONFIG.COLORS.DECOR_BG;
                ctx.fillRect(px, py, TS, TS);
                
                if(c.decor === 'tree') {
                    ctx.fillStyle = CONFIG.COLORS.DECOR_TREE;
                    ctx.beginPath();
                    ctx.moveTo(px + 32, py + 10);
                    ctx.lineTo(px + 10, py + 54);
                    ctx.lineTo(px + 54, py + 54);
                    ctx.fill();
                } else if (c.decor === 'rock') {
                    ctx.fillStyle = CONFIG.COLORS.DECOR_ROCK;
                    ctx.beginPath();
                    ctx.ellipse(px + 32, py + 40, 15, 10, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = 'rgba(0,0,0,0.1)'; 
                ctx.fillRect(px, py, TS, TS);
                
            } else if (c.type === 1) { // PATH
                ctx.fillStyle = CONFIG.COLORS.PATH;
                ctx.fillRect(px, py, TS, TS);
            } else { // BUILDABLE
                ctx.fillStyle = CONFIG.COLORS.GRASS;
                ctx.fillRect(px, py, TS, TS);
                ctx.strokeStyle = 'rgba(0,0,0,0.05)'; 
                ctx.beginPath(); ctx.rect(px, py, TS, TS); ctx.stroke();
            }
        }
        
        const s=this.path[0], e=this.path[this.path.length-1];
        if(s) this.drawCave(ctx, s);
        if(e) this.drawFortress(ctx, e);
    }

    private drawCave(ctx: CanvasRenderingContext2D, p: {x:number, y:number}) {
        const x = p.x * 64 + 32;
        const y = p.y * 64 + 32;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(x, y + 10, 25, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.fillText('☠️', x - 12, y + 15);
    }

    private drawFortress(ctx: CanvasRenderingContext2D, p: {x:number, y:number}) {
        const x = p.x * 64;
        const y = p.y * 64;
        ctx.fillStyle = '#555'; ctx.fillRect(x + 10, y + 10, 44, 44);
        ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(x + 32, y + 54, 15, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.fillText('🏰', x + 22, y + 40);
    }
}