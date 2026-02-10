import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { MapManager } from '../Map';
import { UIManager } from '../UIManager';
import { EntityManager } from './EntityManager';
import { PerformanceProfiler } from '../utils/PerformanceProfiler';
import { StressLogger } from '../utils/StressLogger';
import { SeededRandom } from '../utils/SeededRandom';
import { GameState } from './GameState';
import { EffectSystem } from '../EffectSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { CollisionSystem } from '../CollisionSystem';
import { MetricsSystem } from '../MetricsSystem';
import { IMapData, DEMO_MAP } from '../MapData';
import { IGameScene } from './IGameScene';
import { Tower } from '../Tower';
import { Enemy } from '../Enemy';
import { ICard } from '../CardSystem';
import { CardSystem } from '../CardSystem';
import { WaveManager } from '../WaveManager';
import { ForgeSystem } from '../ForgeSystem';
import { InspectorSystem } from '../InspectorSystem';
import { EventEmitter } from '../Events';
import { CONFIG } from '../Config';
import { WeaponSystem } from '../WeaponSystem';
import { Projectile } from '../Projectile';

enum TestPhase {
    IDLE,
    WARMUP,     // 0-10s
    PATHING,    // 10-25s
    PHYSICS,    // 25-40s
    RENDER,     // 40-55s
    RAMP_UP,    // Dynamic
    FINISHED
}

export class StressTestScene extends BaseScene implements IGameScene {
    public game: Game;
    public mapData: IMapData;
    public gameState: GameState;
    public entityManager: EntityManager;
    public effects: EffectSystem;
    public map: MapManager;
    public projectileSystem: ProjectileSystem;
    public collision: CollisionSystem;
    public metrics: MetricsSystem;
    public ui: UIManager; // Stub
    public cardSys: CardSystem; // Stub
    public waveManager: WaveManager; // Stub
    public forge: ForgeSystem; // Stub
    public inspector: InspectorSystem; // Stub
    public events: EventEmitter;
    public weaponSystem: WeaponSystem;

    // Test State
    private phase: TestPhase = TestPhase.IDLE;
    private timer: number = 0;
    private rng: SeededRandom;
    private uiOverlay: HTMLElement | null = null;

    // Phase Specifics
    private lastWallToggle: number = 0;
    private lastRampUp: number = 0;
    public stableMaxEntities: number = 0;
    private lastDt: number = 0.016;
    private lastFps: number = 60;

    // Stubs for IGameScene
    public wave: number = 0;
    public money: number = 999999;
    public lives: number = 100;
    public startingLives: number = 100;
    public get enemies() { return this.gameState.enemies; }
    public set enemies(v: Enemy[]) { this.gameState.enemies = v; }
    public get towers() { return this.gameState.towers; }
    public set towers(v: Tower[]) { this.gameState.towers = v; }

    public get projectiles(): Projectile[] { return this.projectileSystem.projectiles; }
    public set projectiles(v: Projectile[]) {
        // No-op or warn, as ProjectileSystem manages this
        console.warn("Attempt to set projectiles directly in StressTestScene");
    }

    // Stubs to satisfy potential rigid type checks if systems expect GameScene
    public gameController: any = {
        handleCardDrop: () => false,
        startBuildingTower: () => { },
        handleGridClick: () => { },
        showFloatingText: () => { },
        sellTower: () => { },
        sellCardFromTower: () => { },
        giveRandomCard: () => { },
        handleKeyDown: () => { }
    };
    public dayTime: number = 0;
    public fog: any = { update: () => { }, draw: () => { } };
    public lighting: any = { update: () => { }, render: () => { }, clear: () => { }, resize: () => { }, addLight: () => { } };
    public bestiary: any = { destroy: () => { } };
    public notifications: any = { add: () => { } };
    public acidSystem: any = { update: () => { }, draw: () => { } };
    public commanderSystem: any = { update: () => { }, draw: () => { } };
    public input: any = { hoverCol: -1, hoverRow: -1 };
    public devConsole: any = {};
    public dayNightCycle: any = {};
    public atmosphere: any = {};

