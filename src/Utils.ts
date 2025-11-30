import { IWaveConfig } from './MapData';

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class ObjectPool<T> {
    private createFn: () => T;
    private pool: T[] = [];
    constructor(createFn: () => T) { this.createFn = createFn; }
    public obtain(): T { return this.pool.length > 0 ? this.pool.pop()! : this.createFn(); }
    public free(obj: T): void {
        if ((obj as any).reset) (obj as any).reset();
        this.pool.push(obj);
    }
}

// ГЕНЕРАТОР ВОЛН (Проверь, что эта функция есть в файле!)
export function generateDefaultWaves(count: number = 10): IWaveConfig[] {
    const waves: IWaveConfig[] = [];
    for (let i = 1; i <= count; i++) {
        const waveEnemies: { type: string, count: number }[] = [];
        // Простая прогрессия
        if (i <= 3) {
            waveEnemies.push({ type: 'grunt', count: 3 + i * 2 });
        } else if (i <= 6) {
            waveEnemies.push({ type: 'grunt', count: 5 });
            waveEnemies.push({ type: 'scout', count: 2 + i });
        } else {
            waveEnemies.push({ type: 'tank', count: Math.floor(i / 2) });
            waveEnemies.push({ type: 'scout', count: 5 });
            waveEnemies.push({ type: 'grunt', count: 10 });
        }
        waves.push({ enemies: waveEnemies });
    }
    return waves;
}