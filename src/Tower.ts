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
    public col: number;
    public row: number;
    public x: number;
    public y: number;

    // Slot System (Replaces simple cards array)
    public slots: SlotState[] = [];
    public selectedSlotId: number = -1; // -1: None, 0-2: Slot ID selected in UI

    // Backward compatibility getter: Returns all equipped cards
    public get cards(): ICard[] {
        return this.slots
            .filter(s => !s.isLocked && s.card !== null)
            .map(s => s.card!);
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
    public rangeSquared: number = 0;

    public isBuilding: boolean = false;
    public buildProgress: number = 0;
    public maxBuildProgress: number = CONFIG.TOWER.BUILD_TIME;

    public costSpent: number = 0;

    // Cache State
    private statsDirty: boolean = true;
    private cachedStats: (IProjectileStats & { range: number; cd: number; projCount: number; spread: number; projectileType: string; attackSpeedMultiplier: number }) | null = null;
    // public rangeSquared: number = 0; // Removed duplicate declaration

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
        this.rangeSquared = 0; // Force range recalc
    }

    getStats(): IProjectileStats & { range: number; cd: number; projCount: number; spread: number; projectileType: string; attackSpeedMultiplier: number } {
        if (!this.statsDirty && this.cachedStats) {
            return this.cachedStats;
        }

        // Start with base stats
        let range = CONFIG.TOWER.BASE_RANGE;
        let damage = CONFIG.TOWER.BASE_DMG;
        let attackSpeed = CONFIG.TOWER.BASE_CD;
        let speed = 480; // 8 * 60
        let color = VISUALS.PROJECTILES.STANDARD;
        let critChance = 0;
        let pierce = 0;
        let projectileType = 'standard';

        // Use new card stacking system
        const { modifiers: mergedMods, effects: allEffects } = mergeCardsWithStacking(this.cards);

        // Calculate damage with proper order:
        // 1. Collect base damage and flat bonuses
        const baseDamage = CONFIG.TOWER.BASE_DMG;
        const flatDamageBonuses = mergedMods.damage || 0;

        // 2. Apply damageMultiplier if present (Minigun)
        //    This affects both base and bonuses for better balance
        if (mergedMods.damageMultiplier !== undefined) {
            damage = (baseDamage + flatDamageBonuses) * mergedMods.damageMultiplier;
        } else {
            damage = baseDamage + flatDamageBonuses;
        }

        // Apply range modifiers
        range += mergedMods.range || 0;
        range *= mergedMods.rangeMultiplier || 1.0;

        // Apply attack speed
        attackSpeed = attackSpeed / (mergedMods.attackSpeedMultiplier || 1.0);

        // Apply crit chance
        critChance = mergedMods.critChance || 0;

        // Handle multishot cards
        let projCount = 1;
        let damageMultiplier = 1.0;
        let spread = 0;
        const multiCards = this.cards.filter((c) => c.type.id === 'multi');

        // Get visual overrides from first card (data-driven approach)
        const mainCard = this.cards[0];
        if (mainCard) {
            const upgrade = getCardUpgrade(mainCard.type.id, mainCard.level, mainCard.evolutionPath);
            if (upgrade?.visualOverrides) {
                projectileType = upgrade.visualOverrides.projectileType || 'standard';
                color = upgrade.visualOverrides.projectileColor || VISUALS.PROJECTILES.STANDARD;
                speed = upgrade.visualOverrides.projectileSpeed || 480;
            } else if (mainCard.type.id === 'multi') {
                // Fallback for multishot (no visual overrides needed, it modifies count)
                projectileType = 'split';
                color = VISUALS.PROJECTILES.SPLIT;
            }
        }

        if (multiCards.length > 0) {
            // Use highest level multishot card
            const maxLevel = Math.max(...multiCards.map((c) => c.level));
            const multiConfig = getMultishotConfig(maxLevel);
            projCount = multiConfig.projectileCount;
            damageMultiplier = multiConfig.damageMultiplier;
            spread = multiConfig.spread; // NEW: Get spread from config

            // If main card is NOT multishot, but we have multishot upgrades, 
            // the projectile type stays as main card (e.g. Ice + Split = 3 Ice Shards)
            // But if Multishot is the FIRST card, then it's a "Split Tower"
        }

        // Apply multishot damage penalty
        damage *= damageMultiplier;

        // Find pierce effect
        const pierceEffect = allEffects.find(e => e.type === 'pierce');
        if (pierceEffect) {
            pierce = pierceEffect.pierceCount || 0;
        }

        // === SPINUP MECHANIC ===
        // Find spinup effect and apply bonuses based on current spinupTime
        const spinupEffect = allEffects.find(e => e.type === 'spinup');
        if (spinupEffect) {
            const spinupSeconds = this.spinupTime; // already in seconds

            // Apply damage bonus
            if (spinupEffect.spinupSteps) {
                // Stepped damage (Level 3) - optimized to find max applicable step
                let maxStepDamage = 0;
                for (const step of spinupEffect.spinupSteps) {
                    if (spinupSeconds >= step.threshold) {
                        maxStepDamage = step.damage;
                    } else {
                        // Steps are ordered, so no need to check further
                        break;
                    }
                }
                damage = damage + maxStepDamage;
            } else if (spinupEffect.spinupDamagePerSecond) {
                // Linear damage (Level 1-2)
                const bonusDamage = spinupEffect.spinupDamagePerSecond * spinupSeconds;
                damage += bonusDamage;
            }

            // Apply crit chance bonus
            if (spinupEffect.spinupCritPerSecond) {
                const bonusCrit = spinupEffect.spinupCritPerSecond * spinupSeconds;
                critChance += bonusCrit;
            }

            // Cap spinup at max seconds
            // (actual capping happens in WeaponSystem)
        }

        const stats = {
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
            attackSpeedMultiplier: mergedMods.attackSpeedMultiplier || 1.0
        };

        this.cachedStats = stats;
        this.statsDirty = false;
        return stats;
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
            this.buildProgress += dt;

            // Spawn dust particles during construction (every ~0.15s)
            // Using a hacky random check for now to avoid storing another timer
            if (Math.random() < dt * 6) { // Approx 6 times per second
                effects.add({
                    type: 'particle',
                    x: this.x + (Math.random() - 0.5) * 30,
                    y: this.y + 15,
                    vx: (Math.random() - 0.5) * 120, // ~2 px/frame -> 120 px/sec
                    vy: -Math.random() * 120,
                    life: 0.3 + Math.random() * 0.15, // ~20 frames -> 0.3s
                    color: '#a69060',
                    radius: 2 + Math.random() * 2
                });
            }

            if (this.buildProgress >= this.maxBuildProgress) {
                this.isBuilding = false;

                // Completion burst - dust cloud
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    effects.add({
                        type: 'particle',
                        x: this.x,
                        y: this.y,
                        vx: Math.cos(angle) * 180, // 3 px/frame -> 180 px/sec
                        vy: Math.sin(angle) * 180 - 60, // gravity effect approximately
                        life: 0.4 + Math.random() * 0.15,
                        color: '#c0a060',
                        radius: 3 + Math.random() * 2
                    });
                }

                // Flash effect
                effects.add({ type: 'explosion', x: this.x, y: this.y, radius: 25, life: 0.25, color: '#ffd700' });
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
            // Validate existing target range if we have one
            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const distSq = dx * dx + dy * dy;

                // Recalc range only if needed
                if (this.rangeSquared === 0) {
                    const range = this.getRange();
                    this.rangeSquared = range * range;
                }

                if (distSq > this.rangeSquared) {
                    this.target = null; // Out of range, drop it
                }
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
        // Always look at the target's CURRENT position
        if (this.target && this.target.isAlive()) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const targetAngle = Math.atan2(dy, dx);

            // Smooth Interpolation
            // dt * turnSpeed (e.g. 0.016 * 10 = 0.16 interpolation factor)
            this.angle = lerpAngle(this.angle, targetAngle, dt * this.turnSpeed);
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
