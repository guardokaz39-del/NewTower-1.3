import { CONFIG, getEnemyType } from './Config';
import { EventBus, Events } from './EventBus';
import { RendererFactory } from './RendererFactory';
import { Assets } from './Assets';
import { EnemyRenderer } from './renderers/EnemyRenderer';
import { DamageTags } from './systems/DamageTypes';
import { CollisionSystem } from './CollisionSystem';
import { GlobalEnemyDeathEvent, GlobalEnemyDeathSpawnEvent, Events as GlobalEvents } from './EventBus';

export interface IEnemyConfig {
    // id removed - generated internally
    health: number;
    speed: number;
    armor?: number;
    x?: number;
    y?: number;
    path: { x: number; y: number }[];
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

    public slowDuration: number = 0;
    public slowPower: number = 0;
    public damageModifier: number = 1.0;     // Damage multiplier (e.g., 1.2 = +20% damage)
    public hitFlashTimer: number = 0;        // Timer for white flash on hit

    // Damage Pipeline Slots
    public lastDamageTags: number = 0;
    public lastHitTowerId: number = -1;
    public lastHitCardId: number = 0;

    // Burn Status Slots
    public burnStacks: number = 0;
    public burnDpsPerStack: number = 0; // Сохраняем DPS одного стака
    public burnDuration: number = 0;
    public burnPrimaryApplierId: number = -1; // Чей credit при смерти от ДОТ
    public burnPrimaryCardId: number = 0;

    // Explode On Death Slots (Max Wins Policy)
    public onDeathExplodeRadius: number = 0;
    public onDeathExplodeDamage: number = 0;
    public onDeathExplodeSourceId: number = -1;

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
        this.lastFacingLeft = false; // Reset facing

