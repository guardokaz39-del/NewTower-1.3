import { MapManager } from './Map';
import { IMapData, IWaveConfig } from './MapData';
import { CONFIG } from './Config';

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export class ObjectPool<T> {
    private createFn: () => T;
    private pool: T[] = [];
    constructor(createFn: () => T) {
        this.createFn = createFn;
    }
    public obtain(): T {
        return this.pool.length > 0 ? this.pool.pop()! : this.createFn();
    }
    public free(obj: T): void {
        // Type-safe check for reset method
        if (obj && typeof obj === 'object' && 'reset' in obj && typeof (obj as any).reset === 'function') {
            (obj as any).reset();
        }
        this.pool.push(obj);
    }
}

export function generateDefaultWaves(count: number = 10): IWaveConfig[] {
    const waves: IWaveConfig[] = [];
    for (let i = 1; i <= count; i++) {
        const waveEnemies: { type: string; count: number }[] = [];
        if (i <= 3) {
            waveEnemies.push({ type: 'grunt', count: 3 + i * 2 });
        } else {
            waveEnemies.push({ type: 'grunt', count: 5 + i });
            waveEnemies.push({ type: 'scout', count: Math.floor(i / 2) });
        }
        waves.push({ enemies: waveEnemies });
    }
    return waves;
}

export function serializeMap(map: MapManager): IMapData {
    const simpleTiles: number[][] = [];
    for (let y = 0; y < map.rows; y++) {
        const row: number[] = [];
        for (let x = 0; x < map.cols; x++) {
            row.push(map.grid[y][x].type);
        }
        simpleTiles.push(row);
    }
    return {
        width: map.cols,
        height: map.rows,
        tiles: simpleTiles,
        waypoints: map.waypoints.map((wp) => ({ x: wp.x, y: wp.y })),
        objects: [],
        waves: map.waves && map.waves.length > 0 ? map.waves : generateDefaultWaves(15),
        startingMoney: CONFIG.PLAYER.START_MONEY,
        startingLives: CONFIG.PLAYER.START_LIVES,
    };
}

export function validateMap(data: any): boolean {
    if (!data) return false;
    if (!data.tiles || !Array.isArray(data.tiles) || data.tiles.length === 0) {
        console.error('Map Validation Failed: No tiles data');
        return false;
    }
    if (!data.waypoints || !Array.isArray(data.waypoints)) {
        console.error('Map Validation Failed: No waypoints array');
        return false;
    }
    if (data.waypoints.length < 2) {
        console.error('Map Validation Failed: Path too short (<2 waypoints)');
        return false;
    }
    return true;
}

// --- STORAGE UTILS ---

export function getSavedMaps(): Record<string, IMapData> {
    try {
        const raw = localStorage.getItem('NEWTOWER_MAPS');
        if (!raw) return {};
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load maps', e);
        return {};
    }
}

export function saveMapToStorage(name: string, data: IMapData): boolean {
    try {
        const maps = getSavedMaps();
        maps[name] = data;
        localStorage.setItem('NEWTOWER_MAPS', JSON.stringify(maps));
        return true;
    } catch (e) {
        console.error('Failed to save map', e);
        return false;
    }
}

export function deleteMapFromStorage(name: string): void {
    const maps = getSavedMaps();
    delete maps[name];
    localStorage.setItem('NEWTOWER_MAPS', JSON.stringify(maps));
}
