import { IMapData, migrateMapData } from './MapData';
import { validateMap, normalizeWaveConfig } from './Utils';

// ============================================================
// MapStorage — Гибридное хранение карт (bundled + localStorage)
// ============================================================

/** Метаданные карты для UI */
export interface IMapEntry {
    name: string;
    data: IMapData;
    source: 'bundled' | 'local';
    overridesBundled: boolean;
}

const LOCAL_KEY = 'NEWTOWER_MAPS';

export class MapStorage {

    // === Кэш bundled карт (один fetch за сессию) ===
    private static _bundledCache: Record<string, IMapData> | null = null;
    private static _bundledFetchPromise: Promise<Record<string, IMapData>> | null = null;

    // -----------------------------------------------
    //  LOCAL MAPS (sync — localStorage, как раньше)
    // -----------------------------------------------

    /** Все карты из localStorage (sync). Нормализует волны для обратной совместимости. */
    public static getLocalMaps(): Record<string, IMapData> {
        try {
            const raw = localStorage.getItem(LOCAL_KEY);
            if (!raw) return {};

            const maps = JSON.parse(raw);

            // Нормализация волн (обратная совместимость)
            Object.keys(maps).forEach(mapName => {
                const mapData = maps[mapName];
                if (mapData.waves && Array.isArray(mapData.waves)) {
                    mapData.waves = mapData.waves.map(normalizeWaveConfig);
                }
            });

            return maps;
        } catch (e) {
            console.error('[MapStorage] Failed to load local maps', e);
            return {};
        }
    }

    /** Сохранить карту в localStorage. */
    public static saveLocal(name: string, data: IMapData): boolean {
        try {
            const maps = this.getLocalMaps();
            maps[name] = data;
            const json = JSON.stringify(maps);

            // Safety check: предупредить при приближении к лимиту 5MB
            const byteSize = new TextEncoder().encode(json).length;
            if (byteSize > 4 * 1024 * 1024) {
                console.warn(`[MapStorage] Approaching limit: ${(byteSize / 1024 / 1024).toFixed(1)}MB / 5MB`);
            }

            localStorage.setItem(LOCAL_KEY, json);
            return true;
        } catch (e) {
            console.error('[MapStorage] Failed to save map', e);
            return false;
        }
    }

    /** Удалить карту из localStorage. */
    public static deleteLocal(name: string): void {
        try {
            const maps = this.getLocalMaps();
            delete maps[name];
            localStorage.setItem(LOCAL_KEY, JSON.stringify(maps));
        } catch (e) {
            console.error('[MapStorage] Failed to delete map', e);
        }
    }

    // -----------------------------------------------
    //  BUNDLED MAPS (async — fetch из public/maps/)
    // -----------------------------------------------

    /** Получить base URL для fetch (поддержка SPA/роутинга). */
    private static getBaseUrl(): string {
        // import.meta.env.BASE_URL устанавливается Vite из config.base
        // Fallback к './' для тестового окружения
        try {
            return (import.meta as any).env?.BASE_URL ?? './';
        } catch {
            return './';
        }
    }

    /**
     * Загрузить bundled карты из public/maps/.
     * Кэширует результат — повторные вызовы не делают fetch.
     * При ошибке (404, невалидный JSON) — возвращает {}, логирует warning.
     */
    public static async getBundledMaps(): Promise<Record<string, IMapData>> {
        // Вернуть кэш если есть
        if (this._bundledCache) return this._bundledCache;

        // Дедупликация: если fetch уже в процессе, вернуть тот же промис
        if (this._bundledFetchPromise) return this._bundledFetchPromise;

        this._bundledFetchPromise = this._fetchBundledMaps();
        try {
            this._bundledCache = await this._bundledFetchPromise;
            return this._bundledCache;
        } catch (e) {
            console.warn('[MapStorage] Failed to fetch bundled maps', e);
            return {};
        } finally {
            this._bundledFetchPromise = null;
        }
    }

