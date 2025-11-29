import { CONFIG } from './Config';

export class Assets {
    private static images: Record<string, HTMLCanvasElement> = {};

    public static init() {
        // Тайлы окружения
        this.generateTexture('grass', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50'; ctx.fillRect(0, 0, w, h);
            // Добавляем "шум" травы
            for(let i=0; i<20; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#66bb6a' : '#388e3c';
                ctx.fillRect(Math.random()*w, Math.random()*h, 4, 4);
            }
        });

        this.generateTexture('path', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#d7ccc8'; ctx.fillRect(0, 0, w, h);
            // Камушки
            for(let i=0; i<15; i++) {
                ctx.fillStyle = '#a1887f';
                ctx.beginPath(); ctx.arc(Math.random()*w, Math.random()*h, 3, 0, Math.PI*2); ctx.fill();
            }
        });

        this.generateTexture('decor_tree', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50'; ctx.fillRect(0, 0, w, h); // Фон травы
            // Дерево
            ctx.fillStyle = '#5d4037'; ctx.fillRect(w/2-4, h/2, 8, h/2);
            ctx.fillStyle = '#2e7d32'; 
            ctx.beginPath(); ctx.arc(w/2, h/2-10, 15, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(w/2-10, h/2, 12, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(w/2+10, h/2, 12, 0, Math.PI*2); ctx.fill();
        });

        this.generateTexture('decor_rock', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50'; ctx.fillRect(0, 0, w, h); // Фон травы
            // Камень
            ctx.fillStyle = '#9e9e9e';
            ctx.beginPath(); 
            ctx.moveTo(10, h-10); ctx.lineTo(20, 20); ctx.lineTo(50, 25); ctx.lineTo(60, h-5); 
            ctx.fill();
            ctx.strokeStyle = '#616161'; ctx.lineWidth = 2; ctx.stroke();
        });

        // Башня (Основание)
        this.generateTexture('tower_base', 64, (ctx, w, h) => {
            // Каменная плита
            ctx.fillStyle = '#78909c';
            ctx.beginPath(); ctx.arc(w/2, h/2, 28, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#546e7a'; ctx.lineWidth = 3; ctx.stroke();
            // Заклепки
            ctx.fillStyle = '#37474f';
            for(let i=0; i<4; i++) {
                const a = i * Math.PI/2;
                ctx.beginPath(); ctx.arc(w/2 + Math.cos(a)*20, h/2 + Math.sin(a)*20, 3, 0, Math.PI*2); ctx.fill();
            }
        });

        // Башня (Пушка)
        this.generateTexture('tower_gun', 64, (ctx, w, h) => {
            ctx.translate(w/2, h/2);
            // Ствол
            ctx.fillStyle = '#263238'; ctx.fillRect(0, -6, 26, 12);
            ctx.fillStyle = '#455a64'; ctx.fillRect(0, -4, 20, 8);
            // Башня
            ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        });

        // Враги
        this.generateEnemyTexture('grunt', '#9c27b0', '👾');
        this.generateEnemyTexture('scout', '#ffeb3b', '🦇');
        this.generateEnemyTexture('tank', '#795548', '🐗');
        this.generateEnemyTexture('boss', '#d32f2f', '👹');
    }

    private static generateTexture(name: string, size: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        drawFn(ctx, size, size);
        this.images[name] = canvas;
    }

    private static generateEnemyTexture(name: string, color: string, icon: string) {
        this.generateTexture(`enemy_${name}`, 48, (ctx, w, h) => {
            // Тело
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(w/2, h/2, 18, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            // Глаза/Иконка
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, w/2, h/2 + 2);
        });
    }

    public static get(name: string): HTMLCanvasElement | null {
        return this.images[name] || null;
    }
}