// Режимы появления врагов из портала
export type SpawnPattern = 'normal' | 'random' | 'swarm';

// Структура одной волны
export interface IWaveConfig {
    enemies: {
        type: string;
        count: number;
        // @deprecated Старые поля - не используются, сохранены для совместимости
        speed?: number; // 0.5, 1.0, 1.5, 2.0 etc (multiplier)
        spawnRate?: 'fast' | 'medium' | 'slow'; // spawn delay
        // Новое поле - режим появления группы врагов
        spawnPattern?: SpawnPattern;
    }[]; // Кто и сколько
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
    manualPath?: boolean; // true if waypoints were manually placed
    fogData?: number[]; // ARRAY: fog density per tile (0=Visible, 1-5=Fog density 20%-100%)
}

export interface Cell {
    type: number; // 0=Grass, 1=Path, 2=Decor
    x: number;
    y: number;
    decor?: string | null;
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
