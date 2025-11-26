import { Enemy } from './Enemy';
import { MapManager } from './Map';
import { UIManager } from './UIManager';
import { CONFIG } from './Config';
import { CardSystem, ICard } from './CardSystem';
import { EventEmitter } from './Events';
import { InputSystem } from './InputSystem';
import { EffectSystem } from './EffectSystem';
import { Tower } from './Tower';
import { Projectile } from './Projectile';
import { ObjectPool } from './Utils';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    
    public enemies: Enemy[] = [];
    public towers: Tower[] = [];
    public projectiles: Projectile[] = [];
    
    public map: MapManager;
    public ui: UIManager;
    public cardSys: CardSystem;
    public events: EventEmitter;
    public input: InputSystem;
    public effects: EffectSystem;

    public money: number = CONFIG.PLAYER.START_MONEY;
    public lives: number = CONFIG.PLAYER.START_LIVES;
    public wave: number = 0;
    
    public isWaveActive: boolean = false;
    private spawnInterval: any = null;

    private isRunning: boolean = false;
    public projectilePool: ObjectPool<Projectile>;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found!');
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.events = new EventEmitter();
        this.projectilePool = new ObjectPool<Projectile>(() => new Projectile());
        
        this.map = new MapManager(this.canvas.width, this.canvas.height);
        this.effects = new EffectSystem(this.ctx);
        this.cardSys = new CardSystem(this);
        this.input = new InputSystem(this);
        this.ui = new UIManager(this); // UIManager теперь инициализирует ShopSystem
        
        this.ui.update();
        this.loop = this.loop.bind(this);
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loop();
        console.log("Game Loop Started");
    }

    public restart() {
        this.isRunning = false;
        
        // Сброс ресурсов
        this.money = CONFIG.PLAYER.START_MONEY;
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.wave = 0;
        this.isWaveActive = false;
        
        // Очистка
        this.enemies = [];
        this.towers = [];
        this.projectiles = []; 
        if (this.spawnInterval) clearInterval(this.spawnInterval);
        
        // Сброс карт
        this.cardSys.hand = [];
        this.cardSys.forgeSlots = [null, null];
        this.cardSys.addCard('FIRE', 1);
        this.cardSys.addCard('ICE', 1);
        this.cardSys.addCard('SNIPER', 1);
        this.cardSys.render(); // Обновление руки
        
        this.ui.update();
        this.start(); 
    }

    public startWave() {
        if (this.isWaveActive && this.enemies.length > 0) {
            this.money += CONFIG.ECONOMY.EARLY_WAVE_BONUS;
            this.showFloatingText(`RISK BONUS! +${CONFIG.ECONOMY.EARLY_WAVE_BONUS}💰`, this.map.cols/2, this.map.rows/2, '#ffd700');
        }

        this.wave++;
        this.isWaveActive = true;
        this.ui.update();
        
        let waveIdx = (this.wave - 1) % CONFIG.WAVES.length;
        const waveData = CONFIG.WAVES[waveIdx];
        
        let subWaveIdx = 0;
        
        const runSubWave = () => {
            if (subWaveIdx >= waveData.length) return;
            
            const group = waveData[subWaveIdx];
            let spawned = 0;
            
            this.spawnInterval = setInterval(() => {
                this.spawnEnemy(group.type);
                spawned++;
                if (spawned >= group.count) {
                    clearInterval(this.spawnInterval);
                    subWaveIdx++;
                    runSubWave();
                }
            }, group.interval * 10);
        };

        runSubWave();
    }

    public spawnEnemy(typeKey: string = 'GRUNT') {
        const startPath = this.map.path[0];
        const offset = (Math.random() - 0.5) * 30; 
        
        const typeConf = (CONFIG.ENEMY_TYPES as any)[typeKey];
        const hp = CONFIG.ENEMY.BASE_HP * typeConf.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, this.wave);

        const enemy = new Enemy({
            id: `e_${Date.now()}_${Math.random()}`,
            health: hp,
            speed: typeConf.speed,
            x: startPath.x * CONFIG.TILE_SIZE + 32 + offset,
            y: startPath.y * CONFIG.TILE_SIZE + 32 + offset,
            path: this.map.path 
        });
        
        (enemy as any).reward = typeConf.reward;
        this.enemies.push(enemy);
    }

    public checkWaveEnd() {
        if (this.isWaveActive && this.enemies.length === 0) {
            this.isWaveEnd();
        }
    }

    private isWaveEnd() {
        this.isWaveActive = false;
        
        for(let i=0; i < CONFIG.ECONOMY.WAVE_CLEAR_REWARD; i++) {
            this.giveRandomCard();
        }
        
        this.showFloatingText("WAVE CLEAR! +2 CARDS", this.map.cols/2, this.map.rows/2, '#00ff00');
        this.ui.update();
    }

    public giveRandomCard() {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.cardSys.addCard(randomKey, 1);
    }

    public handleGridClick(col: number, row: number) { 
        // ...
    }

    public handleCardDrop(card: ICard): boolean {
        const col = this.input.hoverCol;
        const row = this.input.hoverRow;

        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return false;
        if (this.map.grid[row][col].type !== 0) { 
            this.showFloatingText("Здесь нельзя строить!", col, row, 'red');
            return false;
        }

        const existingTower = this.towers.find(t => t.col === col && t.row === row);
        const cost = CONFIG.ECONOMY.TOWER_COST;

        if (existingTower) {
            if (existingTower.cards.length >= 3) {
                this.showFloatingText("Башня переполнена!", col, row, 'orange');
                return false;
            }
            existingTower.addCard(card);
            this.effects.add({type: 'text', text: "UPGRADE!", x: existingTower.x, y: existingTower.y - 20, life: 60, color: '#00ff00', vy: -1});
            this.ui.update();
            return true;
        } else {
            if (this.money < cost) {
                this.showFloatingText("Не хватает золота!", col, row, 'red');
                return false;
            }
            this.money -= cost;
            const newTower = new Tower(col, row);
            newTower.addCard(card);
            this.towers.push(newTower);
            this.effects.add({type: 'explosion', x: newTower.x, y: newTower.y, radius: 40, life: 20, color: '#ffffff'});
            this.showFloatingText(`-${cost}💰`, col, row, 'gold');
            this.ui.update();
            return true;
        }
    }

    public showFloatingText(text: string, col: number, row: number, color: string) {
        const x = (col * CONFIG.TILE_SIZE) || col;
        const y = (row * CONFIG.TILE_SIZE) || row;
        
        this.effects.add({
            type: 'text', text: text, x: x + 32, y: y, life: 60, color: color, vy: -1
        });
    }

    private loop() {
        if (!this.isRunning) return;
        this.update();
        this.render();
        requestAnimationFrame(this.loop);
    }

    private update() {
        this.effects.update();
        this.towers.forEach(t => t.update(this.enemies, this.projectiles, this.projectilePool));
        this.projectiles.forEach(p => p.update(this.enemies, this.effects));
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].alive) {
                this.projectilePool.free(this.projectiles[i]);
                this.projectiles.splice(i, 1);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.move();

            if (!e.isAlive()) {
                const reward = (e as any).reward || 5;
                this.money += reward; 
                if (Math.random() < CONFIG.ECONOMY.DROP_CHANCE) {
                    this.giveRandomCard();
                    this.effects.add({type: 'text', text: "CARD GET!", x: e.x, y: e.y, life: 50, color: '#00ffff', vy: -2});
                }
                this.effects.add({type: 'explosion', x: e.x, y: e.y, life: 15, radius: 20, color: '#9c27b0'});
                this.enemies.splice(i, 1);
                this.ui.update();
                this.checkWaveEnd();
            }
            else if (e.finished) {
                this.lives--;
                this.effects.add({type: 'text', text: "-1❤️", x: e.x, y: e.y, life: 40, color: 'red', vy: -1});
                this.enemies.splice(i, 1);
                this.ui.update();
                
                if(this.lives <= 0) {
                    this.isRunning = false;
                    this.ui.showGameOver(this.wave);
                }
                this.checkWaveEnd();
            }
        }
    }

    private render() {
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);

        // --- ПРИЗРАЧНЫЙ РАДИУС (GHOST) ---
        const dragCard = this.cardSys.dragCard;
        if (dragCard && this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            const centerX = hx + 32;
            const centerY = hy + 32;

            const isValidLocation = (this.input.hoverCol < this.map.cols && this.input.hoverRow < this.map.rows) &&
                            (this.map.grid[this.input.hoverRow][this.input.hoverCol].type === 0);

            if (isValidLocation) {
                const existing = this.towers.find(t => t.col === this.input.hoverCol && t.row === this.input.hoverRow);
                let range = 0;
                let color = '';

                if (existing) {
                    const futureCards = [...existing.cards, dragCard];
                    const stats = Tower.getPreviewStats(futureCards);
                    range = stats.range;
                    color = 'rgba(100, 255, 100, 0.3)'; // Upgrade
                } else {
                    const stats = Tower.getPreviewStats([dragCard]);
                    range = stats.range;
                    color = 'rgba(100, 200, 255, 0.3)'; // New
                }

                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, range, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = color.replace('0.3', '0.8');
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                this.ctx.fillRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            }
        }

        if (this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        this.towers.forEach(t => t.draw(this.ctx));

        // --- ВРАГИ С HP БАРАМИ ---
        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.getColor();
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, 16, 0, Math.PI*2); this.ctx.fill();
            
            const barWidth = 32;
            const barHeight = 5;
            const barX = e.x - barWidth / 2;
            const barY = e.y - 28;

            this.ctx.fillStyle = '#000'; 
            this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            
            const pct = e.getHealthPercent();
            this.ctx.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
            this.ctx.fillRect(barX, barY, barWidth * pct, barHeight);
        });

        this.projectiles.forEach(p => p.draw(this.ctx));
        this.effects.draw();
    }
}