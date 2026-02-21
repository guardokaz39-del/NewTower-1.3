export class AssetCache {
    private static cache: Map<string, HTMLCanvasElement> = new Map();

    /**
     * Универсальный метод получения/создания ассета.
     * @param key Уникальный ключ (напр. 'enemy_orc_walk_0')
     * @param factory Функция, которая нарисует ассет, если его нет
     */
    public static get(key: string, factory: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, width: number, height: number): HTMLCanvasElement {
        if (!this.cache.has(key)) {
            // Simple Cache Cap (Phase 5.C Lite)
            // If cache grows too large, clear it completely to prevent memory leaks
            if (this.cache.size > 4096) {
                console.warn(`[AssetCache] Cache limit reached (${this.cache.size}). Clearing!`);
                this.cache.clear();
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return canvas; // Should not happen

            // Оптимизация: отключаем сглаживание, если нужен пиксель-арт
            // ctx.imageSmoothingEnabled = false; 

            factory(ctx, width, height);
            this.cache.set(key, canvas);
            // console.log(`[AssetCache] Baked: ${key}`);
        }
        return this.cache.get(key)!;
    }

    /**
     * Проверить наличие ассета в кэше без создания.
     */
    public static has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Получить ассет из кэша без создания (вернет undefined если нет).
     */
    public static peek(key: string): HTMLCanvasElement | undefined {
        return this.cache.get(key);
    }

    /**
     * Специфичный метод для градиентных шаров (Particles/Projectiles)
     */
    public static getGlow(color: string, size: number): HTMLCanvasElement {
        const key = `glow_${color}_${size}`;
        return this.get(key, (ctx, w, h) => {
            const center = w / 2;
            const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Полная прозрачность на краях

            // Fixed: removed confusing 'lighter' op that was immediately overwritten
            // The 'lighter' effect should be applied when drawing this sprite to the game canvas, not here.

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }, size, size);
    }

    public static clear() {
        this.cache.clear();
    }
}
