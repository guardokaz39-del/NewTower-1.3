import { ENEMY_TYPES, ENEMY_CONFIG } from '../config/Enemies';
import { IEnemyTypeConfig } from '../types';

/**
 * Service to provide access to enemy data for the editor.
 * Wraps the raw configuration to provide helper methods.
 */
export class EnemyRegistry {
    /**
     * Get all available enemy types as an array of entries
     */
    public static getAllEntries(): { key: string; config: IEnemyTypeConfig }[] {
        return Object.entries(ENEMY_TYPES).map(([key, config]) => ({ key, config }));
    }

    /**
     * Get all available enemy types (values only)
     * @deprecated Use getAllEntries for keys
     */
    public static getAllTypes(): IEnemyTypeConfig[] {
        return Object.values(ENEMY_TYPES).filter(e => !e.isHidden);
    }

    /**
     * Get enemy types visible in editor (excludes isHidden)
     */
    public static getVisibleForEditor(): IEnemyTypeConfig[] {
        return Object.values(ENEMY_TYPES).filter(e => !e.isHidden);
    }

    /**
     * Get a specific enemy type by ID (Case insensitive check)
     */
    public static getType(id: string): IEnemyTypeConfig | undefined {
        const key = id.toUpperCase();
        return ENEMY_TYPES[key] || Object.values(ENEMY_TYPES).find(t => t.id === id);
    }

    /**
     * Get enemy types used for dropdowns (keys)
     */
    public static getTypeKeys(): string[] {
        return Object.keys(ENEMY_TYPES);
    }

    /**
     * Calculates an approximate "Power Rating" for a single unit of this type.
     * Used for sorting or rough estimation.
     * Formula: Effective HP * Speed Factor
     */
    public static getPowerRating(typeId: string): number {
        const type = this.getType(typeId);
        if (!type) return 0;

        const hp = ENEMY_CONFIG.BASE_HP * type.hpMod;
        // Normalizing speed: 60 (1 tile/sec) is baseline 1.0
        const speedFactor = type.speed / 60;

        return hp * speedFactor;
    }

    /**
     * Returns types sorted by their Power Rating (weakest to strongest)
     */
    public static getTypesSortedByPower(): IEnemyTypeConfig[] {
        return this.getAllTypes().sort((a, b) => {
            return this.getPowerRating(a.id) - this.getPowerRating(b.id);
        });
    }
}
