import { BrowserStorageProvider } from '../src/modules/persistence/providers';

class LocalStorageMock {
    private store = new Map<string, string>();

    getItem(key: string): string | null {
        return this.store.has(key) ? this.store.get(key)! : null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
}

describe('BrowserStorageProvider', () => {
    const provider = new BrowserStorageProvider();

    beforeEach(() => {
        (global as any).localStorage = new LocalStorageMock();
    });

    it('save/load/list/delete cycle', async () => {
        const payload = {
            width: 2,
            height: 2,
            tiles: [[0, 0], [1, 1]],
            waypoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            objects: [] as any[],
        };

        expect(await provider.save('maps', 'alpha', payload)).toBe(true);

        const list = await provider.list('maps');
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe('alpha');

        const loaded = await provider.load<typeof payload>('maps', 'alpha');
        expect(loaded?.width).toBe(2);

        expect(await provider.delete('maps', 'alpha')).toBe(true);
        expect(await provider.load('maps', 'alpha')).toBeNull();
    });
});
