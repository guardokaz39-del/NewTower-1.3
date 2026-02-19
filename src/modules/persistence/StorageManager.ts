import { IMapData } from '../../MapData';
import { BrowserStorageProvider, FileStorageProvider, IStorageProvider } from './providers';
import { MAP_SAVES_NAMESPACE, SaveMeta } from './types';

const LEGACY_IMPORTED_KEY = 'NEWTOWER_FILE_IMPORT_DONE';

export class StorageManager {
    private static instance: StorageManager | null = null;

    private provider: IStorageProvider = new BrowserStorageProvider();
    private readonly browserProvider = new BrowserStorageProvider();
    private initialized = false;

    public static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        const timeoutMs = 450;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch('/api/status', { signal: controller.signal });
            if (response.ok) {
                this.provider = new FileStorageProvider();
                console.info('[StorageManager] Connected to file saves');
                await this.autoImportLegacyBrowserMaps();
                return;
            }
        } catch {
            // fall back below
        } finally {
            clearTimeout(timeout);
        }

        this.provider = this.browserProvider;
        console.info('[StorageManager] Using browser saves');
    }

    public async listMaps(): Promise<SaveMeta[]> {
        return this.provider.list(MAP_SAVES_NAMESPACE);
    }

    public async loadMap(id: string): Promise<IMapData | null> {
        return this.provider.load<IMapData>(MAP_SAVES_NAMESPACE, id);
    }

    public async saveMap(id: string, data: IMapData): Promise<boolean> {
        return this.provider.save(MAP_SAVES_NAMESPACE, id, data);
    }

    public async deleteMap(id: string): Promise<boolean> {
        return this.provider.delete(MAP_SAVES_NAMESPACE, id);
    }

    public async importBrowserMaps(): Promise<number> {
        const maps = await this.browserProvider.list(MAP_SAVES_NAMESPACE);
        let imported = 0;

        for (const map of maps) {
            const data = await this.browserProvider.load<IMapData>(MAP_SAVES_NAMESPACE, map.id);
            if (!data) continue;
            const ok = await this.provider.save(MAP_SAVES_NAMESPACE, map.id, data);
            if (ok) imported++;
        }

        return imported;
    }

    private async autoImportLegacyBrowserMaps(): Promise<void> {
        if (localStorage.getItem(LEGACY_IMPORTED_KEY) === '1') return;

        const imported = await this.importBrowserMaps();
        localStorage.setItem(LEGACY_IMPORTED_KEY, '1');
        if (imported > 0) {
            console.info(`[StorageManager] Imported ${imported} browser save(s) into file storage`);
        }
    }
}
