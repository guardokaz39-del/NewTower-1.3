import { Enemy } from './Enemy';
import { MapManager } from './Map';
import { UIManager } from './UIManager';
import { CONFIG } from './Config';
import { CardSystem, ICard } from './CardSystem';
import { EventEmitter } from './Events';
import { InputSystem } from './InputSystem';   // <-- Новая система ввода
import { EffectSystem } from './EffectSystem'; // <-- Новая система эффектов
import { Tower } from './Tower';               // <-- Башни
import { Projectile } from './Projectile';     // <-- Снаряды
import { ObjectPool } from './Utils';          // <-- Пул объектов

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    
    // Сущности игры
    public enemies: Enemy[] = [];
    public towers: Tower[] = [];
    public projectiles: Projectile[] = [];
    
    // Системы
    public map: MapManager;
    public ui: UIManager;
    public cardSys: CardSystem;
    public events: EventEmitter;
    public input: InputSystem;
    public effects: EffectSystem;

    // Ресурсы
    public money: number = CONFIG.PLAYER.START_MONEY;
    public lives: number = CONFIG.PLAYER.START_LIVES;
    public wave: number = 0;

    // Техническое
    private isRunning: boolean = false;
    public projectilePool: ObjectPool<Projectile>;

    constructor(canvasId: string) {
        // 1. Настройка Canvas
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found!');
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 2. Инициализация систем (Порядок важен!)
        this.events = new EventEmitter();
        this.projectilePool = new ObjectPool<Projectile>(() => new Projectile());
        
        this.map = new MapManager(this.canvas.width, this.canvas.height);
        this.effects = new EffectSystem(this.ctx);
        this.cardSys = new CardSystem(this);
        this.input = new InputSystem(this); // Подключаем управление
        this.ui = new UIManager(this);      // UI в последнюю очередь
        
        this.ui.update();
        this.loop = this.loop.bind(this);
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loop();
        console.log("Game Loop Started");
    }

    // --- ЛОГИКА ВОЛН ---
    public startWave() {
        this.wave++;
        this.ui.update();
        console.log(`Wave ${this.wave} started!`);
        
        // Временная логика: спавним пачку врагов
        let count = 0;
        const interval = setInterval(() => {
            this.spawnEnemy();
            count++;
            if(count >= 5 + (this.wave * 2)) clearInterval(interval);
        }, 1000);
    }

    public spawnEnemy() {
        // Берем координаты старта из карты (путь)
        const startPath = this.map.path[0];
        // Немного смещаем, чтобы не шли по одной линии
        const offset = (Math.random() - 0.5) * 20; 
        
        const enemy = new Enemy({
            id: `enemy_${Date.now()}_${Math.random()}`,
            health: CONFIG.ENEMY.BASE_HP * Math.pow(CONFIG.ENEMY.HP_GROWTH, this.wave),
            speed: (CONFIG.ENEMY_TYPES.GRUNT as any).speed,
            x: startPath.x * CONFIG.TILE_SIZE + 32 + offset,
            y: startPath.y * CONFIG.TILE_SIZE + 32 + offset
        });
        
        this.enemies.push(enemy);
    }

    // --- ВЗАИМОДЕЙСТВИЕ (Вызывается из InputSystem/CardSystem) ---

    // Игрок кликнул по клетке (без карты)
    public handleGridClick(col: number, row: number) {
        // Можно реализовать выделение башни для просмотра радиуса
        const tower = this.towers.find(t => t.col === col && t.row === row);
        if (tower) {
            console.log("Выбрана башня:", tower);
            // TODO: Показать радиус
        }
    }

    // Игрок отпустил карту над полем (Самое важное!)
    public handleCardDrop(card: ICard): boolean {
        const col = this.input.hoverCol;
        const row = this.input.hoverRow;

        // 1. Проверка границ и типа местности
        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return false;
        const cell = this.map.grid[row][col];
        if (cell.type !== 0) { // 0 = Buildable (Трава)
            this.showFloatingText("Здесь нельзя строить!", col, row, 'red');
            return false;
        }

        // 2. Ищем, есть ли тут уже башня
        const existingTower = this.towers.find(t => t.col === col && t.row === row);

        if (existingTower) {
            // --- УЛУЧШЕНИЕ БАШНИ ---
            if (existingTower.cards.length >= 3) {
                this.showFloatingText("Башня переполнена!", col, row, 'orange');
                return false;
            }
            
            existingTower.addCard(card);
            this.effects.add({
                type: 'text', text: "UPGRADE!", x: existingTower.x, y: existingTower.y - 20,
                life: 60, color: '#00ff00', vy: -1
            });
            return true; // Успех
        } 
        else {
            // --- СТРОИТЕЛЬСТВО НОВОЙ ---
            if (this.money < CONFIG.TOWER.COST) {
                this.showFloatingText("Не хватает золота!", col, row, 'red');
                return false;
            }

            // Строим
            this.money -= CONFIG.TOWER.COST;
            const newTower = new Tower(col, row);
            newTower.addCard(card); // Сразу вставляем карту-основу
            this.towers.push(newTower);

            // Эффекты
            this.effects.add({
                type: 'explosion', x: newTower.x, y: newTower.y, 
                radius: 40, life: 20, color: '#ffffff'
            });
            this.showFloatingText(`-${CONFIG.TOWER.COST}💰`, col, row, 'gold');
            
            this.ui.update();
            return true; // Успех
        }
    }

    private showFloatingText(text: string, col: number, row: number, color: string) {
        this.effects.add({
            type: 'text', 
            text: text, 
            x: col * CONFIG.TILE_SIZE + 32, 
            y: row * CONFIG.TILE_SIZE,
            life: 60, 
            color: color, 
            vy: -1
        });
    }

    // --- ГЛАВНЫЙ ЦИКЛ ---
    private loop() {
        if (!this.isRunning) return;

        // 1. Обновление логики
        this.update();
        
        // 2. Отрисовка
        this.render();

        requestAnimationFrame(this.loop);
    }

    private update() {
        // Эффекты
        this.effects.update();

        // Башни (стрельба)
        this.towers.forEach(t => t.update(this.enemies, this.projectiles, this.projectilePool));

        // Снаряды
        this.projectiles.forEach(p => p.update(this.enemies));
        // Удаляем мертвые снаряды
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].alive) {
                this.projectilePool.free(this.projectiles[i]);
                this.projectiles.splice(i, 1);
            }
        }

        // Враги
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            
            // Двигаем врага по пути (нужно дописать логику пути в Enemy, 
            // но пока используем простой move() из демо)
            // В идеале: e.followPath(this.map.path); 
            // Сейчас просто оставим e.move() или доработаем Enemy позже.
            e.move(); // Временное движение вправо

            // Проверка на смерть
            if (!e.isAlive()) {
                this.money += 10; // Награда
                this.effects.add({type: 'explosion', x: e.x, y: e.y, life: 15, radius: 20, color: '#9c27b0'});
                this.enemies.splice(i, 1);
                this.ui.update();
            }
            // Проверка выхода за карту (потеря жизней)
            else if (e.x > this.canvas.width) {
                this.lives--;
                this.enemies.splice(i, 1);
                this.ui.update();
                if(this.lives <= 0) alert("GAME OVER");
            }
        }
    }

    private render() {
        // Очистка
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Карта
        this.map.draw(this.ctx);

        // 2. Подсветка клетки под мышью
        if (this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        // 3. Башни
        this.towers.forEach(t => t.draw(this.ctx));

        // 4. Враги
        this.enemies.forEach(e => {
            // Временная отрисовка врага здесь, пока не перенесем draw() в Enemy.ts
            this.ctx.fillStyle = e.getHealthPercent() > 0.5 ? '#2ecc71' : '#e74c3c';
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, 16, 0, Math.PI*2); this.ctx.fill();
            // HP Bar
            this.ctx.fillStyle = '#fff'; this.ctx.fillRect(e.x-10, e.y-25, 20, 4);
            this.ctx.fillStyle = '#f00'; this.ctx.fillRect(e.x-10, e.y-25, 20 * e.getHealthPercent(), 4);
        });

        // 5. Снаряды
        this.projectiles.forEach(p => p.draw(this.ctx));

        // 6. Эффекты (поверх всего)
        this.effects.draw();
    }
}