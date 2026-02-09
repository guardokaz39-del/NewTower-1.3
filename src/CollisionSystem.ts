import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { EffectSystem, EffectPriority } from './EffectSystem';
import { PerformanceMonitor } from './utils/PerformanceMonitor';
import { SoundManager, SoundPriority } from './SoundManager';
import { SpatialGrid } from './SpatialGrid';

export class CollisionSystem {
    private effects: EffectSystem;
    public readonly enemyGrid: SpatialGrid<Enemy>; // Public for DevConsole stats

    constructor(effects: EffectSystem) {
        this.effects = effects;
        // Initialize grid with screen dimensions, 128px cells
        this.enemyGrid = new SpatialGrid<Enemy>(window.innerWidth, window.innerHeight, 128);
    }


    public update(projectiles: Projectile[], enemies: Enemy[]) {
        // Rebuild spatial grid each frame
        this.enemyGrid.clear();
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (enemy.isAlive()) {
                this.enemyGrid.register(enemy);
            }
        }

        // Check projectile collisions using spatial grid
        for (let p = 0; p < projectiles.length; p++) {
            const proj = projectiles[p];
            if (!proj.alive) continue;

            // Out of bounds check
            if (proj.x < -50 || proj.x > window.innerWidth + 50 || proj.y < -50 || proj.y > window.innerHeight + 50) {
                proj.alive = false;
                continue;
            }

            // Get only nearby enemies instead of checking all enemies
            const searchRadius = 100; // Reasonable search radius for collision
            const nearbyEnemies = this.enemyGrid.getNearby(proj.x, proj.y, searchRadius);

            // PERF: Allow tracking count
            if (PerformanceMonitor.isEnabled()) {
                PerformanceMonitor.addCount('CollisionChecks', nearbyEnemies.length);
            }

            for (let e = 0; e < nearbyEnemies.length; e++) {
                const enemy = nearbyEnemies[e];
                if (!enemy.isAlive()) continue;
                if (proj.hitList.includes(enemy.id)) continue;

                // Squared distance check (faster than Math.hypot)
                const dx = enemy.x - proj.x;
                const dy = enemy.y - proj.y;
                const distSq = dx * dx + dy * dy;
                const hitDist = 20 + proj.radius;
                const hitDistSq = hitDist * hitDist;

                if (distSq < hitDistSq) {
                    this.handleHit(proj, enemy, enemies);

                    if (proj.pierce > 0) {
                        proj.pierce--;
                        proj.hitList.push(enemy.id);
                    } else {
                        proj.alive = false;
                        break;
                    }
                }
            }
        }
    }

    private handleHit(p: Projectile, target: Enemy, allEnemies: Enemy[]) {
        // Apply damage with projectile reference (for tracking kills)
        let wasSlowed = false;
        for (let i = 0; i < target.statuses.length; i++) {
            if (target.statuses[i].type === 'slow') {
                wasSlowed = true;
                break;
            }
        }

        target.takeDamage(p.damage, p);

        // Sound Hit
        SoundManager.play('hit', SoundPriority.LOW);

        // --- ВИЗУАЛ: Искры при попадании (critical hit = more particles) ---
        const particleCount = p.isCrit ? 10 : 5;
        for (let i = 0; i < particleCount; i++) {
            this.effects.spawn({
                type: 'particle',
                x: target.x,
                y: target.y,
                vx: (Math.random() - 0.5) * (p.isCrit ? 480 : 240), // 8/4 * 60
                vy: (Math.random() - 0.5) * (p.isCrit ? 480 : 240),
                life: p.isCrit ? 0.5 : 0.35, // 30/20 frames
                color: p.color, // Use projectile color (tower type)
                radius: p.isCrit ? 4 : 2,
            });
        }

        // === CRIT FLASH + BIG TEXT ===
        if (p.isCrit) {
            // Screen flash (white)
            this.effects.spawn({
                type: 'screen_flash',
                x: 0,
                y: 0,
                life: 0.15,
                priority: EffectPriority.HIGH, // Critical feedback
                flashColor: 'rgba(255, 255, 255, ',
            });

            // Big "CRIT!" text
            this.effects.spawn({
                type: 'text',
                text: 'CRIT!',
                x: target.x,
                y: target.y - 30,
                life: 0.6,
                color: '#ff0',
                fontSize: 28,
                priority: EffectPriority.HIGH, // Critical feedback
                vy: -120,
            });

            // Enlarged damage number for Crit
            this.spawnDamageText(target, Math.floor(p.damage), true);
        } else {
            // Normal damage text (Accumulated)
            this.spawnDamageText(target, Math.floor(p.damage), false);
        }
        // === END CRIT EFFECTS ===
        // -----------------------------------

        // Handle enemy death effects
        const enemyDied = !target.isAlive();
        if (enemyDied) {
            this.handleEnemyDeath(target, p, allEnemies, wasSlowed);
        }

        // Splash damage effect
        let splash = null;
        for (let i = 0; i < p.effects.length; i++) {
            if (p.effects[i].type === 'splash') {
                splash = p.effects[i];
                break;
            }
        }
        if (splash) {
            this.effects.spawn({
                type: 'explosion',
                x: target.x,
                y: target.y,
                radius: splash.splashRadius || splash.radius,
                life: 0.25,
                priority: EffectPriority.HIGH, // Gameplay effect
                color: 'rgba(255, 100, 0, 0.5)',
            });

            // PERF: indexed loop + squared distance (no sqrt)
            const splashRadiusSq = (splash.splashRadius || splash.radius) ** 2;
            for (let i = 0; i < allEnemies.length; i++) {
                const neighbor = allEnemies[i];
                if (neighbor === target || !neighbor.isAlive()) continue;
                const dx = neighbor.x - target.x;
                const dy = neighbor.y - target.y;
                const distSq = dx * dx + dy * dy;
                if (distSq <= splashRadiusSq) {
                    neighbor.takeDamage(p.damage * 0.7);
                }
            }
        }

        // Slow effect (with damage modifier)
        let slow = null;
        for (let i = 0; i < p.effects.length; i++) {
            if (p.effects[i].type === 'slow') {
                slow = p.effects[i];
                break;
            }
        }
        if (slow) {
            const damageBonus = slow.damageToSlowed || 1.0;
            // Default 60 frames -> 1.0 second. Assuming slow.dur/slowDuration are already converted in Card files, 
            // but fallback must be 1.0, not 60.
            target.applyStatus('slow', slow.slowDuration || slow.dur || 1.0, slow.slowPower || slow.power || 0.4, damageBonus);
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
            this.effects.spawn({
                type: 'explosion',
                x: deathX,
                y: deathY,
                radius: killingProjectile.explosionRadius,
                life: 0.35,
                priority: EffectPriority.HIGH, // Gameplay effect
                color: 'rgba(255, 69, 0, 0.8)',
            });

            // Damage nearby enemies - PERF: indexed loop + squared distance
            const explosionRadiusSq = killingProjectile.explosionRadius ** 2;
            for (let i = 0; i < allEnemies.length; i++) {
                const neighbor = allEnemies[i];
                if (!neighbor.isAlive()) continue;
                const dx = neighbor.x - deathX;
                const dy = neighbor.y - deathY;
                const distSq = dx * dx + dy * dy;
                if (distSq <= explosionRadiusSq) {
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
                this.effects.spawn({
                    type: 'explosion',
                    x: deathX,
                    y: deathY,
                    radius: chainRadius,
                    life: 20,
                    color: 'rgba(0, 188, 212, 0.5)',
                });

                // Apply slow to nearby enemies - PERF: indexed loop + squared distance
                const chainRadiusSq = chainRadius ** 2;
                for (let i = 0; i < allEnemies.length; i++) {
                    const neighbor = allEnemies[i];
                    if (!neighbor.isAlive()) continue;
                    const dx = neighbor.x - deathX;
                    const dy = neighbor.y - deathY;
                    const distSq = dx * dx + dy * dy;
                    if (distSq <= chainRadiusSq) {
                        // Apply the same slow effect from the projectile
                        const slowEffect = killingProjectile.effects.find((ef: any) => ef.type === 'slow');
                        if (slowEffect) {
                            const damageBonus = slowEffect.damageToSlowed || 1.0;
                            neighbor.applyStatus('slow', slowEffect.slowDuration || slowEffect.dur || 1.0, slowEffect.slowPower || slowEffect.power || 0.4, damageBonus);
                        }
                    }
                }
            }
        }
    }


    private spawnDamageText(target: Enemy, amount: number, isCrit: boolean) {
        const now = performance.now();
        // Check if target has an active damage text
        if (!isCrit && target.lastDamageText && (now - target.lastDamageTextTime < 100)) {
            // Accumulate
            target.currentDamageAccumulation += amount;
            target.lastDamageTextTime = now;

            if (target.lastDamageText.life > 0) {
                target.lastDamageText.text = Math.floor(target.currentDamageAccumulation).toString();
                target.lastDamageText.life = 0.6; // Refresh life
                target.lastDamageText.y = target.y - 10; // Reset position slightly
                target.lastDamageText.scale = 1.2; // Pop effect
                return;
            }
        }

        // New text
        const textObj = this.effects.spawn({
            type: 'text',
            text: amount.toString(),
            x: target.x + (Math.random() * 20 - 10),
            y: target.y - 10,
            life: 0.6,
            color: isCrit ? '#ffd700' : '#fff',
            fontSize: isCrit ? 22 : 14,
            priority: isCrit ? EffectPriority.HIGH : EffectPriority.MEDIUM, // High for crit, Med for normal
            vy: -60,
        });

        if (!isCrit) {
            target.lastDamageText = textObj;
            target.lastDamageTextTime = now;
            target.currentDamageAccumulation = amount;
        }
    }
}
