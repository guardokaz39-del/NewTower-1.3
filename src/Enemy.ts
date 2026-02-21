import { CONFIG, getEnemyType } from './Config';
import { EventBus, Events } from './EventBus';
import { RendererFactory } from './RendererFactory';
import { Assets } from './Assets';
import { Projectile } from './Projectile';
import { EnemyRenderer } from './renderers/EnemyRenderer';

export interface IEnemyConfig {
    // id removed - generated internally
    health: number;
    speed: number;
    armor?: number;
    x?: number;
    y?: number;
    path: { x: number; y: number }[];
}

interface IStatus {
    type: 'slow' | 'burn';
    duration: number;
    power: number;
}

export class Enemy {
    // Global ID counter for session
    public static nextId: number = 0;

    public id: number = 0;
    public typeId: string = 'grunt';

    public currentHealth: number;
    public maxHealth: number;
    public baseSpeed: number;
    public armor: number;
    public reward: number = 5; // Reward for killing this enemy

    public x: number;
    public y: number;

    public path: { x: number; y: number }[];
    public pathIndex: number = 0;
    public finished: boolean = false;

    public statuses: IStatus[] = [];
    public damageModifier: number = 1.0;     // Damage multiplier (e.g., 1.2 = +20% damage)
    public killedByProjectile: Projectile | null = null;   // Track what projectile killed this enemy
    public hitFlashTimer: number = 0;        // Timer for white flash on hit

    public lastFacingLeft: boolean = false; // Persistent facing state
    private static readonly FACING_VX_EPSILON = 0.1;

    // Targeting Support
    public threatPriority: number = 0;       // 0 = Normal, >0 = High Priority (Taunt)

    // === BOSS MECHANICS (Spectral Shift) ===
    public isInvulnerable: boolean = false;
    private shieldTimer: number = 0;

    // Magma King Mechanics
    public spawnThresholds: number[] = []; // HP percentages to trigger spawn (0.75, 0.5, 0.25)

    // Thresholds: [HP Percent, Duration in Seconds]
    private thresholds: { p: number, d: number, used: boolean }[] = [];

    // === PERFORMANCE CACHES (Phase 3a) ===
    public typeConfig: any = null;      // Cached getEnemyType() result
    public moveAngle: number = 0;       // Cached Math.atan2() from move()
    private _moveVector = { x: 0, y: 0 }; // Zero-allocation vector for movement

    // Damage Text Accumulation (Phase 6)
    public lastDamageText: any = null; // Ref to active text effect
    public lastDamageTextTime: number = 0;
    public currentDamageAccumulation: number = 0;

    constructor(config?: IEnemyConfig) {
        // Constructor only allocates memory
        if (config) {
            this.init(config);
        }
    }

    public init(config: IEnemyConfig) {
        // 1. Generate NEW identity
        this.id = ++Enemy.nextId;

        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.baseSpeed = config.speed;
        this.armor = config.armor || 0;

        this.x = config.x || 0;
        this.y = config.y || 0;
        this.path = config.path;
        this.pathIndex = 0;
        this.finished = false;

        this.damageModifier = 1.0;
        this.killedByProjectile = null;
        this.lastFacingLeft = false; // Reset facing

        // Reset specific fields
        this.threatPriority = 0;
        // Arrays are cleared in reset(), but here we ensure they are empty or set specific initial values if needed
        // For pooling safety, reset() should have been called before init() or init should overwrite everything.
        // But since init overwrites primitives, we just need to adhere to standard lifecycle.
    }

    public reset() {
        // 3. Clear arrays without GC (keep capacity)
        this.statuses.length = 0;
        this.hitFlashTimer = 0;
        this.pathIndex = 0;
        this.finished = false;
        this.damageModifier = 1.0;
        this.killedByProjectile = null;
        this.x = -1000; // Move offscreen
        this.y = -1000;
        this.lastFacingLeft = false;

        this.threatPriority = 0;
        this.spawnThresholds.length = 0;
        this.thresholds.length = 0;

        // Reset Boss mechanics
        this.isInvulnerable = false;
        this.shieldTimer = 0;

        // Reset Performance caches
        this.typeConfig = null;
        this.moveAngle = 0;
        this._moveVector.x = 0;
        this._moveVector.y = 0;

        // Reset Damage Text
        this.lastDamageText = null;
        this.lastDamageTextTime = 0;
        this.currentDamageAccumulation = 0;
    }

