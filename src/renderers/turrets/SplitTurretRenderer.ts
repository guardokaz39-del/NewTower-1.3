import { ITurretRenderer } from './TurretRenderer';

/**
 * Split/Multishot Card Turret Renderer
 */
export class SplitTurretRenderer implements ITurretRenderer {
    readonly cardId = 'multi';

    getTurretAsset(): string {
        return 'turret_split';
    }

    getModuleAsset(): string {
        return 'mod_split';
    }

    getMuzzleOffset(): number {
        return 28; // Wide barrel array
    }
}
