/**
 * Turret Renderer Registry
 * Central export point for all turret renderers (Strategy Pattern)
 */

import { ITurretRenderer, DefaultTurretRenderer } from './TurretRenderer';
import { FireTurretRenderer } from './FireTurretRenderer';
import { IceTurretRenderer } from './IceTurretRenderer';
import { SniperTurretRenderer } from './SniperTurretRenderer';
import { SplitTurretRenderer } from './SplitTurretRenderer';
import { MinigunTurretRenderer } from './MinigunTurretRenderer';

// Export types
export type { ITurretRenderer };
export { DefaultTurretRenderer };

// Registry of turret renderers (singleton instances)
const TURRET_RENDERERS: Record<string, ITurretRenderer> = {
    'fire': new FireTurretRenderer(),
    'ice': new IceTurretRenderer(),
    'sniper': new SniperTurretRenderer(),
    'multi': new SplitTurretRenderer(),
    'minigun': new MinigunTurretRenderer(),
};

const defaultRenderer = new DefaultTurretRenderer();

/**
 * Get turret renderer for a card type
 * @param cardId - The card type ID (e.g., 'fire', 'ice', 'sniper', 'multi', 'minigun')
 * @returns The turret renderer for the card type, or default if not found
 */
export function getTurretRenderer(cardId: string): ITurretRenderer {
    return TURRET_RENDERERS[cardId] || defaultRenderer;
}
