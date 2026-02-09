import { MapManager } from './Map';
import { IMapData, IWaveConfig } from './MapData';
import { CONFIG } from './Config';

// Fast ID generator using counter instead of regex-based UUID
let _idCounter = 0;
export function generateUUID(): string {
    return `id_${++_idCounter}_${Date.now().toString(36)}`;
}

export class ObjectPool<T> {
    private createFn: () => T;
    private pool: T[] = [];
    private hasReset: boolean = false;
    private resetChecked: boolean = false;

    constructor(createFn: () => T) {
        this.createFn = createFn;
    }
    public obtain(): T {
        return this.pool.length > 0 ? this.pool.pop()! : this.createFn();
    }
    public free(obj: T): void {
        // Check reset method only once per pool type
        if (!this.resetChecked) {
            this.hasReset = obj && typeof obj === 'object' && 'reset' in obj && typeof (obj as any).reset === 'function';
            this.resetChecked = true;
        }
        if (this.hasReset) {
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

/**
 * Проверяет и нормализует конфигурацию волны для безопасности
 * Обеспечивает обратную совместимость со старыми сохранениями
 */
export function normalizeWaveConfig(wave: any): IWaveConfig {
    if (!wave || !wave.enemies || !Array.isArray(wave.enemies)) {
        return { enemies: [] };
    }

    return {
        enemies: wave.enemies.map((group: any) => ({
            type: group.type || 'GRUNT',
            count: Math.max(1, parseInt(group.count) || 1),
            spawnPattern: (['normal', 'random', 'swarm'].includes(group.spawnPattern))
                ? group.spawnPattern
                : 'normal',
            // Сохраняем старые поля для совместимости
            speed: group.speed,
            spawnRate: group.spawnRate
        }))
    };
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
        objects: map.objects || [], // Include objects from map
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

        const maps = JSON.parse(raw);

        // Нормализация всех волн во всех картах для обратной совместимости
        Object.keys(maps).forEach(mapName => {
            const mapData = maps[mapName];
            if (mapData.waves && Array.isArray(mapData.waves)) {
                mapData.waves = mapData.waves.map(normalizeWaveConfig);
            }
        });

        return maps;
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

// === GLOBAL SESSION STORAGE ===
// To preserve Enemy.nextId and other session globals across reloads
interface IGlobalState {
    lastEnemyId: number;
}

export function saveGlobalState(): void {
    const state: IGlobalState = {
        lastEnemyId: (window as any).Enemy?.nextId || 0
    };
    // Need to access the Enemy class static, but importing it might cause cycles if not careful.
    // Better to pass the value in if possible, or use the class if imported.
    // Since we are in Utils, check imports. Enemy is NOT imported here.
    // Let's rely on the caller to pass it or import it dynamically?
    // Actually, Utils uses IMapData etc. It does not import Enemy class.
    // Importing Enemy class here might be fine.
}

// Better approach: Generic Save/Load for key-values that Game.ts can call
export function saveSessionData(key: string, value: any): void {
    try {
        const raw = localStorage.getItem('NEWTOWER_SESSION') || '{}';
        const data = JSON.parse(raw);
        data[key] = value;
        localStorage.setItem('NEWTOWER_SESSION', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save session data', e);
    }
}

export function loadSessionData(key: string): any {
    try {
        const raw = localStorage.getItem('NEWTOWER_SESSION');
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data[key];
    } catch (e) {
        return null;
    }
}
