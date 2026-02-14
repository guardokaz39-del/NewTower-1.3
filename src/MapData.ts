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
}

// Полная структура файла сохранения
export interface IMapObject {
    type: string; // 'stone' | 'rock' | 'tree' | 'wheat' | 'flowers'
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
}

export type WaypointsMode = 'ENDPOINTS' | 'FULLPATH';

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
