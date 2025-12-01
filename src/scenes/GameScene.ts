import { Game } from '../Game';
import { Scene } from '../Scene';
import { Enemy } from '../Enemy';
import { MapManager } from '../Map';
import { UIManager } from '../UIManager';
import { CONFIG } from '../Config';
import { CardSystem, ICard } from '../CardSystem';
import { EventEmitter } from '../Events';
import { InputSystem } from '../InputSystem';
import { EffectSystem } from '../EffectSystem';
import { DebugSystem } from '../DebugSystem';
import { Tower } from '../Tower';
import { Projectile } from '../Projectile';
import { ObjectPool } from '../Utils';
// ИСПРАВЛЕНИЕ: Импорт из правильного места (предполагаем, что он в src/WaveManager.ts)
import { WaveManager } from '../WaveManager';
import { ForgeSystem } from '../ForgeSystem';
import { CollisionSystem } from '../CollisionSystem';
import { EntityFactory } from '../EntityFactory';
import { InspectorSystem } from '../InspectorSystem';
import { BestiarySystem } from '../BestiarySystem';
import { IMapData, DEMO_MAP } from '../MapData';
import { generateUUID } from '../Utils';

export class GameScene implements Scene {
    public game: Game;
    public map: MapManager;
    public mapData: IMapData; // ИСПРАВЛЕНИЕ: Добавлено поле mapData

    public ui: UIManager;
    public cardSys: CardSystem;
    public waveManager: WaveManager;
    public events: EventEmitter;
    public input: InputSystem;
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

    public wave: number = 0;
    public lives: number = CONFIG.PLAYER.START_LIVES;
    public money: number = CONFIG.PLAYER.START_MONEY;

    public selectedTower: Tower | null = null;
    public isRunning: boolean = true;
    public frames: number = 0;

    constructor(game: Game, mapData: IMapData) {
        this.game = game;
        this.mapData = mapData || DEMO_MAP;
        this.map = new MapManager(this.mapData);

        this.events = new EventEmitter();
        this.effects = new EffectSystem(game.ctx);
        this.ui = new UIManager(this as any);
        this.cardSys = new CardSystem(this as any);
        this.input = game.input;
        this.forge = new ForgeSystem(this as any);
        this.debug = new DebugSystem(this as any);
        this.collision = new CollisionSystem(this.effects, this.debug);
        this.inspector = new InspectorSystem(this as any);
        this.bestiary = new BestiarySystem(this as any);
        this.waveManager = new WaveManager(this as any);

        this.projectilePool = new ObjectPool(() => new Projectile());
    }

    public onEnter() {
        const ui = document.getElementById('ui-layer');
        if (ui) ui.style.display = 'block';
        const hand = document.getElementById('hand-container');
        if (hand) hand.style.display = 'flex';

        this.ui.update();
    }

    public onExit() {
        const ui = document.getElementById('ui-layer');
        if (ui) ui.style.display = 'none';
    }

    public update() {
        if (!this.isRunning) return;
        this.frames++;

        this.waveManager.update();

        this.towers.forEach(t => t.update(this.enemies, this.projectiles, this.projectilePool, this.effects));
        this.collision.update(this.projectiles, this.enemies);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.move(); // Теперь move public, ошибки нет

            if (!e.isAlive()) {
                this.money += (e as any).reward || 5;
                this.effects.add({ type: 'text', text: `+${(e as any).reward}G`, x: e.x, y: e.y, life: 30, color: 'gold', vy: -1 });
                this.enemies.splice(i, 1);
                this.ui.update();
            } else if (e.finished) {
                this.lives--;
                this.enemies.splice(i, 1);
                this.ui.update();
                if (this.lives <= 0) this.gameOver();
            }
        }

        this.effects.update();
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        this.map.draw(ctx);

        if (this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        this.towers.forEach(t => t.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
        this.effects.draw();
    }

    // --- API Methods ---

    public spawnEnemy(type: string) {
        if (!this.map.waypoints || this.map.waypoints.length === 0) return;
        // EntityFactory теперь принимает 3 аргумента, ошибки нет
        const enemy = EntityFactory.createEnemy(type, this.wave, this.map.waypoints);
        this.enemies.push(enemy);
    }

    public startBuildingTower(col: number, row: number) {
        if (!this.map.isBuildable(col, row)) {
            this.showFloatingText("Can't build here!", col * 64, row * 64, 'red');
            return;
        }
        // Логика постройки через карты (handleCardDrop)
    }

    public handleGridClick(col: number, row: number) {
        const tower = this.towers.find(t => t.col === col && t.row === row);
        if (tower) {
            this.selectedTower = tower;
            this.inspector.selectTower(tower);
        } else {
            this.selectedTower = null;
            this.inspector.hide();
        }
    }

    public showFloatingText(text: string, x: number, y: number, color: string = '#fff') {
        this.effects.add({ type: 'text', text, x, y, life: 60, color, vy: -1 });
    }

    // ИСПРАВЛЕНИЕ: Добавлен handleCardDrop
    public handleCardDrop(card: ICard, x: number, y: number) {
        const col = Math.floor(x / CONFIG.TILE_SIZE);
        const row = Math.floor(y / CONFIG.TILE_SIZE);

        if (card.type.id === 'fire' || card.type.id === 'ice' || card.type.id === 'sniper' || card.type.id === 'multi') {
            // Это карта-башня или модификатор
            if (this.money < CONFIG.ECONOMY.TOWER_COST) {
                this.showFloatingText("Not enough money!", x, y, 'red');
                return false;
            }

            // Если там пусто -> строим
            let tower = this.towers.find(t => t.col === col && t.row === row);
            if (!tower) {
                if (!this.map.isBuildable(col, row)) {
                    this.showFloatingText("Can't build here", x, y, 'red');
                    return false;
                }
                this.money -= CONFIG.ECONOMY.TOWER_COST;
                tower = EntityFactory.createTower(col, row);
                this.towers.push(tower);
            }

            // Добавляем карту в башню
            if (tower.cards.length < 3) {
                tower.cards.push(card);
                this.showFloatingText("Card installed!", x, y, 'lime');
                this.ui.update();
                return true; // Успех, карта тратится
            } else {
                this.showFloatingText("Tower full!", x, y, 'orange');
                return false;
            }
        }
        return false;
    }

    // ИСПРАВЛЕНИЕ: Добавлен giveRandomCard
    public giveRandomCard() {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const key = keys[Math.floor(Math.random() * keys.length)];
        this.cardSys.addCard(key, 1);
        this.ui.update();
    }

    // ИСПРАВЛЕНИЕ: Добавлен sellTower
    public sellTower(tower: Tower) {
        const idx = this.towers.indexOf(tower);
        if (idx !== -1) {
            this.towers.splice(idx, 1);
            const refund = Math.floor(CONFIG.ECONOMY.TOWER_COST * CONFIG.ECONOMY.SELL_REFUND);
            this.money += refund;
            this.showFloatingText(`+${refund}G`, tower.x, tower.y, 'gold');
            this.selectedTower = null;
            this.inspector.hide();
            this.ui.update();
        }
    }

    // ИСПРАВЛЕНИЕ: Добавлен restart
    public restart() {
        this.game.changeScene(new GameScene(this.game, this.mapData));
    }

    private gameOver() {
        this.isRunning = false;
        this.ui.showGameOver(this.wave);
    }
}