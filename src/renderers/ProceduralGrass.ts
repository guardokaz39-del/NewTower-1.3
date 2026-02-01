import { CONFIG } from '../Config';
import { VISUALS } from '../VisualConfig';

/**
 * Процедурный рендеринг живой травы
 * Добавляет отдельные травинки, камешки и мелкие детали поверх базового слоя
 * 
 * Основные характеристики:
 * - Травинки: 12-18 на тайл, высота 4-8px, наклон ±15°
 * - Камешки: 1-3 на тайл (60% тайлов)
 * - Цветочки: 0-1 на тайл (5% шанс)
 * 
 * Используется для КАЖДОГО варианта grass_0...grass_3
 */
export class ProceduralGrass {
    /**
     * Рендерит слой деталей на уже существующую базу
     * @param ctx Canvas context
     * @param x Pixel X (обычно 0 при генерации в Assets)
     * @param y Pixel Y (обычно 0 при генерации в Assets)
     * @param size Размер тайла (64px)
     * @param seed Детерминированный seed для вариаций
     */
    public static draw(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        seed: number
    ): void {
        // 1. Травинки (основной визуальный элемент)
        this.drawGrassBlades(ctx, x, y, size, seed);

        // 2. Мелкие детали (камешки)
        this.drawPebbles(ctx, x, y, size, seed);

        // 3. Цветочки (очень редко)
        this.drawTinyFlowers(ctx, x, y, size, seed);
    }

    /**
     * Слой 1: Отдельные травинки
     */
    private static drawGrassBlades(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        seed: number
    ): void {
        // Количество травинок: 12-18
        const bladeCount = 12 + (seed % 7); // 12-18

        ctx.strokeStyle = VISUALS.ENVIRONMENT.GRASS.BLADE; // #8bc34a
        ctx.lineWidth = 1;

        for (let i = 0; i < bladeCount; i++) {
            // Детерминированные позиции
            const bx = x + ((seed * 7 + i * 13) % size);
            const by = y + ((seed * 11 + i * 19) % size);

            // Высота травинки: 4-8px
            const height = 4 + ((seed + i * 3) % 5); // 4-8px

            // Наклон: ±15°
            const angleVariation = ((seed + i * 7) % 30) - 15; // -15 to +15
            const angle = angleVariation * Math.PI / 180;

            // Рисуем травинку
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -height); // Вверх от точки
            ctx.stroke();

            ctx.restore();
        }
    }

    /**
     * Слой 2: Мелкие камешки
     */
    private static drawPebbles(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        seed: number
    ): void {
        // Не на всех тайлах есть камешки (60% шанс)
        if (seed % 5 === 0 || seed % 5 === 1) {
            return; // Нет камешков на этом тайле
        }

        // Количество камешков: 1-3
        const pebbleCount = 1 + (seed % 3); // 1-3

        ctx.fillStyle = VISUALS.ENVIRONMENT.GRASS.DETAIL; // #757575

        for (let i = 0; i < pebbleCount; i++) {
            // Детерминированные позиции
            const px = x + ((seed * 17 + i * 23) % size);
            const py = y + ((seed * 19 + i * 29) % size);

            // Размер: 1-2px
            const pebbleSize = 1 + ((seed + i) % 2);

            ctx.fillRect(px, py, pebbleSize, pebbleSize);
        }
    }

    /**
     * Слой 3: Мелкие цветочки (очень редко)
     */
    private static drawTinyFlowers(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        seed: number
    ): void {
        // Очень редко: 5% шанс
        if (seed % 20 !== 0) {
            return; // Нет цветочка на этом тайле
        }

        // Позиция: ближе к краям тайла
        const edge = seed % 4; // 0=top, 1=right, 2=bottom, 3=left
        let fx = x;
        let fy = y;

        switch (edge) {
            case 0: // Top
                fx = x + size / 2 + ((seed % 20) - 10);
                fy = y + 5 + (seed % 10);
                break;
            case 1: // Right
                fx = x + size - 10 - (seed % 10);
                fy = y + size / 2 + ((seed % 20) - 10);
                break;
            case 2: // Bottom
                fx = x + size / 2 + ((seed % 20) - 10);
                fy = y + size - 10 - (seed % 10);
                break;
            case 3: // Left
                fx = x + 5 + (seed % 10);
                fy = y + size / 2 + ((seed % 20) - 10);
                break;
        }

        // Размер: 2-3px
        const flowerSize = 2 + (seed % 2);

        // Яркая точка
        ctx.fillStyle = VISUALS.ENVIRONMENT.GRASS.FLOWER; // #ffeb3b
        ctx.beginPath();
        ctx.arc(fx, fy, flowerSize, 0, Math.PI * 2);
        ctx.fill();

        // Внутренний блик (еще ярче)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(fx, fy, flowerSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
