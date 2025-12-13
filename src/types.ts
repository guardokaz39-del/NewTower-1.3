/**
 * Central type definitions for the Tower Defense game
 */

// ============================================
// Card System Types
// ============================================

export interface ICardTypeConfig {
    id: string;
    name: string;
    icon: string;
    color: string;
    desc: string;
}

// ============================================
// Enemy System Types
// ============================================

export interface IEnemyTypeConfig {
    id: string;
    name: string;
    symbol: string;
    hpMod: number;
    speed: number;
    reward: number;
    color: string;
    desc: string;
    // Modular Visuals
    archetype?: 'SKELETON' | 'WOLF' | 'TROLL' | 'SPIDER';
    scale?: number;
    props?: string[]; // IDs of props
    tint?: string;    // Hex color override
}

// ============================================
// Configuration Types
// ============================================

export type CardTypeKey = 'FIRE' | 'ICE' | 'SNIPER' | 'MULTISHOT';
export type EnemyTypeKey = 'GRUNT' | 'SCOUT' | 'TANK' | 'BOSS';

// ============================================
// Utility Types
// ============================================

/**
 * Type-safe accessor for card types
 */
export function getCardTypeConfig(key: string): ICardTypeConfig | undefined {
    return undefined; // Implementation will be in Config.ts
}

/**
 * Type-safe accessor for enemy types
 */
export function getEnemyTypeConfig(key: string): IEnemyTypeConfig | undefined {
    return undefined; // Implementation will be in Config.ts
}
