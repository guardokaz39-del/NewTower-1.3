import { CONFIG } from './Config';
import { IMapData, Cell, IMapObject, WaypointsMode } from './MapData';
import { Assets } from './Assets';
import { Pathfinder } from './Pathfinder';
import { FlowField } from './FlowField';
import { LightingSystem } from './systems/LightingSystem';
import { ObjectRenderer, ObjectType } from './ObjectRenderer';

export interface PathError {
    x: number;
    y: number;
    reason: 'blocked' | 'disconnected' | 'unreachable' | 'loop';
}

export class MapManager {
    public cols!: number;
    public rows!: number;

    public grid: Cell[][] = [];

    public tiles: number[][] = [];
    public waypoints: { x: number; y: number }[] = [];
    public waypointsMode: WaypointsMode = 'ENDPOINTS'; // Default

    public waves: any[] = [];
    public lighting?: LightingSystem;
    public objects: IMapObject[] = []; // Objects for decoration and blocking
    public flowField: FlowField;

    private cacheCanvas: HTMLCanvasElement;

    // Dirty flag pattern for FlowField optimization
    private isFlowFieldDirty: boolean = false;

    constructor(data: IMapData) {
        this.loadMap(data);
    }

    public loadMap(data: IMapData) {
        this.cols = data.width;
        this.rows = data.height;
        this.tiles = data.tiles;
        this.waves = data.waves || [];
        this.objects = data.objects || []; // Load objects

        // Default or Derived Waypoints Mode
        if (data.waypointsMode) {
            this.waypointsMode = data.waypointsMode;
        } else {
            // Migration Logic: Implicit Mode
            if (!data.waypoints || data.waypoints.length <= 2) {
                this.waypointsMode = 'ENDPOINTS';
            } else {
                this.waypointsMode = 'FULLPATH';
            }
        }

        // Copy waypoints initially
        this.waypoints = data.waypoints || [];

        // Build grid object for runtime usage
        this.grid = [];
        for (let y = 0; y < this.rows; y++) {
            const row: Cell[] = [];
            for (let x = 0; x < this.cols; x++) {
                const type = this.tiles[y][x];
                let decor = null;
                // Basic visual decor restoration
                if (type === 2) decor = Math.random() > 0.5 ? 'tree' : 'rock';
                row.push({ type, x, y, decor });
            }
            this.grid.push(row);
        }

        // STRICT LOADER CONTRACT
        if (this.waypointsMode === 'ENDPOINTS') {
            // RASTER IS CANONICAL
            // We expect strictly 2 waypoints (Start/End) or at least 2.
            // If < 2, we can't do anything (Editor should prevent saving this state).
            if (this.waypoints.length >= 2) {
                const start = this.waypoints[0];
                const end = this.waypoints[this.waypoints.length - 1];

                // Clear cache because mapping just loaded/changed
                Pathfinder.invalidateCache();

                const fullPath = Pathfinder.findPath(this.grid, start, end);
                if (fullPath.length > 0) {
                    this.waypoints = fullPath;
                } else {
                    console.error('[MapManager] Failed to derive path from endpoints!', start, end);
                    // Critical Error in Dev, might want to fallback or show UI error
                }
            }
        } else {
            // FULLPATH: VECTOR IS CANONICAL
            // We leave this.waypoints AS IS.
            // Validation happens separately.
        }

        // Initialize or Resize FlowField (Reuse buffers)
        if (!this.flowField) {
            this.flowField = new FlowField(this.cols, this.rows);
        } else {
            this.flowField.resize(this.cols, this.rows);
        }

        // Initial generation
        this.requestFlowFieldUpdate();
        this.updateFlowField(); // Force immediate update for init

        // Prerender the static map logic
        this.prerender();
        // Cache torches logic
        this.cacheTorches();
    }

    /**
     * Request a flow field rebuild on next update
     */
    public requestFlowFieldUpdate() {
        this.isFlowFieldDirty = true;
    }

    /**
     * Called every frame/tick by GameScene
     */
    public update(_dt: number) {
        if (this.isFlowFieldDirty) {
            this.updateFlowField();
            this.isFlowFieldDirty = false;
        }
    }

    /**
     * Regenerates the Flow Field based on current grid and target.
     */
    private updateFlowField() {
        let target = { x: 0, y: 0 };
        if (this.waypoints.length > 0) {
            target = this.waypoints[this.waypoints.length - 1];
        }

        // Mark pathfinder cache invalid if we are updating flow (likely means tiles changed)
        // Although loadMap handles init, if this is called from Editor, we likely changed tiles.
        Pathfinder.invalidateCache();

        this.flowField.generate(this.grid, target);
        console.log('[MapManager] FlowField Regenerated. Version:', this.flowField.version);
    }

