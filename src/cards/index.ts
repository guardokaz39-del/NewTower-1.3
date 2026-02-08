/**
 * Card System Module
 * Central export point for all card upgrade definitions
 */

import { IUpgradeCard, ICardModifiers, ICardEffect, mergeModifiers, mergeEffects } from './CardType';
import { FIRE_UPGRADES } from './FireCard';
import { ICE_UPGRADES } from './IceCard';
import { SNIPER_UPGRADES } from './SniperCard';
import { MULTISHOT_UPGRADES, getMultishotConfig } from './MultishotCard';
import { MINIGUN_UPGRADES } from './MinigunCard';
import {
    EVOLUTION_UPGRADES,
    EVOLUTION_CHOICES,
    getEvolutionChoice,
    getEvolutionUpgrade,
    getEvolutionMeta,
    IEvolutionPath,
    IEvolutionChoice
} from './CardEvolutions';

// Export types
export type { IUpgradeCard, ICardModifiers, ICardEffect, IEvolutionPath, IEvolutionChoice };
export { mergeModifiers, mergeEffects };

// Export card upgrade data
export { FIRE_UPGRADES, ICE_UPGRADES, SNIPER_UPGRADES, MULTISHOT_UPGRADES, MINIGUN_UPGRADES, getMultishotConfig };

// Export evolution system
export { EVOLUTION_UPGRADES, EVOLUTION_CHOICES, getEvolutionChoice, getEvolutionUpgrade, getEvolutionMeta };

/**
 * Card upgrade registry (classic paths)
 */
const CARD_REGISTRY: Record<string, Record<number, IUpgradeCard>> = {
    'fire': FIRE_UPGRADES,
    'ice': ICE_UPGRADES,
    'sniper': SNIPER_UPGRADES,
    'multi': MULTISHOT_UPGRADES,
    'minigun': MINIGUN_UPGRADES,
};

/**
 * Get upgrade data for a specific card type and level
 * Prioritizes evolution upgrades if evolutionPath is set
 * 
 * @param cardTypeId - The card type ID (e.g., 'fire', 'ice', 'sniper', 'multi')
 * @param level - The card level (1-3)
 * @param evolutionPath - Optional evolution path ('inferno', 'napalm', etc.)
 * @returns The upgrade data or null if not found
 */
export function getCardUpgrade(cardTypeId: string, level: number, evolutionPath?: string): IUpgradeCard | null {
    // First, check for evolution upgrade
    if (evolutionPath && evolutionPath !== 'classic') {
        const evoUpgrade = getEvolutionUpgrade(evolutionPath, level);
        if (evoUpgrade) {
            return evoUpgrade;
        }
    }

    // Fallback to classic registry
    const cardUpgrades = CARD_REGISTRY[cardTypeId];
    if (!cardUpgrades) {
        console.warn(`Unknown card type: ${cardTypeId}`);
        return null;
    }

    const upgrade = cardUpgrades[level];
    if (!upgrade) {
        console.warn(`Unknown level ${level} for card type ${cardTypeId}`);
        return null;
    }

    return upgrade;
}

