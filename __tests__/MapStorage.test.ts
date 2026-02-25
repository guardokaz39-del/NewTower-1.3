import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapStorage, IMapEntry } from '../src/MapStorage';
import { IMapObject, IWaveConfig } from '../src/MapData';

// Mock fetch for bundled maps testing
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Minimal valid map for testing
const VALID_MAP = {
    width: 5,
    height: 5,
    tiles: [
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0],
    ],
    waypoints: [{ x: 0, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 3 }],
    objects: [] as IMapObject[],
    waves: [] as IWaveConfig[],
    startingMoney: 100,
    startingLives: 20,
    timeOfDay: 'night' as const,
};

// Map without waypoints (valid structure, passes migrateMapData but fails validateMap)
const MAP_NO_WAYPOINTS = {
    width: 3,
    height: 3,
    tiles: [[0, 0, 0], [1, 1, 1], [0, 0, 0]],
    waypoints: [{ x: 0, y: 1 }], // Only 1 waypoint — validateMap needs ≥ 2
    objects: [] as IMapObject[],
};

function mockFetchSuccess(url: string, data: any) {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
    });
}

function mockFetch404() {
    return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error('404')),
    });
}

describe('MapStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        mockFetch.mockReset();
        MapStorage.invalidateBundledCache();
    });

    // ===========================
    //  LOCAL MAPS (sync)
    // ===========================

    describe('Local Maps', () => {
        it('getLocalMaps returns {} when localStorage is empty', () => {
            expect(MapStorage.getLocalMaps()).toEqual({});
        });

        it('saveLocal → getLocalMaps round-trip', () => {
            const ok = MapStorage.saveLocal('test_map', VALID_MAP as any);
            expect(ok).toBe(true);

            const maps = MapStorage.getLocalMaps();
            expect(maps['test_map']).toBeDefined();
            expect(maps['test_map'].width).toBe(5);
            expect(maps['test_map'].tiles.length).toBe(5);
            expect(maps['test_map'].timeOfDay).toBe('night'); // Phase 5 feature
        });

        it('deleteLocal removes entry', () => {
            MapStorage.saveLocal('map_a', VALID_MAP as any);
            MapStorage.saveLocal('map_b', VALID_MAP as any);
            expect(Object.keys(MapStorage.getLocalMaps()).length).toBe(2);

            MapStorage.deleteLocal('map_a');
            const maps = MapStorage.getLocalMaps();
            expect(maps['map_a']).toBeUndefined();
            expect(maps['map_b']).toBeDefined();
        });

        it('handles corrupted localStorage gracefully', () => {
            localStorage.setItem('NEWTOWER_MAPS', '{BROKEN!!!');
            expect(MapStorage.getLocalMaps()).toEqual({});
        });
    });

    // ===========================
    //  BUNDLED MAPS (async)
    // ===========================

    describe('Bundled Maps', () => {
        it('returns {} when _index.json is 404', async () => {
            mockFetch.mockImplementation(() => mockFetch404());
            const result = await MapStorage.getBundledMaps();
            expect(result).toEqual({});
        });

        it('returns {} when _index.json is invalid JSON', async () => {
            mockFetch.mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve('not an array'),
            }));
            const result = await MapStorage.getBundledMaps();
            expect(result).toEqual({});
        });

        it('returns {} when _index.json is empty array', async () => {
            mockFetch.mockImplementation(() => mockFetchSuccess('', []));
            const result = await MapStorage.getBundledMaps();
            expect(result).toEqual({});
        });

        it('loads bundled maps through migrateMapData', async () => {
            mockFetch.mockImplementation((url: string) => {
                if (url.includes('_index.json')) {
                    return mockFetchSuccess(url, ['test_bundled']);
                }
                if (url.includes('test_bundled.json')) {
                    return mockFetchSuccess(url, VALID_MAP);
                }
                return mockFetch404();
            });

            const result = await MapStorage.getBundledMaps();
            expect(result['test_bundled']).toBeDefined();
            expect(result['test_bundled'].schemaVersion).toBeDefined(); // migrateMapData sets this
        });

        it('skips bundled map that 404s', async () => {
            mockFetch.mockImplementation((url: string) => {
                if (url.includes('_index.json')) {
                    return mockFetchSuccess(url, ['good', 'missing']);
                }
                if (url.includes('good.json')) {
                    return mockFetchSuccess(url, VALID_MAP);
                }
                return mockFetch404();
            });

            const result = await MapStorage.getBundledMaps();
            expect(result['good']).toBeDefined();
            expect(result['missing']).toBeUndefined();
        });

        it('caches bundled maps — second call does not fetch', async () => {
            mockFetch.mockImplementation(() => mockFetchSuccess('', []));
            await MapStorage.getBundledMaps();
            await MapStorage.getBundledMaps();
            // Only 1 fetch call (for _index.json), not 2
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('invalidateBundledCache forces re-fetch', async () => {
            mockFetch.mockImplementation(() => mockFetchSuccess('', []));
            await MapStorage.getBundledMaps();
            MapStorage.invalidateBundledCache();
            await MapStorage.getBundledMaps();
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    // ===========================
    //  UNIFIED API — getAllMaps()
    // ===========================

    describe('getAllMaps — Merge & Collision', () => {
        it('returns local maps when no bundled', async () => {
            mockFetch.mockImplementation(() => mockFetchSuccess('', []));
            MapStorage.saveLocal('my_map', VALID_MAP as any);

            const entries = await MapStorage.getAllMaps();
            expect(entries.length).toBe(1);
            expect(entries[0].name).toBe('my_map');
            expect(entries[0].source).toBe('local');
            expect(entries[0].overridesBundled).toBe(false);
        });

        it('Local Override: same name → local wins, overridesBundled=true', async () => {
            mockFetch.mockImplementation((url: string) => {
                if (url.includes('_index.json')) return mockFetchSuccess(url, ['shared']);
                if (url.includes('shared.json')) return mockFetchSuccess(url, VALID_MAP);
                return mockFetch404();
            });

            // Save local map with same name as bundled
            MapStorage.saveLocal('shared', VALID_MAP as any);

            const entries = await MapStorage.getAllMaps();
            // Should have only 1 entry (local wins, bundled hidden)
            const shared = entries.filter(e => e.name === 'shared');
            expect(shared.length).toBe(1);
            expect(shared[0].source).toBe('local');
            expect(shared[0].overridesBundled).toBe(true);
        });

        it('deleteLocal overridden → bundled restores', async () => {
            mockFetch.mockImplementation((url: string) => {
                if (url.includes('_index.json')) return mockFetchSuccess(url, ['shared']);
                if (url.includes('shared.json')) return mockFetchSuccess(url, VALID_MAP);
                return mockFetch404();
            });

            MapStorage.saveLocal('shared', VALID_MAP as any);
            MapStorage.deleteLocal('shared');

            MapStorage.invalidateBundledCache(); // re-fetch
            const entries = await MapStorage.getAllMaps();
            const shared = entries.filter(e => e.name === 'shared');
            expect(shared.length).toBe(1);
            expect(shared[0].source).toBe('bundled');
            expect(shared[0].overridesBundled).toBe(false);
        });

        it('bundled first, then local in order', async () => {
            mockFetch.mockImplementation((url: string) => {
                if (url.includes('_index.json')) return mockFetchSuccess(url, ['alpha_bundled']);
                if (url.includes('alpha_bundled.json')) return mockFetchSuccess(url, VALID_MAP);
                return mockFetch404();
            });

            MapStorage.saveLocal('zeta_local', VALID_MAP as any);
            const entries = await MapStorage.getAllMaps();
            expect(entries[0].name).toBe('alpha_bundled');
            expect(entries[0].source).toBe('bundled');
            expect(entries[1].name).toBe('zeta_local');
            expect(entries[1].source).toBe('local');
        });
    });

    // ===========================
    //  IMPORT / EXPORT
    // ===========================

    describe('Import & Export', () => {
        it('importFromFile with valid JSON returns IMapData', async () => {
            const blob = new Blob([JSON.stringify(VALID_MAP)], { type: 'application/json' });
            const file = new File([blob], 'test.json');

            const result = await MapStorage.importFromFile(file);
            expect(result.width).toBe(5);
            expect(result.tiles.length).toBe(5);
            expect(result.schemaVersion).toBeDefined(); // migrateMapData applied
            expect(result.timeOfDay).toBe('night'); // Phase 5 preserved
        });

        it('importFromFile with garbage JSON throws', async () => {
            const blob = new Blob(['{BROKEN!!!'], { type: 'application/json' });
            const file = new File([blob], 'bad.json');

            await expect(MapStorage.importFromFile(file)).rejects.toThrow('Невалидный JSON');
        });

        it('importFromFile without tiles throws (migrateMapData)', async () => {
            const blob = new Blob([JSON.stringify({ noTiles: true })], { type: 'application/json' });
            const file = new File([blob], 'empty.json');

            await expect(MapStorage.importFromFile(file)).rejects.toThrow();
        });

        it('importFromFile with insufficient waypoints throws (validateMap)', async () => {
            const blob = new Blob([JSON.stringify(MAP_NO_WAYPOINTS)], { type: 'application/json' });
            const file = new File([blob], 'no_wp.json');

            await expect(MapStorage.importFromFile(file)).rejects.toThrow('валидацию');
        });

        it('createExportBlob returns valid JSON Blob', () => {
            const blob = MapStorage.createExportBlob(VALID_MAP as any);
            expect(blob.type).toBe('application/json');
            expect(blob.size).toBeGreaterThan(0);
        });

        it('sanitizeFileName handles spaces and special chars', () => {
            expect(MapStorage.sanitizeFileName('My Cool Map!')).toBe('my_cool_map');
            expect(MapStorage.sanitizeFileName('  Тест 123  ')).toBe('123');
            expect(MapStorage.sanitizeFileName('')).toBe('map');
        });
    });
});
