import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { EffectSystem, EffectPriority } from './EffectSystem';
import { PerformanceMonitor } from './utils/PerformanceMonitor';
import { PerformanceProfiler } from './utils/PerformanceProfiler';
import { SoundManager, SoundPriority } from './SoundManager';
import { SpatialGrid } from './SpatialGrid';
import { DamageTags } from './systems/DamageTypes';

export class CollisionSystem {
    private effects: EffectSystem;
    private enemyGrid: SpatialGrid<Enemy>;

    private gridDirty: boolean = true;
    private enemyLastCells: WeakMap<Enemy, { x: number, y: number }> = new WeakMap();

    constructor(effects: EffectSystem) {
        this.effects = effects;
        // Initialize grid with screen dimensions, 128px cells
        this.enemyGrid = new SpatialGrid<Enemy>(window.innerWidth, window.innerHeight, 128);
    }


    private static aoeBuffer: Enemy[] = [];
    public static explosionQueue: number[] = [];

    public static queueExplosion(x: number, y: number, radius: number, damage: number, sourceId: number) {
        CollisionSystem.explosionQueue.push(x, y, radius, damage, sourceId);
    }

    private processExplosions(activeGrid: SpatialGrid<Enemy>) {
        if (CollisionSystem.explosionQueue.length === 0) return;

        const queue = [...CollisionSystem.explosionQueue];
        CollisionSystem.explosionQueue.length = 0;

        for (let i = 0; i < queue.length; i += 5) {
            const exX = queue[i];
            const exY = queue[i + 1];
            const exRadius = queue[i + 2];
            const exDamage = queue[i + 3];
            const exSourceId = queue[i + 4];

            this.effects.spawn({
                type: 'explosion',
                x: exX,
                y: exY,
                radius: exRadius,
                life: 0.3,
                priority: EffectPriority.HIGH,
                color: 'rgba(255, 100, 0, 0.6)'
            });

            CollisionSystem.aoeBuffer.length = 0;
            const count = activeGrid.queryInRadius(exX, exY, exRadius, CollisionSystem.aoeBuffer);
            const radiusSq = exRadius * exRadius;

            for (let j = 0; j < count; j++) {
                const neighbor = CollisionSystem.aoeBuffer[j];
                if (!neighbor.isAlive()) continue;

                const dx = neighbor.x - exX;
                const dy = neighbor.y - exY;
                if (dx * dx + dy * dy <= radiusSq) {
                    neighbor.takeDamage(exDamage, exSourceId, 0, DamageTags.SPLASH);
                }
            }
        }
    }

    public invalidateGrid() {
        this.gridDirty = true;
    }

    public getValidGrid(enemies: Enemy[]): SpatialGrid<Enemy> {
        // Automatically check if rebuilding is necessary
        let autoDirty = false;

        let aliveCount = 0;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (enemy && enemy.isAlive()) {
                aliveCount++;
                const currentCellX = Math.floor(enemy.x / this.enemyGrid.cellSize);
                const currentCellY = Math.floor(enemy.y / this.enemyGrid.cellSize);

                const lastCell = this.enemyLastCells.get(enemy);
                if (!lastCell || lastCell.x !== currentCellX || lastCell.y !== currentCellY) {
                    autoDirty = true;
                    this.enemyLastCells.set(enemy, { x: currentCellX, y: currentCellY });
                }
            }
        }

        // We also need to know if the total alive enemies changed. 
        // A simple check is comparing grid size to aliveCount.
        if (aliveCount !== this.enemyGrid.size) {
            autoDirty = true;
        }