    public setType(id: string) {
        this.typeId = id;

        // PERF: Cache typeConfig to avoid getEnemyType() calls in render loop
        this.typeConfig = getEnemyType(id.toUpperCase()) || getEnemyType('GRUNT');

        // Initialize Boss Mechanics if this is a boss
        if (id.toLowerCase() === 'boss') {
            this.thresholds = [
                { p: 0.8, d: 3.0, used: false },
                { p: 0.5, d: 5.0, used: false },
                { p: 0.2, d: 8.0, used: false }
            ];
        } else if (id === 'magma_king') {
            this.spawnThresholds = [0.75, 0.5, 0.25];
        } else if (id === 'magma_statue') {
            this.threatPriority = 999; // Maximum priority
        } else {
            // Already cleared in reset, but strictly set here if strictly needed
            // this.thresholds.length = 0; 
            // this.spawnThresholds.length = 0;
        }
    }

    public takeDamage(amount: number, projectile?: Projectile): void {
        if (this.isInvulnerable) {
            // Visual Effect "BLOCKED"
            EventBus.getInstance().emit(Events.ENEMY_IMMUNE, { x: this.x, y: this.y });
            return;
        }

        const prevHpPercent = this.currentHealth / this.maxHealth;

        // Apply damage modifier (from slow effects, etc.)
        const modifiedAmount = amount * this.damageModifier;
        const actualDamage = Math.max(1, modifiedAmount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) this.currentHealth = 0;

        const currentHpPercent = this.currentHealth / this.maxHealth;

        // Check Thresholds (Invulnerable Shield Boss)
        for (const t of this.thresholds) {
            if (!t.used && currentHpPercent <= t.p && prevHpPercent > t.p) {
                this.activateShield(t.d);
                t.used = true;
                break; // Activate one threshold at a time
            }
        }

        // Check Spawn Thresholds (Magma King)
        for (let i = this.spawnThresholds.length - 1; i >= 0; i--) {
            const threshold = this.spawnThresholds[i];
            if (currentHpPercent <= threshold && prevHpPercent > threshold) {
                // Trigger Split Event
                EventBus.getInstance().emit('ENEMY_SPLIT', { enemy: this, threshold });
                this.spawnThresholds.splice(i, 1); // Remove used threshold
            }
        }

        // Visual Feedback: Hit Flash
        this.hitFlashTimer = 0.08; // ~5 frames at 60fps

        // Track what killed this enemy
        if (!this.isAlive()) {
            if (projectile) {
                this.killedByProjectile = projectile;
            }

            // Check for Death Spawns (Flesh Colossus mechanic)
            const typeConfig = getEnemyType(this.typeId);
            if (typeConfig?.deathSpawns && typeConfig.deathSpawns.length > 0) {
                EventBus.getInstance().emit('ENEMY_DEATH_SPAWN', {
                    enemy: this,
                    spawns: typeConfig.deathSpawns
                });
            }

            EventBus.getInstance().emit(Events.ENEMY_DIED, { enemy: this });
        }
    }

    private activateShield(duration: number) {
        this.isInvulnerable = true;
        this.shieldTimer = duration;
        // Float text handled by event listener or renderer (if we want persistency)
        // But for "IMMUNE!" popup, we can emit event
        EventBus.getInstance().emit(Events.ENEMY_IMMUNE, { x: this.x, y: this.y - 40 });
    }

