import { CONFIG } from './Config';
import { RendererFactory } from './RendererFactory';
import { ICard } from './CardSystem';
import { Enemy } from './Enemy';
import { Projectile, IProjectileStats } from './Projectile';
import { ObjectPool, lerpAngle } from './Utils';
import { EffectSystem } from './EffectSystem';
import { Assets } from './Assets';
import { VISUALS } from './VisualConfig';
import { getCardUpgrade, getMultishotConfig, ICardEffect } from './cards';
import { mergeCardsWithStacking } from './CardStackingSystem';
import { TowerRenderer } from './renderers/TowerRenderer';
import { TargetingSystem } from './systems/TargetingSystem';
import { SpatialGrid } from './SpatialGrid';
import { FlowField } from './FlowField';

export interface SlotState {
    id: number;
    isLocked: boolean;
    card: ICard | null;
}

export class Tower {
    private static nextId: number = 1;
    public readonly id: number;

    public col: number;
    public row: number;
    public x: number;
    public y: number;

    // Slot System (Replaces simple cards array)
    public slots: SlotState[] = [];
    public selectedSlotId: number = -1; // -1: None, 0-2: Slot ID selected in UI

    // Cache State for Getter
    private _activeCardsCache: ICard[] = [];

    // Safe, Zero-Allocation, Auto-Healing getter
    public get cards(): readonly ICard[] {
        let changed = false;
        let activeCount = 0;

        // Fast O(1) memory validation (max 3 slots)
        for (let i = 0; i < this.slots.length; i++) {
            const s = this.slots[i];
            if (!s.isLocked && s.card) {
                if (this._activeCardsCache[activeCount] !== s.card) {
                    changed = true;
                }
                activeCount++;
            }
        }

        // In-place rebuild only if mismatch detected
        if (changed || activeCount !== this._activeCardsCache.length) {
            this._activeCardsCache.length = 0; // Clear without allocation
            for (let i = 0; i < this.slots.length; i++) {
                if (!this.slots[i].isLocked && this.slots[i].card) {
                    this._activeCardsCache.push(this.slots[i].card);
                }
            }
        }

        // Apply read-only freeze in Development
        if (process.env.NODE_ENV === 'development') {
            return Object.freeze([...this._activeCardsCache]);
        }
        return this._activeCardsCache;
    }

    // Legacy setter (optional, but safer to prevent direct assignment bugs)
    public set cards(v: ICard[]) {
        // Clear slots
        this.slots.forEach(s => s.card = null);
        // Try fill
        v.forEach(c => this.addCard(c));
    }
    public cooldown: number = 0;
    public angle: number = 0;
    public turnSpeed: number = 10.0; // Default turn speed (radians/sec)
    public firingArc: number = 0.5; // Firing arc in radians (0.5 ~= 28 degrees)
    public targetingMode: string = 'first'; // Targeting priority: first, closest, strongest, weakest, last

    // Targeting State (Optimized)
    public target: Enemy | null = null;
    public searchTimer: number = Math.random() * 0.2; // Random offset to spread CPU load
    public currentRangeSq: number = 0;
    public statsVersion: number = 0;

    public isBuilding: boolean = false;
    public buildProgress: number = 0;
    public maxBuildProgress: number = CONFIG.TOWER.BUILD_TIME;

    public costSpent: number = 0;

    // Cache State
    private statsDirty: boolean = true;
    private cachedStats: (IProjectileStats & { range: number; cd: number; projCount: number; spread: number; projectileType: string; attackSpeedMultiplier: number }) | null = null;
    private _frameStats: any = null;

    // Spinup state (for Minigun cards)
    public spinupTime: number = 0;        // Seconds spent firing continuously
    public maxHeat: number = 5;             // Max seconds before overheat (default 5s)
    public isOverheated: boolean = false;   // Whether tower is overheated
    public overheatCooldown: number = 0;    // Seconds remaining in overheat lockout
    public totalOverheatDuration: number = 0; // Total duration of the current overheat lockout (for UI)

    // Visual state (Phase 3)
    public recoilTimer: number = 0;        // Recoil animation timer (seconds)
    public recoilIntensity: number = 0;     // Recoil strength
    public barrelRotation: number = 0;      // Rotation angle of the barrel (Minigun)
    public barrelRecoil: number = 0;        // Recoil offset of the barrel (px)
    public heatLevel: number = 0;          // Heat level 0-1 (Minigun visual)
    public chargeProgress: number = 0;      // Charge progress 0-1 (Sniper visual)

    // Generic container for visual state (Phase 2)
    public visualState: Record<string, any> = {};

