import { CONFIG } from './Config';
import { RendererFactory } from './RendererFactory';
import { ICard } from './CardSystem';
import { Enemy } from './Enemy';
import { Projectile, IProjectileStats } from './Projectile';
import { ObjectPool } from './Utils';
import { EffectSystem } from './EffectSystem';
import { Assets } from './Assets';
import { VISUALS } from './VisualConfig';
import { getCardUpgrade, getMultishotConfig, ICardEffect } from './cards';
import { mergeCardsWithStacking } from './CardStackingSystem';
import { TowerRenderer } from './renderers/TowerRenderer';

export class Tower {
    public col: number;
    public row: number;
    public x: number;
    public y: number;

    public cards: ICard[] = [];
    public cooldown: number = 0;
    public angle: number = 0;
    public targetingMode: string = 'first'; // Targeting priority: first, closest, strongest, weakest, last

    public isBuilding: boolean = false;
    public buildProgress: number = 0;
    public maxBuildProgress: number = CONFIG.TOWER.BUILD_TIME;

    public costSpent: number = 0;

    // Spinup state (for Minigun cards)
    public spinupTime: number = 0;        // Seconds spent firing continuously
    public maxHeat: number = 5;             // Max seconds before overheat (default 5s)
    public isOverheated: boolean = false;   // Whether tower is overheated
    public overheatCooldown: number = 0;    // Seconds remaining in overheat lockout

    // Visual state (Phase 3)
    public recoilTimer: number = 0;        // Recoil animation timer (seconds)
    public recoilIntensity: number = 0;     // Recoil strength

    constructor(c: number, r: number) {
        this.col = c;
        this.row = r;
        this.x = c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.costSpent = CONFIG.ECONOMY.TOWER_COST;
    }

    public static getPreviewStats(cards: ICard[]): any {
        const dummy = new Tower(0, 0);
        dummy.cards = cards;
        return dummy.getStats();
    }

    getStats(): IProjectileStats & { range: number; cd: number; projCount: number; spread: number; projectileType: string } {
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
            const upgrade = getCardUpgrade(mainCard.type.id, mainCard.level);
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

        return {
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
            projectileType
        };
    }

    addCard(c: ICard): boolean {
        if (this.cards.length < CONFIG.TOWER.MAX_CARDS) {
            this.cards.push(c);
            // this.costSpent += 100; // Removed cost tracking for cards
            return true;
        }
        return false;
    }

    removeCard(index: number): ICard | null {
        if (index < 0 || index >= this.cards.length) return null;
        const card = this.cards.splice(index, 1)[0];
        return card || null;
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

    draw(ctx: CanvasRenderingContext2D) {
        RendererFactory.drawTower(ctx, this);
    }
}
