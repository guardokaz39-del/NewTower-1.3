import { GameState } from './scenes/GameState';
import { EntityManager } from './scenes/EntityManager';
import { WaveManager } from './WaveManager';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { CollisionSystem } from './CollisionSystem';
import { MetricsSystem } from './MetricsSystem';
import { WeaponSystem } from './WeaponSystem';
import { EffectSystem } from './EffectSystem';
import { MapManager } from './Map';
import { IMapData } from './MapData';
import { CardSystem } from './CardSystem';
import { Rng } from './utils/Rng';
import { ForgeSystem } from './ForgeSystem';
import { InspectorSystem } from './InspectorSystem';
import { BestiarySystem } from './BestiarySystem';
import { NotificationSystem } from './systems/NotificationSystem';
import { AcidPuddleSystem } from './systems/AcidPuddleSystem';
import { SkeletonCommanderSystem } from './systems/SkeletonCommanderSystem';
import { Game } from './Game';
import { IGameScene } from './scenes/IGameScene';

/**
 * GameSession owns the simulation state and logic.
 * It is decoupled from the Scene's rendering and lifecycle as much as possible.
 */
export class GameSession {
    public gameState: GameState;
    public entityManager: EntityManager;
    public waveManager: WaveManager;
    public projectileSystem: ProjectileSystem;
    public collision: CollisionSystem;
    public metrics: MetricsSystem;
    public weaponSystem: WeaponSystem;
    public cardSys: CardSystem;
    public forge: ForgeSystem;
    public inspector: InspectorSystem;
    public bestiary: BestiarySystem;
    public notifications: NotificationSystem;
    public acidSystem: AcidPuddleSystem;
    public commanderSystem: SkeletonCommanderSystem;

    // Randomness State
    public readonly runSeed: number;
    public readonly rng: Rng;

    // References needed for logic
    private game: Game;
    private map: MapManager;
    private effects: EffectSystem;
    private scene: IGameScene; // Back-reference for compatibility (temporary/permanent?)

    constructor(game: Game, scene: IGameScene, map: MapManager, mapData: IMapData, effects: EffectSystem, startingCards: string[], forceSeed?: number) {
        this.game = game;
        this.scene = scene;
        this.map = map;
        this.effects = effects;

        // Initialize RNG
        // @ts-ignore - Allow temporary window override for testing
        const globalForce = (window as any).FORCE_SEED;
        this.runSeed = forceSeed ?? globalForce ?? Date.now();
        this.rng = new Rng(this.runSeed);
        console.log(`[GameSession] Initialized with Run Seed: ${this.runSeed}`);

        // Initialize State
        this.gameState = new GameState();

        // Initialize Systems
        this.metrics = new MetricsSystem();
        this.entityManager = new EntityManager(this.gameState, effects, this.metrics);
        this.projectileSystem = new ProjectileSystem();
        this.weaponSystem = new WeaponSystem();
        this.collision = new CollisionSystem(effects);

        this.waveManager = new WaveManager(scene, this.runSeed); // WaveManager needs IGameScene interface
        this.cardSys = new CardSystem(scene, startingCards);
        this.forge = new ForgeSystem(scene);
        this.inspector = new InspectorSystem(scene);
        this.bestiary = new BestiarySystem(scene);
        this.notifications = new NotificationSystem(effects, game);

        this.acidSystem = new AcidPuddleSystem(game.ctx); // Needs ctx for drawing? Or just update? AcidSystem draws.
        this.commanderSystem = new SkeletonCommanderSystem(game.ctx);
    }

    public update(dt: number) {
        // 1. Update Entities (Move enemies first)
        this.entityManager.updateEnemies(dt, this.map.flowField);
        this.acidSystem.update(dt, this.gameState.enemies);
        this.commanderSystem.update(dt, this.gameState.enemies);

        // 2. Prepare Spatial Grid
        this.collision.prepareGrid(this.gameState.enemies);

        // 3. Update Towers
        for (let i = 0; i < this.gameState.towers.length; i++) {
            const t = this.gameState.towers[i];
            t.update(dt, this.collision.enemyGrid, this.map.flowField);
            t.updateBuilding(this.effects, dt);
            // RendererFactory update moved to Scene? No, RendererFactory updates visual state on Tower. 
            // Ideally Tower update handles logic, RendererFactory handles visual.
            // For now, allow Tower to update its visual state properties here.
        }

        // 4. Weapon System
        this.weaponSystem.update(
            this.gameState.towers,
            this.gameState.enemies,
            this.projectileSystem,
            dt,
            this.effects
        );

        // 5. Projectiles
        this.projectileSystem.update(dt, this.effects);

        // 6. Collisions
        this.collision.update(this.projectileSystem.projectiles, this.gameState.enemies);

        // 7. Wave Manager
        this.waveManager.update(dt);
    }

    public destroy() {
        if (this.bestiary) this.bestiary.destroy();
        if (this.notifications) this.notifications.destroy();
        if (this.acidSystem) this.acidSystem.destroy();
        if (this.commanderSystem) this.commanderSystem.destroy();
    }
}
