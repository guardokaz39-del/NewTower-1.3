import { Projectile } from '../Projectile';
import { EffectSystem } from '../EffectSystem';

export class ProjectileSystem {
    // Stack-based pooling
    // 'pool' contains inactive projectiles ready for reuse
    // 'active' contains currently live projectiles
    private pool: Projectile[] = [];
    private active: Projectile[] = [];

    // Getter for other systems (Collision, etc)
    public get projectiles(): Projectile[] {
        return this.active;
    }

    public spawn(x: number, y: number, target: { x: number; y: number }, stats: any): Projectile {
        // 1. Pop from pool or create new (O(1))
        const p = this.pool.pop() || new Projectile();

        // 2. Init
        p.init(x, y, target, stats);

        // 3. Add to active list
        this.active.push(p);

        return p;
    }

    public createExplosion(x: number, y: number, radius: number, damage: number, friendlyFire: boolean = false) {
        // DEPRECATED/LEGACY:
        // Logic usually handled by CollisionSystem triggers.
        // If this is still used for direct spawning (e.g. from debug or abilities),
        // we spawn a projectile that dies instantly.

        const p = this.spawn(
            x,
            y,
            { x, y },
            {
                dmg: damage,
                speed: 0,
                color: '#76ff03',
                effects: [],
                pierce: 999,
                projectileType: 'explosion',
                explosionRadius: radius,
                explosionDamage: damage,
                explodeOnDeath: true,
            },
        );

        p.life = 0;
        (p as any).friendlyFire = friendlyFire;
        return p;
    }

    public update(dt: number, effects: EffectSystem) {
        // Iterate active projectiles
        for (let i = 0; i < this.active.length; i++) {
            const p = this.active[i];

            p.update(dt); // Update logic (physics only)

            if (p.alive) {
                // --- TRAIL EFFECTS (Decoupled from Projectile) ---
                // Spawn trail particles approx every ~0.06s (15 fps density)
                if (Math.random() < dt * 15) {
                    this.spawnTrail(p, effects);
                }
            } else {
                // Remove from active (Swap & Pop)
                this.remove(i);

                // Decrement i because we swapped a new element into this slot
                i--;
            }
        }
    }

    private spawnTrail(p: Projectile, effects: EffectSystem) {
        const type = p.projectileType || 'standard';

        // Fire Trail (Smoke/Embers)
        if (type === 'fire') {
            effects.add({
                type: 'particle',
                x: p.x + (Math.random() - 0.5) * 4,
                y: p.y + (Math.random() - 0.5) * 4,
                vx: -p.vx * 0.2 + (Math.random() - 0.5) * 60,
                vy: -p.vy * 0.2 + (Math.random() - 0.5) * 60,
                life: 0.25 + Math.random() * 0.15, // ~15-25 frames
                radius: 2 + Math.random() * 2,
                color: Math.random() > 0.5 ? 'rgba(255, 100, 0, 0.5)' : 'rgba(100, 100, 100, 0.3)',
            });
        }
        // Ice Trail (Snow/Sparkle)
        else if (type === 'ice') {
            effects.add({
                type: 'particle',
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 30,
                life: 0.35, // 20 frames
                radius: 1.5,
                color: '#e1f5fe',
            });
        }
        // Level 3 Trail (Glow) - Generic for all high levels
        if (p.towerLevel >= 3) {
            effects.add({
                type: 'particle',
                x: p.x,
                y: p.y,
                vx: 0,
                vy: 0,
                life: 0.16, // 10 frames
                radius: 2,
                color: p.color,
            });
        }
    }

    private remove(index: number) {
        const p = this.active[index];

        // 1. Reset state completely
        p.reset();

        // 2. Return to pool
        this.pool.push(p);

        // 3. Swap Remove from active
        const last = this.active.pop();
        if (last && last !== p) {
            this.active[index] = last;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        // Draw all active
        for (let i = 0; i < this.active.length; i++) {
            this.active[i].draw(ctx);
        }
    }

    public clear() {
        // Move all active to pool
        while (this.active.length > 0) {
            const p = this.active.pop();
            if (p) {
                p.reset(); // Crucial: Reset before pooling
                p.alive = false;
                this.pool.push(p);
            }
        }
    }
}
