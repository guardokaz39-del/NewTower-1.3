import { CONFIG } from '../Config';
import { VISUALS } from '../VisualConfig';

/**
 * Процедурный рендеринг каменной дороги
 * Использует битмаскинг для плавного соединения плит
 *
 * Основные характеристики:
 * - Светло-бежевый камень с вариациями
 * - Трещины (2-4 на плиту)
 * - Зернистая текстура (крапинки)
 * - Тёмные края между плитами
 * - Редкие моховые пятна
 */
export class ProceduralRoad {
    /**
     * Рендерит одну каменную плиту с учётом соседей
     * @param ctx Canvas context
     * @param x Pixel X (кратно TILE_SIZE)
     * @param y Pixel Y (кратно TILE_SIZE)
     * @param bitmask Битмаска соседей 0-15 (NORTH|WEST|EAST|SOUTH)
     */
    public static draw(ctx: CanvasRenderingContext2D, x: number, y: number, bitmask: number): void {
        const TS = CONFIG.TILE_SIZE;
        const col = Math.floor(x / TS);
        const row = Math.floor(y / TS);

        // Детерминированный seed для вариаций
        const seed = col * 73 + row * 37;

        // 1. Базовая плита (с вариациями)
        this.drawBaseTile(ctx, x, y, TS, seed);

        // 2. Края/границы (только там где нет соседей)
        this.drawEdges(ctx, x, y, TS, bitmask, seed);

        // 3. Детали (трещины, крапинки)
        this.drawDetails(ctx, x, y, TS, seed);
    }

    /**
     * Слой 1: Базовая текстура камня
     */
    private static drawBaseTile(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
        // Вариация яркости: ±10%
        const brightness = 0.9 + (seed % 20) * 0.01; // 0.9 - 1.09

        // Выбрать базовый оттенок
        const baseColors = [
            VISUALS.ENVIRONMENT.PATH.STONE_BASE, // #c5b8a1
            VISUALS.ENVIRONMENT.PATH.STONE_LIGHT, // #d4c5a9
            VISUALS.ENVIRONMENT.PATH.STONE_DARK, // #b6a890
        ];
        const colorIndex = seed % 3;
        let baseColor = baseColors[colorIndex];

        // Применить вариацию яркости
        baseColor = this.adjustBrightness(baseColor, brightness);

        // Заполнить плиту
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, size, size);

        // Текстура: мелкозернистая (крапинки)
        this.drawGrainTexture(ctx, x, y, size, seed);
    }

    /**
     * Зернистая текстура (мелкие крапинки)
     */
    private static drawGrainTexture(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        seed: number,
    ): void {
        const speckCount = 8 + (seed % 8); // 8-15 крапинок

        ctx.fillStyle = '#5a5a5a'; // Тёмно-серый

        for (let i = 0; i < speckCount; i++) {
            // Детерминированные позиции
            const sx = x + ((seed * 7 + i * 13) % size);
            const sy = y + ((seed * 11 + i * 19) % size);
            const speckSize = 1 + ((seed + i) % 3); // 1-3px

            ctx.fillRect(sx, sy, speckSize, speckSize);
        }
    }

    /**
     * Слой 2: Края между плитами
     * Рисуем темные границы только там, где НЕТ соседей
     */
    private static drawEdges(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        bitmask: number,
        seed: number,
    ): void {
        const NORTH = (bitmask & 1) !== 0;
        const WEST = (bitmask & 2) !== 0;
        const EAST = (bitmask & 4) !== 0;
        const SOUTH = (bitmask & 8) !== 0;

        ctx.strokeStyle = VISUALS.ENVIRONMENT.PATH.EDGE; // #9a8d7a
        ctx.lineWidth = 2;

        // Северная граница
        if (!NORTH) {
            ctx.beginPath();
            ctx.moveTo(x, y + 1);
            ctx.lineTo(x + size, y + 1);
            ctx.stroke();
        }

        // Южная граница
        if (!SOUTH) {
            ctx.beginPath();
            ctx.moveTo(x, y + size - 1);
            ctx.lineTo(x + size, y + size - 1);
            ctx.stroke();
        }

        // Западная граница
        if (!WEST) {
            ctx.beginPath();
            ctx.moveTo(x + 1, y);
            ctx.lineTo(x + 1, y + size);
            ctx.stroke();
        }

        // Восточная граница
        if (!EAST) {
            ctx.beginPath();
            ctx.moveTo(x + size - 1, y);
            ctx.lineTo(x + size - 1, y + size);
            ctx.stroke();
        }
    }

    /**
     * Слой 3: Детали (трещины, мох)
     */
    private static drawDetails(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
        // Трещины: 2-4 на плиту
        const crackCount = 2 + (seed % 3); // 2-4

        ctx.strokeStyle = VISUALS.ENVIRONMENT.PATH.CRACK; // #8b7e6a
        ctx.lineWidth = 1 + (seed % 2); // 1-2px

        for (let i = 0; i < crackCount; i++) {
            this.drawCrack(ctx, x, y, size, seed + i * 100);
        }

        // Мох (опционально, редко): 0-1 пятно
        if (seed % 5 === 0) {
            // 20% шанс
            this.drawMoss(ctx, x, y, size, seed);
        }
    }

    /**
     * Рисует одну трещину
     */
    private static drawCrack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
        // Стартовая точка (край плиты или центр)
        const startX = x + ((seed * 3) % size);
        const startY = y + ((seed * 7) % size);

        // Длина трещины: 20-40px
        const length = 20 + (seed % 21);
        const angle = ((seed % 360) * Math.PI) / 180;

        // Конечная точка
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        // Ломаная линия (3-5 сегментов)
        const segments = 3 + (seed % 3);
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const midX = startX + (endX - startX) * t;
            const midY = startY + (endY - startY) * t;

            // Случайное отклонение ±5px
            const offsetX = ((seed * i * 11) % 11) - 5;
            const offsetY = ((seed * i * 13) % 11) - 5;

            ctx.lineTo(midX + offsetX, midY + offsetY);
        }

        ctx.stroke();
    }

    /**
     * Рисует моховое пятно
     */
    private static drawMoss(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
        // Позиция: угол плиты
        const corner = seed % 4; // 0=NW, 1=NE, 2=SW, 3=SE
        let mossX = x;
        let mossY = y;

        switch (corner) {
            case 0:
                mossX = x + 5;
                mossY = y + 5;
                break; // NW
            case 1:
                mossX = x + size - 10;
                mossY = y + 5;
                break; // NE
            case 2:
                mossX = x + 5;
                mossY = y + size - 10;
                break; // SW
            case 3:
                mossX = x + size - 10;
                mossY = y + size - 10;
                break; // SE
        }

        const mossSize = 3 + (seed % 4); // 3-6px

        ctx.fillStyle = VISUALS.ENVIRONMENT.PATH.MOSS; // #7a8f63
        ctx.globalAlpha = 0.6; // Полупрозрачный
        ctx.beginPath();
        ctx.arc(mossX, mossY, mossSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0; // Восстановить
    }

    /**
     * Вспомогательная функция: изменение яркости цвета
     */
    private static adjustBrightness(color: string, factor: number): string {
        // Простая реализация: конвертировать HEX → RGB → умножить → HEX
        const hex = color.replace('#', '');
        const r = Math.min(255, Math.round(parseInt(hex.substr(0, 2), 16) * factor));
        const g = Math.min(255, Math.round(parseInt(hex.substr(2, 2), 16) * factor));
        const b = Math.min(255, Math.round(parseInt(hex.substr(4, 2), 16) * factor));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
