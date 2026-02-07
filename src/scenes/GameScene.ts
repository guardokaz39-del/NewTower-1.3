import { Game } from '../Game';
import { BaseScene } from '../BaseScene';
import { IGameScene } from './IGameScene';
import { MapManager } from '../Map';
import { UIManager } from '../UIManager';
import { CONFIG } from '../Config';
import { CardSystem, ICard } from '../CardSystem';
import { EventEmitter } from '../Events';
import { EventBus, Events } from '../EventBus';
import { InputSystem } from '../InputSystem';
import { EffectSystem } from '../EffectSystem';
// import { DebugSystem } from '../DebugSystem';
import { DevConsole } from '../ui/DevConsole';
import { Logger, LogChannel } from '../utils/Logger';
import { Tower } from '../Tower';
import { SoundManager } from '../SoundManager';
import { WaveManager } from '../WaveManager';
import { ForgeSystem } from '../ForgeSystem';
import { CollisionSystem } from '../CollisionSystem';
import { InspectorSystem } from '../InspectorSystem';
import { BestiarySystem } from '../BestiarySystem';
import { IMapData, DEMO_MAP } from '../MapData';
import { MetricsSystem } from '../MetricsSystem';
import { WeaponSystem } from '../WeaponSystem';
import { FogSystem } from '../FogSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { NotificationSystem } from '../systems/NotificationSystem';
import { DayNightCycle } from '../DayNightCycle';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { Enemy } from '../Enemy';

import { GameController } from './GameController';
import { GameState } from './GameState';
import { EntityManager } from './EntityManager';
import { RendererFactory } from '../RendererFactory';
import { EnemyRenderer } from '../renderers/EnemyRenderer';
import { AcidPuddleSystem } from '../systems/AcidPuddleSystem';
import { SkeletonCommanderSystem } from '../systems/SkeletonCommanderSystem';

/**
 * Main game scene - REFACTORED VERSION
 * Orchestrates game systems using modular components.
 * Implements IGameScene interface to decouple systems.
 */
export class GameScene extends BaseScene implements IGameScene {
    // Core references
    public game: Game;
    public mapData: IMapData;
    public readonly startingLives: number;

    // Modular components
    public gameState: GameState;
    public entityManager: EntityManager;
    public gameController: GameController;

    // Ambient cycle
    private dayTime: number = 0;

    // Map & rendering
    public map: MapManager;
    public fog: FogSystem;
    public lighting: LightingSystem;

    // Systems
    public ui: UIManager;
    public cardSys: CardSystem;
    public waveManager: WaveManager;
    public events: EventEmitter;
    public input: InputSystem;
    public projectileSystem: ProjectileSystem;
    public effects: EffectSystem;
    public devConsole: DevConsole;
    public forge: ForgeSystem;
    public collision: CollisionSystem;
    public inspector: InspectorSystem;
    public bestiary: BestiarySystem;
    public metrics: MetricsSystem;
    public weaponSystem: WeaponSystem;
    public notifications: NotificationSystem;
    private dayNightCycle!: DayNightCycle;
    private atmosphere!: AtmosphereSystem;
    public acidSystem: AcidPuddleSystem;
    public commanderSystem: SkeletonCommanderSystem;

    // IGameScene compatibility properties (delegate to gameState)
    public get wave(): number { return this.gameState.wave; }
    public set wave(value: number) { this.gameState.wave = value; }

    public get money(): number { return this.gameState.money; }

    public get lives(): number { return this.gameState.lives; }

    public get paused(): boolean { return this.gameState.paused; }

    public get selectedTower(): Tower | null { return this.gameState.selectedTower; }
    public set selectedTower(value: Tower | null) { this.gameState.selectTower(value); }

    public get enemies() { return this.gameState.enemies; }
    public get towers() { return this.gameState.towers; }
    public get projectiles() { return this.projectileSystem.projectiles; }

    public get enemyPool() { return this.gameState.enemyPool; }