        this.threatPriority = 0;
        // Arrays are cleared in reset(), but here we ensure they are empty or set specific initial values if needed
        // For pooling safety, reset() should have been called before init() or init should overwrite everything.
        // But since init overwrites primitives, we just need to adhere to standard lifecycle.
    }

    public reset() {
        this.slowDuration = 0;
        this.slowPower = 0;
        this.burnStacks = 0;
        this.burnDpsPerStack = 0;
        this.burnDuration = 0;
        this.burnPrimaryApplierId = -1;
        this.burnPrimaryCardId = 0;
        this.onDeathExplodeRadius = 0;
        this.onDeathExplodeDamage = 0;
        this.onDeathExplodeSourceId = -1;

        this.hitFlashTimer = 0;
        this.pathIndex = 0;
        this.finished = false;
        this.damageModifier = 1.0;
        this.lastDamageTags = 0;
        this.lastHitTowerId = -1;
        this.lastHitCardId = 0;
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

    public takeDamage(amount: number, sourceTowerId: number = -1, sourceCardId: number = 0, tags: number = 0): void {
        if (!this.isAlive()) return;

        if (this.isInvulnerable) {
            // Visual Effect "BLOCKED"
            EventBus.getInstance().emit(Events.ENEMY_IMMUNE, { x: this.x, y: this.y });
            return;
        }

        const prevHpPercent = this.currentHealth / this.maxHealth;

        // 1. Modifiers & True Damage
        let finalAmount = amount;
        if (!(tags & DamageTags.TRUE_DAMAGE)) {
            finalAmount *= this.damageModifier;
            // Armor mitigates physical damage, but ensures at least 1 damage
            if (finalAmount > 0) {
                finalAmount = Math.max(1, finalAmount - this.armor);
            } else {
                finalAmount = 0;
            }
        }

        // 2. Commit & Context Update
        this.currentHealth -= finalAmount;
        if (this.currentHealth < 0) this.currentHealth = 0;

        this.lastDamageTags = tags;

        // Обновляем Hit Track только для не-DOT урона
        if (!(tags & DamageTags.DOT)) {
            this.lastHitTowerId = sourceTowerId;
            this.lastHitCardId = sourceCardId;
        }

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

        // 3. Death Pipeline
        if (this.currentHealth <= 0) {
            this.die(); // synchronous handling
        }
    }

    private die() {
        // Track what killed this enemy
        let killingTowerId = this.lastHitTowerId;
        let killingCardId = this.lastHitCardId;

        if (this.lastDamageTags & DamageTags.DOT) {
            killingTowerId = this.burnPrimaryApplierId;
            killingCardId = this.burnPrimaryCardId;
        }

        // 4. Queue OnDeath Explosions (Защита от рекурсии)
        if (this.onDeathExplodeRadius > 0) {
            CollisionSystem.queueExplosion(this.x, this.y, this.onDeathExplodeRadius, this.onDeathExplodeDamage, this.onDeathExplodeSourceId);
        }

        // Check for Death Spawns (Flesh Colossus mechanic)
        const typeConfig = getEnemyType(this.typeId);
        if (typeConfig?.deathSpawns && typeConfig.deathSpawns.length > 0) {
            GlobalEnemyDeathSpawnEvent.enemy = this;
            GlobalEnemyDeathSpawnEvent.spawns = typeConfig.deathSpawns;
            EventBus.getInstance().emit('ENEMY_DEATH_SPAWN', GlobalEnemyDeathSpawnEvent);
        }

        EventBus.getInstance().emit(Events.ENEMY_DIED, { enemy: this, towerId: killingTowerId, cardId: killingCardId });
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
        // Apply slow statuses
        if (this.slowDuration > 0) {
            speedMod *= (1 - this.slowPower);
        }

        // BERSERKER ENRAGE MECHANIC
        // Double movement speed when health drops below 50%
        if (this.typeId === 'skeleton_berserker' && (this.currentHealth / this.maxHealth) < 0.5) {
            speedMod *= 2.0;
        }

        const currentSpeed = Math.max(0, this.baseSpeed * speedMod * dt);

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

    public applySlow(duration: number, power: number, damageBonus?: number) {
        if (this.slowDuration > 0) {
            this.slowDuration = Math.max(this.slowDuration, duration);
            this.slowPower = Math.max(this.slowPower, power);
            if (damageBonus) {
                this.damageModifier = Math.max(this.damageModifier, damageBonus);
            }
        } else {
            this.slowDuration = duration;
            this.slowPower = power;
            if (damageBonus) {
                this.damageModifier = Math.max(this.damageModifier, damageBonus);
            }
        }
    }

    public applyBurn(duration: number, dpsPerStack: number, stackCap: number, towerId: number, cardId: number) {
        if (this.burnStacks === 0) {
            // Первый поджигатель (Primary Applier) получает Credit
            this.burnPrimaryApplierId = towerId;
            this.burnPrimaryCardId = cardId;
            this.burnDpsPerStack = dpsPerStack;
        }

        // Duration refresh
        this.burnDuration = Math.max(this.burnDuration, duration);
        // Stacks increase
        this.burnStacks = Math.min(stackCap, this.burnStacks + 1);
    }

    public setOnDeathExplode(radius: number, damage: number, sourceId: number) {
        if (radius > this.onDeathExplodeRadius) { // Max Radius Wins
            this.onDeathExplodeRadius = radius;
            this.onDeathExplodeDamage = damage;
            this.onDeathExplodeSourceId = sourceId;
        }
    }

    public update(dt: number): void {
        // Update statuses
        if (this.slowDuration > 0) {
            this.slowDuration -= dt;
            if (this.slowDuration <= 0) {
                this.slowDuration = 0;
                this.damageModifier = 1.0;
            }
        }

        if (this.burnDuration > 0 && this.burnStacks > 0) {
            this.burnDuration -= dt;

            // Burn damage tick: DPS * dt * stacks
            const tickDamage = this.burnDpsPerStack * this.burnStacks * dt;

            // takeDamage with TRUE_DAMAGE | DOT
            // Burn has its own damage pipeline resolution now via internal calls, 
            // but we can just use takeDamage:
            this.takeDamage(tickDamage, this.burnPrimaryApplierId, this.burnPrimaryCardId, DamageTags.TRUE_DAMAGE | DamageTags.DOT);

            if (this.burnDuration <= 0) {
                this.burnDuration = 0;
                this.burnStacks = 0;
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

