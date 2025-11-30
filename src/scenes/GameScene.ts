import { Game } from '../Game';
import { Scene } from '../Scene';
import { Enemy } from '../Enemy';
import { MapManager } from '../Map';
import { UIManager } from '../UIManager';
import { CONFIG } from '../Config';
import { CardSystem } from '../CardSystem';
import { EventEmitter } from '../Events';
import { EffectSystem } from '../EffectSystem';
import { DebugSystem } from '../DebugSystem';
import { Tower } from '../Tower';
import { Projectile } from '../Projectile';
import { ObjectPool } from '../Utils';
import { WaveManager } from '../WaveManager';
import { ForgeSystem } from '../ForgeSystem';
import { CollisionSystem } from '../CollisionSystem';
import { EntityFactory } from '../EntityFactory';
import { InspectorSystem } from '../InspectorSystem';
import { BestiarySystem } from '../BestiarySystem';
import { IMapData, DEMO_MAP } from '../MapData';

export class GameScene implements Scene {
    public game: Game; 
    public map: MapManager;
    public mapData: IMapData; // Данные карты (важно для Редактора!)

    public ui: UIManager;
    public cardSys: CardSystem;
    public waveManager: WaveManager;
    public events: EventEmitter;
    public effects: EffectSystem;
    public debug: DebugSystem;
    public forge: ForgeSystem;
    public collision: CollisionSystem;
    public inspector: InspectorSystem;
    public bestiary: BestiarySystem;

    public enemies: Enemy[] = [];
    public towers: Tower[] = [];
    public projectiles: Projectile[] = [];
    public projectilePool: ObjectPool<Projectile>;
    
    public money: number;
    public lives: number;
    public wave: number = 0;
    public frames: number = 0;
    
    public selectedTower: Tower | null = null;
    public isRunning: boolean = true;

    // Конструктор принимает mapData, чтобы Editor мог передать свою карту
    constructor(game: Game, mapData: IMapData = DEMO_MAP) {
        this.game = game;
        this.mapData = mapData;
        this.map = new MapManager(this.mapData);
        
        this.money = this.mapData.startingMoney || CONFIG.PLAYER.START_MONEY;
        this.lives = this.mapData.startingLives || CONFIG.PLAYER.START_LIVES;

        this.events = new EventEmitter();
        this.effects = new EffectSystem(this.game.ctx);
        
        // Инициализация систем
        this.ui = new UIManager(this);
        this.cardSys = new CardSystem(this);
        this.waveManager = new WaveManager(this);
        this.forge = new ForgeSystem(this);
        this.debug = new DebugSystem(this);
        this.collision = new CollisionSystem(this.effects, this.debug);
        this.inspector = new InspectorSystem(this);
        this.bestiary = new BestiarySystem(this);

        this.projectilePool = new ObjectPool<Projectile>(() => new Projectile());
    }

    public onEnter() {
        this.isRunning = true;
        this.ui.update();
        // Скрываем UI главного меню, если он вдруг остался
        const menuContainer = document.querySelector('.menu-container') as HTMLElement; 
        if(menuContainer) menuContainer.style.display = 'none';
    }

    public onExit() {
        this.isRunning = false;
        // Очищаем UI элементы
        const hand = document.getElementById('hand');
        if (hand) hand.innerHTML = '';
        this.inspector.hide();
    }