    constructor(game: Game, mapData: IMapData) {
        super();
        this.game = game;
        this.mapData = mapData || DEMO_MAP;

        // Initialize core state
        this.gameState = new GameState();
        this.startingLives = CONFIG.PLAYER.START_LIVES;

        // Initialize map and rendering
        this.map = new MapManager(this.mapData);
        this.fog = new FogSystem(this.mapData);
        this.lighting = new LightingSystem(game.canvas.width, game.canvas.height);
        this.map.lighting = this.lighting; // [NEW] Link lighting
        this.dayNightCycle = new DayNightCycle(); // Default cycle (4 min)
        this.atmosphere = new AtmosphereSystem(this.dayNightCycle); // Default config
        // Set world size for cloud positioning (map dimensions in pixels)
        const worldWidth = this.mapData.width * CONFIG.TILE_SIZE;
        const worldHeight = this.mapData.height * CONFIG.TILE_SIZE;
        this.atmosphere.setWorldSize(worldWidth, worldHeight);
        this.events = new EventEmitter();
        this.effects = new EffectSystem(game.ctx);
        this.input = game.input;

        // Initialize systems
        this.projectileSystem = new ProjectileSystem();
        this.weaponSystem = new WeaponSystem();
        this.metrics = new MetricsSystem();
        this.notifications = new NotificationSystem(this.effects, game.canvas);

        this.waveManager = new WaveManager(this);
        this.acidSystem = new AcidPuddleSystem(game.ctx);
        this.commanderSystem = new SkeletonCommanderSystem(game.ctx);

        // Initialize entity manager
        this.entityManager = new EntityManager(
            this.gameState,
            this.effects,
            this.metrics,
        );

        // Initialize UI and card systems
        // Get starting cards from selection or use default
        // CHANGED: Start with ALL 5 card types
        const startingCards = (window as any)._STARTING_CARDS || ['FIRE', 'ICE', 'SNIPER', 'MULTISHOT', 'MINIGUN'];
        delete (window as any)._STARTING_CARDS; // Cleanup after use

        this.ui = new UIManager(this);
        this.cardSys = new CardSystem(this, startingCards);
        this.forge = new ForgeSystem(this);
        this.devConsole = new DevConsole(this);
        this.collision = new CollisionSystem(this.effects); // Debug removed

        Logger.info(LogChannel.GAME, 'GameScene Initialized');
        this.inspector = new InspectorSystem(this);
        this.bestiary = new BestiarySystem(this);

        // Initialize game controller
        this.gameController = new GameController(
            this.gameState,
            this.entityManager,
            this.effects,
            this.inspector,
            this.ui,
            this.metrics,
            this.mapData,
            (col, row) => this.map.isBuildable(col, row),
            this.cardSys,
            this.events,
        );

        // Listen for Global Events
        EventBus.getInstance().on(Events.ENEMY_DIED, (data: any) => {
            const enemy = data.enemy as Enemy;
            if (enemy && enemy.typeId === 'sapper_rat') {
                this.triggerExplosion(enemy.x, enemy.y, 45, 200, true); // Уменьшенный радиус
            }
        });

        // Magma King Split Logic
        EventBus.getInstance().on('ENEMY_SPLIT', (data: any) => {
            const enemy = data.enemy as Enemy;
            if (enemy && enemy.typeId === 'magma_king') {
                // Spawn Decoy
                // Iterate through neighbor points to find a valid spot or just spawn at same location
                // Spawning at exact same location is fine, visually they overlap during "shedding"
                const decoy = this.entityManager.spawnEnemy('MAGMA_STATUE', this.map.waypoints);
                if (decoy) {
                    // Set Decoy Position to Boss Position
                    decoy.x = enemy.x;
                    decoy.y = enemy.y;

                    // Match path progress so it doesn't walk from start
                    decoy.pathIndex = enemy.pathIndex;

                    // Add "Pop" effect
                    this.effects.add({
                        type: 'explosion', // Reusing explosion for visual splash
                        x: enemy.x,
                        y: enemy.y,
                        radius: 40,
                        life: 0.3,
                        color: '#b0bec5' // Silver splash
                    });

                    this.showFloatingText('DECOY!', enemy.x, enemy.y - 30, '#b0bec5');
                }
            }
        });
    }

