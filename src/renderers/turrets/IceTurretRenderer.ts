import { ITurretRenderer } from './TurretRenderer';

/**
 * Ice Card Turret Renderer
 */
export class IceTurretRenderer implements ITurretRenderer {
    readonly cardId = 'ice';

    getTurretAsset(): string {
        return 'turret_ice';
    }

    getModuleAsset(): string {
        return 'mod_ice';
    }

    getMuzzleOffset(): number {
        return 24; // Crystal structure length
    }

    // Future: drawEffects for frost aura
}