    // ИСПРАВЛЕНИЕ: метод стал public
    public move(dt: number, flowField: any): void { // Using 'any' briefly to avoid circular deps if types not ready, but better import FlowField interface
        let speedMod = 1;
        let slow = null;
        for (let i = 0; i < this.statuses.length; i++) {
            if (this.statuses[i].type === 'slow') {
                slow = this.statuses[i];
                break;
            }
        }
        if (slow) speedMod -= slow.power;

        const currentSpeed = Math.max(0, this.baseSpeed * speedMod * dt); // Apply delta time

        // Flow Field Movement
        // Get vector from the field (Zero Allocation)
        flowField.getVector(this.x, this.y, this._moveVector);
        const vector = this._moveVector;

        if (vector.x === 0 && vector.y === 0) {
            // Reached target or stuck
            // Check distance to center of target tile
            const targetTile = flowField.target;
            if (targetTile) {
                const tx = targetTile.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const ty = targetTile.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const dx = tx - this.x;
                const dy = ty - this.y;
                const dist = Math.hypot(dx, dy);

                // If close enough, finish
                if (dist < 5) {
                    this.finished = true;
                    return;
                }

                // Otherwise, manually steer towards center to complete the path
                if (dist > 0.001) {
                    vector.x = dx / dist;
                    vector.y = dy / dist;
                }
            } else {
                return;
            }
        }

        this.x += vector.x * currentSpeed;
        this.y += vector.y * currentSpeed;

        // Calculate angle for visual rotation
        // Only update if moving significant amount to avoid jitter
        if (Math.abs(vector.x) > 0.01 || Math.abs(vector.y) > 0.01) {
            this.moveAngle = Math.atan2(vector.y, vector.x);

            // Update Facing State (Stabilized)
            // Use a threshold to prevent flipping when moving vertically (jitter)
            if (Math.abs(vector.x) > Enemy.FACING_VX_EPSILON) {
                this.lastFacingLeft = vector.x < 0;
            }
        }
    }

    public isAlive(): boolean {
        return this.currentHealth > 0;
    }

    public getHealthPercent(): number {
        return this.currentHealth / this.maxHealth;
    }

    public applyStatus(type: 'slow' | 'burn', duration: number, power: number, damageBonus?: number) {
        let existing = null;
        for (let i = 0; i < this.statuses.length; i++) {
            if (this.statuses[i].type === type) {
                existing = this.statuses[i];
                break;
            }
        }

        if (existing) {
            // Refresh duration
            existing.duration = Math.max(existing.duration, duration);

            if (type === 'slow') {
                // For slow, keep the strongest effect (highest power/slow amount)
                existing.power = Math.max(existing.power, power);
                // Apply highest damage modifier
                if (damageBonus) {
                    this.damageModifier = Math.max(this.damageModifier, damageBonus);
                }
            } else if (type === 'burn') {
                // For burn, keep the strongest DoT
                existing.power = Math.max(existing.power, power);
            }
        } else {
            this.statuses.push({ type, duration, power });
            if (type === 'slow' && damageBonus) {
                this.damageModifier = Math.max(this.damageModifier, damageBonus);
            }
        }
    }

    public update(dt: number): void {
        // Update status durations - in-place removal (no new array)
        for (let i = this.statuses.length - 1; i >= 0; i--) {
            this.statuses[i].duration -= dt;
            if (this.statuses[i].duration <= 0) {
                // Swap with last and pop
                this.statuses[i] = this.statuses[this.statuses.length - 1];
                this.statuses.pop();
            }
        }

        // Reset damage modifier if no slow status
        let hasSlow = false;
        for (let i = 0; i < this.statuses.length; i++) {
            if (this.statuses[i].type === 'slow') {
                hasSlow = true;
                break;
            }
        }
        if (!hasSlow) {
            this.damageModifier = 1.0;
        }

        // Burn damage tick
        for (let i = 0; i < this.statuses.length; i++) {
            if (this.statuses[i].type === 'burn') {
                // power = burnDps (damage per second)
                // Direct health subtraction (bypasses armor — burn is TRUE damage)
                this.currentHealth -= this.statuses[i].power * dt;

                // Check death from DOT
                if (this.currentHealth <= 0) {
                    this.currentHealth = 0;

                    // Emit death events — same as takeDamage() death path
                    // Without this, deathSpawns (Flesh Colossus), sapper_rat explosion,
                    // and ENEMY_DIED listeners won't fire for burn kills
                    const typeConfig = getEnemyType(this.typeId);
                    if (typeConfig && typeConfig.deathSpawns && typeConfig.deathSpawns.length > 0) {
                        EventBus.getInstance().emit('ENEMY_DEATH_SPAWN', {
                            enemy: this,
                            spawns: typeConfig.deathSpawns
                        });
                    }
                    EventBus.getInstance().emit(Events.ENEMY_DIED, { enemy: this });

                    // Critical hit fix: purge burn status so we don't emit death twice if update is called again
                    this.statuses.splice(i, 1);
                }
                break; // One burn source (last applied overwrites)
            }
        }

        // Update flash timer
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

        // Update Shield
        if (this.isInvulnerable) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.isInvulnerable = false;
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawEnemy(ctx, this);
    }

    public drawSprite(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawEnemySprite(ctx, this);
    }

    public drawUI(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawEnemyUI(ctx, this);
    }
}