    public onEnter() {
        const ui = document.getElementById('ui-layer');
        if (ui) ui.style.display = 'block';
        const hand = document.getElementById('hand-container');
        if (hand) hand.style.display = 'flex';

        this.ui.update();
        window.addEventListener('keydown', this.onKeyDown);
    }

    public onExit() {
        const ui = document.getElementById('ui-layer');
        if (ui) ui.style.display = 'none';
        window.removeEventListener('keydown', this.onKeyDown);
        if (this.bestiary) this.bestiary.destroy();
    }

    private onKeyDown = (e: KeyboardEvent) => {
        this.gameController.handleKeyDown(e);
    };

    public update(dt: number) {
        if (!this.gameState.isRunning) return;
        if (this.gameState.paused) return;

        this.gameState.frames++;

        // Time scale support (1x or 2x speed)
        const loops = (this.gameState.timeScale >= 2) ? 2 : 1;

        // Day/Night Cycle (Simple Sine Wave)
        // Cycle duration: approx 60 seconds (3600 frames)

        // Determine current phase (Sine Wave)
        // Math.sin(this.dayTime) -> -1 (Night) to 1 (Day)
        const currentSin = Math.sin(this.dayTime);
        const isNight = currentSin < 0;

        // Modulate speed: Night passes 50% faster, Day is normal
        const speedMultiplier = isNight ? 1.5 : 1.0;

        // Update DayTime
        // Warning: this relies on loops count. We should probably use dt.
        // But for now keeping loops based 
        this.dayTime += 0.0005 * loops * speedMultiplier;

        // Update DayNightCycle system
        // Pass real dt (accumulated per loop if we loop, but here we pass dt * loops roughly?)
        // Actually, if we loop 2 times with dt, we advance 2 * dt time. Correct.

        // Oscillate between 0.5 (Darkest evening) and 0.95 (Brightest day)
        // Math.sin goes -1 to 1. 
        // We want range [0.5, 0.95]. Center is 0.725, Amplitude is 0.225
        const brightness = 0.75 + currentSin * 0.20;
        this.lighting.ambientLight = brightness;

        // delta frames is NOT used anymore for logic, everything uses dt (seconds)
        // const delta = dt * 60; 

        for (let l = 0; l < loops; l++) {
            this.dayNightCycle.update(dt);
            this.atmosphere.update(dt);
            this.waveManager.update(dt);
            this.fog.update(dt);
            // Lighting doesn't need explicit update logic for now, just render

            // Update projectiles
            this.projectileSystem.update(dt, this.effects);

            // Update weapon system (tower shooting)
            this.weaponSystem.update(
                this.gameState.towers,
                this.gameState.enemies,
                this.projectileSystem,
                dt,
                this.effects
            );

            // Update tower visual states
            this.gameState.towers.forEach((t) => t.updateBuilding(this.effects, dt));

            this.collision.update(this.projectileSystem.projectiles, this.gameState.enemies);
            this.entityManager.updateEnemies(dt);
            this.acidSystem.update(dt, this.gameState.enemies);
            this.commanderSystem.update(dt, this.gameState.enemies);

            this.effects.update(dt);

            // Update enemy counter in HUD
            this.ui.hud.updateEnemyCounter(this.gameState.enemies.length);
        }
        // Update shake (once per frame, not per loop)
        this.gameState.updateShake();
        // ИСПРАВЛЕНИЕ ШАГ 3: Дубликат effects.update() закомментирован
        // Эффекты уже обновлены в цикле выше (строка 237)
        // Раскомментировать эту строку для отката изменений:
        // this.effects.update();
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();

        // Reset global canvas state to prevent artifacts from previous frames
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';

        // Apply screen shake
        if (this.gameState.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * this.gameState.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.gameState.shakeIntensity;
            ctx.translate(dx, dy);
        }

        // Complete canvas clearing to prevent "Hall of Mirrors" artifacts
        ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        // Draw map and fog
        // Draw map and fog
        RendererFactory.drawMap(ctx, this.map);
        // Torches
        this.map.drawTorches(ctx, this.gameState.frames); // [NEW] Draw torches with time

        // === PHASE 6: VIGNETTE (Cinematic Polish) ===
        // Draw a subtle dark gradient at the edges
        // const w = this.game.canvas.width;
        // const h = this.game.canvas.height;
        //
        // ctx.save();
        // const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.9);
        // gradient.addColorStop(0, 'rgba(0,0,0,0)');
        // gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        // ctx.fillStyle = gradient;
        // ctx.fillRect(0, 0, w, h);
        // ctx.restore();
        // === END VIGNETTE ===

        this.fog.draw(ctx);

        // Draw path preview
        this.drawPathPreview(ctx);

        // Draw hover highlight
        this.drawHoverHighlight(ctx);

        // Draw entities
        this.gameState.towers.forEach((t) => t.draw(ctx));
        this.drawSelectedTowerRange(ctx);

        // Draw targeting mode tooltip for hovered tower
        this.drawTargetingModeTooltip(ctx);

        // Draw acid puddles UNDER enemies (z-order fix)
        this.acidSystem.draw();
        this.commanderSystem.draw();

        this.gameState.enemies.forEach((e) => e.draw(ctx));
        this.projectileSystem.draw(ctx);
        // Draw effects
        this.effects.draw();

        // Draw lighting (over everything except UI)
        // Update size if needed
        if (this.game.canvas.width !== this.lighting['width'] || this.game.canvas.height !== this.lighting['height']) {
            this.lighting.resize(this.game.canvas.width, this.game.canvas.height);
        }
        // Reset lights
        this.lighting.clear();
        // Add dynamic lights...
        // Add dynamic lights...
        this.lighting.render(ctx);

        // === EMISSIVE PASS (Glowing Eyes through Fog/Darkness) ===
        // Draw this AFTER lighting so it "pops"
        this.gameState.enemies.forEach((e) => EnemyRenderer.drawEmissive(ctx, e));

        // Draw atmosphere effects (sunlight, moonlight, stars, etc)
        this.atmosphere.draw(ctx);

        ctx.restore();
    }

