import { ICard } from './CardSystem';
import { ICardModifiers, ICardEffect } from './cards/CardType';
import { getCardUpgrade } from './cards';

/**
 * Card Stacking System
 * 
 * Implements the advanced card stacking logic where:
 * - Different card types: All bonuses sum normally
 * - Same card types: Highest level = 100%, others contribute by level:
 *   - Level 3: 70% of stats
 *   - Level 2: 50% of stats
 *   - Level 1: 35% of stats
 */

/**
 * Get stacking bonus percentage based on card level
 */
export function getStackingBonus(level: number): number {
    switch (level) {
        case 3: return 0.70;
        case 2: return 0.50;
        case 1: return 0.35;
        default: return 0.35;
    }
}

/**
 * Group cards by type ID
 */
function groupCardsByType(cards: ICard[]): Map<string, ICard[]> {
    const grouped = new Map<string, ICard[]>();

    for (const card of cards) {
        const typeId = card.type.id;
        if (!grouped.has(typeId)) {
            grouped.set(typeId, []);
        }
        grouped.get(typeId)!.push(card);
    }

    return grouped;
}

export interface MergedCardData {
    modifiers: ICardModifiers;
    effects: ICardEffect[];
}

/**
 * Merge modifiers and effects from cards with advanced stacking rules
 */
export function mergeCardsWithStacking(cards: ICard[]): MergedCardData {
    const result: ICardModifiers = {
        damage: 0,
        damageMultiplier: undefined,
        attackSpeedMultiplier: 1.0,
        range: 0,
        rangeMultiplier: 1.0,
        critChance: 0,
    };
    const allEffects: ICardEffect[] = [];

    // Group cards by type
    const grouped = groupCardsByType(cards);

    // Process each card type group
    for (const [typeId, typeCards] of grouped) {
        // Sort by level (highest first)
        typeCards.sort((a, b) => b.level - a.level);

        if (typeId === 'minigun') {
            // Special handling for Minigun
            processMinigunGroup(typeCards, result, allEffects);
        } else if (typeId === 'multi') {
            // Multishot doesn't add modifiers, skip in this loop
            // (handled separately in Tower.ts)
            continue;
        } else if (typeCards.length === 1) {
            // Single card of this type: 100% bonus
            const card = typeCards[0];
            const upgrade = getCardUpgrade(typeId, card.level, card.evolutionPath);
            if (upgrade) {
                applyModifiers(result, upgrade.modifiers, 1.0);
                allEffects.push(...upgrade.effects);
            }
        } else {
            // Multiple cards of same type: use stacking rules
            processSameTypeGroup(typeCards, result, allEffects);
        }
    }

    return { modifiers: result, effects: allEffects };
}

/**
 * Process multiple cards of the same type (non-minigun)
 */
function processSameTypeGroup(
    cards: ICard[],
    result: ICardModifiers,
    allEffects: ICardEffect[]
) {
    // Already sorted by level (highest first)

    // First card (highest level): 100%
    const mainCard = cards[0];
    const mainUpgrade = getCardUpgrade(mainCard.type.id, mainCard.level, mainCard.evolutionPath);
    if (mainUpgrade) {
        applyModifiers(result, mainUpgrade.modifiers, 1.0);
        allEffects.push(...mainUpgrade.effects);
    }

    // Rest of the cards: apply stacking bonus
    for (let i = 1; i < cards.length; i++) {
        const card = cards[i];
        const upgrade = getCardUpgrade(card.type.id, card.level, card.evolutionPath);
        if (!upgrade) continue;

        const bonus = getStackingBonus(card.level);

        // Apply modifiers with bonus percentage
        applyModifiers(result, upgrade.modifiers, bonus);

        // Apply effects with bonus (if they have numeric values)
        applyEffectsWithBonus(upgrade.effects, allEffects, bonus);
    }
}

/**
 * Special processing for Minigun cards
 * 
 * - Takes highest level card for base damageMultiplier
 * - Additional minigun cards add penalties:
 *   - LVL 1: -5% damage
 *   - LVL 2: -7% damage
 *   - LVL 3: -9% damage
 *   - Penalties are summed
 */