    constructor(c: number, r: number) {
        this.id = Tower.nextId++;
        this.col = c;
        this.row = r;
        this.x = c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.costSpent = CONFIG.ECONOMY.TOWER_COST;

        // Initialize Slots
        // Slot 0: Open
        // Slot 1: Locked
        // Slot 2: Locked
        this.slots = [
            { id: 0, isLocked: false, card: null },
            { id: 1, isLocked: true, card: null },
            { id: 2, isLocked: true, card: null }
        ];
    }

    public static getPreviewStats(cards: ICard[]): any {
        const dummy = new Tower(0, 0);
        dummy.cards = cards;
        return dummy.getStats();
    }

    // Force cache update
    public invalidateCache() {
        this.statsDirty = true;
        this.statsVersion++;
    }

    getStats(): IProjectileStats & { range: number; cd: number; projCount: number; spread: number; projectileType: string; attackSpeedMultiplier: number } {
        // === PERF: Two-tier caching ===
        // Tier 1 (Dirty Flag): Full recalculation only when cards change
        // Tier 2 (Spinup Overlay): Lightweight recalc of spinup-dependent values every frame

        if (this.statsDirty || !this.cachedStats) {
            // === FULL RECALCULATION (only on card add/remove) ===
            let range = CONFIG.TOWER.BASE_RANGE;
            let damage = CONFIG.TOWER.BASE_DMG;
            let attackSpeed = CONFIG.TOWER.BASE_CD;
            let speed = 480; // 8 * 60
            let color = VISUALS.PROJECTILES.STANDARD;
            let critChance = 0;
            let pierce = 0;
            let projectileType = 'standard';

            // PERF: mergeCardsWithStacking is expensive — only run when dirty
            const { modifiers: mergedMods, effects: allEffects } = mergeCardsWithStacking(this.cards);

            const baseDamage = CONFIG.TOWER.BASE_DMG;
            const flatDamageBonuses = mergedMods.damage || 0;

            if (mergedMods.damageMultiplier !== undefined) {
                damage = (baseDamage + flatDamageBonuses) * mergedMods.damageMultiplier;
            } else {
                damage = baseDamage + flatDamageBonuses;
            }

            range += mergedMods.range || 0;
            range *= mergedMods.rangeMultiplier || 1.0;
            critChance = mergedMods.critChance || 0;

            let projCount = 1;
            let damageMultiplier = 1.0;
            let spread = 0;

            // PERF: Manual scan instead of .filter() (Rule 4: no .filter() in hot path)
            let bestMultiLevel = -1;
            let bestMultiCard: ICard | null = null;
            for (let i = 0; i < this.cards.length; i++) {
                if (this.cards[i].type.id === 'multi' && this.cards[i].level > bestMultiLevel) {
                    bestMultiLevel = this.cards[i].level;
                    bestMultiCard = this.cards[i];
                }
            }

            const mainCard = this.cards[0];
            if (mainCard) {
                const upgrade = getCardUpgrade(mainCard.type.id, mainCard.level, mainCard.evolutionPath);
                if (upgrade?.visualOverrides) {
                    projectileType = upgrade.visualOverrides.projectileType || 'standard';
                    color = upgrade.visualOverrides.projectileColor || VISUALS.PROJECTILES.STANDARD;
                    speed = upgrade.visualOverrides.projectileSpeed || 480;
                } else if (mainCard.type.id === 'multi') {
                    projectileType = 'split';
                    color = VISUALS.PROJECTILES.SPLIT;
                }
            }

            if (bestMultiCard) {
                const multiConfig = getMultishotConfig(bestMultiCard.level, bestMultiCard.evolutionPath);
                projCount = multiConfig.projectileCount;
                damageMultiplier = multiConfig.damageMultiplier;
                spread = multiConfig.spread;
            }

            damage *= damageMultiplier;

            // PERF: Manual scan instead of .find() (no closure allocation)
            let pierceEffect = null;
            let spinupEffect = null;
            for (let i = 0; i < allEffects.length; i++) {
                if (allEffects[i].type === 'pierce') pierceEffect = allEffects[i];
                else if (allEffects[i].type === 'spinup') spinupEffect = allEffects[i];
            }
            if (pierceEffect) {
                pierce = pierceEffect.pierceCount || 0;
            }

            const baseSpeedMult = mergedMods.attackSpeedMultiplier || 1.0;

            if (mergedMods.targetingMode) {
                this.targetingMode = mergedMods.targetingMode;
            }

            this.cachedStats = {
                range: Math.round(range),
                dmg: damage,
                cd: attackSpeed,
                speed,
                color,
                effects: allEffects,
                pierce,
                projCount,
                spread,
                critChance,
                projectileType,
                attackSpeedMultiplier: baseSpeedMult,
                // Cache spinup inputs for Tier 2 overlay
                _baseDamage: damage,
                _baseCrit: critChance,
                _baseCd: attackSpeed,
                _baseSpeedMult: baseSpeedMult,
                _spinupEffect: spinupEffect,
            } as any;

            this.currentRangeSq = range * range;
            this._frameStats = { ...this.cachedStats };

            this.statsDirty = false;
        }

        // === TIER 2: Lightweight spinup overlay (runs every frame for Minigun) ===
        const frameStats = this._frameStats;
        const se = (this.cachedStats as any)._spinupEffect;

        if (se && this.spinupTime > 0) {
            const spinupSeconds = this.spinupTime;
            let bonusDamage = 0;
            let bonusCrit = 0;
            let spinupSpeedBonus = 0;

            // Damage bonus
            if (se.spinupSteps) {
                for (const step of se.spinupSteps) {
                    if (spinupSeconds >= step.threshold) {
                        bonusDamage = step.damage;
                    } else break;
                }
            } else if (se.spinupDamagePerSecond) {
                bonusDamage = se.spinupDamagePerSecond * spinupSeconds;
            }

            // Crit bonus
            if (se.spinupCritPerSecond) {
                bonusCrit = se.spinupCritPerSecond * spinupSeconds;
            }

            // Speed bonus
            if (se.spinupSpeedBonus) {
                const maxSpinup = se.maxSpinupSeconds || 5;
                const ratio = Math.min(1, spinupSeconds / maxSpinup);
                spinupSpeedBonus = se.spinupSpeedBonus * ratio;
            }

            // Apply overlays (mutate frameStats — it's our own object)
            frameStats.dmg = (this.cachedStats as any)._baseDamage + bonusDamage;
            frameStats.critChance = (this.cachedStats as any)._baseCrit + bonusCrit;
            frameStats.cd = (this.cachedStats as any)._baseCd / ((this.cachedStats as any)._baseSpeedMult + spinupSpeedBonus);
        } else if (se) {
            // No spinup active — restore base values
            frameStats.dmg = (this.cachedStats as any)._baseDamage;
            frameStats.critChance = (this.cachedStats as any)._baseCrit;
            frameStats.cd = (this.cachedStats as any)._baseCd / (this.cachedStats as any)._baseSpeedMult;
        }

        // Apply Math Bounds (Safety Limits)
        frameStats.dmg = Math.max(1.0, frameStats.dmg);
        frameStats.cd = Math.max(0.05, Math.min(10.0, frameStats.cd));

        return frameStats as Readonly<IProjectileStats & { range: number; cd: number; projCount: number; spread: number; projectileType: string; attackSpeedMultiplier: number }>;
    }

