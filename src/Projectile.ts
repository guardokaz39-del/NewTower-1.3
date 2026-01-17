
import { ICardEffect } from './cards';
import { Assets } from './Assets';

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
    public hitList: string[] = [];
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
        this.hitList = [];
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

        this.life = 120; // 2 секунды жизни

        // Adjust life for sniper (faster = less time needed)
        if (this.projectileType === 'sniper') this.life = 60;
    }

    public update() {
        if (!this.alive) return;

        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        if (this.life <= 0 || this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 2000) {
            this.alive = false;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;

        // Enhanced visual for critical hits
        if (this.isCrit) {
            // Enhanced visual for critical hits (kept dynamic for glow intensity)
            ctx.save();
            // Outer glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff3300'; // Orange-red glow
            ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.fill();

            // Inner core glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffff00';
            ctx.fillStyle = '#ffffaa';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Inner bright core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // --- BAKED PROJECTILES ---
            const type = this.projectileType || 'standard';
            const img = Assets.get(`projectile_${type}`);

            if (img) {
                const size = 16;
                ctx.save();
                ctx.translate(this.x, this.y);

                // Rotate if needed
                if (type === 'ice' || type === 'sniper') {
                    const angle = Math.atan2(this.vy, this.vx);
                    ctx.rotate(angle);
                }

                ctx.drawImage(img, -size / 2, -size / 2);

                // Level-based trail effects
                if (this.towerLevel >= 2) {
                    const angle = Math.atan2(this.vy, this.vx);

                    // Fade in trail over first 30 frames (0.5 seconds)
                    const trailOpacity = Math.min(1, (120 - this.life) / 30);

                    ctx.save();
                    ctx.rotate(angle);

                    if (this.towerLevel === 2) {
                        // LVL 2: Light trail
                        ctx.strokeStyle = this.color;
                        ctx.globalAlpha = 0.4 * trailOpacity;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-size * 1.2, 0);
                        ctx.stroke();
                    } else if (this.towerLevel === 3) {
                        // LVL 3: Bright trail with glow
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = this.color;
                        ctx.strokeStyle = this.color;
                        ctx.globalAlpha = 0.7 * trailOpacity;
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-size * 2, 0);
                        ctx.stroke();

                        // Inner bright core trail
                        ctx.shadowBlur = 5;
                        ctx.strokeStyle = '#fff';
                        ctx.globalAlpha = 0.9 * trailOpacity;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-size * 1.5, 0);
                        ctx.stroke();
                    }

                    ctx.restore();
                }

                // Sniper Trail (original, still works)
                if (type === 'sniper') {
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = this.color;
                    // Draw line relative to rotated context (backing up)
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-size * 1.5, 0);
                    ctx.stroke();
                }

                ctx.restore();
            } else {
                // Fallback
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    public reset() {
        this.alive = false;
        this.hitList = [];
    }
}
