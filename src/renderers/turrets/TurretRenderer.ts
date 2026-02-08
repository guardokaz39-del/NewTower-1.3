import type { Tower } from '../../Tower';

/**
 * Interface for turret-specific renderers
 * Similar to UnitRenderer for enemies
 */
export interface ITurretRenderer {
    /** Card ID for mapping */
    readonly cardId: string;

    /** Get turret asset name based on level */
    getTurretAsset(level: number): string;

    /** Get module asset name (for slots 1-2) */
    getModuleAsset(): string;

    /** 
     * Get muzzle offset from tower center (px) 
     * Used for projectile spawn point and muzzle flash
     */
    getMuzzleOffset(): number;

    /** 
     * Additional rendering after turret (laser, heat haze)
     * Called INSIDE rotated+recoiled context — effects move with barrel
     */
    drawEffects?(ctx: CanvasRenderingContext2D, tower: Tower): void;

    /**
     * Update visual state (animations, particles)
     * Called every frame
     */
    update?(dt: number, tower: Tower): void;

    /**
     * Draw preview of turret for ghost building
     * @param ctx Context to draw to
     * @param x Center X
     * @param y Center Y
     */
    drawPreview?(ctx: CanvasRenderingContext2D, x: number, y: number): void;

    /**
     * Custom turret drawing (replaces standard sprite drawing)
     * Called inside rotated context (0,0 is tower center)
     * @param ctx Context to draw to
     * @param tower Tower instance
     */
    drawTurret?(ctx: CanvasRenderingContext2D, tower: Tower): void;
}

/**
 * Default renderer for unknown cards or empty towers
 */
export class DefaultTurretRenderer implements ITurretRenderer {
    readonly cardId = 'default';

    getTurretAsset(level: number): string {
        return 'turret_standard';
    }

    getModuleAsset(): string {
        return '';
    }

    getMuzzleOffset(): number {
        return 22; // Default barrel length
    }
}
