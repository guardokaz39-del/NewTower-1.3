import { IMapData } from '../../MapData';

export const MAP_SAVES_NAMESPACE = 'maps';

export interface SaveMeta {
    id: string;
    namespace: string;
    updatedAt: string;
    schemaVersion: number;
}

export interface SaveEnvelope<T> {
    id: string;
    namespace: string;
    updatedAt: string;
    schemaVersion: number;
    data: T;
}

export type MapSaveData = IMapData;
export type MapSaveEnvelope = SaveEnvelope<MapSaveData>;

export type PersistenceError = {
    code: 'INVALID_SAVE' | 'MIGRATION_ERROR' | 'IO_ERROR';
    message: string;
    details?: unknown;
};

export type SafeLoadResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: PersistenceError };
