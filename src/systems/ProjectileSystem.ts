import { Projectile } from '../Projectile';
import { EffectSystem } from '../EffectSystem';

export class ProjectileSystem {
    // Single pool array containing both active and inactive projectiles
    private pool: Projectile[] = [];

    // Getter for other systems (Collision, etc)
    public get projectiles(): Projectile[] {
        return this.pool;
    }

    public spawn(x: number, y: number, target: { x: number, y: number }, stats: any): Projectile {
        // 1. Try to find an inactive projectile
        let p = this.pool.find(p => !p.alive);

        if (!p) {
            // 2. If not found, create new and add to pool
            p = new Projectile();
            this.pool.push(p);
        }

        // 3. Reset/Init (active = true happens here)
        p.init(x, y, target, stats);
        return p;
    }

    public update(dt: number, effects: EffectSystem) {
        for (const p of this.pool) {
            if (p.alive) {
                p.update(effects, dt);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        for (const p of this.pool) {
            if (p.alive) {
                p.draw(ctx);
            }
        }
    }

    public clear() {
        // Mark all as dead, but keep objects in pool for reuse
        for (const p of this.pool) {
            p.alive = false;
        }
    }
}
