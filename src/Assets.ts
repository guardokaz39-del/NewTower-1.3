import { CONFIG } from './Config';

export class Assets {
    // Хранилище изображений
    private static images: Record<string, HTMLCanvasElement | HTMLImageElement> = {};

    // ГЛАВНЫЙ МЕТОД ЗАГРУЗКИ
    public static async loadAll(): Promise<void> {
        console.log("Assets: Start loading...");

        // Здесь можно добавить загрузку внешних картинок: 
        // await this.loadImage('hero', 'hero.png');
        
        // Пока генерируем процедурные текстуры (синхронно, но быстро)
        this.generateAllTextures();

        console.log("Assets: Loading complete!");
        return Promise.resolve();
    }

    public static get(name: string): HTMLCanvasElement | HTMLImageElement | undefined {
        return this.images[name];
    }

    // --- ГЕНЕРАЦИЯ ТЕКСТУР (Как и было, но собрано в один метод) ---
    private static generateAllTextures() {
        // Окружение
        this.generateTexture('grass', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50'; ctx.fillRect(0, 0, w, h);
            for(let i=0; i<20; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#66bb6a' : '#388e3c';
                ctx.fillRect(Math.random()*w, Math.random()*h, 4, 4);
            }
        });

        this.generateTexture('path', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#d7ccc8'; ctx.fillRect(0, 0, w, h);
            for(let i=0; i<15; i++) {
                ctx.fillStyle = '#a1887f';
                ctx.beginPath(); ctx.arc(Math.random()*w, Math.random()*h, 3, 0, Math.PI*2); ctx.fill();
            }
        });

        this.generateTexture('decor_tree', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50'; ctx.fillRect(0,0,w,h); // Фон травы
            ctx.fillStyle = '#2e7d32'; 
            ctx.beginPath(); ctx.arc(w/2, h/2, 16, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#1b5e20'; 
            ctx.beginPath(); ctx.arc(w/2 - 5, h/2 - 5, 8, 0, Math.PI*2); ctx.fill();
        });

        this.generateTexture('decor_rock', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50'; ctx.fillRect(0,0,w,h);
            ctx.fillStyle = '#78909c'; 
            ctx.beginPath(); ctx.moveTo(10, h-10); ctx.lineTo(w/2, 10); ctx.lineTo(w-10, h-10); ctx.fill();
        });

        // Башни
        this.generateTexture('tower_base', 64, (ctx, w, h) => {
            ctx.fillStyle = '#9e9e9e'; 
            ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#616161'; ctx.lineWidth = 4; ctx.stroke();
        });

        this.generateTexture('tower_gun', 64, (ctx, w, h) => {
            ctx.fillStyle = '#424242'; 
            ctx.fillRect(28, 10, 8, 34); // Ствол
            ctx.beginPath(); ctx.arc(32, 32, 14, 0, Math.PI*2); ctx.fill(); // Башня
            ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(32, 32, 6, 0, Math.PI*2); ctx.fill();
        });

        // Враги
        const enemies = CONFIG.ENEMY_TYPES as any;
        for (const key in enemies) {
            const e = enemies[key];
            this.generateEnemyTexture(e.id, e.color);
        }
    }

    private static generateTexture(name: string, size: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        drawFn(ctx, size, size);
        this.images[name] = canvas;
    }

    private static generateEnemyTexture(name: string, color: string) {
        this.generateTexture(`enemy_${name}`, 48, (ctx, w, h) => {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(w/2, h/2, 18, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            // Глаза
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(w/2 - 6, h/2 - 5, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(w/2 + 6, h/2 - 5, 4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(w/2 - 6, h/2 - 5, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(w/2 + 6, h/2 - 5, 1.5, 0, Math.PI*2); ctx.fill();
        });
    }
}