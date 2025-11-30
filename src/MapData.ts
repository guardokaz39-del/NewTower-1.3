// Структура одной волны
export interface IWaveConfig {
    enemies: { type: string, count: number }[]; // Кто и сколько
}

// Полная структура файла сохранения
export interface IMapData {
    width: number;
    height: number;
    tiles: number[][];
    waypoints: { x: number, y: number }[];
    objects: any[];
    
    // Новые поля (сценарий)
    waves?: IWaveConfig[]; 
    startingMoney?: number;
    startingLives?: number;
}

// Заглушка (чтобы старый код не ломался, если где-то используется)
export const DEMO_MAP: IMapData = {
    width: 10, height: 10, tiles: [], waypoints: [], objects: [],
    waves: [], startingMoney: 100, startingLives: 20
};