function processMinigunGroup(
    cards: ICard[],
    result: ICardModifiers,
    allEffects: ICardEffect[]
) {
    // Already sorted by level
    const mainCard = cards[0];
    const mainUpgrade = getCardUpgrade('minigun', mainCard.level, mainCard.evolutionPath);

    if (!mainUpgrade) return;

    // Start with main card's damageMultiplier
    let baseDamageMultiplier = mainUpgrade.modifiers.damageMultiplier || 0.30;

    // Calculate penalties from additional minigun cards
    let totalPenalty = 0;
    for (let i = 1; i < cards.length; i++) {
        const level = cards[i].level;
        switch (level) {
            case 1:
                totalPenalty += 0.05; // 5%
                break;
            case 2:
                totalPenalty += 0.07; // 7%
                break;
            case 3:
                totalPenalty += 0.09; // 9%
                break;
        }
    }

    // Apply penalty to damageMultiplier (subtract from multiplier)
    baseDamageMultiplier -= totalPenalty;

    // Ensure minimum multiplier (can't go below 10%)
    baseDamageMultiplier = Math.max(0.10, baseDamageMultiplier);

    // Apply to result
    result.damageMultiplier = baseDamageMultiplier;
    result.attackSpeedMultiplier! *= mainUpgrade.modifiers.attackSpeedMultiplier || 1.0;

    // Add effects from main card only
    allEffects.push(...mainUpgrade.effects);
}

/**
 * Apply modifiers with a bonus multiplier
 */
function applyModifiers(
    result: ICardModifiers,
    modifiers: ICardModifiers,
    bonus: number
) {
    // Flat bonuses: multiply by bonus percentage
    if (modifiers.damage !== undefined) {
        result.damage! += modifiers.damage * bonus;
    }

    if (modifiers.range !== undefined) {
        result.range! += modifiers.range * bonus;
    }

    // Multipliers: scale the effect
    if (modifiers.attackSpeedMultiplier !== undefined) {
        // Effect = (multiplier - 1.0), e.g., 0.85 -> effect = -0.15
        const effect = modifiers.attackSpeedMultiplier - 1.0;
        const scaledEffect = effect * bonus;
        const finalMultiplier = 1.0 + scaledEffect;
        result.attackSpeedMultiplier! *= finalMultiplier;
    }

    if (modifiers.rangeMultiplier !== undefined) {
        const effect = modifiers.rangeMultiplier - 1.0;
        const scaledEffect = effect * bonus;
        const finalMultiplier = 1.0 + scaledEffect;
        result.rangeMultiplier! *= finalMultiplier;
    }

    // Crit chance: sum with bonus (not just max)
    if (modifiers.critChance !== undefined) {
        result.critChance! += modifiers.critChance * bonus;
    }

    // DamageMultiplier: only used by Minigun, handled specially
    // Don't merge here
}

/**
 * Apply effects with bonus percentage and deduplication
 */
function applyEffectsWithBonus(
    effects: ICardEffect[],
    allEffects: ICardEffect[],
    bonus: number
) {
    // Add effects with deduplication - only keep strongest version of each effect type
    for (const effect of effects) {
        const existing = allEffects.find(e => e.type === effect.type);

        if (!existing) {
            // New effect type - add it
            allEffects.push({ ...effect });
        } else {
            // Effect already exists - update to maximum values
            if (effect.splashRadius !== undefined && existing.splashRadius !== undefined) {
                existing.splashRadius = Math.max(existing.splashRadius, effect.splashRadius);
            }
            if (effect.slowDuration !== undefined && existing.slowDuration !== undefined) {
                existing.slowDuration = Math.max(existing.slowDuration, effect.slowDuration);
            }
            if (effect.slowPower !== undefined && existing.slowPower !== undefined) {
                existing.slowPower = Math.max(existing.slowPower, effect.slowPower);
            }
            if (effect.damageToSlowed !== undefined && existing.damageToSlowed !== undefined) {
                existing.damageToSlowed = Math.max(existing.damageToSlowed, effect.damageToSlowed);
            }
            if (effect.pierceCount !== undefined && existing.pierceCount !== undefined) {
                existing.pierceCount = Math.max(existing.pierceCount, effect.pierceCount);
            }
            if (effect.explosionDamagePercent !== undefined && existing.explosionDamagePercent !== undefined) {
                existing.explosionDamagePercent = Math.max(existing.explosionDamagePercent, effect.explosionDamagePercent);
            }
            if (effect.explosionRadius !== undefined && existing.explosionRadius !== undefined) {
                existing.explosionRadius = Math.max(existing.explosionRadius, effect.explosionRadius);
            }
            if (effect.chainRadius !== undefined && existing.chainRadius !== undefined) {
                existing.chainRadius = Math.max(existing.chainRadius, effect.chainRadius);
            }
            // Spinup effects - keep from main card (already handled in processMinigunGroup)
        }
    }
}
