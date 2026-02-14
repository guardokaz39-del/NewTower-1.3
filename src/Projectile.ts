
import { ICardEffect } from './cards';
import { Assets } from './Assets';
import { RendererFactory } from './RendererFactory';

export interface IProjectileStats {
    dmg: number;
    speed: number;
    color: string;
    effects: ICardEffect[];
    pierce: number;
    critChance?: number;           // Critical hit chance (0-1)
    isCrit?: boolean;               // Is this projectile a crit
    explodeOnDeath?: boolean;       // Fire level 3 effect
    explosionDamage?: number;       // Damage from explosion
    explosionRadius?: number;       // Radius of explosion
    projectileType?: string;        // Visual type: standard, ice, fire, sniper, split
    towerLevel?: number;            // Tower's max card level (for trail effects)
}

export class Projectile {
    public x: number = 0;
    public y: number = 0;
    public vx: number = 0;
    public vy: number = 0;
    public radius: number = 4;
    public alive: boolean = false;

    public damage: number = 0;
    public life: number = 0;
    public color: string = '#fff';
    public effects: ICardEffect[] = [];
    public pierce: number = 0;
    public hitList: number[] = [];
    public isCrit: boolean = false;           // Is this a critical hit
    public explodeOnDeath: boolean = false;   // Should explode on enemy death
    public explosionDamage: number = 0;       // Damage from explosion
    public explosionRadius: number = 0;       // Radius of explosion
    public projectileType: string = 'standard'; // Visual type
    public towerLevel: number = 1;            // Tower's max card level (for trails)

    private static readonly EMPTY_EFFECTS: ICardEffect[] = [];

    // Конструктор пустой!
    constructor() { }

    // Метод инициализации (вызывается из пула)
    public init(x: number, y: number, target: { x: number; y: number }, stats: IProjectileStats) {
        this.x = x;
        this.y = y;
        this.alive = true;
        this.damage = stats.dmg;
        this.color = stats.color;
        this.effects = stats.effects || Projectile.EMPTY_EFFECTS;
        this.pierce = stats.pierce || 0;
        this.hitList.length = 0; // PERF: Reuse array instead of allocating new
        this.projectileType = stats.projectileType || 'standard';
        this.towerLevel = stats.towerLevel || 1;
        this.radius = 4; // Default radius

        // Handle critical hits
        const critChance = stats.critChance || 0;
        this.isCrit = Math.random() < critChance;
        if (this.isCrit) {
            this.damage *= 2; // Critical hits deal 2x damage
        }

        // Handle explosion on death effect (Fire level 3)
        const explodeEffect = this.effects.find((e: any) => e.type === 'explodeOnDeath');
        if (explodeEffect) {
            this.explodeOnDeath = true;
            this.explosionDamage = stats.dmg * (explodeEffect.explosionDamagePercent || 0.5);
            this.explosionRadius = explodeEffect.explosionRadius || 40;
        } else {
            this.explodeOnDeath = false;
            this.explosionDamage = 0;
            this.explosionRadius = 0;
        }

        const angle = Math.atan2(target.y - y, target.x - x);
        this.vx = Math.cos(angle) * stats.speed;
        this.vy = Math.sin(angle) * stats.speed;

        this.life = 2.0; // 2 секунды жизни
        // Adjust life for sniper (faster = less time needed)
        if (this.projectileType === 'sniper') this.life = 1.0;
    }

    // Decoupled update: No effects dependency
    public update(dt: number = 1) {
        if (!this.alive) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;

        if (this.life <= 0 || this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 2000) {
            this.alive = false;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawProjectile(ctx, this);
    }

    public reset() {
        this.alive = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.damage = 0;
        this.life = 0;
        this.effects = Projectile.EMPTY_EFFECTS; // Zero alloc reset
        this.hitList.length = 0;

        this.isCrit = false;
        this.explodeOnDeath = false;
        this.explosionDamage = 0;
        this.explosionRadius = 0;
        this.projectileType = 'standard';
        this.towerLevel = 1;
        this.pierce = 0;
        this.radius = 4;
        this.color = '#fff';
    }
}
