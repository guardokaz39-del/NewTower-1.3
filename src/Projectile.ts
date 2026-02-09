
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

    // Конструктор пустой!
    constructor() { }

    // Метод инициализации (вызывается из пула)
    public init(x: number, y: number, target: { x: number; y: number }, stats: IProjectileStats) {
        this.x = x;
        this.y = y;
        this.alive = true;
        this.damage = stats.dmg;
        this.color = stats.color;
        this.effects = stats.effects;
        this.pierce = stats.pierce || 0;
        this.hitList.length = 0; // PERF: Reuse array instead of allocating new
        this.projectileType = stats.projectileType || 'standard';
        this.towerLevel = stats.towerLevel || 1;

        // Handle critical hits
        const critChance = stats.critChance || 0;
        this.isCrit = Math.random() < critChance;
        if (this.isCrit) {
            this.damage *= 2; // Critical hits deal 2x damage
        }

        // Handle explosion on death effect (Fire level 3)
        const explodeEffect = stats.effects.find((e: any) => e.type === 'explodeOnDeath');
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

    public update(effects?: any, dt: number = 1) { // Type 'any' to avoid strict circular import issues if EffectSystem isn't imported, but normally it should be fine. Using any for safety here or import it.
        if (!this.alive) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;

        // --- TRAIL EFFECTS ---
        // Spawn trail particles approx every ~0.03s (30 fps)
        // Spawn trail particles approx every ~0.06s (15 fps)
        if (effects && Math.random() < dt * 15) {
            const type = this.projectileType || 'standard';

            // Fire Trail (Smoke/Embers)
            if (type === 'fire') {
                effects.add({
                    type: 'particle',
                    x: this.x + (Math.random() - 0.5) * 4,
                    y: this.y + (Math.random() - 0.5) * 4,
                    vx: -this.vx * 0.2 + (Math.random() - 0.5) * 60,
                    vy: -this.vy * 0.2 + (Math.random() - 0.5) * 60,
                    life: 0.25 + Math.random() * 0.15, // ~15-25 frames
                    radius: 2 + Math.random() * 2,
                    color: Math.random() > 0.5 ? 'rgba(255, 100, 0, 0.5)' : 'rgba(100, 100, 100, 0.3)'
                });
            }
            // Ice Trail (Snow/Sparkle)
            else if (type === 'ice') {
                effects.add({
                    type: 'particle',
                    x: this.x,
                    y: this.y,
                    vx: (Math.random() - 0.5) * 30, // 0.5 * 60
                    vy: (Math.random() - 0.5) * 30,
                    life: 0.35, // 20 frames
                    radius: 1.5,
                    color: '#e1f5fe'
                });
            }
            // Sniper Trail (handled by draw mostly, but particles are nice)
            else if (type === 'sniper') {
                // Sniper is fast, maybe no particles needed, leaving trail line in draw()
            }
            // Level 3 Trail (Glow)
            if (this.towerLevel >= 3) {
                effects.add({
                    type: 'particle',
                    x: this.x,
                    y: this.y,
                    vx: 0,
                    vy: 0,
                    life: 0.16, // 10 frames
                    radius: 2,
                    color: this.color
                });
            }
        }

        if (this.life <= 0 || this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 2000) {
            this.alive = false;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawProjectile(ctx, this);
    }

    public reset() {
        this.alive = false;
        this.hitList.length = 0;
    }
}
