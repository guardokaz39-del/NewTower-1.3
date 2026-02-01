import { CONFIG } from '../Config';
import { Enemy } from '../Enemy';
import { Tower } from '../Tower';
import { Projectile } from '../Projectile';
import { ObjectPool } from '../Utils';
import { EventBus, Events } from '../EventBus';

/**
 * Manages game state (money, lives, wave, pause) and provides state mutation methods.
 * Emits events when state changes occur.
 */
export class GameState {
    // Core state
    public wave: number = 0;
    public lives: number = CONFIG.PLAYER.START_LIVES;
    public money: number = CONFIG.PLAYER.START_MONEY;
    public paused: boolean = false;
    public isRunning: boolean = true;
    public timeScale: number = 1.0;

    // Entity collections
    public enemies: Enemy[] = [];
    public towers: Tower[] = [];
    // public projectiles: Projectile[] = []; // MOVED to ProjectileSystem

    // Object pools
    // public projectilePool: ObjectPool<Projectile>; // MOVED to ProjectileSystem
    public enemyPool: ObjectPool<Enemy>;

    // Selection state
    public selectedTower: Tower | null = null;

    // Animation state
    public frames: number = 0;
    public shakeTimer: number = 0;
    public shakeIntensity: number = 0;

    private eventBus: EventBus = EventBus.getInstance();

    constructor() {
        // this.projectilePool = new ObjectPool(() => new Projectile());
        this.enemyPool = new ObjectPool(() => new Enemy());
    }



    // === Reset (for restart) ===
    public reset(): void {
        this.wave = 0;
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.money = CONFIG.PLAYER.START_MONEY;
        this.paused = false;
        this.isRunning = true;
        this.timeScale = 1.0;
        this.frames = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.selectedTower = null;

        // Clear entities
        this.enemies = [];
        this.towers = [];
        // this.projectiles = []; // MOVED
    }

    // === Money Management ===
    public addMoney(amount: number): void {
        this.money += amount;
        this.eventBus.emit(Events.MONEY_CHANGED, this.money);
    }

    public spendMoney(amount: number): boolean {
        if (this.money >= amount) {
            this.money -= amount;
            this.eventBus.emit(Events.MONEY_CHANGED, this.money);
            return true;
        }
        return false;
    }

    // === Lives Management ===
    public loseLife(amount: number = 1, effects?: any): void {
        this.lives -= amount;
        this.eventBus.emit(Events.LIVES_CHANGED, this.lives);

        // Red screen flash on damage
        if (effects) {
            effects.add({
                type: 'screen_flash',
                x: 0,
                y: 0,
                life: 15,
                flashColor: 'rgba(255, 0, 0, ',
            });
        }

        if (this.lives <= 0) {
            this.eventBus.emit(Events.GAME_OVER, this.wave);
            this.isRunning = false;
        }
    }

    // === Wave Management ===
    public incrementWave(): void {
        this.wave++;
    }

    // === Pause Management ===
    public togglePause(): void {
        this.paused = !this.paused;
        this.eventBus.emit(Events.TOGGLE_PAUSE, this.paused);
    }

    // === Screen Shake ===
    public triggerShake(duration: number, intensity: number): void {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    public updateShake(): void {
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
        }
    }

    // === Tower Selection ===
    public selectTower(tower: Tower | null): void {
        this.selectedTower = tower;
    }

    // === Time Scale ===
    public setTimeScale(scale: number): void {
        this.timeScale = Math.max(1.0, Math.min(scale, 2.0)); // Clamp between 1x and 2x
    }

    public toggleTimeScale(): void {
        this.timeScale = (this.timeScale === 1.0) ? 2.0 : 1.0;
    }

    // === Game Over ===
    public endGame(): void {
        this.isRunning = false;
    }
}
