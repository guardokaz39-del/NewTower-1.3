import { CONFIG } from './Config';
import { Assets } from './Assets';

interface Cell {
    type: number; 
    x: number;
    y: number;
    decor?: string | null; 
}

export class MapManager {
    public cols: number;
    public rows: number;
    public grid: Cell[][] = []; 
    public path: {x: number, y: number}[] = []; 

    constructor(width: number, height: number) {
        this.cols = Math.floor(width / CONFIG.TILE_SIZE);
        this.rows = Math.floor(height / CONFIG.TILE_SIZE);
        this.initMap();
    }

    private initMap() {
        for(let y=0; y<this.rows; y++) {
            const row: Cell[] = []; 
            for(let x=0; x<this.cols; x++) {
                let decorType = 'grass';
                const r = Math.random();
                if(r < 0.2) decorType = 'tree';     
                else if(r < 0.3) decorType = 'rock'; 
                
                row.push({type: 2, x, y, decor: decorType});
            }
            this.grid.push(row);
        }

        let cx = 0;
        let cy = Math.floor(this.rows / 2);
        this.path = [];
        
        if (cy < 2) cy = 2;
        if (cy > this.rows - 3) cy = this.rows - 3;

        while(cx < this.cols) {
            this.grid[cy][cx].type = 1;
            this.grid[cy][cx].decor = null;
            this.path.push({x: cx, y: cy});

            cx++;
            
            if (cx < this.cols - 1 && Math.random() < 0.5) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const nextY = cy + dir;
                
                if (nextY >= 1 && nextY < this.rows - 1) {
                    this.grid[nextY][cx-1].type = 1; 
                    this.grid[nextY][cx-1].decor = null;
                    
                    this.path.push({x: cx-1, y: nextY}); 
                    cy = nextY;
                }
            }
        }
        
        this.path.forEach(p => {
            const dirs = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
            dirs.forEach(d => {
                const nx = p.x + d[0], ny = p.y + d[1];
                if(nx >=0 && nx < this.cols && ny >=0 && ny < this.rows) {
                    if(this.grid[ny][nx].type !== 1) {
                         this.grid[ny][nx].type = 0; 
                         this.grid[ny][nx].decor = null;
                    }
                }
            });
        });
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const TS = CONFIG.TILE_SIZE;
        const grassImg = Assets.get('grass');
        const pathImg = Assets.get('path');
        const treeImg = Assets.get('decor_tree');
        const rockImg = Assets.get('decor_rock');

        for(let y=0; y<this.rows; y++) {
            for(let x=0; x<this.cols; x++) {
                const c = this.grid[y][x];
                const px = x * TS;
                const py = y * TS;

                if (grassImg) ctx.drawImage(grassImg, px, py);
                else { ctx.fillStyle = CONFIG.COLORS.GRASS; ctx.fillRect(px, py, TS, TS); }

                if (c.type === 1) { 
                    if (pathImg) ctx.drawImage(pathImg, px, py);
                    else { ctx.fillStyle = CONFIG.COLORS.PATH; ctx.fillRect(px, py, TS, TS); }
                } 
                else if (c.type === 2) { 
                    if (c.decor === 'tree' && treeImg) ctx.drawImage(treeImg, px, py);
                    else if (c.decor === 'rock' && rockImg) ctx.drawImage(rockImg, px, py);
                }
                
                // --- ИСПРАВЛЕНИЕ ТУТ ---
                if (c.type === 0) { 
                    ctx.lineWidth = 1; // <--- Гарантируем тонкую линию
                    ctx.strokeStyle = 'rgba(0,0,0,0.05)'; 
                    ctx.strokeRect(px, py, TS, TS);
                }
                // -----------------------
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
        ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline='middle'; ctx.fillText('☠️', x, y);
    }

    private drawFortress(ctx: CanvasRenderingContext2D, p: {x:number, y:number}) {
        const x = p.x * 64 + 32;
        const y = p.y * 64 + 32;
        ctx.fillStyle = CONFIG.COLORS.BASE;
        ctx.fillRect(x - 20, y - 20, 40, 40);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x - 20, y - 20, 40, 40);
        ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline='middle'; ctx.fillText('🏰', x, y);
    }
}