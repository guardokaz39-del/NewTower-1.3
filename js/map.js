import { CONFIG } from './config.js';

export class MapManager {
    constructor(cols, rows) {
        this.cols = cols; this.rows = rows; 
        this.grid = []; 
        this.path = []; 
        this.initMap();
    }

    initMap() {
        // 1. Заливаем все декором (Лес)
        for(let y=0; y<this.rows; y++) {
            const row=[]; 
            for(let x=0; x<this.cols; x++) {
                let decorType = 'grass';
                const r = Math.random();
                if(r < 0.3) decorType = 'tree';
                else if(r < 0.4) decorType = 'rock';
                
                // type: 2 = DECOR (нельзя строить)
                row.push({type: 2, x, y, decor: decorType});
            }
            this.grid.push(row);
        }

        // 2. Определяем АКТИВНУЮ ЗОНУ (Центр)
        // Увеличиваем отступы по бокам, чтобы карта была меньше и "кучнее"
        const activeMarginX = 5; // Было 2, стало 5 (сужаем поле боя)
        const activeMarginY = 2; // Сверху и снизу оставляем как есть
        
        // Зачищаем центр под строительство (Type 0 = Buildable)
        for(let y=activeMarginY; y<this.rows-activeMarginY; y++) {
            for(let x=activeMarginX; x<this.cols-activeMarginX; x++) {
                this.grid[y][x].type = 0;
            }
        }

        // 3. Генерация Пути (Smart Snake)
        let curX = 0;
        let curY = Math.floor(this.rows / 2); // Старт по центру вертикали
        
        const addToPath = (x, y) => {
            if(x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                this.path.push({x,y});
                this.grid[y][x].type = 1; // 1 = Дорога
                this.grid[y][x].decor = null; // Убираем елки с дороги
            }
        };

        // Гарантируем старт
        addToPath(curX, curY);

        // Ведем прямую линию от края до активной зоны
        while(curX < activeMarginX) {
            curX++;
            addToPath(curX, curY);
        }

        // Генерируем змейку внутри активной зоны
        let goingUp = true;
        const zigZagWidth = 3; // Ширина петли
        
        // Пока не дойдем до правого края активной зоны
        while(curX < this.cols - activeMarginX) {
            // Вертикальный сегмент
            const targetY = goingUp ? activeMarginY + 1 : this.rows - activeMarginY - 2;
            const dir = goingUp ? -1 : 1;
            
            while(curY !== targetY) {
                curY += dir;
                addToPath(curX, curY);
            }
            
            // Горизонтальный сегмент
            for(let i=0; i<zigZagWidth && curX < this.cols - activeMarginX; i++) {
                curX++;
                addToPath(curX, curY);
            }
            
            goingUp = !goingUp; // Меняем направление
        }

        // Финальная прямая до правого края карты (выход)
        while(curX < this.cols) { 
            curX++;
            addToPath(curX, curY); 
        }
    }

    draw(ctx) {
        ctx.lineWidth = 1;
        for(let y=0; y<this.rows; y++) for(let x=0; x<this.cols; x++) {
            const c = this.grid[y][x]; const px=x*64, py=y*64;
            
            if (c.type === 2) { // DECOR
                ctx.fillStyle = CONFIG.COLORS.DECOR_BG;
                ctx.fillRect(px, py, 64, 64);
                
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
                ctx.fillStyle = 'rgba(0,0,0,0.1)'; // Тень
                ctx.fillRect(px, py, 64, 64);
                
            } else if (c.type === 1) { // PATH
                ctx.fillStyle = CONFIG.COLORS.PATH;
                ctx.fillRect(px, py, 64, 64);
            } else { // BUILDABLE
                ctx.fillStyle = CONFIG.COLORS.GRASS;
                ctx.fillRect(px, py, 64, 64);
                ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.beginPath(); ctx.rect(px, py, 64, 64); ctx.stroke();
            }
        }
        
        const s=this.path[0], e=this.path[this.path.length-1];
        if(s) this.drawCave(ctx, s);
        if(e) this.drawFortress(ctx, e);
    }

    drawCave(ctx, p) {
        const x = p.x * 64 + 32;
        const y = p.y * 64 + 32;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(x, y + 10, 25, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.fillText('☠️', x - 12, y + 15);
    }

    drawFortress(ctx, p) {
        const x = p.x * 64;
        const y = p.y * 64;
        ctx.fillStyle = '#555'; ctx.fillRect(x + 10, y + 10, 44, 44);
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 10, y + 5, 10, 10); ctx.fillRect(x + 27, y + 5, 10, 10); ctx.fillRect(x + 44, y + 5, 10, 10);
        ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(x + 32, y + 54, 15, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.fillText('🏰', x + 22, y + 40);
    }

    isBuildable(c,r) { return c>=0 && c<this.cols && r>=0 && r<this.rows && this.grid[r][c].type===0; }
}