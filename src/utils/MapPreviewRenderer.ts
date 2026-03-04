import { IMapData } from '../MapData';
import { CONFIG } from '../Config';
import { VISUALS } from '../VisualConfig';

const TILE_COLORS: Record<number, string> = {
    0: VISUALS.ENVIRONMENT.GRASS.BASE,      // 0: Grass
    1: VISUALS.ENVIRONMENT.PATH.STONE_BASE, // 1: Path
    2: '#0288d1',                           // 2: Water
    3: '#e6c280',                           // 3: Sand
    4: '#8d6e63',                           // 4: Bridge
    5: '#f4511e',                           // 5: Lava
};

/**
 * Рендерер-структура (stateless) для генерации быстрых UI превью-отрисовок карт.
 * Без создания тяжеловесного MapManager. Отвечает только за отрисовку тайлов/точек интереса на Canvas.
 */
export class MapPreviewRenderer {
    /**
     * Отрисовывает превью карты на переданный CanvasRenderingContext2D. 
     * Scale вычисляется автоматически для строгого Center-Fit (`100% математическая корректность скейлинга`).
     */
    public static drawToCanvas(ctx: CanvasRenderingContext2D, mapData: IMapData, canvasWidth: number, canvasHeight: number, dpr: number = 1): void {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const cols = mapData.width;
        const rows = mapData.height;
        const realWidth = cols * CONFIG.TILE_SIZE;
        const realHeight = rows * CONFIG.TILE_SIZE;

        // Математика scale & padding
        const padding = 20 * dpr;
        const scale = Math.min(
            (canvasWidth - padding) / realWidth,
            (canvasHeight - padding) / realHeight
        );

        const offsetX = (canvasWidth - realWidth * scale) / 2;
        const offsetY = (canvasHeight - realHeight * scale) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Оптимизация: заливаем весь фон базовым цветом (например, травой - 0)
        ctx.fillStyle = TILE_COLORS[0] || '#111';
        ctx.fillRect(0, 0, realWidth, realHeight);

        let currentFillStyle = ctx.fillStyle;

        // Отрисовка тайлов, отличающихся от базового (1+), для минимизации fillRect
        for (let y = 0; y < rows; y++) {
            const row = mapData.tiles[y];
            if (!row) continue;
            for (let x = 0; x < cols; x++) {
                const tileValue = row[x] || 0;
                if (tileValue !== 0) {
                    const color = TILE_COLORS[tileValue] || '#111';
                    if (currentFillStyle !== color) {
                        ctx.fillStyle = color;
                        currentFillStyle = color;
                    }
                    ctx.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                }
            }
        }

        // Map Objects (Trees, Rocks, etc)
        if (mapData.objects && mapData.objects.length > 0) {
            for (const obj of mapData.objects) {
                const px = obj.x * CONFIG.TILE_SIZE;
                const py = obj.y * CONFIG.TILE_SIZE;
                const size = (obj.size || 1) * CONFIG.TILE_SIZE;

                // Simple representation for preview
                if (obj.type === 'tree' || obj.type === 'pine' || obj.type === 'bush') {
                    ctx.fillStyle = VISUALS.ENVIRONMENT.GRASS.DARK; // Dark green
                    ctx.beginPath();
                    ctx.arc(px + size / 2, py + size / 2, size / 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (obj.type === 'rock' || obj.type === 'stone') {
                    ctx.fillStyle = '#666'; // Gray
                    const trim = size * 0.15;
                    ctx.fillRect(px + trim, py + trim, size - trim * 2, size - trim * 2);
                } else {
                    // Crate, barrel, etc.
                    ctx.fillStyle = '#8d6e63'; // Brown
                    const trim = size * 0.2;
                    ctx.fillRect(px + trim, py + trim, size - trim * 2, size - trim * 2);
                }
            }
        }

        // Waypoints (Начало = Спавнер, Конец = База)
        if (mapData.waypoints && mapData.waypoints.length > 0) {
            // Линия пути
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = Math.max(2, 4 * dpr / scale); // Корректируем ширину линии относительно скейла
            if (ctx.setLineDash) ctx.setLineDash([15 / scale, 10 / scale]);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(
                mapData.waypoints[0].x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                mapData.waypoints[0].y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
            );
            for (let i = 1; i < mapData.waypoints.length; i++) {
                ctx.lineTo(
                    mapData.waypoints[i].x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    mapData.waypoints[i].y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
                );
            }
            ctx.stroke();
            if (ctx.setLineDash) ctx.setLineDash([]);

            // Спавнер
            const spawner = mapData.waypoints[0];
            ctx.fillStyle = '#ff5252';
            ctx.beginPath();
            ctx.arc(
                spawner.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                spawner.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                CONFIG.TILE_SIZE * 0.4, 0, Math.PI * 2
            );
            ctx.fill();

            if (mapData.waypoints.length > 1) {
                const ep = mapData.waypoints[mapData.waypoints.length - 1];
                ctx.fillStyle = '#448aff';
                ctx.beginPath();
                ctx.arc(
                    ep.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    ep.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    CONFIG.TILE_SIZE * 0.4, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