    public update() {
        if (!this.isRunning) return;
        this.frames++;
        
        this.waveManager.update();
        this.effects.update();
        
        // Обновляем башни
        this.towers.forEach(t => {
            t.update(this.enemies, this.projectiles, this.projectilePool);
        });

        // Обновляем снаряды
        this.projectiles.forEach(p => p.update());
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].alive) {
                this.projectilePool.free(this.projectiles[i]);
                this.projectiles.splice(i, 1);
            }
        }

        this.collision.update(this.projectiles, this.enemies);

        // Обновляем врагов
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(); 
            
            if (e.finished) {
                this.lives--;
                this.enemies.splice(i, 1);
                this.ui.update();
                if (this.lives <= 0) {
                    this.isRunning = false;
                    this.ui.showGameOver(this.wave);
                }
            } else if (!e.isAlive()) {
                const reward = (e as any).reward || 5;
                this.money += reward;
                this.showFloatingText(`+${reward}`, e.x, e.y, 'gold');
                
                if (Math.random() < CONFIG.ECONOMY.DROP_CHANCE) {
                    this.cardSys.addRandomCardToHand();
                }
                
                this.enemies.splice(i, 1);
                this.ui.update();
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        // Очистка и фон
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        
        this.map.draw(ctx);
        
        // Получаем input из GAME, а не локально
        const input = this.game.input;

        // Подсветка курсора
        if (input.hoverCol >= 0) {
             const hx = input.hoverCol * CONFIG.TILE_SIZE;
             const hy = input.hoverRow * CONFIG.TILE_SIZE;
             ctx.strokeStyle = 'rgba(255,255,255,0.3)'; 
             ctx.lineWidth = 2; 
             ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
        
        // Подсветка выбранной башни
        if(this.selectedTower) { 
             ctx.strokeStyle = '#00ffff'; 
             ctx.lineWidth = 3; 
             ctx.strokeRect(this.selectedTower.col * CONFIG.TILE_SIZE, this.selectedTower.row * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE); 
        }

        this.towers.forEach(t => t.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
        this.effects.draw();
    }

    // --- Логика игры ---

    public restart() {
        // Перезапускаем сцену с теми же данными (важно для редактора)
        this.game.changeScene(new GameScene(this.game, this.mapData));
    }

    public spawnEnemy(type: string) {
        if (this.map.path.length === 0) return;
        // ВОТ ИСПРАВЛЕНИЕ: Передаем ровно 3 аргумента, как в Factory
        const enemy = EntityFactory.createEnemy(type, this.wave, this.map.path);
        this.enemies.push(enemy);
    }

    public handleGridClick(col: number, row: number) {
        const tower = this.towers.find(t => t.col === col && t.row === row);
        if (tower) {
            this.selectedTower = tower;
            this.inspector.selectTower(tower);
            return;
        }
        this.selectedTower = null;
        this.inspector.hide();
    }

    public startBuildingTower(col: number, row: number) {
        if (!this.map.isBuildable(col, row)) {
            this.showFloatingText("Тут нельзя строить!", col * 64, row * 64, 'red');
            return;
        }
        if (this.towers.some(t => t.col === col && t.row === row)) return;

        if (this.money >= CONFIG.ECONOMY.TOWER_COST) {
            this.money -= CONFIG.ECONOMY.TOWER_COST;
            const t = EntityFactory.createTower(col, row);
            t.isBuilding = true;
            this.towers.push(t);
            this.ui.update();
        } else {
            this.showFloatingText("Не хватает золота!", col * 64, row * 64, 'red');
        }
    }

    public handleCardDrop(card: any, x: number, y: number) {
        const col = Math.floor(x / CONFIG.TILE_SIZE);
        const row = Math.floor(y / CONFIG.TILE_SIZE);

        // Сначала проверяем кузницу
        if (this.forge.tryDropCard(x, y, card)) return;

        // Потом проверяем башни
        const tower = this.towers.find(t => t.col === col && t.row === row);
        if (tower && !tower.isBuilding) {
             if (tower.cards.length < 3) {
                 tower.cards.push(card);
                 this.cardSys.removeCardFromHand(card);
                 this.showFloatingText("Card Equipped!", x, y, '#00ff00');
                 this.inspector.selectTower(tower);
             } else {
                 this.showFloatingText("Tower Full!", x, y, 'red');
             }
        }
    }
    
    public sellTower(tower: Tower) {
        const idx = this.towers.indexOf(tower);
        if (idx !== -1) {
            const refund = Math.floor(tower.costSpent * CONFIG.ECONOMY.SELL_REFUND);
            this.money += refund;
            this.showFloatingText(`+${refund}💰`, tower.x, tower.y, 'gold');
            this.towers.splice(idx, 1);
            this.selectedTower = null;
            this.inspector.hide();
            this.ui.update();
        }
    }

    public showFloatingText(text: string, x: number, y: number, color: string) {
        this.effects.add({
            type: 'text', text: text, x: x, y: y, color: color, life: 60, vy: -1
        });
    }

    public giveRandomCard() {
        this.cardSys.addRandomCardToHand();
    }
}