    private drawPathPreview(ctx: CanvasRenderingContext2D) {
        if (this.map.waypoints && this.map.waypoints.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);

            const start = this.map.waypoints[0];
            const ts = CONFIG.TILE_SIZE;
            const half = ts / 2;

            ctx.moveTo(start.x * ts + half, start.y * ts + half);
            for (let i = 1; i < this.map.waypoints.length; i++) {
                const wp = this.map.waypoints[i];
                ctx.lineTo(wp.x * ts + half, wp.y * ts + half);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    private drawHoverHighlight(ctx: CanvasRenderingContext2D) {
        if (this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    private drawSelectedTowerRange(ctx: CanvasRenderingContext2D) {
        if (this.gameState.selectedTower) {
            const stats = this.gameState.selectedTower.getStats();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                this.gameState.selectedTower.x,
                this.gameState.selectedTower.y,
                stats.range,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
        }
    }

    private drawTargetingModeTooltip(ctx: CanvasRenderingContext2D) {
        // Find tower under mouse cursor
        if (this.input.hoverCol < 0 || this.input.hoverRow < 0) return;

        const hoverX = this.input.hoverCol * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const hoverY = this.input.hoverRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const hoveredTower = this.gameState.towers.find((t) => {
            const dist = Math.hypot(t.x - hoverX, t.y - hoverY);
            return dist < 32; // Within tower radius
        });

        if (hoveredTower && !hoveredTower.isBuilding) {
            const modeKey = hoveredTower.targetingMode.toUpperCase();
            const mode = Object.values(CONFIG.TARGETING_MODES).find((m: any) => m.id === hoveredTower.targetingMode);
            if (mode) {
                // Draw small icon above tower
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';

                // Background circle
                ctx.fillStyle = 'rgba(50, 50, 70, 0.95)';
                ctx.beginPath();
                ctx.arc(hoveredTower.x, hoveredTower.y - 45, 18, 0, Math.PI * 2);
                ctx.fill();

                // Border
                ctx.strokeStyle = '#4caf50';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();

                // Icon
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(mode.icon, hoveredTower.x, hoveredTower.y - 45);

                // Tooltip text below
                ctx.font = '12px Arial';
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText(mode.name, hoveredTower.x, hoveredTower.y - 22);
                ctx.fillText(mode.name, hoveredTower.x, hoveredTower.y - 22);
            }
        }
    }

    // === IGameScene Implementation (Delegate to modules) ===

    public addMoney(amount: number): void {
        this.gameState.addMoney(amount);
    }

    public spendMoney(amount: number): boolean {
        return this.gameState.spendMoney(amount);
    }

    public loseLife(amount: number = 1): void {
        this.gameState.loseLife(amount);
    }

    public spawnEnemy(type: string): void {
        this.entityManager.spawnEnemy(type, this.map.waypoints);
    }

    public startBuildingTower(col: number, row: number): void {
        this.gameController.startBuildingTower(col, row);
    }

    public handleGridClick(col: number, row: number): void {
        this.gameController.handleGridClick(col, row);
    }

    public showFloatingText(text: string, x: number, y: number, color: string = '#fff'): void {
        this.gameController.showFloatingText(text, x, y, color);
    }

    public handleCardDrop(card: ICard, x: number, y: number): boolean {
        return this.gameController.handleCardDrop(card, x, y);
    }

    public giveRandomCard(): void {
        this.gameController.giveRandomCard();
    }

    public sellTower(tower: Tower): void {
        this.gameController.sellTower(tower);
    }

    public sellCardFromTower(tower: Tower, cardIndex: number): void {
        this.gameController.sellCardFromTower(tower, cardIndex);
    }

    public restart(): void {
        this.game.changeScene(new GameScene(this.game, this.mapData));
    }

    public togglePause(): void {
        this.gameState.togglePause();
        this.ui.updatePauseMenu(this.gameState.paused);
    }

    public gameOver(): void {
        this.gameState.endGame();
        this.metrics.endGame(false);
        this.ui.showGameOver(this.gameState.wave);
    }

    public triggerShake(duration: number, intensity: number): void {
        this.gameState.triggerShake(duration, intensity);
    }

    /**
     * Spawns an explosion that can damage enemies (Friendly Fire)
     */
    public triggerExplosion(x: number, y: number, radius: number, damage: number, friendlyFire: boolean = false) {
        // 1. Main Explosion Visual
        this.effects.add({
            type: 'explosion',
            x: x,
            y: y,
            radius: radius, // No multiplier - new effect looks good at base size
            life: 0.45,
            color: friendlyFire ? 'rgba(118, 255, 3, 0.8)' : 'rgba(255, 100, 0, 0.7)',
        });

        // 2. Explosion particles (debris flying out)
        const particleCount = friendlyFire ? 8 : 5;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 150 + Math.random() * 100;
            this.effects.add({
                type: 'debris',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 0.4 + Math.random() * 0.2,
                size: 3 + Math.random() * 3,
                color: friendlyFire ? '#76ff03' : '#ff6d00',
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 20,
                gravity: 400,
            });
        }

        // 3. Sound and shake
        SoundManager.play('explosion');
        this.triggerShake(0.4, friendlyFire ? 8 : 5);

        // 4. Damage Logic
        if (friendlyFire) {
            // Damage ALL enemies in range
            const enemies = this.gameState.enemies;
            for (const enemy of enemies) {
                if (!enemy.isAlive()) continue;

                const dist = Math.hypot(enemy.x - x, enemy.y - y);
                if (dist <= radius) {
                    enemy.takeDamage(damage);
                }
            }
        }
    }
}
