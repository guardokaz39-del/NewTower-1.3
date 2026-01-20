import { CONFIG } from './Config';
import { IMapData, Cell, IMapObject } from './MapData';
import { Assets } from './Assets';
import { Pathfinder } from './Pathfinder';
import { LightingSystem } from './systems/LightingSystem';
import { ObjectRenderer, ObjectType } from './ObjectRenderer';

export class MapManager {
    public cols!: number;
    public rows!: number;

    public grid: Cell[][] = [];

    public tiles: number[][] = [];
    public waypoints: { x: number; y: number }[] = [];
    public waves: any[] = [];
    public lighting?: LightingSystem;
    public objects: IMapObject[] = []; // Objects for decoration and blocking

    constructor(data: IMapData) {
        this.loadMap(data);
    }

    public loadMap(data: IMapData) {
        this.cols = data.width;
        this.rows = data.height;
        this.tiles = data.tiles;
        this.waypoints = data.waypoints;
        this.waves = data.waves || [];
        this.objects = data.objects || []; // Load objects

        // Генерация объекта grid для совместимости с редактором
        this.grid = [];
        for (let y = 0; y < this.rows; y++) {
            const row: Cell[] = [];
            for (let x = 0; x < this.cols; x++) {
                const type = this.tiles[y][x];
                let decor = null;
                // Восстанавливаем декор визуально
                if (type === 2) decor = Math.random() > 0.5 ? 'tree' : 'rock';
                row.push({ type, x, y, decor });
            }
            this.grid.push(row);
        }

        // If waypoints only contain start and end, expand to full path
        if (this.waypoints.length === 2) {
            const fullPath = Pathfinder.findPath(this.grid, this.waypoints[0], this.waypoints[1]);
            if (fullPath.length > 0) {
                this.waypoints = fullPath;
            }
        }
    }

