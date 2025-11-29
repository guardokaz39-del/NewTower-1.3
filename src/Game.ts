import { CrashHandler } from './CrashHandler'; // 1. Первым делом
const crashHandler = new CrashHandler();

import { Enemy } from './Enemy';
import { MapManager } from './Map';
import { UIManager } from './UIManager';
import { CONFIG } from './Config';
import { CardSystem, ICard } from './CardSystem';
import { EventEmitter } from './Events';
import { InputSystem } from './InputSystem';
import { EffectSystem } from './EffectSystem';
import { DebugSystem } from './DebugSystem';
import { Tower } from './Tower';
import { Projectile } from './Projectile';
import { ObjectPool } from './Utils';

import { WaveManager } from './WaveManager';
import { ForgeSystem } from './ForgeSystem';
import { CollisionSystem } from './CollisionSystem';
import { EntityFactory } from './EntityFactory';
import { InspectorSystem } from './InspectorSystem'; // <-- NEW
import { BestiarySystem } from './BestiarySystem';   // <-- NEW

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    
    public enemies: Enemy[] = [];
    public towers: Tower[] = [];
    public projectiles: Projectile[] = [];
    public projectilePool: ObjectPool<Projectile>;
    
    public map: MapManager;
    public ui: UIManager;
    public cardSys: CardSystem;
    public events: EventEmitter;
    public input: InputSystem;
    public effects: EffectSystem;
    public debug: DebugSystem;
    
    public waveManager: WaveManager;
    public forge: ForgeSystem;
    public collision: CollisionSystem;
    public inspector: InspectorSystem; // <-- NEW
    public bestiary: BestiarySystem;   // <-- NEW

    public money: number = CONFIG.PLAYER.START_MONEY;
    public lives: number = CONFIG.PLAYER.START_LIVES;
    public wave: number = 0;
    
    public selectedTower: Tower | null = null; // <-- Для кликов
    
    private isRunning: boolean = false;
    public frames: number = 0;
    private activeBuildingTower: Tower | null = null;

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
        this.debug = new DebugSystem(this);
        
        this.forge = new ForgeSystem(this);
        this.cardSys = new CardSystem(this);
        this.waveManager = new WaveManager(this);
        this.collision = new CollisionSystem(this.effects, this.debug);
        this.inspector = new InspectorSystem(this); // <-- INIT
        this.bestiary = new BestiarySystem(this);   // <-- INIT
        
        this.input = new InputSystem(this);
        this.ui = new UIManager(this); 
        
        this.ui.update();
        this.loop = this.loop.bind(this);
    }
    
    public getActiveTower() { return this.activeBuildingTower; }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.ui.hideGameOver();
        this.debug.log("Game Started");
        this.loop();
    }

    public restart() {
        this.debug.log("Game Restarting...");
        this.isRunning = false;
        this.money = CONFIG.PLAYER.START_MONEY;
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.wave = 0;
        this.frames = 0;
        
        this.enemies = [];
        this.towers = [];
        this.projectiles = []; 
        this.activeBuildingTower = null;
        this.selectedTower = null;
        
        this.cardSys.hand = [];
        this.forge.slots = [null, null];
        this.cardSys.addCard('FIRE', 1);
        this.cardSys.addCard('ICE', 1);
        this.cardSys.addCard('SNIPER', 1);
        
        this.waveManager = new WaveManager(this);
        
        this.cardSys.render(); 
        this.ui.shop.rerollShop();
        this.ui.update();
        this.start(); 
    }

    // --- ЛОГИКА СТРОЙКИ ---
    public startBuildingTower(col: number, row: number) {
        if (this.activeBuildingTower) return; 

        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return;
        if (this.map.grid[row][col].type !== 0) {
            this.showFloatingText("Тут занято!", col, row, 'red');
            return;
        }
        if (this.towers.find(t => t.col === col && t.row === row)) return;

        const cost = CONFIG.ECONOMY.TOWER_COST;
        if (this.money < cost) {
            this.showFloatingText("Нет денег!", col, row, 'red');
            return;
        }

        this.money -= cost;
        const newTower = EntityFactory.createTower(col, row);
        newTower.isBuilding = true;
        this.towers.push(newTower);
        
        this.activeBuildingTower = newTower;
        this.showFloatingText(`-${cost}💰`, col, row, 'gold');
        this.debug.log(`Build started at [${col},${row}]`);
        this.ui.update();
    }

    public stopBuildingTower() {
        if (!this.activeBuildingTower) return;
        if (this.activeBuildingTower.isBuilding) {
            this.towers = this.towers.filter(t => t !== this.activeBuildingTower);
            this.money += CONFIG.ECONOMY.TOWER_COST;
            this.showFloatingText(`Отмена`, this.activeBuildingTower.col, this.activeBuildingTower.row, '#ccc');
        }
        this.activeBuildingTower = null;
        this.ui.update();
    }

    // --- ПРОДАЖА БАШНИ ---
    public sellTower(tower: Tower) {
        const refund = Math.floor(tower.costSpent * CONFIG.ECONOMY.SELL_REFUND);
        this.money += refund;
        this.towers = this.towers.filter(t => t !== tower);
        this.effects.add({type: 'text', text: `+${refund}💰`, x: tower.x, y: tower.y, life: 60, color: 'gold', vy: -1});
        this.effects.add({type: 'explosion', x: tower.x, y: tower.y, radius: 40, life: 20, color: '#fff'});
        this.ui.update();
        this.debug.log(`Tower sold for ${refund}`);
    }

    public handleCardDrop(card: ICard): boolean {
        const col = this.input.hoverCol;
        const row = this.input.hoverRow;
        const existingTower = this.towers.find(t => t.col === col && t.row === row);

        if (existingTower) {
            if (existingTower.isBuilding) {
                this.showFloatingText("Еще строится!", col, row, 'orange');
                return false;
            }
            if (existingTower.cards.length >= 3) {
                this.showFloatingText("Башня полна!", col, row, 'orange');
                return false;
            }
            existingTower.addCard(card);
            this.effects.add({type: 'text', text: "UPGRADE!", x: existingTower.x, y: existingTower.y - 20, life: 60, color: '#00ff00', vy: -1});
            this.ui.update();
            return true;
        }
        this.showFloatingText("Мимо!", col, row, '#ccc');
        return false;
    }

    // Обработка клика по сетке (ВЫДЕЛЕНИЕ)
    public handleGridClick(col: number, row: number) {
        // Если строим - не выделяем
        if (this.activeBuildingTower) return;
        
        const clickedTower = this.towers.find(t => t.col === col && t.row === row);
        
        if (clickedTower) {
            this.selectedTower = clickedTower;
        } else {
            this.selectedTower = null;
        }
    }

    public giveRandomCard() {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.cardSys.addCard(randomKey, 1);
    }

    public showFloatingText(text: string, col: number, row: number, color: string) {
        const x = (col * CONFIG.TILE_SIZE) || col;
        const y = (row * CONFIG.TILE_SIZE) || row;
        this.effects.add({ type: 'text', text: text, x: x + 32, y: y, life: 60, color: color, vy: -1 });
    }
    
    public spawnEnemy(typeKey: string) {
        try {
            const enemy = EntityFactory.createEnemy(typeKey, this.wave, this.map.path);
            this.enemies.push(enemy);
            // Открываем врага в бестиарии
            this.bestiary.unlock(typeKey); 
        } catch (e) {
            this.debug.log(`Error spawning enemy: ${e}`);
        }
    }

    private loop() {
        if (!this.isRunning) return;
        this.frames++;
        this.update();
        this.render();
        requestAnimationFrame(this.loop);
    }

    private update() {
        this.input.update(); 
        this.effects.update();
        this.debug.update();
        this.waveManager.update();
        this.inspector.update(); // <-- Обновляем панель инспектора

        this.towers.forEach(t => t.update(this.enemies, this.projectiles, this.projectilePool, this.effects));
        this.projectiles.forEach(p => p.move());
        this.collision.update(this.projectiles, this.enemies);

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
            }
        }

        if (this.activeBuildingTower && !this.activeBuildingTower.isBuilding) {
             this.activeBuildingTower = null;
        }
    }

    private render() {
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);

        // --- ЛОГИКА ОТРИСОВКИ РАДИУСА И ПРЕДСКАЗАНИЯ ---
        const dragCard = this.cardSys.dragCard;
        const hoverCol = this.input.hoverCol;
        const hoverRow = this.input.hoverRow;

        // 1. Если наводим на башню курсором (без карты) или она выбрана -> рисуем белый радиус
        let targetTower = this.towers.find(t => t.col === hoverCol && t.row === hoverRow);
        if (!targetTower && this.selectedTower) targetTower = this.selectedTower;

        if (targetTower && !targetTower.isBuilding) {
            const stats = targetTower.getStats();
            this.ctx.beginPath();
            this.ctx.arc(targetTower.x, targetTower.y, stats.range, 0, Math.PI * 2);
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.fill();
        }

        // 2. Если тащим карту над башней -> рисуем зеленый радиус
        if (dragCard && hoverCol >= 0) {
            const hx = hoverCol * CONFIG.TILE_SIZE;
            const hy = hoverRow * CONFIG.TILE_SIZE;
            const centerX = hx + CONFIG.TILE_SIZE / 2;
            const centerY = hy + CONFIG.TILE_SIZE / 2;

            const towerUnderDrag = this.towers.find(t => t.col === hoverCol && t.row === hoverRow && !t.isBuilding);

            if (towerUnderDrag && towerUnderDrag.cards.length < 3) {
                // Предсказание
                const futureCards = [...towerUnderDrag.cards, dragCard];
                const stats = Tower.getPreviewStats(futureCards);
                
                this.ctx.fillStyle = 'rgba(100, 255, 100, 0.1)'; 
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, stats.range, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                // Красный квадрат (нельзя поставить)
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                this.ctx.fillRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            }
        }
        
        // Подсветка курсора
        if (hoverCol >= 0) {
            const hx = hoverCol * CONFIG.TILE_SIZE;
            const hy = hoverRow * CONFIG.TILE_SIZE;
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            
            // Если башня выбрана - рисуем рамку выделения
            if (this.selectedTower) {
                 this.ctx.strokeStyle = '#00ffff';
                 this.ctx.lineWidth = 3;
                 this.ctx.strokeRect(
                     this.selectedTower.col * CONFIG.TILE_SIZE, 
                     this.selectedTower.row * CONFIG.TILE_SIZE, 
                     CONFIG.TILE_SIZE, CONFIG.TILE_SIZE
                 );
            }
        }

        this.towers.forEach(t => t.draw(this.ctx));
        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.getColor();
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, 16, 0, Math.PI*2); this.ctx.fill();
            const barWidth = 32; const barHeight = 5; const barX = e.x - barWidth / 2; const barY = e.y - 28;
            this.ctx.fillStyle = '#000'; this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            const pct = e.getHealthPercent();
            this.ctx.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
            this.ctx.fillRect(barX, barY, barWidth * pct, barHeight);
        });
        
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.effects.draw();
    }
}