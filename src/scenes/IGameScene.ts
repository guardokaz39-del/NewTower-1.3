import { Game } from '../Game';
import { IMapData } from '../MapData';
import { WaveManager } from '../WaveManager';
import { CardSystem, ICard } from '../CardSystem';
import { UIManager } from '../UIManager';
import { ForgeSystem } from '../ForgeSystem';
import { InspectorSystem } from '../InspectorSystem';
import { MetricsSystem } from '../MetricsSystem';
import { Enemy } from '../Enemy';
import { Tower } from '../Tower';
import { Projectile } from '../Projectile';
import { EffectSystem } from '../EffectSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { CollisionSystem } from '../CollisionSystem';
import { EventEmitter } from '../Events';
import { GameController } from './GameController';
import { GameState } from './GameState';

// Define the interface for the GameScene
export interface IGameScene {
    // Core references
    game: Game;
    mapData: IMapData;

    // Controller
    gameController: GameController;

    // Systems
    waveManager: WaveManager;
    cardSys: CardSystem;
    ui: UIManager;
    forge: ForgeSystem;
    inspector: InspectorSystem;
    metrics: MetricsSystem;
    effects: EffectSystem;
    projectileSystem: ProjectileSystem;
    collision: CollisionSystem;
    events: EventEmitter;

    // State
    gameState: GameState;
    wave: number;
    readonly money: number;
    readonly lives: number;
    readonly startingLives: number; // For perfect wave bonus detection
    enemies: Enemy[];
    towers: Tower[];
    projectiles: Projectile[];

    // Methods
    spawnEnemy(type: string): void;
    showFloatingText(text: string, x: number, y: number, color?: string): void;
    handleCardDrop(card: ICard, x: number, y: number): boolean;
    giveRandomCard(): void;
    sellTower(tower: Tower): void;
    sellCardFromTower(tower: Tower, cardIndex: number): void;
    restart(): void;
    togglePause(): void;

    // Helper Methods
    addMoney(amount: number): void;
    spendMoney(amount: number): boolean;
    loseLife(amount?: number): void;

    // Need these for some systems (e.g. UIManager accessing shop)
    // shop is in UIManager, but UIManager might access scene's other props
}