    public isBuildable(col: number, row: number): boolean {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        if (this.tiles[row][col] !== 0) return false; // Only grass is buildable

        // Check if any object occupies this tile
        const hasObject = this.objects.some(obj => {
            const size = obj.size || 1;
            return col >= obj.x && col < obj.x + size &&
                row >= obj.y && row < obj.y + size;
        });

        return !hasObject;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const TS = CONFIG.TILE_SIZE;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const type = this.tiles[y][x];
                const px = x * TS;
                const py = y * TS;

                // Рисуем тайл
                if (type === 1) {
                    // PATH
                    this.drawTile(ctx, 'path', px, py);
                } else {
                    // GRASS (0) - тип 2 больше не используется
                    this.drawTile(ctx, 'grass', px, py);
                    // Сетка (REMOVED: User requested polish, no grid lines)
                    // ctx.strokeStyle = 'rgba(0,0,0,0.05)';
                    // ctx.lineWidth = 1;
                    // ctx.strokeRect(px, py, TS, TS);
                }
            }
        }

        // Draw objects
        for (const obj of this.objects) {
            const px = obj.x * TS;
            const py = obj.y * TS;
            ObjectRenderer.draw(ctx, obj.type as ObjectType, px, py, obj.size || 1);
        }

        if (this.waypoints.length > 0) {
            const start = this.waypoints[0];
            const end = this.waypoints[this.waypoints.length - 1];
            this.drawIcon(ctx, '☠️', start.x, start.y);
            this.drawIcon(ctx, '🏰', end.x, end.y);
        }
    }

    // [NEW] Draw Torches overlay (called from GameScene after main draw)
    public drawTorches(ctx: CanvasRenderingContext2D, time: number = 0) {
        if (!this.lighting) return;

        // Always active, but intensity might vary if we want them to look "on" all the time
        // User requested: "flame on torches disappeared... fix it"
        // We removed the ambientLight check so they are always drawn.

        const TS = CONFIG.TILE_SIZE;
        // Intensity: Always full flame visibility
        const intensity = 1.0;

        // Light radius: 1.5 tiles
        const radiusVal = TS * 1.5;

        const checkGrass = (cx: number, cy: number) => {
            if (cx < 0 || cx >= this.cols || cy < 0 || cy >= this.rows) return true; // Edge is grass-like
            return this.tiles[cy][cx] !== 1; // 1 is path
        };

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.tiles[y][x] === 1) { // Path

                    // Identify borders with grass
                    const top = checkGrass(x, y - 1);
                    const bottom = checkGrass(x, y + 1);
                    const left = checkGrass(x - 1, y);
                    const right = checkGrass(x + 1, y);

                    // Place torch if border exists
                    // Throttle placement (one torch per N valid spots)
                    // We use distinct hashes for different sides so they don't sync up perfectly

                    const drawTorchAt = (tx: number, ty: number, colorHash: number) => {
                        // Smooth flicker using Sine waves
                        // Combine 2 sines for non-repeating feel
                        const flickerBase = Math.sin(time * 0.1 + colorHash) * 0.05 + Math.sin(time * 0.03 + colorHash * 2) * 0.05;
                        // Occasional "pop"
                        const pop = (Math.random() > 0.98) ? (Math.random() * 0.1) : 0;

                        const flickerLocal = 1.0 + flickerBase + pop;

                        // Torch Stick
                        ctx.fillStyle = '#5d4037';
                        ctx.fillRect(tx - 2, ty, 4, 6);

                        // Flame
                        // Always visible now
                        const size = (8 + flickerBase * 4);
                        ctx.fillStyle = `rgba(255, 87, 34, ${0.8 + flickerBase})`;
                        ctx.beginPath();
                        ctx.arc(tx, ty + 2, size / 2, 0, Math.PI * 2);
                        ctx.fill();

                        // Inner Flame
                        ctx.fillStyle = `rgba(255, 235, 59, ${0.8 + flickerBase})`;
                        ctx.beginPath();
                        ctx.arc(tx, ty + 2, size / 4, 0, Math.PI * 2);
                        ctx.fill();

                        // Light
                        // User: "torch gives a circle of light... bright near torch and fades to edge... radius 1.5 tiles"
                        // We use the LightingSystem to add the light.
                        // LightingSystem uses additive blending or 'destination-out' depending on logic.
                        // Assuming LightingSystem adds light to the dark overlay.

                        const lightRadius = radiusVal + flickerBase * 5;

                        // We want the light to be noticeable. 
                        this.lighting!.addLight(tx, ty, lightRadius, '#ff9100', 0.8 * flickerLocal);
                    };

                    const spacing = 4; // Every 4th valid spot roughly

                    if (top && (x + y * 7) % spacing === 0) {
                        drawTorchAt(x * TS + TS / 2, y * TS + 4, 0);
                    }
                    if (bottom && (x + y * 13) % spacing === 0) {
                        drawTorchAt(x * TS + TS / 2, y * TS + TS - 4, 1);
                    }
                    if (left && (y + x * 11) % spacing === 0) {
                        drawTorchAt(x * TS + 4, y * TS + TS / 2, 2);
                    }
                    if (right && (y + x * 17) % spacing === 0) {
                        drawTorchAt(x * TS + TS - 4, y * TS + TS / 2, 3);
                    }
                }
            }
        }
    }

    private drawTile(ctx: CanvasRenderingContext2D, key: string, x: number, y: number) {
        // Phase 2: Bitmasking для path
        if (key === 'path') {
            // Вычислить координаты тайла
            const col = Math.floor(x / CONFIG.TILE_SIZE);
            const row = Math.floor(y / CONFIG.TILE_SIZE);

            // Проверить соседей (для битмаска)
            const NORTH = (row > 0 && this.tiles[row - 1][col] === 1) ? 1 : 0;
            const WEST = (col > 0 && this.tiles[row][col - 1] === 1) ? 1 : 0;
            const EAST = (col < this.cols - 1 && this.tiles[row][col + 1] === 1) ? 1 : 0;
            const SOUTH = (row < this.rows - 1 && this.tiles[row + 1][col] === 1) ? 1 : 0;

            // Вычислить индекс битмаска (0-15)
            const bitmask = NORTH | (WEST << 1) | (EAST << 2) | (SOUTH << 3);

            // Получить соответствующий path tile
            const pathTile = Assets.get(`path_${bitmask}`);

            if (pathTile) {
                ctx.drawImage(pathTile, x, y);
            } else {
                // Fallback - простой path
                const fallback = Assets.get('path');
                if (fallback) {
                    ctx.drawImage(fallback, x, y);
                } else {
                    ctx.fillStyle = '#ded29e';
                    ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                }
            }
            return;
        }

        // Grass (с вариативностью)
        // FIX: Use deterministic variant to prevent flickering (Assets.get is random)
        let img: HTMLCanvasElement | HTMLImageElement | undefined;

        if (key === 'grass') {
            const variantCount = Assets.getVariantCount('grass');
            if (variantCount > 0) {
                // Deterministic index based on position
                const index = Math.abs((x * 73 + y * 37)) % variantCount;
                img = Assets.getVariant('grass', index);
            } else {
                img = Assets.get('grass');
            }
        } else {
            img = Assets.get(key);
        }

        if (img) {
            // Для разнообразия травы - случайное отражение
            if (key === 'grass') {
                // Используем координаты для детерминированной "случайности"
                const seed = x * 73 + y * 37;
                const flipH = (seed % 2) === 0;
                const flipV = (Math.floor(seed / 2) % 2) === 0;

                ctx.save();
                ctx.translate(x + CONFIG.TILE_SIZE / 2, y + CONFIG.TILE_SIZE / 2);
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                ctx.drawImage(img, -CONFIG.TILE_SIZE / 2, -CONFIG.TILE_SIZE / 2);
                ctx.restore();
            } else {
                ctx.drawImage(img, x, y);
            }
        } else {
            ctx.fillStyle = key === 'path' ? '#ded29e' : '#8bc34a';
            ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    private drawIcon(ctx: CanvasRenderingContext2D, icon: string, col: number, row: number) {
        const halfTile = CONFIG.TILE_SIZE / 2;
        const x = col * CONFIG.TILE_SIZE + halfTile;
        const y = row * CONFIG.TILE_SIZE + halfTile;
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
    }

    public validatePath(_start: { x: number; y: number }, _end: { x: number; y: number }): { x: number; y: number }[] {
        return [];
    }
}