    public prerender() {
        // Create offscreen canvas
        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = this.cols * CONFIG.TILE_SIZE;
        this.cacheCanvas.height = this.rows * CONFIG.TILE_SIZE;
        const ctx = this.cacheCanvas.getContext('2d');
        if (!ctx) return;

        const TS = CONFIG.TILE_SIZE;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const type = this.tiles[y][x];
                const px = x * TS;
                const py = y * TS;

                // Рисуем тайл на кэш-канвас
                if (type === 1) {
                    this.drawTile(ctx, 'path', px, py);
                } else {
                    this.drawTile(ctx, 'grass', px, py);
                }
            }
        }
    }

    public isBuildable(col: number, row: number): boolean {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;

        // MAZE FORBIDDEN CONTRACT: Cannot build on path
        if (this.tiles[row][col] === 1) return false;

        if (this.tiles[row][col] !== 0) return false; // Only grass is buildable

        // Check if any object occupies this tile
        const hasObject = this.objects.some(obj => {
            const size = obj.size || 1;
            return col >= obj.x && col < obj.x + size &&
                row >= obj.y && row < obj.y + size;
        });

        return !hasObject;
    }

    /**
     * Checks if building at (col, row) would block the path.
     * Delegates to FlowField but includes pre-checks.
     */
    public checkBuildability(col: number, row: number): boolean {
        // 1. Basic check
        if (!this.isBuildable(col, row)) return false;

        // 2. FlowField check
        // We need spawn points to check connectivity
        // In this game, usually we check if ANY spawn is blocked?
        // Or if the Target is reachable from all spawns?

        // Strict Mode: If we are on Grass, and Enemies are strictly on Path,
        // then building on Grass NEVER blocks path.
        // So we can return true immediately if we trust isBuildable!
        if (this.tiles[row][col] === 0) {
            return true;
        }

        // If we assumed "Mazing" was allowed (building on 0 blocks movement),
        // we would call this.flowField.checkBuildability(this.grid, col, row, this.waypoints[0] or spawns);
        // But since we enforced strict rules:
        return true;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        // 1. Draw cached static background
        if (this.cacheCanvas) {
            ctx.drawImage(this.cacheCanvas, 0, 0);
        }

        const TS = CONFIG.TILE_SIZE;

        // 2. Draw dynamic objects (trees, rocks, etc that are "objects" not tiles)
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

    // [NEW] Cache torch positions to avoid grid scanning every frame
    private torchPositions: { x: number, y: number, colorHash: number }[] = [];

    private cacheTorches() {
        this.torchPositions = [];
        const TS = CONFIG.TILE_SIZE;
        const checkGrass = (cx: number, cy: number) => {
            if (cx < 0 || cx >= this.cols || cy < 0 || cy >= this.rows) return true;
            return this.tiles[cy][cx] !== 1;
        };

        const spacing = 4; // Every 4th valid spot roughly

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.tiles[y][x] === 1) { // Path
                    // Identify borders with grass
                    const top = checkGrass(x, y - 1);
                    const bottom = checkGrass(x, y + 1);
                    const left = checkGrass(x - 1, y);
                    const right = checkGrass(x + 1, y);

                    // Add to cache if valid
                    if (top && (x + y * 7) % spacing === 0) {
                        this.torchPositions.push({ x: x * TS + TS / 2, y: y * TS + 4, colorHash: 0 });
                    }
                    if (bottom && (x + y * 13) % spacing === 0) {
                        this.torchPositions.push({ x: x * TS + TS / 2, y: y * TS + TS - 4, colorHash: 1 });
                    }
                    if (left && (y + x * 11) % spacing === 0) {
                        this.torchPositions.push({ x: x * TS + 4, y: y * TS + TS / 2, colorHash: 2 });
                    }
                    if (right && (y + x * 17) % spacing === 0) {
                        this.torchPositions.push({ x: x * TS + TS - 4, y: y * TS + TS / 2, colorHash: 3 });
                    }
                }
            }
        }
    }

    public drawTorches(ctx: CanvasRenderingContext2D, time: number = 0) {
        if (!this.lighting) return;
        if (this.torchPositions.length === 0) return;

        const TS = CONFIG.TILE_SIZE;
        const radiusVal = TS * 1.5;

        for (const torch of this.torchPositions) {
            const flickerBase = Math.sin(time * 0.1 + torch.colorHash) * 0.05 + Math.sin(time * 0.03 + torch.colorHash * 2) * 0.05;
            const pop = (Math.random() > 0.98) ? (Math.random() * 0.1) : 0;
            const flickerLocal = 1.0 + flickerBase + pop;

            ctx.fillStyle = '#5d4037';
            ctx.fillRect(torch.x - 2, torch.y, 4, 6);

            const size = (8 + flickerBase * 4);
            ctx.fillStyle = `rgba(255, 87, 34, ${0.8 + flickerBase})`;
            ctx.beginPath();
            ctx.arc(torch.x, torch.y + 2, size / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 235, 59, ${0.8 + flickerBase})`;
            ctx.beginPath();
            ctx.arc(torch.x, torch.y + 2, size / 4, 0, Math.PI * 2);
            ctx.fill();

            const lightRadius = radiusVal + flickerBase * 5;
            this.lighting!.addLight(torch.x, torch.y, lightRadius, '#ff9100', 0.8 * flickerLocal);
        }
    }

    private drawTile(ctx: CanvasRenderingContext2D, key: string, x: number, y: number) {
        if (key === 'path') {
            const col = Math.floor(x / CONFIG.TILE_SIZE);
            const row = Math.floor(y / CONFIG.TILE_SIZE);

            const NORTH = (row > 0 && this.tiles[row - 1][col] === 1) ? 1 : 0;
            const WEST = (col > 0 && this.tiles[row][col - 1] === 1) ? 1 : 0;
            const EAST = (col < this.cols - 1 && this.tiles[row][col + 1] === 1) ? 1 : 0;
            const SOUTH = (row < this.rows - 1 && this.tiles[row + 1][col] === 1) ? 1 : 0;

            const bitmask = NORTH | (WEST << 1) | (EAST << 2) | (SOUTH << 3);
            const pathTile = Assets.get(`path_${bitmask}`);

            if (pathTile) {
                ctx.drawImage(pathTile, x, y);
            } else {
                const fallback = Assets.get('path');
                if (fallback) {
                    ctx.drawImage(fallback, x, y);
                } else {
                    ctx.fillStyle = '#c5b8a1';
                    ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                }
            }
            return;
        }

        let img: HTMLCanvasElement | HTMLImageElement | undefined;

        if (key === 'grass') {
            const variantCount = Assets.getVariantCount('grass');
            if (variantCount > 0) {
                const index = Math.abs((x * 73 + y * 37)) % variantCount;
                img = Assets.getVariant('grass', index);
            } else {
                img = Assets.get('grass');
            }
        } else {
            img = Assets.get(key);
        }

        if (img) {
            if (key === 'grass') {
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

    /**
     * Engine-Grade Validation
     * Checks for: Connectivity, Alignment, Continuity, and Loops
     */
    public validatePath(_start?: { x: number; y: number }, _end?: { x: number; y: number }): PathError[] {
        const errors: PathError[] = [];

        // 1. Endpoint Existence
        if (this.waypoints.length < 2) {
            // If we have no waypoints at all, can't validate much, unless map expects them.
            return errors;
        }

        // 2. Alignment Check (All Modes: Path must be on Path Tiles)
        // If WaypointsMode is FULLPATH, this is critical.
        // If ENDPOINTS, it's derived so likely correct, but good to check.
        this.waypoints.forEach(wp => {
            if (wp.x < 0 || wp.x >= this.cols || wp.y < 0 || wp.y >= this.rows) {
                errors.push({ x: wp.x, y: wp.y, reason: 'unreachable' }); // Out of bounds
            } else if (this.tiles[wp.y][wp.x] !== 1) {
                errors.push({ x: wp.x, y: wp.y, reason: 'blocked' }); // Waypoint on Grass/Obstacle
            }
        });

        // 3. Continuity & Loop Check (Only for FULLPATH usually, but good for all)
        if (this.waypointsMode === 'FULLPATH' || this.waypoints.length > 2) {
            const visited = new Set<string>();

            for (let i = 0; i < this.waypoints.length; i++) {
                const wp = this.waypoints[i];
                const key = `${wp.x},${wp.y}`;

                // Self-Intersection / Loop Check
                if (visited.has(key)) {
                    errors.push({ x: wp.x, y: wp.y, reason: 'loop' });
                }
                visited.add(key);

                // Continuity Check (Distance to next)
                if (i < this.waypoints.length - 1) {
                    const next = this.waypoints[i + 1];
                    const dist = Math.abs(next.x - wp.x) + Math.abs(next.y - wp.y); // Manhattan
                    if (dist > 1) {
                        errors.push({ x: wp.x, y: wp.y, reason: 'disconnected' });
                    }
                }
            }
        }

        // 4. Connectivity Check (Raster Reachability)
        // Can we actually get from start to end on grid?
        // This validates if the tiles themselves form a valid corridor
        const start = this.waypoints[0];
        const end = this.waypoints[this.waypoints.length - 1];

        // Only run BFS if endpoints are valid
        if (this.tiles[start.y]?.[start.x] === 1 && this.tiles[end.y]?.[end.x] === 1) {
            const path = Pathfinder.findPath(this.grid, start, end);
            if (path.length === 0) {
                // Disconnected components
                errors.push({ x: end.x, y: end.y, reason: 'unreachable' });
            }
        }

        return errors;
    }
}
