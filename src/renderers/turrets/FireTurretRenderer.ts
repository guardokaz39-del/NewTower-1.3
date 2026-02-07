import { ITurretRenderer } from './TurretRenderer';

/**
 * Fire Card Turret Renderer
 */
export class FireTurretRenderer implements ITurretRenderer {
    readonly cardId = 'fire';

    getTurretAsset(): string {
        return 'turret_fire';
    }

    getModuleAsset(): string {
        return 'mod_fire';
    }
}
