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

    public createExplosion(x: number, y: number, radius: number, damage: number, friendlyFire: boolean = false) {
        // Visual Explosion (Reuse existing particle logic or spawn a dummy projectile that explodes immediately)
        // For now, let's spawn a "stationary" projectile that dies immediately but triggers effects
        // OR better: Just handle the logic here if we have access to effects.

        // Since this system doesn't have direct access to 'enemies' list to apply damage,
        // we will create a special projectile that acts as the explosion.

        // Actually, looking at the code, ProjectileSystem.update() doesn't do collision checks.
        // Collision is likely handled in GameScene.
        // So we need to return a projectile that the GameScene will process as "Just Exploded"

        const p = this.spawn(x, y, { x, y }, {
            dmg: damage,
            speed: 0,
            color: '#76ff03',
            effects: [],
            pierce: 999,
            projectileType: 'explosion', // New type
            explosionRadius: radius,
            explosionDamage: damage,
            explodeOnDeath: true // This ensures it triggers explosion logic
        });

        p.life = 0; // Die immediately next frame to trigger explosion

        // Mark it specially for friendly fire if needed
        // We'll add a runtime property or use existing fields
        (p as any).friendlyFire = friendlyFire;

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