    addCard(c: ICard): boolean {
        // Find first empty, unlocked slot
        const emptySlot = this.slots.find(s => !s.isLocked && s.card === null);
        if (emptySlot) {
            emptySlot.card = c;
            this.invalidateCache();
            this.updateTowerStats(); // Recalculate turn speed etc
            return true;
        }
        return false;
    }

    private updateTowerStats() {
        // Determine Turn Speed based on Main Card (Slot 0)
        // Default: 10.0
        this.turnSpeed = 10.0;
        this.firingArc = 0.5;

        const mainCard = this.slots[0]?.card;
        if (mainCard) {
            switch (mainCard.type.id) {
                case 'sniper':
                    this.turnSpeed = 5.0; // Slow, heavy
                    this.firingArc = 0.15; // Requires precise aim
                    break;
                case 'minigun':
                    this.turnSpeed = 15.0; // Fast, light
                    this.firingArc = 0.6; // Spray and pray
                    break;
                case 'ice':
                    this.turnSpeed = 8.0;
                    this.firingArc = 0.4;
                    break;
                case 'fire':
                    this.turnSpeed = 6.0;
                    this.firingArc = 0.4;
                    break;
                default:
                    this.turnSpeed = 10.0;
                    this.firingArc = 0.5;
                    break;
            }
        }
    }

    removeCard(index: number): ICard | null {
        // In legacy system, index was simple array index.
        // In slot system, it corresponds to the equipped cards list?
        // OR does it correspond to slot ID?
        // For UI drag-out, we usually know the specific card or slot.

        // Strategy: "index" here is treated as an index into the `this.cards` array (legacy behavior)
        // to keep existing UI compatible if it loops through cards.
        // HOWEVER, for the new Menu, we will call `removeCardFromSlot` directly.

        // Legacy fallback: find the Nth active card
        const activeSlots = this.slots.filter(s => !s.isLocked && s.card !== null);
        if (index >= 0 && index < activeSlots.length) {
            const card = activeSlots[index].card;
            activeSlots[index].card = null;
            this.invalidateCache();
            this.updateTowerStats();
            return card;
        }
        return null;
    }

