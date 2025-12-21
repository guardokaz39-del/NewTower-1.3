// Структура одной волны
export interface IWaveConfig {
    enemies: { type: string; count: number }[]; // Кто и сколько
}

// Полная структура файла сохранения
export interface IMapObject {
    type: string;
    x: number;
    y: number;
    properties?: Record<string, any>;
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
    fogData?: number[]; // ARRAY: 0=Visible, 1=Fog (Stores logical state, not bitmask index)
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
