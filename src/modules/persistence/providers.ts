import { migrateToCurrentSchema } from './migrations';
import { schemaVersion } from './schemas';
import { SaveEnvelope, SaveMeta } from './types';

export interface IStorageProvider {
    list(namespace: string): Promise<SaveMeta[]>;
    load<T>(namespace: string, id: string): Promise<T | null>;
    save<T>(namespace: string, id: string, data: T): Promise<boolean>;
    delete(namespace: string, id: string): Promise<boolean>;
}

function getBrowserKey(namespace: string): string {
    return `NEWTOWER_${namespace.toUpperCase()}`;
}

export class BrowserStorageProvider implements IStorageProvider {
    public async list(namespace: string): Promise<SaveMeta[]> {
        const bucket = this.getNamespaceBucket(namespace);
        return Object.entries(bucket).map(([id, value]) => ({
            id,
            namespace,
            updatedAt: this.extractUpdatedAt(value),
            schemaVersion,
        }));
    }

    public async load<T>(namespace: string, id: string): Promise<T | null> {
        const bucket = this.getNamespaceBucket(namespace);
        const raw = bucket[id];
        if (!raw) return null;

        const envelope = this.normalizeToEnvelope(namespace, id, raw);
        const migrated = migrateToCurrentSchema(envelope);
        if (!migrated.ok) {
            console.warn(`[Storage] Invalid browser save ${namespace}/${id}`, (migrated as any).error);
            return null;
        }

        return migrated.data.data as T;
    }

    public async save<T>(namespace: string, id: string, data: T): Promise<boolean> {
        try {
            const bucket = this.getNamespaceBucket(namespace);
            bucket[id] = this.normalizeToEnvelope(namespace, id, data);
            localStorage.setItem(getBrowserKey(namespace), JSON.stringify(bucket));
            return true;
        } catch (error) {
            console.error('[Storage] Browser save failed', error);
            return false;
        }
    }

    public async delete(namespace: string, id: string): Promise<boolean> {
        const bucket = this.getNamespaceBucket(namespace);
        if (!(id in bucket)) return false;
        delete bucket[id];
        localStorage.setItem(getBrowserKey(namespace), JSON.stringify(bucket));
        return true;
    }

    private getNamespaceBucket(namespace: string): Record<string, unknown> {
        const raw = localStorage.getItem(getBrowserKey(namespace));
        if (!raw) return {};
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return {};
        }
    }

    private normalizeToEnvelope<T>(namespace: string, id: string, raw: T): SaveEnvelope<T> {
        const maybeEnvelope = raw as SaveEnvelope<T>;
        if (
            maybeEnvelope &&
            typeof maybeEnvelope === 'object' &&
            'data' in maybeEnvelope &&
            'namespace' in maybeEnvelope &&
            'id' in maybeEnvelope
        ) {
            return maybeEnvelope;
        }

        return {
            id,
            namespace,
            updatedAt: new Date().toISOString(),
            schemaVersion,
            data: raw,
        };
    }

    private extractUpdatedAt(raw: unknown): string {
        if (raw && typeof raw === 'object' && 'updatedAt' in raw && typeof (raw as any).updatedAt === 'string') {
            return (raw as any).updatedAt;
        }
        return new Date(0).toISOString();
    }
}

export class FileStorageProvider implements IStorageProvider {
    public async list(namespace: string): Promise<SaveMeta[]> {
        const response = await fetch(`/api/storage/${encodeURIComponent(namespace)}`);
        if (!response.ok) return [];
        return (await response.json()) as SaveMeta[];
    }

    public async load<T>(namespace: string, id: string): Promise<T | null> {
        const response = await fetch(`/api/storage/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`);
        if (response.status === 404) return null;
        if (!response.ok) return null;

        const raw = await response.json();
        const migrated = migrateToCurrentSchema(raw);
        if (!migrated.ok) {
            console.warn(`[Storage] Invalid file save ${namespace}/${id}`, (migrated as any).error);
            return null;
        }

        return migrated.data.data as T;
    }

    public async save<T>(namespace: string, id: string, data: T): Promise<boolean> {
        const response = await fetch(`/api/storage/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                namespace,
                updatedAt: new Date().toISOString(),
                schemaVersion,
                data,
            }),
        });

        return response.ok;
    }

    public async delete(namespace: string, id: string): Promise<boolean> {
        const response = await fetch(`/api/storage/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        return response.ok;
    }
}