    public removeCardFromSlot(slotId: number): ICard | null {
        const slot = this.slots.find(s => s.id === slotId);
        if (slot && slot.card) {
            const c = slot.card;
            slot.card = null;
            this.invalidateCache();
            this.updateTowerStats();
            return c;
        }
        return null;
    }

    public unlockSlot(slotId: number): boolean {
        const slot = this.slots.find(s => s.id === slotId);
        if (slot && slot.isLocked) {
            slot.isLocked = false;
            this.invalidateCache();
            return true;
        }
        return false;
    }

    updateBuilding(effects: EffectSystem, dt: number) {
        if (this.isBuilding) {
            const prevProgress = this.buildProgress;
            this.buildProgress += dt;

            // Spawn dust particles during construction deterministically (~ every 0.16s)
            if (Math.floor(this.buildProgress / 0.16) > Math.floor(prevProgress / 0.16)) {
                effects.spawnParticle(
                    'particle',
                    this.x + (Math.random() - 0.5) * 30, // Still random pos, but deterministic timing
                    this.y + 15,
                    (Math.random() - 0.5) * 120, // vx
                    -Math.random() * 120,        // vy
                    0.3 + Math.random() * 0.15,  // life
                    2 + Math.random() * 2,       // radius
                    '#a69060'                    // color
                );
            }

            if (this.buildProgress >= this.maxBuildProgress) {
                this.isBuilding = false;

                // Completion burst - dust cloud
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    effects.spawnParticle(
                        'particle',
                        this.x,
                        this.y,
                        Math.cos(angle) * 180, // vx: 3 px/frame -> 180 px/sec
                        Math.sin(angle) * 180 - 60, // vy: gravity effect approximately
                        0.4 + Math.random() * 0.15, // life
                        3 + Math.random() * 2, // radius
                        '#c0a060' // color
                    );
                }

                // Flash effect
                effects.spawnExplosion(this.x, this.y, 25, 0.25, '#ffd700');
            }
        }
    }

    /**
     * Optimized Tower Update
     * Handles Lazy Targeting and State Updates
     */
    public update(dt: number, grid: SpatialGrid<Enemy>, flowField: FlowField) {
        // 1. Update Cooldowns
        if (this.cooldown > 0) this.cooldown -= dt;

        // --- TARGETING (Low Frequency) ---
        // Only verify target once in a while to save CPU
        this.searchTimer -= dt;

        // Check conditions to re-target:
        // 1. Timer expired
        // 2. Current target is dead/invalid (immediate re-target attempt allowed)
        // 3. We are idle and have no target (immediate search)

        let needsSearch = this.searchTimer <= 0;

        // Instant check if target became invalid
        if (this.target && !this.target.isAlive()) {
            this.target = null;
            needsSearch = true; // Search immediately
        }

        if (needsSearch) {
            if (this.target) {
                // Remove redundant check here since we now do it every frame below
            }

            // If we need a new target (either dropped, or just periodic check for better one)
            // We only check for BETTER target if we are ready to fire (cooldown <= 0) 
            // OR if we have no target.
            // Switching targets while aiming (cooldown > 0) is bad for "charged" towers, 
            // but generally we want to stick to target until it dies or leaves range.

            // The user logic suggests we should search periodically.
            // TargetingSystem now handles "Hysteresis" internally (stickiness).
            // So we can safely call findTarget() and it will prefer current target.

            const newTarget = TargetingSystem.findTarget(this, grid, flowField);

            // Only update if changed (TargetingSystem handles the bias)
            if (newTarget !== this.target) {
                this.target = newTarget;
            }

            // Reset Timer: 5-6 times per second (approx 0.15s - 0.25s)
            this.searchTimer = 0.15 + Math.random() * 0.1;
        }

        // --- TRACKING (High Frequency: Every Frame) ---
        if (this.target && this.target.isAlive()) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distSq = dx * dx + dy * dy;

            // Continual Range Guard (Fixes Zombie Pool Ref bug safely)
            if (this.currentRangeSq === 0) {
                this.getStats(); // Hydrate caches
            }

            if (distSq > this.currentRangeSq) {
                this.target = null; // Target walked or respawned out of bounds
            } else {
                const targetAngle = Math.atan2(dy, dx);
                // Smooth Interpolation
                this.angle = lerpAngle(this.angle, targetAngle, dt * this.turnSpeed);
            }
        }
    }

    public getRange(): number {
        // Fast path: use cached stats if available? 
        // For now, re-calculate stats is expense but acceptable if not every frame.
        // Optimization: In real implementation, cache 'stats' object when cards change.
        return this.getStats().range;
    }

    draw(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawTower(ctx, this);
    }

    drawSprite(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawTowerSprite(ctx, this);
    }

    drawUI(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawTowerUI(ctx, this);
    }
}
