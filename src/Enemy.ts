import { CONFIG, getEnemyType } from './Config';
import { EventBus, Events } from './EventBus';
import { RendererFactory } from './RendererFactory';
import { Assets } from './Assets';
import { Projectile } from './Projectile';
import { EnemyRenderer } from './renderers/EnemyRenderer';

export interface IEnemyConfig {
    id: string;
    health: number;
    speed: number;
    armor?: number;
    x?: number;
    y?: number;
    path: { x: number; y: number }[];
}

interface IStatus {
    type: 'slow' | 'burn';
    duration: number;
    power: number;
}

export class Enemy {
    public id: string;
    public typeId: string = 'grunt';

    public currentHealth: number;
    public maxHealth: number;
    public baseSpeed: number;
    public armor: number;
    public reward: number = 5; // Reward for killing this enemy

    public x: number;
    public y: number;

    public path: { x: number; y: number }[];
    public pathIndex: number = 0;
    public finished: boolean = false;

    public statuses: IStatus[] = [];
    public damageModifier: number = 1.0;     // Damage multiplier (e.g., 1.2 = +20% damage)
    public killedByProjectile: Projectile | null = null;   // Track what projectile killed this enemy
    public hitFlashTimer: number = 0;        // Timer for white flash on hit

    // === BOSS MECHANICS (Spectral Shift) ===
    public isInvulnerable: boolean = false;
    private shieldTimer: number = 0;
    // Thresholds: [HP Percent, Duration in Seconds]
    private thresholds: { p: number, d: number, used: boolean }[] = [];

    constructor(config?: IEnemyConfig) {
        if (config) {
            this.init(config);
        }
    }

    public init(config: IEnemyConfig) {
        this.id = config.id;
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.baseSpeed = config.speed;
        this.armor = config.armor || 0;

        this.x = config.x || 0;
        this.y = config.y || 0;
        this.path = config.path;
        this.pathIndex = 0;
        this.finished = false;

        this.damageModifier = 1.0;
        this.killedByProjectile = null;
    }

    public reset() {
        this.statuses = [];
        this.hitFlashTimer = 0;
        this.pathIndex = 0;
        this.finished = false;
        this.damageModifier = 1.0;
        this.killedByProjectile = null;
        this.x = -1000; // Move offscreen
        this.y = -1000;
    }

    public setType(id: string) {
        this.typeId = id;

        // Initialize Boss Mechanics if this is a boss
        if (id.toLowerCase() === 'boss') {
            this.thresholds = [
                { p: 0.8, d: 3.0, used: false },
                { p: 0.5, d: 5.0, used: false },
                { p: 0.2, d: 8.0, used: false }
            ];
        } else {
            this.thresholds = [];
        }
    }

    public takeDamage(amount: number, projectile?: Projectile): void {
        if (this.isInvulnerable) {
            // Visual Effect "BLOCKED"
            EventBus.getInstance().emit(Events.ENEMY_IMMUNE, { x: this.x, y: this.y });
            return;
        }

        const prevHpPercent = this.currentHealth / this.maxHealth;

        // Apply damage modifier (from slow effects, etc.)
        const modifiedAmount = amount * this.damageModifier;
        const actualDamage = Math.max(1, modifiedAmount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) this.currentHealth = 0;

        const currentHpPercent = this.currentHealth / this.maxHealth;

        // Check Thresholds
        // Only bosses typically have this, but it doesn't hurt to have the logic generic
        // or check if thresholds exist (they are initialized).
        for (const t of this.thresholds) {
            if (!t.used && currentHpPercent <= t.p && prevHpPercent > t.p) {
                this.activateShield(t.d);
                t.used = true;
                break; // Activate one threshold at a time
            }
        }

        // Visual Feedback: Hit Flash
        this.hitFlashTimer = 0.08; // ~5 frames at 60fps

        // Track what killed this enemy
        if (!this.isAlive()) {
            if (projectile) {
                this.killedByProjectile = projectile;
            }
            EventBus.getInstance().emit(Events.ENEMY_DIED, { enemy: this });
        }
    }

    private activateShield(duration: number) {
        this.isInvulnerable = true;
        this.shieldTimer = duration;
        // Float text handled by event listener or renderer (if we want persistency)
        // But for "IMMUNE!" popup, we can emit event
        EventBus.getInstance().emit(Events.ENEMY_IMMUNE, { x: this.x, y: this.y - 40 });
    }

    // ИСПРАВЛЕНИЕ: метод стал public
    public move(dt: number): void {
        let speedMod = 1;
        const slow = this.statuses.find((s) => s.type === 'slow');
        if (slow) speedMod -= slow.power;

        const currentSpeed = Math.max(0, this.baseSpeed * speedMod * dt); // Apply delta time

        if (this.pathIndex >= this.path.length) {
            this.finished = true;
            return;
        }

        const node = this.path[this.pathIndex];
        const targetX = node.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const targetY = node.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= currentSpeed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
        } else {
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }
    }

    public isAlive(): boolean {
        return this.currentHealth > 0;
    }

    public getHealthPercent(): number {
        return this.currentHealth / this.maxHealth;
    }

    public applyStatus(type: 'slow' | 'burn', duration: number, power: number, damageBonus?: number) {
        const existing = this.statuses.find((s) => s.type === type);
        if (existing) {
            existing.duration = duration;
            existing.power = power;
        } else {
            this.statuses.push({ type, duration, power });
        }

        // Apply damage modifier for slowed enemies (Ice level 2+)
        if (type === 'slow' && damageBonus) {
            this.damageModifier = damageBonus;
        }
    }

    public update(dt: number): void {
        // Update status durations
        this.statuses = this.statuses.filter((s) => {
            s.duration -= dt;
            return s.duration > 0;
        });

        // Reset damage modifier if no slow status
        if (!this.statuses.some(s => s.type === 'slow')) {
            this.damageModifier = 1.0;
        }

        // Update flash timer
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

        // Update Shield
        if (this.isInvulnerable) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.isInvulnerable = false;
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawEnemy(ctx, this);
    }

    public drawSprite(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawEnemySprite(ctx, this);
    }

    public drawUI(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawEnemyUI(ctx, this);
    }
}
