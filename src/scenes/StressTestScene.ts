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
import { IMapData } from '../MapData';
import { IGameScene } from './IGameScene';
import { Tower } from '../Tower';
import { Enemy } from '../Enemy';
import { Projectile } from '../Projectile';
import { ICard } from '../CardSystem';
import { EventEmitter } from '../Events';
import { CONFIG } from '../Config';
import { GameSession } from '../GameSession';
import { GameController } from './GameController';

enum TestPhase {
    IDLE,
    WARMUP,
    CPU_NAV_REBUILD,
    CPU_AGENT_UPDATE,
    PHYSICS_CLUSTERED,
    PHYSICS_UNIFORM,
    RENDER_BASELINE,
    RENDER_REALISTIC,
    RENDER_WORST_CACHED,
    RENDER_WORST_NOCACHE,
    RAMP_UP,
    FINISHED
}

type BenchMode = 'logicOnly' | 'renderOnly' | 'mixed';

export class StressTestScene extends BaseScene implements IGameScene {
    public game: Game;
    public mapData: IMapData;
    public session: GameSession;
    private _map: MapManager;

    // IGameScene proxies
    public get gameState() { return this.session.gameState; }
    public get entityManager() { return this.session.entityManager; }
    public get waveManager() { return this.session.waveManager; }
    public get projectileSystem() { return this.session.projectileSystem; }
    public get collision() { return this.session.collision; }
    public get metrics() { return this.session.metrics; }
    public get weaponSystem() { return this.session.weaponSystem; }
    public get cardSys() { return this.session.cardSys; }
    public get forge() { return this.session.forge; }
    public get inspector() { return this.session.inspector; }
    public get bestiary() { return this.session.bestiary; }
    public get notifications() { return this.session.notifications; }
    public get acidSystem() { return this.session.acidSystem; }
    public get commanderSystem() { return this.session.commanderSystem; }
    public get effects() { return this._effects; }

    public ui: UIManager;
    public events: EventEmitter;
    public gameController: GameController;

    private _effects: EffectSystem;

    // Test State
    private phase: TestPhase = TestPhase.IDLE;
    private benchMode: BenchMode = 'mixed';
    private timer: number = 0;
    private phaseTimer: number = 0;
    private rng: SeededRandom;
    private uiOverlay: HTMLElement | null = null;

    private lastDt: number = 0.016;
    private lastFps: number = 60;
    private lastTotalEntities: number = 0;
    public stableMaxEntities: number = 0;

    private profiledCtx: CanvasRenderingContext2D | null = null;
    private prevCtx: CanvasRenderingContext2D | null = null;

    private getProfiledCtx(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
        if (this.prevCtx !== ctx) {
            this.prevCtx = ctx;
            this.profiledCtx = new Proxy(ctx, {
                get(target, prop) {
                    const val = (target as any)[prop];
                    if (typeof val === 'function') {
                        // Categories based on TL feedback
                        if (prop === 'drawImage') {
                            return (...args: any[]) => { PerformanceProfiler.count('drawImage'); return val.apply(target, args); };
                        }
                        if (prop === 'fillRect' || prop === 'strokeRect' || prop === 'clearRect') {
                            return (...args: any[]) => { PerformanceProfiler.count('fillRect'); return val.apply(target, args); };
                        }
                        if (['beginPath', 'moveTo', 'lineTo', 'arc', 'fill', 'stroke', 'bezierCurveTo', 'quadraticCurveTo'].includes(prop as string)) {
                            return (...args: any[]) => { PerformanceProfiler.count('pathOps'); return val.apply(target, args); };
                        }
                        if (prop === 'fillText' || prop === 'strokeText' || prop === 'measureText') {
                            return (...args: any[]) => { PerformanceProfiler.count('textOps'); return val.apply(target, args); };
                        }
                        if (prop === 'save' || prop === 'restore') {
                            return (...args: any[]) => { PerformanceProfiler.count('saveRestore'); return val.apply(target, args); };
                        }
                        if (['translate', 'scale', 'rotate', 'transform', 'setTransform', 'resetTransform'].includes(prop as string)) {
                            return (...args: any[]) => { PerformanceProfiler.count('transform'); return val.apply(target, args); };
                        }
                        if (prop === 'createRadialGradient' || prop === 'createLinearGradient' || prop === 'createPattern') {
                            return (...args: any[]) => { PerformanceProfiler.count('gradientOps'); return val.apply(target, args); };
                        }

                        // For any other function
                        return val.bind(target);
                    }
                    return val;
                },
                set(target, prop, value) {
                    if (prop === 'globalAlpha' || prop === 'globalCompositeOperation') {
                        PerformanceProfiler.count('stateChanges');
                    }
                    if (prop === 'fillStyle' || prop === 'strokeStyle' || prop === 'lineWidth' || prop === 'font') {
                        PerformanceProfiler.count('stateChanges');
                    }
                    (target as any)[prop] = value;
                    return true;
                }
            });
        }
        return this.profiledCtx!;
    }

