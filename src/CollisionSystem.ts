import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { EffectSystem } from './EffectSystem';
import { DebugSystem } from './DebugSystem';

export class CollisionSystem {
    private effects: EffectSystem;
    private debug: DebugSystem;

    constructor(effects: EffectSystem, debug: DebugSystem) {
        this.effects = effects;
        this.debug = debug;
    }

    public update(projectiles: Projectile[], enemies: Enemy[]) {
        for (const p of projectiles) {
            if (!p.alive) continue;

            if (p.x < -50 || p.x > window.innerWidth + 50 || p.y < -50 || p.y > window.innerHeight + 50) {
                p.alive = false;
                continue;
            }

            for (const e of enemies) {
                if (!e.isAlive()) continue;
                if (p.hitList.includes(e.id)) continue;

                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                const hitDist = 20 + p.radius; // Чуть увеличил хитбокс

                if (dist < hitDist) {
                    this.handleHit(p, e, enemies);
                    
                    if (p.pierce > 0) {
                        p.pierce--;
                        p.hitList.push(e.id);
                    } else {
                        p.alive = false;
                        break;
                    }
                }
            }
        }
    }

    private handleHit(p: Projectile, target: Enemy, allEnemies: Enemy[]) {
        target.takeDamage(p.damage);

        // --- ВИЗУАЛ: Искры при попадании ---
        for(let i=0; i<4; i++) {
            this.effects.add({
                type: 'particle',
                x: target.x, y: target.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20,
                color: p.color,
                radius: 2
            });
        }
        // -----------------------------------

        const splash = p.effects.find(ef => ef.type === 'splash');
        if (splash) {
            this.effects.add({
                type: 'explosion', x: target.x, y: target.y,
                radius: splash.radius, life: 15, color: 'rgba(255, 100, 0, 0.5)'
            });

            for (const neighbor of allEnemies) {
                if (neighbor === target || !neighbor.isAlive()) continue;
                const dist = Math.hypot(neighbor.x - target.x, neighbor.y - target.y);
                if (dist <= splash.radius) {
                    neighbor.takeDamage(p.damage * 0.7);
                }
            }
        }

        const slow = p.effects.find(ef => ef.type === 'slow');
        if (slow) {
            target.applyStatus('slow', slow.dur || 60, slow.power || 0.4);
        }
    }
}