    // Stub methods
    public spawnEnemy(type: string) { }
    public showFloatingText(text: string, x: number, y: number, color?: string) { }
    public handleCardDrop(card: ICard, x: number, y: number): boolean { return false; }
    public giveRandomCard() { }
    public sellTower(tower: Tower) { }
    public sellCardFromTower(tower: Tower, cardIndex: number) { }
    public restart() { }
    public togglePause() { }
    public addMoney(amount: number) { }
    public spendMoney(amount: number): boolean { return true; }
    public loseLife(amount?: number) { }
    public startBuildingTower(col: number, row: number) { }
    public handleGridClick(col: number, row: number) { }
    public gameOver() { }
    public triggerShake(duration: number, intensity: number) { }


    constructor(game: Game) {
        super();
        this.game = game;
        this.mapData = {
            width: 20,
            height: 20,
            tiles: Array(20).fill(0).map(() => Array(20).fill(0)),
            waypoints: [],
            objects: []
        };
        this.rng = new SeededRandom(12345); // Fixed seed

        // Init Systems
        this.gameState = new GameState();
        this.events = new EventEmitter();
        this.effects = new EffectSystem(game.ctx);
        this.map = new MapManager(this.mapData);

        // Setup Map for Stress Test: Clear a central area
        // Ensure grid reflects Grass
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
                if (this.map.grid && this.map.grid[y] && this.map.grid[y][x]) {
                    this.map.grid[y][x].type = 0;
                }
            }
        }

        // Define simple linear path for enemies to crowd
        this.mapData.waypoints = [
            { x: 0, y: 10 },
            { x: 19, y: 10 }
        ];
        this.map.waypoints = this.mapData.waypoints; // Sync

        this.metrics = new MetricsSystem();
        this.entityManager = new EntityManager(this.gameState, this.effects, this.metrics);
        this.projectileSystem = new ProjectileSystem();
        this.collision = new CollisionSystem(this.effects);
        this.weaponSystem = new WeaponSystem();

        // Stubs
        // UIManager and others might depend on 'this' satisfying IGameScene
        // Since we implement IGameScene, this should be safe
        this.ui = new UIManager(this as any);
        this.cardSys = new CardSystem(this as any, []);
        this.waveManager = new WaveManager(this as any);
        this.forge = new ForgeSystem(this as any);
        this.inspector = new InspectorSystem(this as any);
    }

    public onEnter() {
        // Create Overlay
        this.createOverlay();
        // Start Test
        this.phase = TestPhase.WARMUP;
        this.timer = 0;
        StressLogger.reset();
        StressLogger.startPhase('WARMUP');
        PerformanceProfiler.enable();

        // Initial FlowField
        this.map.updateFlowField([]);

        console.log("Stress Test Started");
    }

    public onExit() {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        PerformanceProfiler.disable();
    }

    public update(dt: number) {
        // 0. Safety and Tools
        if (document.hidden) return; // Throttling protection

        // FPS Calculation for logic
        const currentFps = 1 / dt;
        this.lastDt = dt;
        this.lastFps = currentFps;

        // Emergency Stop Logic
        if (this.timer > 5 && currentFps < 5 && this.phase !== TestPhase.FINISHED) {
            console.warn("Emergency Stop: FPS too low");
            this.finishTest();
            return;
        }

        PerformanceProfiler.beginFrame();
        PerformanceProfiler.start('Total');

        this.timer += dt;

        // 1. Phase Logic
        PerformanceProfiler.start('Logic');
        this.updatePhase(dt, currentFps);

        // 2. Systems Update
        // Move Enemies
        PerformanceProfiler.start('Entities');
        this.entityManager.updateEnemies(dt, this.map.flowField);
        PerformanceProfiler.end('Entities');

        PerformanceProfiler.start('Entities'); // Group towers with Entities metric
        // Update Towers
        // Use full WeaponSystem for realistic load
        for (const t of this.gameState.towers) {
            t.update(dt, this.collision.enemyGrid, this.map.flowField);
        }
        this.weaponSystem.update(
            this.gameState.towers,
            this.gameState.enemies,
            this.projectileSystem,
            dt,
            this.effects
        );
        PerformanceProfiler.end('Entities');
        PerformanceProfiler.end('Logic'); // End 'Logic' block


        // 3. Collision & Grid
        PerformanceProfiler.start('Collision');
        this.collision.prepareGrid(this.gameState.enemies);
        this.collision.update(this.projectileSystem.projectiles, this.gameState.enemies);
        PerformanceProfiler.end('Collision');

        // 4. Projectiles
        PerformanceProfiler.start('Logic'); // Projectiles move is logic
        this.projectileSystem.update(dt, this.effects);
        PerformanceProfiler.end('Logic');


        // 5. Render
        // Note: Actual rendering happens in draw(), here we just might simulate load or update effects
        this.effects.update(dt);
        // Note: Render time is captured in draw() method

        PerformanceProfiler.end('Total');

        this.updateOverlay(currentFps);
    }

    // Ramp Up Stability Counter
    private lowFpsFrames = 0;

    private updatePhase(dt: number, currentFps: number) {
        switch (this.phase) {
            case TestPhase.WARMUP: // 0-10s
                if (this.timer > 10) {
                    this.phase = TestPhase.PATHING;
                    this.lastWallToggle = this.timer;
                    StressLogger.startPhase('CPU_CRUNCH');
                    this.clearEntities();
                } else {
                    // Spawn 50 enemies over 10s (approx 5 per sec)
                    if (this.gameState.enemies.length < 50 && this.rng.chance(0.1)) {
                        this.spawnTestEnemy('ORC_TANK');
                    }
                }
                break;

            case TestPhase.PATHING: // 10-25s (15s duration)
                if (this.timer > 25) {
                    this.phase = TestPhase.PHYSICS;
                    StressLogger.startPhase('PHYSICS_CRUNCH');
                    this.clearEntities();

                    // CLEANUP: Reset map walls from Pathing phase
                    this.resetMapWalls();
                    this.map.updateFlowField([]); // Clear flowfield

                    this.setupPhysicsPhase();
                } else {
                    // Maintain 300 enemies
                    if (this.gameState.enemies.length < 300) {
                        for (let i = 0; i < 5; i++) this.spawnTestEnemy('SCOUT');
                    }

                    // Dynamic Walls every 1s
                    if (this.timer - this.lastWallToggle > 1.0) {
                        this.lastWallToggle = this.timer;
                        PerformanceProfiler.start('Pathfinding');
                        this.randomizeWalls();
                        this.map.updateFlowField([]);
                        PerformanceProfiler.end('Pathfinding');
                    }
                }
                break;

            case TestPhase.PHYSICS: // 25-40s (15s duration)
                if (this.timer > 40) {
                    this.phase = TestPhase.RENDER;
                    StressLogger.startPhase('RENDER_STRESS');
                    this.clearEntities();
                } else {
                    // Maintain 500 enemies
                    if (this.gameState.enemies.length < 500) {
                        this.spawnTestEnemy('ORC_WARRIOR');
                    }
                }
                break;

            case TestPhase.RENDER: // 40-55s (15s duration)
                if (this.timer > 55) {
                    this.phase = TestPhase.RAMP_UP;
                    StressLogger.startPhase('RAMP_UP');
                    this.clearEntities();
                    this.lastRampUp = this.timer;
                    this.lowFpsFrames = 0;
                } else {
                    // Spawn Particles continuously
                    // We want to force Draw Calls
                    PerformanceProfiler.start('Logic'); // Creating them is logic
                    for (let i = 0; i < 30; i++) { // Increased to 30 to ensure load
                        this.effects.add({
                            type: 'particle',
                            x: this.rng.rangeFloat(0, this.game.canvas.width),
                            y: this.rng.rangeFloat(0, this.game.canvas.height),
                            life: 0.8,
                            color: this.rng.chance(0.5) ? '#fff' : '#ff0000',
                            size: 4
                        });
                    }
                    PerformanceProfiler.end('Logic');
                }
                break;

            case TestPhase.RAMP_UP:
                // Find max stable entities
                // Robust Check: require 60 cumulative frames below 25 FPS to fail
                // This buffers against GC spikes
                if (currentFps < 25) {
                    this.lowFpsFrames++;
                } else {
                    this.lowFpsFrames = Math.max(0, this.lowFpsFrames - 1); // Recover slowly
                }

                if (this.lowFpsFrames > 60 && this.gameState.enemies.length > 100) {
                    this.stableMaxEntities = this.gameState.enemies.length;
                    this.finishTest();
                } else {
                    if (this.timer - this.lastRampUp > 2.0) {
                        this.lastRampUp = this.timer;
                        // Add 50 enemies
                        for (let i = 0; i < 50; i++) this.spawnTestEnemy('SCOUT');
                    }
                }
                break;
        }
    }

    private finishTest() {
        this.phase = TestPhase.FINISHED;
        StressLogger.finishPhase();
        this.showReport();
    }

    private spawnTestEnemy(type: string) {
        // Spawn at random edge
        const e = new Enemy();
        e.init({
            health: 100, // Dummy stats
            speed: 50,
            path: this.map.waypoints
        });
        e.setType(type);

        // Randomize pos slightly around start
        e.x = this.rng.rangeFloat(0, 50);
        e.y = this.rng.rangeFloat(200, 400); // Middle band
        this.gameState.enemies.push(e);
    }

    private clearEntities() {
        this.gameState.enemies = [];
        this.gameState.towers = [];
        this.projectileSystem.clear(); // Correct clear
        this.effects.clear(); // Correct clear
    }

    private setupPhysicsPhase() {
        // Spawn 50 towers in a grid in the center
        const startX = 5;
        const startY = 4;
        let count = 0;

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (count >= 50) break;
                // Minigun for fast fire rate
                const t = new Tower(startX + x, startY + y);
                // We need to set cards or type. Tower constructor in NewTower 1.4 requires adding cards.
                // Or we can manually set stats if we want to cheat, but Tower uses cards to determine stats.
                // Let's add a Minigun card.

                // Assuming CardSystem.addCard adds to hand, we need to add to Tower directly.
                // Tower.addCard() takes ICard.
                // We need to create a dummy card.
                const card: ICard = {
                    id: `dummy_${count}`,
                    type: CONFIG.CARD_TYPES['MINIGUN'], // We assume CONFIG is available and has MINIGUN
                    level: 1,
                    isDragging: false
                };

                t.addCard(card);
                t.cooldown = 0; // Ready to fire

                // Manually boost stats if needed by adding more cards of same type?
                // Level 1 minigun is fine for stress test, it fires fast.

                this.gameState.towers.push(t);
                count++;
            }
        }
    }

    private randomizeWalls() {
        // Toggle 5 random walls in the center area to force pathfinding
        for (let i = 0; i < 5; i++) {
            const x = this.rng.range(6, 14);
            const y = this.rng.range(6, 14);

            // Toggle between Grass(0) and Wall(undefined/Object?)
            const current = this.mapData.tiles[y][x];
            this.mapData.tiles[y][x] = (current === 0) ? 2 : 0;
            this.map.grid[y][x].type = this.mapData.tiles[y][x];
        }
    }

    private resetMapWalls() {
        // Clear 10x10 area in center (restore to Grass)
        for (let y = 5; y < 15; y++) {
            for (let x = 5; x < 15; x++) {
                if (y >= 0 && y < this.mapData.height && x >= 0 && x < this.mapData.width) {
                    this.mapData.tiles[y][x] = 0; // Grass
                    this.map.grid[y][x].type = 0;
                }
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        PerformanceProfiler.start('Render');

        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        // Draw Map (Simplified)
        // this.map.draw(ctx); // Can use real map draw

        // Draw Enemies
        // Batch draw if possible? No, standard draw for stress test
        for (const e of this.gameState.enemies) {
            e.draw(ctx);
        }

        // Draw Towers
        for (const t of this.gameState.towers) {
            t.draw(ctx);
        }

        // Draw Projectiles
        this.projectileSystem.draw(ctx);

        // Draw Particles (This is the heavy part for Render Stress)
        PerformanceProfiler.start('DrawParticles'); // Sub-metric
        this.effects.draw();
        PerformanceProfiler.end('DrawParticles');

        PerformanceProfiler.end('Render');

        // Log to StressLogger at END of frame (after Render)
        const totalEntities = this.gameState.enemies.length + this.projectileSystem.projectiles.length + this.effects.activeEffects.length;
        StressLogger.logFrame(this.lastDt, this.lastFps, totalEntities);
    }

    private createOverlay() {
        this.uiOverlay = document.createElement('div');
        Object.assign(this.uiOverlay.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: '#0f0',
            padding: '15px',
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            border: '2px solid #0f0',
            borderRadius: '8px',
            zIndex: '9999',
            boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)'
        });
        document.body.appendChild(this.uiOverlay);
    }

    private updateOverlay(fps: number) {
        if (!this.uiOverlay) return;
        if (this.phase === TestPhase.FINISHED) return; // Static report

        const phaseName = TestPhase[this.phase];
        const entities = this.gameState.enemies.length;
        const particles = this.effects.activeEffects.length;

        // Memory
        const mem = (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0;

        const data = PerformanceProfiler.getFrameData();
        const minFps = data['fps_min'] || 0;

        // If "getFrameData" returns durations, we don't have minFps there unless we calculated it.
        // StressLogger calculates minFps for the report.
        // We can just show current FPS which is fine for overlay.

        this.uiOverlay.innerText =
            `--- DEEP STRESS TEST ---
PHASE: ${phaseName}
TIME:  ${this.timer.toFixed(1)}s
FPS:   ${fps.toFixed(0)}
ENTITIES: ${entities}
PARTICLES: ${particles}
MEM:   ${mem} MB
`;
    }

    private showReport() {
        if (!this.uiOverlay) return;
        const report = StressLogger.generateReport();
        const json = StressLogger.generateJson();

        this.uiOverlay.innerHTML = '';
        this.uiOverlay.style.right = 'calc(50% - 200px)'; // Center
        this.uiOverlay.style.top = '100px';
        this.uiOverlay.style.width = '400px';
        this.uiOverlay.style.textAlign = 'center';

        const title = document.createElement('h2');
        title.innerText = "TEST COMPLETE";
        title.style.color = '#fff';
        this.uiOverlay.appendChild(title);

        const btnStyle = "background:#444; color:#fff; border:1px solid #888; padding:10px 20px; font-size:16px; margin:5px; cursor:pointer;";

        const createBtn = (text: string, onClick: () => void) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.style.cssText = btnStyle;
            btn.onclick = onClick;
            return btn;
        };

        this.uiOverlay.appendChild(createBtn("COPY REPORT (MD)", () => {
            navigator.clipboard.writeText(report);
            alert("Markdown Report copied!");
        }));

        this.uiOverlay.appendChild(document.createElement('br'));

        this.uiOverlay.appendChild(createBtn("COPY JSON", () => {
            navigator.clipboard.writeText(json);
            alert("JSON copied!");
        }));

        this.uiOverlay.appendChild(document.createElement('br'));

        this.uiOverlay.appendChild(createBtn("EXIT TO MENU", () => {
            this.game.toMenu();
        }));
    }
}