        if (this.gridDirty || autoDirty) {
            this.prepareGrid(enemies);
            this.gridDirty = false;
        }
        return this.enemyGrid;
    }

    private prepareGrid(enemies: Enemy[]) {
        this.enemyGrid.clear();
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            // Safety check for holes in array
            if (enemy && enemy.isAlive()) {
                this.enemyGrid.register(enemy);
            }
        }
    }

    public update(projectiles: Projectile[], enemies: Enemy[]) {
        const activeGrid = this.getValidGrid(enemies);

        let processLoops = 0;
        while (CollisionSystem.explosionQueue.length > 0 && processLoops < 10) {
            this.processExplosions(activeGrid);
            processLoops++;
        }

        // Check projectile collisions using spatial grid
        for (let p = 0; p < projectiles.length; p++) {
            const proj = projectiles[p];
            if (!proj || !proj.alive) continue;

            // Out of bounds check
            if (proj.x < -50 || proj.x > window.innerWidth + 50 || proj.y < -50 || proj.y > window.innerHeight + 50) {
                proj.alive = false;
                continue;
            }

            // Get only nearby enemies instead of checking all enemies
            const searchRadius = 100; // Reasonable search radius for collision
            const count = activeGrid.queryInRadius(proj.x, proj.y, searchRadius, CollisionSystem.aoeBuffer);

            // PERF: Custom Stress Test Profiler
            PerformanceProfiler.count('pairsChecked', count);

            for (let e = 0; e < count; e++) {
                const enemy = CollisionSystem.aoeBuffer[e];
                // CRITICAL FIX: Safety check for undefined logic
                if (!enemy || !enemy.isAlive()) continue;
                if (proj.hitList.includes(enemy.id)) continue;

                // Squared distance check (faster than Math.hypot)
                const dx = enemy.x - proj.x;
                const dy = enemy.y - proj.y;
                const distSq = dx * dx + dy * dy;
                const hitDist = 20 + proj.radius;
                const hitDistSq = hitDist * hitDist;

                if (distSq < hitDistSq) {
                    this.handleHit(proj, enemy, enemies, activeGrid);

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

    private handleHit(p: Projectile, target: Enemy, allEnemies: Enemy[], activeGrid: SpatialGrid<Enemy>) {
        // Apply damage with projectile reference (for tracking kills)
        let wasSlowed = target.slowDuration > 0;

        target.takeDamage(p.damage, p.sourceTowerId, p.sourceCardId, p.isCrit ? DamageTags.CRIT : DamageTags.NONE);

        // Sound Hit
        SoundManager.play('hit', SoundPriority.LOW);

        // --- ВИЗУАЛ: Искры при попадании (critical hit = more particles) ---
        // DECOUPLED: Visuals are fire-and-forget
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
            this.handleEnemyDeath(target, p, wasSlowed, activeGrid);
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
            // 1. VISUAL
            this.effects.spawn({
                type: 'explosion',
                x: target.x,
                y: target.y,
                radius: splash.splashRadius || splash.radius,
                life: 0.25,
                priority: EffectPriority.HIGH, // Gameplay effect
                color: 'rgba(255, 100, 0, 0.5)',
            });

            // 2. PHYSICS (Decoupled: Instant Area Damage via Grid)
            // PERF: Use local array for splash to prevent recursive static buffer overwrite if enemies die and explode
            const splashMultiplier = splash.splashDamageMultiplier || 0.7;
            const radius = splash.splashRadius || splash.radius || 40;

            CollisionSystem.aoeBuffer.length = 0;
            const count = activeGrid.queryInRadius(target.x, target.y, radius, CollisionSystem.aoeBuffer);
            const radiusSq = radius * radius;

            for (let i = 0; i < count; i++) {
                const neighbor = CollisionSystem.aoeBuffer[i];
                if (neighbor === target || !neighbor.isAlive()) continue;

                const dx = neighbor.x - target.x;
                const dy = neighbor.y - target.y;
                if (dx * dx + dy * dy <= radiusSq) {
                    // Pass primitive source IDs and SPLASH tag instead of raw projectile
                    neighbor.takeDamage(p.damage * splashMultiplier, p.sourceTowerId, p.sourceCardId, DamageTags.SPLASH | (p.isCrit ? DamageTags.CRIT : DamageTags.NONE));
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
            target.applySlow(slow.slowDuration || slow.dur || 1.0, slow.slowPower || slow.power || 0.4, damageBonus);
        }

        // Burn effect (Napalm evolution)
        let burn = null;
        for (let i = 0; i < p.effects.length; i++) {
            if (p.effects[i].type === 'burn') {
                burn = p.effects[i];
                break;
            }
        }
        if (burn) {
            // Power = DPS for burn
            target.applyBurn(burn.burnDuration || 3, burn.burnDps || 5, 3, p.sourceTowerId, p.sourceCardId);
        }
    }

    private handleEnemyDeath(enemy: Enemy, killingProjectile: Projectile, wasSlowed: boolean, activeGrid: SpatialGrid<Enemy>) {
        const deathX = enemy.x;
        const deathY = enemy.y;

        // Sound Death
        SoundManager.play('death', SoundPriority.LOW);

        // Fire Level 3 Explosion logic removed here (now deferred via Enemy.die -> explosionQueue)


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
                    life: 0.3, // Shortened life
                    color: 'rgba(0, 188, 212, 0.5)',
                });

                // Apply slow to nearby enemies - PERF: Using local array
                const chainSlowTargets: Enemy[] = [];
                const count = activeGrid.queryInRadius(deathX, deathY, chainRadius, chainSlowTargets);
                const radiusSq = chainRadius * chainRadius;

                // Find original slow effect properties
                const slowEffect = killingProjectile.effects.find((ef: any) => ef.type === 'slow');

                if (slowEffect) {
                    const damageBonus = slowEffect.damageToSlowed || 1.0;
                    const duration = slowEffect.slowDuration || slowEffect.dur || 1.0;
                    const power = slowEffect.slowPower || slowEffect.power || 0.4;

                    for (let i = 0; i < count; i++) {
                        const neighbor = chainSlowTargets[i];
                        if (!neighbor.isAlive()) continue;

                        const dx = neighbor.x - deathX;
                        const dy = neighbor.y - deathY;
                        if (dx * dx + dy * dy <= radiusSq) {
                            neighbor.applySlow(duration, power, damageBonus);
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
