import type { Enemy } from '../../Enemy';
import { BakedSpriteRegistry } from './BakedSpriteRegistry';

const ARCHETYPE_DEFAULT_BAKED_TYPE: Record<string, string> = {
    SKELETON: 'skeleton',
    HELLHOUND: 'hellhound',
    SPIDER: 'spider',
    RAT: 'rat',
    MAGMA: 'magma_king',
    FLESH: 'flesh_colossus',
};

const EXPLICIT_TYPE_ALIASES: Record<string, string> = {
    grunt: 'skeleton',
    spider_poison: 'spider',
    troll_armored: 'troll',
    orc_tank: 'orc',
    orc_warrior: 'orc',
};

export function normalizeUnitTypeId(runtimeTypeId: string, enemy?: Enemy): string {
    const runtime = (runtimeTypeId || '').toLowerCase();
    if (!runtime) return runtime;

    if (BakedSpriteRegistry.hasType(runtime)) {
        return runtime;
    }

    const noDecorator = runtime.replace(/@.+$/, '');
    if (BakedSpriteRegistry.hasType(noDecorator)) {
        return noDecorator;
    }

    const noNumericSuffix = noDecorator.replace(/_\d+$/, '');
    if (BakedSpriteRegistry.hasType(noNumericSuffix)) {
        return noNumericSuffix;
    }

    const aliased = EXPLICIT_TYPE_ALIASES[runtime];
    if (aliased && BakedSpriteRegistry.hasType(aliased)) {
        return aliased;
    }

    const archetype = enemy?.typeConfig?.archetype;
    if (archetype && ARCHETYPE_DEFAULT_BAKED_TYPE[archetype]) {
        const byArchetype = ARCHETYPE_DEFAULT_BAKED_TYPE[archetype];
        if (BakedSpriteRegistry.hasType(byArchetype)) {
            return byArchetype;
        }
    }

    return noNumericSuffix;
}
