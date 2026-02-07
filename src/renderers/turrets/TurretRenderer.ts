import type { Tower } from '../../Tower';

/**
 * Interface for turret-specific renderers
 * Similar to UnitRenderer for enemies
 */
export interface ITurretRenderer {
    /** Card ID for mapping */
    readonly cardId: string;

    /** Get turret asset name */
    getTurretAsset(): string;

    /** Get module asset name (for slots 1-2) */
    getModuleAsset(): string;

    /** 
     * Additional rendering after turret (laser, heat haze)
     * Called INSIDE rotated+recoiled context — effects move with barrel
     */
    drawEffects?(ctx: CanvasRenderingContext2D, tower: Tower): void;
}

/**
 * Default renderer for unknown cards or empty towers
 */
export class DefaultTurretRenderer implements ITurretRenderer {
    readonly cardId = 'default';

    getTurretAsset(): string {
        return 'turret_standard';
    }

    getModuleAsset(): string {
        return '';
    }
}
