// Режимы появления врагов из портала
export type SpawnPattern = 'normal' | 'random' | 'swarm';

// Input format (from JSON/Editor/Config)
// This is lenient to allow legacy data and editor drafts
export interface IWaveGroupRaw {
    type: string;
    count: number;

    // Optional / Legacy fields
    baseInterval?: number;
    pattern?: SpawnPattern;
    spawnRate?: 'fast' | 'medium' | 'slow';
    spawnPattern?: SpawnPattern; // Alias for pattern, seen in some legacy data
    speed?: number; // Legacy multiplier, rarely used but present in old saves
    delayBefore?: number;   // Pause before this group spawns (seconds), default: 0
}

// Runtime format (Strictly normalized)
// Logic should ONLY use this interface
export interface IWaveGroup {
    type: string;
    count: number;
    baseInterval: number; // Always in seconds (e.g. 0.5)
    pattern: SpawnPattern;
}

// Структура одной волны
export interface IWaveConfig {
    // Configs can be raw, we normalize them at runtime
    enemies: IWaveGroupRaw[];
    name?: string;                              // Display name ("Boss Wave!")
    startDelay?: number;                        // Delay before wave starts (seconds)
    waitForClear?: boolean;                     // Block next wave until all enemies dead
    bonusReward?: number;                       // Extra gold for clearing this wave
    shuffleMode?: 'none' | 'within_group' | 'all'; // Spawn order control
}

// Полная структура файла сохранения
export interface IMapObject {
    type: string; // 'stone' | 'rock' | 'tree' | 'wheat' | 'flowers' | 'bush' | 'pine' | 'crate' | 'barrel' | 'torch_stand' | 'mushroom' | 'stump' | 'bones' | 'crystal'
    x: number;
    y: number;
    properties?: Record<string, any>;
    size?: number; // Размер объекта в тайлах (для скал: 2 или 3)
}

export interface Cell {
    type: number; // 0=Grass, 1=Path, 2=Decor
    x: number;
    y: number;
    decor?: string | null;
}

// Полная структура файла сохранения
export interface IMapData {
    width: number;
    height: number;
    tiles: number[][]; // 0=Grass, 1=Path, 2=Decor
    waypoints: { x: number; y: number }[];
    objects: IMapObject[];

    // Новые поля (сценарий)
    waves?: IWaveConfig[];
    startingMoney?: number;
    startingLives?: number;
    manualPath?: boolean; // @deprecated use waypointsMode
    waypointsMode?: WaypointsMode; // Defines the source of truth for navigation
    fogData?: number[]; // ARRAY: fog density per tile (0=Visible, 1-5=Fog density 20%-100%)
    timeOfDay?: 'day' | 'night';
    allowedCards?: string[]; // Какие карты башен разрешены на этой карте. undefined = все.
    schemaVersion?: number;
}

export type WaypointsMode = 'ENDPOINTS' | 'FULLPATH';

import { CONFIG } from './Config';

/** Все доступные ключи карт из CONFIG, отсортированные для стабильного порядка */
export function getAllCardKeys(): string[] {
    return Object.keys(CONFIG.CARD_TYPES).sort();
}

/**
 * Нормализует allowedCards из сырых данных.
 * - undefined / не массив → undefined (= все разрешены)
 * - убирает дубликаты
 * - отфильтровывает ключи, которых нет в CONFIG.CARD_TYPES
 * - если после фильтрации пусто → undefined (= все разрешены, fallback)
 */
export function resolveAllowedCards(raw: unknown): string[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const valid = getAllCardKeys();
    const filtered = [...new Set(raw)].filter(k => typeof k === 'string' && valid.includes(k));
    if (filtered.length === 0 || filtered.length === valid.length) return undefined;
    return filtered;
}

// Заглушка (чтобы старый код не ломался, если где-то используется)
export const DEMO_MAP: IMapData = {
    width: 10,
    height: 10,
    tiles: Array(10)
        .fill(0)
        .map(() => Array(10).fill(0)), // 10x10 Grass
    waypoints: [],
    objects: [],
    waves: [],
    startingMoney: 100,
    startingLives: 20,
    fogData: [],
};

export const MAP_SCHEMA_VERSION = 2;

const VALID_TILES = new Set([0, 1, 2, 3, 4, 5, 6]);
const VALID_OBJECTS = new Set(['stone', 'rock', 'tree', 'wheat', 'flowers', 'bush', 'pine', 'crate', 'barrel', 'torch_stand', 'mushroom', 'stump', 'bones', 'crystal']);

/**
 * Validates and migrates raw map data from any source (localStorage, JSON import, etc.)
 * to the current IMapData format, filling in missing fields with safe defaults.
 * 
 * @throws Error if data is fundamentally broken (no tiles, wrong shape)
 */
export function migrateMapData(raw: unknown): IMapData {
    if (!raw || typeof raw !== 'object') {
        console.error('[MapData] Map data is not an object. Falling back to DEMO_MAP.');
        return structuredClone(DEMO_MAP);
    }

    const data = raw as Record<string, unknown>;

    // Required: tiles must be 2D number array
    if (!Array.isArray(data.tiles) || data.tiles.length === 0 || !Array.isArray(data.tiles[0])) {
        console.error('[MapData] Map data missing valid tiles array. Falling back to DEMO_MAP.');
        return structuredClone(DEMO_MAP);
    }

    const tiles = data.tiles as number[][];
    const height = tiles.length;
    const width = tiles[0].length;
    if (width === 0) {
        console.error('[MapData] Map data has empty tile rows. Falling back to DEMO_MAP.');
        return structuredClone(DEMO_MAP);
    }

    const sanitizedTiles = tiles.map(row =>
        row.map(cell => VALID_TILES.has(cell) ? cell : 0)
    );

    const result: IMapData = {
        width: typeof data.width === 'number' ? data.width : width,
        height: typeof data.height === 'number' ? data.height : height,
        tiles: sanitizedTiles,
        waypoints: Array.isArray(data.waypoints) ? data.waypoints : [],
        objects: Array.isArray(data.objects) 
            ? (data.objects as IMapObject[]).filter(obj => VALID_OBJECTS.has(obj.type))
            : [],
        waves: Array.isArray(data.waves) ? (data.waves as IWaveConfig[]) : [],
        startingMoney: typeof data.startingMoney === 'number' ? data.startingMoney : 100,
        startingLives: typeof data.startingLives === 'number' ? data.startingLives : 20,
        waypointsMode: (data.waypointsMode === 'FULLPATH' || (data.waypointsMode === undefined && data.manualPath === true))
            ? 'FULLPATH'
            : 'ENDPOINTS',
        fogData: Array.isArray(data.fogData) ? (data.fogData as number[]) : [],
        timeOfDay: (data.timeOfDay === 'night') ? 'night' : 'day',
        allowedCards: resolveAllowedCards(data.allowedCards),
        schemaVersion: MAP_SCHEMA_VERSION,
    };

    // Sanitize new wave fields
    if (result.waves) {
        result.waves.forEach(w => {
            if (w.startDelay != null) w.startDelay = Math.max(0, w.startDelay);
            if (w.bonusReward != null) w.bonusReward = Math.max(0, w.bonusReward);
            if (w.enemies) {
                w.enemies.forEach(g => {
                    if (g.delayBefore != null) g.delayBefore = Math.max(0, g.delayBefore);
                    if (g.baseInterval != null) g.baseInterval = Math.max(0.05, g.baseInterval);
                });
            }
        });
    }

    return result;
}
