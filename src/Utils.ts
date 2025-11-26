// Генерация уникального ID (нужно для карт и врагов)
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Умный "Пул" для повторного использования объектов (снарядов, частиц)
// Это критически важно для производительности игры
export class ObjectPool<T> {
    private createFn: () => T;
    private pool: T[] = [];

    constructor(createFn: () => T) {
        this.createFn = createFn;
    }

    public obtain(): T {
        // Если есть свободный объект в запасе - берем его, иначе создаем новый
        return this.pool.length > 0 ? this.pool.pop()! : this.createFn();
    }

    public free(obj: T): void {
        // Если у объекта есть метод сброса (reset), вызываем его
        if ((obj as any).reset) {
            (obj as any).reset();
        }
        this.pool.push(obj); // Возвращаем объект на склад
    }
}