/**
 * Base interfaces and types for the upgrade card system
 */

export interface ICardModifiers {
    damage?: number;              // Flat damage bonus
    attackSpeedMultiplier?: number; // Multiplier for attack speed (0.85 = -15% speed, 1.0 = no change)
    range?: number;               // Flat range bonus
    rangeMultiplier?: number;     // Multiplier for range
    critChance?: number;          // Critical hit chance (0-1)
}

export interface ICardEffect {
    type: 'splash' | 'slow' | 'pierce' | 'explodeOnDeath' | 'chainSlowOnDeath' | 'spinup';

    // Splash effect properties
    splashRadius?: number;

    // Slow effect properties
    slowPower?: number;           // 0-1, where 0.2 = 20% slow
    slowDuration?: number;        // Frames
    damageToSlowed?: number;      // Damage multiplier for slowed enemies (1.2 = +20% damage)

    // Pierce properties
    pierceCount?: number;         // Number of enemies to pierce through
    pierceDamageLoss?: number;    // Damage loss per pierce (0.15 = 15% loss)

    // Explosion on death properties
    explosionDamagePercent?: number; // Percent of tower damage (0.5 = 50%)
    explosionRadius?: number;

    // Chain slow properties
    chainRadius?: number;

    // Spinup properties (Minigun mechanic)
    spinupDamagePerSecond?: number;   // Flat damage bonus per second of continuous fire
    spinupCritPerSecond?: number;     // Crit chance bonus per second (0.02 = 2%)
    spinupSteps?: Array<{ threshold: number; damage: number }>; // For stepped damage (level 3)
    maxSpinupSeconds?: number;        // Maximum spinup time (7 seconds)
    overheatDuration?: number;        // Overheat lockout duration in frames (90 or 180)
    overheatExtensionWithIce?: number; // Bonus time before overheat when combined with Ice card (180 frames = 3 sec)

    // Legacy/Generic properties (fixing TS errors)
    radius?: number;
    dur?: number;
    power?: number;
}

export interface IUpgradeCard {
    level: number;
    modifiers: ICardModifiers;
    effects: ICardEffect[];
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

    modifiers.forEach(mod => {
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
    effectArrays.forEach(effects => {
        result.push(...effects);
    });
    return result;
}
