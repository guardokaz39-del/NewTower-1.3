import { mapSaveEnvelopeSchema, schemaVersion } from './schemas';
import { MapSaveEnvelope, SafeLoadResult } from './types';

export function migrateToCurrentSchema(raw: unknown): SafeLoadResult<MapSaveEnvelope> {
    const parsed = mapSaveEnvelopeSchema.safeParse(raw);
    if (parsed.success) {
        if (parsed.data.schemaVersion === schemaVersion) {
            return { ok: true, data: parsed.data as MapSaveEnvelope };
        }

        return {
            ok: false,
            error: {
                code: 'MIGRATION_ERROR',
                message: `Unsupported save schema version: ${parsed.data.schemaVersion}`,
            },
        };
    }

    return {
        ok: false,
        error: {
            code: 'INVALID_SAVE',
            message: 'Save failed schema validation',
            details: (parsed as any).error?.flatten?.() ?? { fieldErrors: {} },
        },
    };
}

// Placeholder for future migration map (v1 -> v1 noop currently)
export function migrateV1ToV1(save: MapSaveEnvelope): MapSaveEnvelope {
    return save;
}