    /** Внутренняя реализация загрузки bundled карт. */
    private static async _fetchBundledMaps(): Promise<Record<string, IMapData>> {
        const base = this.getBaseUrl();
        const result: Record<string, IMapData> = {};

        // 1. Загрузить manifest
        let index: string[];
        try {
            const resp = await fetch(`${base}maps/_index.json`, { cache: 'no-cache' });
            if (!resp.ok) {
                console.warn(`[MapStorage] _index.json returned ${resp.status}`);
                return result;
            }
            const parsed = await resp.json();
            if (!Array.isArray(parsed)) {
                console.warn('[MapStorage] _index.json is not an array');
                return result;
            }
            index = parsed;
        } catch (e) {
            console.warn('[MapStorage] Failed to fetch _index.json', e);
            return result;
        }

        if (index.length === 0) return result;

        // 2. Загрузить каждую карту
        const fetches = index.map(async (name: string) => {
            try {
                const resp = await fetch(`${base}maps/${name}.json`);
                if (!resp.ok) {
                    console.warn(`[MapStorage] Map "${name}" returned ${resp.status}, skipping`);
                    return;
                }
                const raw = await resp.json();

                // КРИТИЧНО: миграция + валидация bundled карт
                const migrated = migrateMapData(raw);
                if (!validateMap(migrated)) {
                    console.warn(`[MapStorage] Bundled map "${name}" failed validation, skipping`);
                    return;
                }

                result[name] = migrated;
            } catch (e) {
                console.warn(`[MapStorage] Failed to load bundled map "${name}"`, e);
            }
        });

        await Promise.all(fetches);
        return result;
    }

    /** Инвалидировать кэш bundled карт (для HMR). */
    public static invalidateBundledCache(): void {
        this._bundledCache = null;
        this._bundledFetchPromise = null;
    }

    // -----------------------------------------------
    //  UNIFIED API — единая точка правды
    // -----------------------------------------------

    /**
     * Получить ВСЕ карты (bundled + local) с метаданными.
     * Collision policy: Local Override — если имя совпадает, local побеждает.
     * Порядок: bundled (по алфавиту), затем local (по алфавиту).
     */
    public static async getAllMaps(): Promise<IMapEntry[]> {
        const local = this.getLocalMaps();
        const bundled = await this.getBundledMaps();
        const localNames = new Set(Object.keys(local));
        const bundledNames = new Set(Object.keys(bundled));

        const entries: IMapEntry[] = [];

        // Bundled карты (только те, что НЕ перезаписаны локальными)
        const sortedBundled = Object.keys(bundled).sort();
        for (const name of sortedBundled) {
            if (localNames.has(name)) {
                // Local override — bundled не показываем, local покажем ниже с overridesBundled=true
                continue;
            }
            entries.push({
                name,
                data: bundled[name],
                source: 'bundled',
                overridesBundled: false,
            });
        }

        // Local карты
        const sortedLocal = Object.keys(local).sort();
        for (const name of sortedLocal) {
            entries.push({
                name,
                data: local[name],
                source: 'local',
                overridesBundled: bundledNames.has(name),
            });
        }

        return entries;
    }

    /**
     * Проверить, является ли карта bundled (из проекта).
     */
    public static async isBundled(name: string): Promise<boolean> {
        const bundled = await this.getBundledMaps();
        return name in bundled;
    }

    // -----------------------------------------------
    //  IMPORT / EXPORT (чистая логика, без UI)
    // -----------------------------------------------

    /**
     * Импорт карты из File.
     * Прогоняет через полный validation pipeline: JSON.parse → migrateMapData → validateMap.
     * @throws Error при невалидных данных
     */
    public static async importFromFile(file: File): Promise<IMapData> {
        const text = await file.text();

        let raw: unknown;
        try {
            raw = JSON.parse(text);
        } catch (e) {
            throw new Error(`Невалидный JSON: ${(e as Error).message}`);
        }

        // Миграция (throws если нет tiles и т.д.)
        const migrated = migrateMapData(raw);

        // Валидация (waypoints ≥ 2 и т.д.)
        if (!validateMap(migrated)) {
            throw new Error('Карта не прошла валидацию (нет пути или waypoints < 2)');
        }

        return migrated;
    }

    /**
     * Создать Blob для скачивания карты как JSON.
     * Возвращает Blob — создание <a download> остаётся в UI-слое.
     */
    public static createExportBlob(data: IMapData): Blob {
        const json = JSON.stringify(data, null, 2);
        return new Blob([json], { type: 'application/json' });
    }

    /**
     * Санитизация имени файла для экспорта.
     * Пробелы → _, убраны спецсимволы, lowercase.
     */
    public static sanitizeFileName(name: string): string {
        return name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_\-]/g, '')
            .replace(/_+/g, '_')         // collapse double underscores
            .replace(/^_|_$/g, '')       // trim leading/trailing _
            .substring(0, 50) || 'map';
    }
}
