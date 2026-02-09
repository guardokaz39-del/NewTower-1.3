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

    public spawn(x: number, y: number, target: { x: number, y: number }, stats: any): Projectile {
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

        const p = this.spawn(x, y, { x, y }, {
            dmg: damage,
            speed: 0,
            color: '#76ff03',
            effects: [],
            pierce: 999,
            projectileType: 'explosion',
            explosionRadius: radius,
            explosionDamage: damage,
            explodeOnDeath: true
        });

        p.life = 0;
        (p as any).friendlyFire = friendlyFire;
        return p;
    }

    public update(dt: number, effects: EffectSystem) {
        // Iterate BACKWARDS to allow swap-remove safely?
        // Actually, with swap-remove, we can iterate forward if we handle the index correctly.
        // Standard pattern:
        for (let i = 0; i < this.active.length; i++) {
            const p = this.active[i];

            p.update(effects, dt); // Update logic

            if (!p.alive) {
                // Remove from active (Swap & Pop)
                this.remove(i);

                // Decrement i because we swapped a new element into this slot
                i--;
            }
        }
    }

    private remove(index: number) {
        const p = this.active[index];
        const last = this.active.pop();

        if (last && last !== p) {
            this.active[index] = last;
        }

        // Return to pool
        this.pool.push(p);
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
                p.alive = false;
                this.pool.push(p);
            }
        }
    }
}