    // Config parameters
    private static readonly PHASE_DURATION = 5.0; // 5 seconds per phase hold

    // IGameScene Stubs
    public get wave() { return 0; }
    public set wave(v: number) { }
    public get money() { return 0; }
    public get lives() { return 20; }
    public get startingLives() { return 20; }
    public get enemies() { return this.gameState.enemies; }
    public get towers() { return this.gameState.towers; }
    public get projectiles() { return this.projectileSystem.projectiles; }

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
        this.rng = new SeededRandom(42); // Fixed seed for reproducible tests

        this.mapData = {
            width: 20,
            height: 20,
            tiles: Array(20).fill(0).map(() => Array(20).fill(0)),
            waypoints: [{ x: 0, y: 10 }, { x: 19, y: 10 }],
            objects: []
        };

        this._effects = new EffectSystem(game.ctx);
        this._map = new MapManager(this.mapData);
        this._map.waypoints = this.mapData.waypoints;
        this.events = new EventEmitter();

        this.session = new GameSession(game, this, this._map, this.mapData, this._effects, []);
        this.ui = new UIManager(this);
        this.gameController = {} as GameController;
    }

    public get map() { return this._map; }

    protected onEnterImpl() {
        this.createOverlay();
        this.setPhase(TestPhase.WARMUP);
        StressLogger.reset();
        PerformanceProfiler.enable();
        console.log("Stress Test V2 Started");
    }

    protected onExitImpl() {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        PerformanceProfiler.disable();
    }

    private setPhase(newPhase: TestPhase) {
        this.phase = newPhase;
        this.phaseTimer = 0;
        this.clearEntities();
        this.resetMapWalls();

        switch (newPhase) {
            case TestPhase.WARMUP:
                this.benchMode = 'mixed';
                StressLogger.startPhase('WARMUP');
                this.spawnTestEnemies('ORC_TANK', 50, 'uniform');
                break;
            case TestPhase.CPU_NAV_REBUILD:
                this.benchMode = 'logicOnly';
                StressLogger.startPhase('CPU_NAV_REBUILD');
                this.spawnTestEnemies('SCOUT', 300, 'uniform');
                break;
            case TestPhase.CPU_AGENT_UPDATE:
                this.benchMode = 'logicOnly';
                StressLogger.startPhase('CPU_AGENT_UPDATE');
                this.spawnTestEnemies('SCOUT', 1000, 'uniform'); // High logic load
                break;
            case TestPhase.PHYSICS_CLUSTERED:
                this.benchMode = 'logicOnly';
                StressLogger.startPhase('PHYSICS_CLUSTERED');
                this.spawnTestEnemies('ORC_WARRIOR', 500, 'clustered');
                this.setupPhysicsProjectiles(1000, 'clustered');
                break;
            case TestPhase.PHYSICS_UNIFORM:
                this.benchMode = 'logicOnly';
                StressLogger.startPhase('PHYSICS_UNIFORM');
                this.spawnTestEnemies('ORC_WARRIOR', 500, 'uniform');
                this.setupPhysicsProjectiles(1000, 'uniform');
                break;
            case TestPhase.RENDER_BASELINE:
                this.benchMode = 'renderOnly';
                StressLogger.startPhase('RENDER_BASELINE');
                this.spawnTestEnemies('SCOUT', 500, 'uniform');
                break;
            case TestPhase.RENDER_REALISTIC:
                this.benchMode = 'renderOnly';
                StressLogger.startPhase('RENDER_REALISTIC');
                this.spawnTestEnemies('SCOUT', 500, 'uniform'); // Normal drawing
                break;
            case TestPhase.RENDER_WORST_CACHED:
                this.benchMode = 'renderOnly';
                StressLogger.startPhase('RENDER_WORST_CACHED');
                break;
            case TestPhase.RENDER_WORST_NOCACHE:
                this.benchMode = 'renderOnly';
                StressLogger.startPhase('RENDER_WORST_NOCACHE');
                break;
            case TestPhase.RAMP_UP:
                this.benchMode = 'mixed';
                this.rampUpStep = 1;
                StressLogger.startPhase(`RAMP_UP_STEP_${this.rampUpStep}`);
                break;
            case TestPhase.FINISHED:
                StressLogger.finishPhase();
                this.showReport();
                break;
        }
    }

    private clearEntities() {
        this.gameState.enemies = [];
        this.gameState.towers = [];
        this.projectileSystem.clear();
        this.effects.clear();
        this.map.requestFlowFieldUpdate();
        this.map.update(0);
    }

    public update(dt: number) {
        if (document.hidden) return;

        const currentFps = dt > 0 ? 1 / dt : 60;
        this.lastDt = dt;
        this.lastFps = currentFps;

        PerformanceProfiler.beginFrame();
        PerformanceProfiler.start('Total');

        this.timer += dt;
        this.phaseTimer += dt;

        PerformanceProfiler.start('Logic');
        this.updatePhaseLogic(dt, currentFps);

        if (this.benchMode !== 'renderOnly') {
            // Entities Update
            PerformanceProfiler.start('Entities');
            this.entityManager.updateEnemies(dt, this.map.flowField);

            // Towers & Weapons
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
            PerformanceProfiler.count('entitiesUpdated', this.gameState.enemies.length);
            PerformanceProfiler.end('Entities');
        }
        PerformanceProfiler.end('Logic');

        if (this.benchMode !== 'renderOnly') {
            PerformanceProfiler.start('Collision');
            this.collision.prepareGrid(this.gameState.enemies);
            this.collision.update(this.projectileSystem.projectiles, this.gameState.enemies);
            PerformanceProfiler.end('Collision');

            PerformanceProfiler.start('Logic');
            this.projectileSystem.update(dt, this.effects);
            PerformanceProfiler.end('Logic');
        }

        if (this.benchMode !== 'logicOnly') {
            this.effects.update(dt);
        }

        PerformanceProfiler.end('Total');

        this.lastTotalEntities = this.gameState.enemies.length + this.projectileSystem.projectiles.length + this.effects.activeEffects.length;
        this.updateOverlay(currentFps);
    }

    private updatePhaseLogic(dt: number, currentFps: number) {
        switch (this.phase) {
            case TestPhase.WARMUP:
                if (this.phaseTimer > StressTestScene.PHASE_DURATION) this.setPhase(TestPhase.CPU_NAV_REBUILD);
                break;
            case TestPhase.CPU_NAV_REBUILD:
                // Rebuild heavy map every 0.5s
                if (Math.floor(this.phaseTimer * 2) > Math.floor((this.phaseTimer - dt) * 2)) {
                    PerformanceProfiler.start('Pathfinding');
                    this.randomizeWalls();
                    this.map.requestFlowFieldUpdate();
                    this.map.update(0);
                    PerformanceProfiler.end('Pathfinding');
                }
                // Force path update by updating flow field (already done above)
                if (this.phaseTimer > StressTestScene.PHASE_DURATION) this.setPhase(TestPhase.CPU_AGENT_UPDATE);
                break;
            case TestPhase.CPU_AGENT_UPDATE:
                // Just let them run
                if (this.phaseTimer > StressTestScene.PHASE_DURATION) this.setPhase(TestPhase.PHYSICS_CLUSTERED);
                break;
            case TestPhase.PHYSICS_CLUSTERED:
            case TestPhase.PHYSICS_UNIFORM:
                // Static bullets testing collision grid densely
                if (this.phaseTimer > StressTestScene.PHASE_DURATION) {
                    if (this.phase === TestPhase.PHYSICS_CLUSTERED) this.setPhase(TestPhase.PHYSICS_UNIFORM);
                    else this.setPhase(TestPhase.RENDER_BASELINE);
                }
                break;
            case TestPhase.RENDER_BASELINE:
                if (this.phaseTimer > StressTestScene.PHASE_DURATION) this.setPhase(TestPhase.RENDER_REALISTIC);
                break;
            case TestPhase.RENDER_REALISTIC:
                if (this.phaseTimer > StressTestScene.PHASE_DURATION) this.setPhase(TestPhase.RENDER_WORST_CACHED);
                break;
            case TestPhase.RENDER_WORST_CACHED:
            case TestPhase.RENDER_WORST_NOCACHE:
                // Spawn heavy particles each frame
                for (let i = 0; i < 50; i++) {
                    this.effects.add({
                        type: 'explosion',
                        x: this.rng.rangeFloat(0, this.game.width),
                        y: this.rng.rangeFloat(0, this.game.height),
                        life: 0.5,
                        color: '#ff4400',
                        size: 30
                    });
                }
                if (this.phaseTimer > StressTestScene.PHASE_DURATION) {
                    if (this.phase === TestPhase.RENDER_WORST_CACHED) this.setPhase(TestPhase.RENDER_WORST_NOCACHE);
                    else this.setPhase(TestPhase.RAMP_UP);
                }
                break;
            case TestPhase.RAMP_UP:
                this.updateRampUp(currentFps);
                break;
        }
    }

    private rampUpStep: number = 0;
    private medianBuffer: number[] = [];

    private updateRampUp(currentFps: number) {
        this.medianBuffer.push(currentFps);

        // Every 3 seconds, evaluate step
        if (this.phaseTimer > 3.0) {
            this.medianBuffer.sort((a, b) => a - b);
            const median = this.medianBuffer[Math.floor(this.medianBuffer.length / 2)];
            const p99 = this.medianBuffer[0]; // worst frame roughly

            if (median < 20 || p99 < 12 || this.rampUpStep > 15) {
                // FAILED CRITERIA OR MAX STEPS REACHED
                this.stableMaxEntities = this.gameState.enemies.length + this.gameState.towers.length + this.projectileSystem.projectiles.length;
                this.setPhase(TestPhase.FINISHED);
                return;
            }

            // SUCCESS -> Ramp up harder
            let addCount = 20;
            if (median > 55) addCount = 100;
            else if (median > 35) addCount = 50;

            this.spawnTestEnemies('SCOUT', addCount, 'uniform');

            this.phaseTimer = 0;
            this.medianBuffer = [];
            this.rampUpStep++;
            StressLogger.startPhase(`RAMP_UP_STEP_${this.rampUpStep}`);
        }
    }

    // --- Helpers ---

    private spawnTestEnemies(type: string, count: number, layout: 'uniform' | 'clustered') {
        for (let i = 0; i < count; i++) {
            const e = new Enemy();
            e.init({ health: 100000, speed: 50, path: this.map.waypoints }); // Invulnerable
            e.setType(type);

            if (layout === 'uniform') {
                e.x = this.rng.rangeFloat(0, this.game.width);
                e.y = this.rng.rangeFloat(0, this.game.height);
            } else {
                // Clustered in middle
                e.x = this.game.width / 2 + this.rng.rangeFloat(-20, 20);
                e.y = this.game.height / 2 + this.rng.rangeFloat(-20, 20);
            }
            this.gameState.enemies.push(e);
        }
    }

    private setupPhysicsProjectiles(count: number, layout: 'uniform' | 'clustered') {
        for (let i = 0; i < count; i++) {
            const p = new Projectile();
            const config = { speed: 0, damage: 0, effects: [{ type: 'splash', splashRadius: 100 }] };
            const px = layout === 'uniform' ? this.rng.rangeFloat(0, this.game.width) : this.game.width / 2;
            const py = layout === 'uniform' ? this.rng.rangeFloat(0, this.game.height) : this.game.height / 2;

            p.init(px, py, { x: px, y: py }, config as any);
            // Patch logic: it won't move, it will just constantly search for collision
            this.projectileSystem.projectiles.push(p);
        }
    }

    private randomizeWalls() {
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
                this.mapData.tiles[y][x] = this.rng.chance(0.2) ? 2 : 0; // 20% walls
                if (this.map.grid[y] && this.map.grid[y][x]) {
                    this.map.grid[y][x].type = this.mapData.tiles[y][x];
                }
            }
        }
    }

    private resetMapWalls() {
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
                this.mapData.tiles[y][x] = 0;
                if (this.map.grid[y] && this.map.grid[y][x]) this.map.grid[y][x].type = 0;
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        PerformanceProfiler.start('Render');

        const pCtx = this.getProfiledCtx(ctx);

        if (this.benchMode === 'logicOnly') {
            // Strictly NO canvas state churn
            pCtx.fillStyle = '#111';
            pCtx.fillRect(0, 0, this.game.width, this.game.height);

            pCtx.fillStyle = '#0f0';
            pCtx.font = '24px monospace';
            pCtx.textAlign = 'center';
            pCtx.fillText(`LOGIC ONLY MODE (${TestPhase[this.phase]})`, this.game.width / 2, this.game.height / 2);
            pCtx.fillText('Rendering disabled to measure purely CPU limits', this.game.width / 2, this.game.height / 2 + 30);

            PerformanceProfiler.end('Render');
            StressLogger.logFrame(this.lastDt, this.lastFps, this.lastTotalEntities);
            return;
        }

        pCtx.fillStyle = '#222';
        pCtx.fillRect(0, 0, this.game.width, this.game.height);

        if (this.phase === TestPhase.RENDER_BASELINE) {
            // Primitive drawing
            pCtx.fillStyle = '#ff0000';
            for (const e of this.gameState.enemies) {
                pCtx.fillRect(e.x - 10, e.y - 10, 20, 20);
            }
        } else {
            // Realistic or Heavy
            for (const e of this.gameState.enemies) {
                e.draw(pCtx);
            }
            this.projectileSystem.draw(pCtx);
        }

        PerformanceProfiler.start('DrawParticles');
        if (this.phase === TestPhase.RENDER_WORST_NOCACHE) {
            // Heavy logic
            for (const p of this.effects.activeEffects) {
                if (p.type === 'explosion') {
                    pCtx.save();
                    pCtx.globalCompositeOperation = 'lighter';
                    const grad = pCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    grad.addColorStop(0, 'rgba(255,100,0,1)');
                    grad.addColorStop(1, 'rgba(255,0,0,0)');
                    pCtx.fillStyle = grad;
                    pCtx.beginPath();
                    pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    pCtx.fill();
                    pCtx.restore();
                }
            }
        } else {
            this.effects.draw(); // Default realistic rendering
        }
        PerformanceProfiler.end('DrawParticles');

        PerformanceProfiler.end('Render');
        StressLogger.logFrame(this.lastDt, this.lastFps, this.lastTotalEntities);
    }

    private createOverlay() {
        this.uiOverlay = document.createElement('div');
        Object.assign(this.uiOverlay.style, {
            position: 'absolute', top: '10px', right: '10px',
            backgroundColor: 'rgba(0,0,0,0.85)', color: '#0f0',
            padding: '15px', fontFamily: 'monospace', whiteSpace: 'pre',
            border: '2px solid #0f0', borderRadius: '8px', zIndex: '9999'
        });
        document.body.appendChild(this.uiOverlay);
    }

    private updateOverlay(fps: number) {
        if (!this.uiOverlay || this.phase === TestPhase.FINISHED) return;
        const phaseName = TestPhase[this.phase];
        const entities = this.gameState.enemies.length;
        this.uiOverlay.innerText = `[STRESS V2] Phase: ${phaseName}\nTime: ${this.phaseTimer.toFixed(1)}s\nFPS: ${fps.toFixed(0)}\nEntities: ${entities}`;
    }

    private showReport() {
        if (!this.uiOverlay) return;
        const report = StressLogger.generateReport();
        const json = StressLogger.generateJson();

        this.uiOverlay.innerHTML = '';
        Object.assign(this.uiOverlay.style, { right: 'calc(50% - 250px)', top: '50px', width: '500px', textAlign: 'center' });

        const title = document.createElement('h2');
        title.innerText = "BENCHMARK COMPLETE";
        title.style.color = '#fff';
        this.uiOverlay.appendChild(title);

        const btnStyle = "background:#444; color:#fff; border:1px solid #888; padding:10px; margin:5px; cursor:pointer;";

        const createBtn = (text: string, action: () => void) => {
            const b = document.createElement('button');
            b.innerText = text; b.style.cssText = btnStyle; b.onclick = action; return b;
        };

        this.uiOverlay.appendChild(createBtn("COPY MARKDOWN", () => navigator.clipboard.writeText(report)));
        this.uiOverlay.appendChild(createBtn("COPY JSON", () => navigator.clipboard.writeText(json)));
        this.uiOverlay.appendChild(createBtn("EXIT", () => this.game.toMenu()));
    }
}
