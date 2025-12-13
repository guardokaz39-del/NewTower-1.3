import { Game } from '../Game';
import { BaseScene } from '../BaseScene';
import { IGameScene } from './IGameScene';
import { Enemy } from '../Enemy';
import { MapManager } from '../Map';
import { UIManager } from '../UIManager';
import { CONFIG, getEnemyType } from '../Config';
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
import { MetricsSystem } from '../MetricsSystem';
import { WeaponSystem } from '../WeaponSystem';
import { FogSystem } from '../FogSystem';

/**
 * Main game scene where gameplay takes place.
 * Implements IGameScene interface to decouple systems.
 */
export class GameScene extends BaseScene implements IGameScene {
    public game: Game;
    public map: MapManager;
    public mapData: IMapData; // ИСПРАВЛЕНИЕ: Добавлено поле mapData
    public fog: FogSystem;

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
    public metrics: MetricsSystem;
    public weaponSystem: WeaponSystem;

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
        super();
        this.game = game;
        this.mapData = mapData || DEMO_MAP;
        this.map = new MapManager(this.mapData);
        this.fog = new FogSystem(this.mapData);

        this.events = new EventEmitter();
        this.effects = new EffectSystem(game.ctx);
        this.input = game.input;

        // CRITICAL: waveManager must be created BEFORE ui and cardSys
        // because CardSystem.constructor calls ui.update() which accesses waveManager
        this.waveManager = new WaveManager(this);
        this.weaponSystem = new WeaponSystem();

        this.ui = new UIManager(this);
        this.cardSys = new CardSystem(this);
        this.forge = new ForgeSystem(this);
        this.debug = new DebugSystem(this);
        this.collision = new CollisionSystem(this.effects, this.debug);
        this.inspector = new InspectorSystem(this);
        this.bestiary = new BestiarySystem(this);
        this.metrics = new MetricsSystem();

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
        this.fog.update();

