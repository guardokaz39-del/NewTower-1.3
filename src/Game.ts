import { Enemy } from './Enemy';
import { MapManager } from './Map';
import { UIManager } from './UIManager';
import { CONFIG } from './Config';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public enemies: Enemy[] = [];
    public map: MapManager;
    public ui: UIManager;

    // Состояние игрока
    public money: number = CONFIG.PLAYER.START_MONEY;
    public lives: number = CONFIG.PLAYER.START_LIVES;

    private isRunning: boolean = false;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found!');
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        
        // Растягиваем на весь экран
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 1. Создаем Карту
        this.map = new MapManager(this.canvas.width, this.canvas.height);
        
        // 2. Создаем Интерфейс
        this.ui = new UIManager(this);
        this.ui.update(); 

        this.loop = this.loop.bind(this);
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loop();
    }

    public startWave() {
        console.log("Волна пошла!");
    }

    public addEnemy(enemy: Enemy) {
        this.enemies.push(enemy);
    }

    private loop() {
        if (!this.isRunning) return;
        this.update();
        this.render();
        requestAnimationFrame(this.loop);
    }

    private update() {
        this.enemies.forEach(enemy => enemy.move());
    }

    private render() {
        // ВОТ ТУТ БЫЛА ОШИБКА. Исправленная строка:
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем карту (фон)
        this.map.draw(this.ctx);

        // Рисуем врагов
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.getHealthPercent() > 0.5 ? '#2ecc71' : '#e74c3c';
            this.ctx.fillRect(enemy.x, enemy.y, 30, 30); 
            
            // HP бар
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`${enemy.currentHealth}`, enemy.x, enemy.y - 5);
        });
    }
}