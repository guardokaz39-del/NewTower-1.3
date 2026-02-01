import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { EffectSystem } from './EffectSystem';
import { SoundManager, SoundPriority } from './SoundManager';
import { SpatialGrid } from './SpatialGrid';

export class CollisionSystem {
    private effects: EffectSystem;
    private enemyGrid: SpatialGrid<Enemy>;

    constructor(effects: EffectSystem) {
        this.effects = effects;
        // Initialize grid with screen dimensions, 128px cells
        this.enemyGrid = new SpatialGrid<Enemy>(window.innerWidth, window.innerHeight, 128);
    }


    public update(projectiles: Projectile[], enemies: Enemy[]) {
        // Rebuild spatial grid each frame
        this.enemyGrid.clear();
        for (const enemy of enemies) {
            if (enemy.isAlive()) {
                this.enemyGrid.register(enemy);
            }
        }

        // Check projectile collisions using spatial grid
        for (const p of projectiles) {
            if (!p.alive) continue;

            // Out of bounds check
            if (p.x < -50 || p.x > window.innerWidth + 50 || p.y < -50 || p.y > window.innerHeight + 50) {
                p.alive = false;
                continue;
            }

            // Get only nearby enemies instead of checking all enemies
            const searchRadius = 100; // Reasonable search radius for collision
            const nearbyEnemies = this.enemyGrid.getNearby(p.x, p.y, searchRadius);

            for (const e of nearbyEnemies) {
                if (!e.isAlive()) continue;
                if (p.hitList.includes(e.id)) continue;

                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                const hitDist = 20 + p.radius;

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
        // Apply damage with projectile reference (for tracking kills)
        const wasSlowed = target.statuses.some(s => s.type === 'slow');

        target.takeDamage(p.damage, p);

        // Sound Hit
        SoundManager.play('hit', SoundPriority.LOW);

        // --- ВИЗУАЛ: Искры при попадании (critical hit = more particles) ---
        const particleCount = p.isCrit ? 10 : 5;
        for (let i = 0; i < particleCount; i++) {
            this.effects.add({
                type: 'particle',
                x: target.x,
                y: target.y,
                vx: (Math.random() - 0.5) * (p.isCrit ? 8 : 4),
                vy: (Math.random() - 0.5) * (p.isCrit ? 8 : 4),
                life: p.isCrit ? 30 : 20,
                color: p.color, // Use projectile color (tower type)
                radius: p.isCrit ? 4 : 2,
            });
        }

        // === CRIT FLASH + BIG TEXT ===
        if (p.isCrit) {
            // Screen flash (white)
            this.effects.add({
                type: 'screen_flash',
                x: 0,
                y: 0,
                life: 8,
                flashColor: 'rgba(255, 255, 255, ',
            });

            // Big "CRIT!" text
            this.effects.add({
                type: 'text',
                text: 'CRIT!',
                x: target.x,
                y: target.y - 30,
                life: 35,
                color: '#ff0',
                fontSize: 28,
                vy: -2,
            });

            // Enlarged damage number
            this.effects.add({
                type: 'text',
                text: Math.floor(p.damage).toString(),
                x: target.x + 15,
                y: target.y - 10,
                life: 30,
                color: '#ffd700',
                fontSize: 22,
                vy: -1.5,
            });
        }
        // === END CRIT EFFECTS ===
        // -----------------------------------

        // Handle enemy death effects
        const enemyDied = !target.isAlive();
        if (enemyDied) {
            this.handleEnemyDeath(target, p, allEnemies, wasSlowed);
        }

        // Splash damage effect
        const splash = p.effects.find((ef) => ef.type === 'splash');
        if (splash) {
            this.effects.add({
                type: 'explosion',
                x: target.x,
                y: target.y,
                radius: splash.splashRadius || splash.radius,
                life: 15,
                color: 'rgba(255, 100, 0, 0.5)',
            });

            for (const neighbor of allEnemies) {
                if (neighbor === target || !neighbor.isAlive()) continue;
                const dist = Math.hypot(neighbor.x - target.x, neighbor.y - target.y);
                if (dist <= (splash.splashRadius || splash.radius)) {
                    neighbor.takeDamage(p.damage * 0.7);
                }
            }
        }

        // Slow effect (with damage modifier)
        const slow = p.effects.find((ef) => ef.type === 'slow');
        if (slow) {
            const damageBonus = slow.damageToSlowed || 1.0;
            target.applyStatus('slow', slow.slowDuration || slow.dur || 60, slow.slowPower || slow.power || 0.4, damageBonus);
        }
    }

    private handleEnemyDeath(enemy: Enemy, killingProjectile: Projectile, allEnemies: Enemy[], wasSlowed: boolean) {
        const deathX = enemy.x;
        const deathY = enemy.y;

        // Sound Death
        // Boss death sound? (Checking enemy type or size)
        SoundManager.play('death', SoundPriority.LOW);

        // Fire Level 3: Explosion on death
        if (killingProjectile.explodeOnDeath) {
            this.effects.add({
                type: 'explosion',
                x: deathX,
                y: deathY,
                radius: killingProjectile.explosionRadius,
                life: 20,
                color: 'rgba(255, 69, 0, 0.8)',
            });

            // Damage nearby enemies
            for (const neighbor of allEnemies) {
                if (!neighbor.isAlive()) continue;
                const dist = Math.hypot(neighbor.x - deathX, neighbor.y - deathY);
                if (dist <= killingProjectile.explosionRadius) {
                    neighbor.takeDamage(killingProjectile.explosionDamage);
                }
            }
        }

        // Ice Level 3: Chain slow on death (if enemy was slowed when it died)
        if (wasSlowed) {
            const chainSlowEffect = killingProjectile.effects.find((ef: any) => ef.type === 'chainSlowOnDeath');
            if (chainSlowEffect) {
                const chainRadius = chainSlowEffect.chainRadius || 60;

                // Visual effect for chain slow
                this.effects.add({
                    type: 'explosion',
                    x: deathX,
                    y: deathY,
                    radius: chainRadius,
                    life: 20,
                    color: 'rgba(0, 188, 212, 0.5)',
                });

                // Apply slow to nearby enemies
                for (const neighbor of allEnemies) {
                    if (!neighbor.isAlive()) continue;
                    const dist = Math.hypot(neighbor.x - deathX, neighbor.y - deathY);
                    if (dist <= chainRadius) {
                        // Apply the same slow effect from the projectile
                        const slowEffect = killingProjectile.effects.find((ef: any) => ef.type === 'slow');
                        if (slowEffect) {
                            const damageBonus = slowEffect.damageToSlowed || 1.0;
                            neighbor.applyStatus('slow', slowEffect.slowDuration || slowEffect.dur || 60, slowEffect.slowPower || slowEffect.power || 0.4, damageBonus);
                        }
                    }
                }
            }
        }
    }
}