        // FIX: Update projectiles BEFORE spawning new ones to prevent visual gaps (jump forward)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update();
            if (!p.alive) {
                this.projectiles.splice(i, 1);
                this.projectilePool.free(p);
            }
        }

        // Use WeaponSystem for tower logic
        this.weaponSystem.update(this.towers, this.enemies, this.projectiles, this.projectilePool, this.effects);

        // Update tower visual states (building progress)
        this.towers.forEach((t) => t.updateBuilding(this.effects));



        this.collision.update(this.projectiles, this.enemies);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.move(); // Теперь move public, ошибки нет
            e.update(); // Update status effects and damage modifiers

            if (!e.isAlive()) {
                const reward = e.reward || 5;
                this.money += reward;
                this.metrics.trackEnemyKilled();
                this.metrics.trackMoneyEarned(reward);

                // Floating text with emoji
                this.effects.add({
                    type: 'text',
                    text: `+${reward}💰`,
                    x: e.x,
                    y: e.y,
                    life: 40,
                    color: 'gold',
                    vy: -1.5,
                });

                // Coin particle burst animation
                const particleCount = Math.min(3 + Math.floor(reward / 5), 8);
                for (let p = 0; p < particleCount; p++) {
                    this.effects.add({
                        type: 'particle',
                        x: e.x + (Math.random() - 0.5) * 20,
                        y: e.y + (Math.random() - 0.5) * 20,
                        vx: (Math.random() - 0.5) * 6,
                        vy: -(Math.random() * 4 + 2),
                        life: 25 + Math.floor(Math.random() * 15),
                        radius: 3 + Math.random() * 2,
                        color: Math.random() > 0.3 ? '#ffd700' : '#ffeb3b', // Gold/Yellow coins
                    });
                }

                // === DEATH DEBRIS EFFECT ===
                const enemyTypeConf = getEnemyType(e.typeId.toUpperCase());
                const debrisColor = enemyTypeConf?.color || '#888';
                const debrisCount = 6 + Math.floor(Math.random() * 3); // 6-8 pieces
                for (let d = 0; d < debrisCount; d++) {
                    this.effects.add({
                        type: 'debris',
                        x: e.x,
                        y: e.y,
                        vx: (Math.random() - 0.5) * 8,
                        vy: -(Math.random() * 4 + 1),
                        life: 30 + Math.floor(Math.random() * 15),
                        size: 3 + Math.random() * 4,
                        color: debrisColor,
                        rotation: Math.random() * Math.PI * 2,
                        vRot: (Math.random() - 0.5) * 0.4,
                        gravity: 0.3,
                    });
                }
                // === END DEATH DEBRIS ===

                this.enemies.splice(i, 1);
                this.ui.update();
            } else if (e.finished) {
                this.lives--;
                this.metrics.trackLifeLost();
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
        this.fog.draw(ctx);

        if (this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        this.towers.forEach((t) => t.draw(ctx));

        // FEATURE: Show range circle for selected tower
        if (this.selectedTower) {
            const stats = this.selectedTower.getStats();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.selectedTower.x, this.selectedTower.y, stats.range, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        this.enemies.forEach((e) => e.draw(ctx));
        this.projectiles.forEach((p) => p.draw(ctx));
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
        const screenX = col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const screenY = row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        if (!this.map.isBuildable(col, row)) {
            this.showFloatingText("Can't build here!", screenX, screenY, 'red');
            return;
        }

        // Prevent building in fog
        const idx = row * this.mapData.width + col;
        if (this.mapData.fogData && this.mapData.fogData[idx] === 1) {
            this.showFloatingText("Too foggy!", screenX, screenY, 'gray');
            return;
        }

        // Check if a tower already exists at this location
        const existingTower = this.towers.find((t) => t.col === col && t.row === row);
        if (existingTower) {
            this.showFloatingText('Tower already here!', screenX, screenY, 'orange');
            return;
        }

        // Check if player has enough money
        if (this.money < CONFIG.ECONOMY.TOWER_COST) {
            this.showFloatingText('Not enough money!', screenX, screenY, 'red');
            return;
        }

        // Build the tower with progress
        this.money -= CONFIG.ECONOMY.TOWER_COST;
        this.metrics.trackMoneySpent(CONFIG.ECONOMY.TOWER_COST);
        const tower = EntityFactory.createTower(col, row);
        tower.isBuilding = true;
        tower.buildProgress = 0;
        this.towers.push(tower);
        this.metrics.trackTowerBuilt();
        this.ui.update();
    }

    public handleGridClick(col: number, row: number) {
        const tower = this.towers.find((t) => t.col === col && t.row === row);
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

        if (
            card.type.id === 'fire' ||
            card.type.id === 'ice' ||
            card.type.id === 'sniper' ||
            card.type.id === 'multi'
        ) {
            // Это карта-башня или модификатор
            if (this.money < CONFIG.ECONOMY.TOWER_COST) {
                this.showFloatingText('Not enough money!', x, y, 'red');
                return false;
            }

            // Если там пусто -> строим
            let tower = this.towers.find((t) => t.col === col && t.row === row);
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
                this.cardSys.removeCardFromHand(card); // FIX: Remove card from hand
                this.metrics.trackCardUsed(card.type.id);
                this.showFloatingText('Card installed!', x, y, 'lime');
                this.ui.update();
                return true; // Успех, карта тратится
            } else {
                this.showFloatingText('Tower full!', x, y, 'orange');
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
            this.showFloatingText(`+${refund}💰`, tower.x, tower.y, 'gold');
            this.selectedTower = null;
            this.inspector.hide();
            this.ui.update();
        }
    }

    // Sell a card from a tower for gold
    public sellCardFromTower(tower: Tower, cardIndex: number) {
        const card = tower.removeCard(cardIndex);
        if (card) {
            const prices = CONFIG.ECONOMY.CARD_SELL_PRICES;
            const price = prices[card.level] || 5;
            this.money += price;
            this.showFloatingText(`+${price}💰`, tower.x, tower.y - 30, 'gold');
            this.metrics.trackMoneyEarned(price);
            this.ui.update();
            // Refresh inspector to show updated card slots
            this.inspector.selectTower(tower);
        }
    }

    // ИСПРАВЛЕНИЕ: Добавлен restart
    public restart() {
        this.game.changeScene(new GameScene(this.game, this.mapData));
    }

    private gameOver() {
        this.isRunning = false;
        this.metrics.endGame(false);
        this.ui.showGameOver(this.wave);
    }
}
