/**
 * Base interfaces and types for the upgrade card system
 */

export interface ICardModifiers {
    damage?: number; // Flat damage bonus
    damageMultiplier?: number; // Multiplier for base damage (e.g., 0.30 = 30% of base)
    attackSpeedMultiplier?: number; // Multiplier for attack speed (0.85 = -15% speed, 1.0 = no change)
    range?: number; // Flat range bonus
    rangeMultiplier?: number; // Multiplier for range
    critChance?: number; // Critical hit chance (0-1)
}

export interface ICardEffect {
    type: 'splash' | 'slow' | 'pierce' | 'explodeOnDeath' | 'chainSlowOnDeath' | 'spinup' | 'burn';

    // Splash effect properties
    splashRadius?: number;

    // Burn effect properties (Napalm evolution)
    burnDps?: number; // Damage per second
    burnDuration?: number; // Duration in seconds

    // Slow effect properties
    slowPower?: number; // 0-1, where 0.2 = 20% slow
    slowDuration?: number; // Frames
    damageToSlowed?: number; // Damage multiplier for slowed enemies (1.2 = +20% damage)

    // Pierce properties
    pierceCount?: number; // Number of enemies to pierce through
    pierceDamageLoss?: number; // Damage loss per pierce (0.15 = 15% loss)

    // Explosion on death properties
    explosionDamagePercent?: number; // Percent of tower damage (0.5 = 50%)
    explosionRadius?: number;

    // Chain slow properties
    chainRadius?: number;

    // Spinup properties (Minigun mechanic)
    spinupDamagePerSecond?: number; // Flat damage bonus per second of continuous fire
    spinupCritPerSecond?: number; // Crit chance bonus per second (0.02 = 2%)
    spinupSpeedBonus?: number; // NEW: Max speed bonus at full spinup (e.g. 1.5 = +150%)
    spinupSteps?: Array<{ threshold: number; damage: number }>; // For stepped damage (level 3)
    maxSpinupSeconds?: number; // Maximum spinup time (7 seconds)
    overheatDuration?: number; // Overheat lockout duration in frames (90 or 180)
    overheatExtensionWithIce?: number; // Bonus time before overheat when combined with Ice card (180 frames = 3 sec)

    // Legacy/Generic properties (fixing TS errors)
    radius?: number;
    dur?: number;
    power?: number;
}

export interface ICardVisualOverrides {
    projectileType?: string; // Visual type: 'standard', 'fire', 'ice', 'sniper', 'minigun', 'split'
    projectileColor?: string; // Hex color for projectile
    projectileSpeed?: number; // Projectile travel speed
}

export interface IUpgradeCard {
    level: number;
    modifiers: ICardModifiers;
    effects: ICardEffect[];
    visualOverrides?: ICardVisualOverrides; // NEW: Data-driven visuals
}

/**
 * Merge multiple card modifiers into one
 */
export function mergeModifiers(modifiers: ICardModifiers[]): ICardModifiers {
    const result: ICardModifiers = {
        damage: 0,
        attackSpeedMultiplier: 1.0,
        range: 0,
        rangeMultiplier: 1.0,
        critChance: 0,
    };

    modifiers.forEach((mod) => {
        result.damage! += mod.damage || 0;
        result.attackSpeedMultiplier! *= mod.attackSpeedMultiplier || 1.0;
        result.range! += mod.range || 0;
        result.rangeMultiplier! *= mod.rangeMultiplier || 1.0;
        result.critChance! = Math.max(result.critChance!, mod.critChance || 0);
    });

    return result;
}

/**
 * Merge multiple card effects into one array
 */
export function mergeEffects(effectArrays: ICardEffect[][]): ICardEffect[] {
    const result: ICardEffect[] = [];
    effectArrays.forEach((effects) => {
        result.push(...effects);
    });
    return result;
}
