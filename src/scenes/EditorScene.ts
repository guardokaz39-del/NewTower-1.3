import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { IMapData, IMapObject, migrateMapData } from '../MapData';
import { serializeMap } from '../Utils';
import { MapStorage } from '../MapStorage';
import { UIUtils } from '../UIUtils';
import { Pathfinder } from '../Pathfinder';
import { WaveEditor } from '../WaveEditor';
import { FogSystem } from '../FogSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { EditorState, EditorMode } from '../editor/EditorState';
import { EditorSidebar } from '../editor/EditorSidebar';
import { WaypointManager } from '../editor/WaypointManager';
import { EditorHistory, EditorActions } from '../editor/EditorHistory';

export class EditorScene extends BaseScene {
    private game: Game;
    private map: MapManager;
    private fog: FogSystem;
    private lighting: LightingSystem;
    private state: EditorState;
    private sidebar!: EditorSidebar;
    private editorRoot!: HTMLElement;
    private canvasWrap!: HTMLElement;
    private statusBar!: HTMLElement;
    private originalCanvasParent: ParentNode | null = null;
    private waypointMgr!: WaypointManager;
    private history!: EditorHistory;
    private activeWaveEditor: WaveEditor | null = null;

    // FEATURE: Saved maps panel
    private mapsPanel!: HTMLElement;
    private currentMapName: string = '';

    // Race condition guard для async refreshMapsPanel
    private _refreshGeneration: number = 0;

    // Hidden file input for JSON import
    private _fileInput!: HTMLInputElement;

    // Track previous mouse state for click detection (not hold)
    private prevMouseDown: boolean = false;
    private lastClickedTile: { col: number; row: number } | null = null;
    private _tileDirty: boolean = true;
    private time: number = 0;
    private isAltDown: boolean = false;

    constructor(game: Game) {
        super();
        this.game = game;

        // Создаем пустую сетку
        const cols = Math.ceil(game.width / CONFIG.TILE_SIZE);
        const rows = Math.ceil(game.height / CONFIG.TILE_SIZE);
        const emptyTiles = Array(rows)
            .fill(0)
            .map(() => Array(cols).fill(0));

        const emptyData: IMapData = {
            width: cols,
            height: rows,
            tiles: emptyTiles,
            waypoints: [],
            objects: [],
        };

        this.map = new MapManager(emptyData);
        this.fog = new FogSystem(emptyData);
        this.lighting = new LightingSystem(game.width, game.height);
        this.waypointMgr = new WaypointManager();
        this.history = new EditorHistory();
        this.state = new EditorState();
        this.createUI();
        this.createMapsPanel();
        // Hotkeys are now set up in onEnterImpl
    }

    protected onEnterImpl() {
        this.originalCanvasParent = this.game.canvas.parentNode;

        // Setup Layout (Overlay Mode)
        this.editorRoot = document.createElement('div');
        this.editorRoot.id = 'editor-root';
        Object.assign(this.editorRoot.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '1000',
            overflow: 'hidden'
        });

        // 1. Sidebar (absolute, z: 50)
        this.editorRoot.appendChild(this.sidebar.getElement());

        // 2. Overlay Backdrop (absolute, z: 40)
        const overlay = document.createElement('div');
        overlay.className = 'editor-overlay';
        Object.assign(overlay.style, {
            position: 'absolute',
            inset: '0',
            background: 'rgba(0,0,0,0.5)',
            zIndex: '40',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity 160ms ease'
        });

        // Link sidebar collapse to overlay visibility
        this.sidebar.onToggle = (isCollapsed: boolean) => {
            if (isCollapsed) {
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
            } else {
                overlay.style.opacity = '1';
                overlay.style.pointerEvents = 'auto'; // Block clicks to canvas while interacting with sidebar
            }
        };

        // Click overlay to close sidebar
        overlay.onclick = () => {
            this.sidebar.collapse(); // Needs new public method in EditorSidebar
        };

        this.editorRoot.appendChild(overlay);

        // 3. Canvas Wrap (absolute, z: 0)
        this.canvasWrap = document.createElement('div');
        this.canvasWrap.id = 'editor-canvas-wrap';
        Object.assign(this.canvasWrap.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '0'
        });

        this.canvasWrap.appendChild(this.game.canvas);

        this.statusBar = document.createElement('div');
        this.statusBar.id = 'editor-statusbar';
        Object.assign(this.statusBar.style, {
            position: 'absolute',
            bottom: '0',
            width: '100%',
            height: '24px',
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontSize: '12px',
            zIndex: '1000'
        });
        this.canvasWrap.appendChild(this.statusBar);

        this.editorRoot.appendChild(this.canvasWrap);
        document.body.appendChild(this.editorRoot);
        this.game.resize();

        // Initial state sync
        this.sidebar.onToggle(this.sidebar.getIsCollapsed());

        this.mapsPanel.style.display = 'block';

        // Hide standard game UI
        (this.game as any).uiRoot.hideGameUI(); // Cast as any if TS doesn't know yet

        // Remove any leaked Bestiary buttons
        document.querySelectorAll('button[title="Bestiary"]').forEach(btn => {
            if (btn.parentNode) btn.parentNode.removeChild(btn);
        });
        // Initial fog render
        this.fog.update(0);

        // Setup hotkeys with automatic cleanup
        this.on(document, 'keydown', (e: Event) => this.handleGlobalKey(e as KeyboardEvent));
        this.on(document, 'keyup', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Alt') this.isAltDown = false;
        });

        // Prevent Alt key from getting stuck if window loses focus
        this.on(window, 'blur', () => {
            this.isAltDown = false;
        });
    }

    protected onExitImpl() {
        // Restore Canvas
        if (this.originalCanvasParent) {
            this.originalCanvasParent.appendChild(this.game.canvas);
        }
        if (this.editorRoot && this.editorRoot.parentNode) {
            this.editorRoot.parentNode.removeChild(this.editorRoot);
        }
        if (this.sidebar) {
            this.sidebar.destroy();
        }
        this.game.resize();

        if (this.activeWaveEditor) {
            this.activeWaveEditor.destroy();
            this.activeWaveEditor = null;
        }
        // BaseScene.dispose() handles listener cleanup
    }

    public update(dt: number) {
        this.time += dt;
        // Don't update fog animation in editor - only static rendering
        const input = this.game.input;

        // Begin compound action on mouse down (for paint modes)
        if (input.isMouseDown && !this.prevMouseDown) {
            if (this.isPaintMode(this.state.mode)) {
                this.history.beginCompound(this.state.mode);
            }
        }

        // Handle mouse input - works on hold
        if (input.isMouseDown && input.hoverCol >= 0 && input.hoverRow >= 0) {
            // Check if clicked on a different tile
            const isDifferentTile =
                !this.lastClickedTile ||
                this.lastClickedTile.col !== input.hoverCol ||
                this.lastClickedTile.row !== input.hoverRow;

            if (isDifferentTile) {
                if (this.isAltDown || this.state.mode === 'eyedropper') {
                    // Eyedropper
                    this.doEyedropper(input.hoverCol, input.hoverRow);
                    // Do not mark lastClickedTile here so we can drag eyedropper if needed, but usually it's just one click.
                    // Actually, let's mark it to avoid spamming eyedropper.
                    this.lastClickedTile = { col: input.hoverCol, row: input.hoverRow };
                } else {
                    this.handleInput(input.hoverCol, input.hoverRow);
                    this.lastClickedTile = { col: input.hoverCol, row: input.hoverRow };
                    this._tileDirty = true;
                    // Trigger fog re-render after data change (static, no animation)
                    this.fog.update(0);
                }
            }
        }

        // Mouse release -> Commit
        if (!input.isMouseDown && this.prevMouseDown) {
            this.history.commitCompound();
        }

        // Update previous state
        this.prevMouseDown = input.isMouseDown;

        // Reset last clicked tile when mouse is released
        if (!input.isMouseDown) {
            this.lastClickedTile = null;
        }
    }

    private handleInput(col: number, row: number) {
        if (this.state.mode === 'fill') {
            alert('Fill mode active. Please select a paint mode (like grass/road) and press F to fill!');
            return;
        }

        const isPaint = this.isPaintMode(this.state.mode);
        const size = isPaint ? this.state.brushSize : 1;
        const offset = Math.floor(size / 2); // e.g., size 3 -> offset 1 (draws -1, 0, +1)
        // actually brush usually draws down-right or center. Let's do center: 
        const startX = size === 1 ? col : col - offset;
        const startY = size === 1 ? row : row - offset;

        // If painting fog with a brush size > 1, we want to cycle ONLY ONCE based on the center tile,
        // and apply that new density uniformly to all brushed tiles.
        let targetFogDensity = -1;
        if (this.state.mode === 'paint_fog') {
            const oldCenter = this.fog.getFog(col, row);
            targetFogDensity = (oldCenter + 1) % 6; // Cycle center's density
        }

        // For large brushes, we wrap in one compound action if not already wrapped
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                this.applyToolAt(startX + dx, startY + dy, targetFogDensity);
            }
        }
    }

    private applyToolAt(col: number, row: number, targetFogDensity: number = -1) {
        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return;

        const oldTileType = this.map.grid[row][col].type;
        const oldFogDensity = this.fog.getFog(col, row);

        if (this.state.mode === 'paint_road') {
            console.log('[EditorScene] paint_road mode active, tile type:', oldTileType, '→ 1');
            if (oldTileType !== 1) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 1));
                this.map.grid[row][col].type = 1;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                this._tileDirty = true;
                console.log('[EditorScene] Road painted at', col, row);
            } else {
                console.log('[EditorScene] Tile already road, skipping');
            }
        } else if (this.state.mode === 'paint_grass') {
            if (oldTileType !== 0) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 0));
                this.map.grid[row][col].type = 0;
                Pathfinder.invalidateCache();
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'paint_water') {
            if (oldTileType !== 2) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 2));
                this.map.grid[row][col].type = 2;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'paint_sand') {
            if (oldTileType !== 3) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 3));
                this.map.grid[row][col].type = 3;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'paint_bridge') {
            if (oldTileType !== 4) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 4));
                this.map.grid[row][col].type = 4;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'paint_lava') {
            if (oldTileType !== 5) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 5));
                this.map.grid[row][col].type = 5;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'paint_dirt') {
            if (oldTileType !== 6) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 6));
                this.map.grid[row][col].type = 6;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'paint_fog') {
            if (targetFogDensity >= 0 && oldFogDensity !== targetFogDensity) {
                this.history.pushInCompound(EditorActions.createFogAction(this.fog, col, row, oldFogDensity, targetFogDensity));
                this.fog.setFog(col, row, targetFogDensity);
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'eraser') {
            // FEATURE: Eraser - reset to grass, remove fog, and remove objects
            const hasObject = this.map.objects.find(obj => {
                const size = obj.size || 1;
                return col >= obj.x && col < obj.x + size &&
                    row >= obj.y && row < obj.y + size;
            });

            if (oldTileType !== 0 || oldFogDensity !== 0 || hasObject) {
                // Сброс тайла в траву
                if (oldTileType !== 0) {
                    this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 0));
                    this.map.grid[row][col].type = 0;
                    this.map.grid[row][col].decor = null;
                    Pathfinder.invalidateCache();
                    this._tileDirty = true;
                }
                // Удаление тумана
                if (oldFogDensity !== 0) {
                    this.history.pushInCompound(EditorActions.createFogAction(this.fog, col, row, oldFogDensity, 0));
                    this.fog.setFog(col, row, 0);
                }
                // Удаление объектов (все объекты, перекрывающие этот тайл)
                if (hasObject) {
                    this.map.objects = this.map.objects.filter(obj => {
                        const size = obj.size || 1;
                        const overlaps = col >= obj.x && col < obj.x + size &&
                            row >= obj.y && row < obj.y + size;
                        return !overlaps;
                    });
                    this._tileDirty = true;
                }
            }
        } else if (this.state.mode === 'set_start') {
            const oldState = {
                start: this.waypointMgr.getStart(),
                end: this.waypointMgr.getEnd(),
                waypoints: this.waypointMgr.getWaypoints()
            };
            this.history.push(EditorActions.createWaypointAction(this.waypointMgr, 'setStart', { x: col, y: row }, oldState));
            this.waypointMgr.setStart({ x: col, y: row });
            this.map.grid[row][col].type = 1;
            this._tileDirty = true;
        } else if (this.state.mode === 'set_end') {
            const oldState = {
                start: this.waypointMgr.getStart(),
                end: this.waypointMgr.getEnd(),
                waypoints: this.waypointMgr.getWaypoints()
            };
            this.history.push(EditorActions.createWaypointAction(this.waypointMgr, 'setEnd', { x: col, y: row }, oldState));
            this.waypointMgr.setEnd({ x: col, y: row });
            this.map.grid[row][col].type = 1;
            this._tileDirty = true;
        } else if (this.state.mode === 'place_waypoint') {
            if (this.waypointMgr.canAddWaypoint()) {
                const oldState = {
                    start: this.waypointMgr.getStart(),
                    end: this.waypointMgr.getEnd(),
                    waypoints: this.waypointMgr.getWaypoints()
                };
                this.history.push(EditorActions.createWaypointAction(this.waypointMgr, 'addWaypoint', { x: col, y: row }, oldState));
                this.waypointMgr.addWaypoint({ x: col, y: row });
                this._tileDirty = true;
            }
        } else if (this.state.mode === 'place_stone') {
            this.placeObject(col, row, 'stone', 1);
        } else if (this.state.mode === 'place_rock') {
            // Скалы - рандомный размер 2-3 тайла
            const size = Math.random() > 0.5 ? 3 : 2;
            this.placeObject(col, row, 'rock', size);
        } else if (this.state.mode === 'place_tree') {
            this.placeObject(col, row, 'tree', 1);
        } else if (this.state.mode === 'place_wheat') {
            this.placeObject(col, row, 'wheat', 1);
        } else if (this.state.mode === 'place_flowers') {
            this.placeObject(col, row, 'flowers', 1);
        } else if (this.state.mode === 'place_bush') {
            this.placeObject(col, row, 'bush', 1);
        } else if (this.state.mode === 'place_pine') {
            this.placeObject(col, row, 'pine', 1);
        } else if (this.state.mode === 'place_crate') {
            this.placeObject(col, row, 'crate', 1);
        } else if (this.state.mode === 'place_barrel') {
            this.placeObject(col, row, 'barrel', 1);
        } else if (this.state.mode === 'place_torch_stand') {
            this.placeObject(col, row, 'torch_stand', 1);
        } else if (this.state.mode === 'place_mushroom') {
            this.placeObject(col, row, 'mushroom', 1);
        } else if (this.state.mode === 'place_stump') {
            this.placeObject(col, row, 'stump', 1);
        } else if (this.state.mode === 'place_bones') {
            this.placeObject(col, row, 'bones', 1);
        } else if (this.state.mode === 'place_crystal') {
            this.placeObject(col, row, 'crystal', 1);
        }
    }

    private doEyedropper(col: number, row: number) {
        if (col >= this.map.cols || row >= this.map.rows) return;

        // Check objects first
        const obj = this.map.objects.find(o => {
            const size = o.size || 1;
            return col >= o.x && col < o.x + size && row >= o.y && row < o.y + size;
        });

        if (obj) {
            this.state.setMode(`place_${obj.type}` as EditorMode);
            return;
        }

        // Then fog
        const fog = this.fog.getFog(col, row);
        if (fog > 0) {
            this.state.setMode('paint_fog');
            return;
        }

        // Then tiles
        const type = this.map.grid[row][col].type;
        switch (type) {
            case 0: this.state.setMode('paint_grass'); break;
            case 1: this.state.setMode('paint_road'); break;
            case 2: this.state.setMode('paint_water'); break;
            case 3: this.state.setMode('paint_sand'); break;
            case 4: this.state.setMode('paint_bridge'); break;
            case 5: this.state.setMode('paint_lava'); break;
            case 6: this.state.setMode('paint_dirt'); break;
            default: this.state.setMode('paint_grass'); break;
        }
    }

    private applyFill(startCol: number, startRow: number, fillMode: EditorMode) {
        if (startCol < 0 || startCol >= this.map.cols || startRow < 0 || startRow >= this.map.rows) return;

        // Parse target tile type from mode
        let targetType = 0;
        switch (fillMode) {
            case 'paint_grass': targetType = 0; break;
            case 'paint_road': targetType = 1; break;
            case 'paint_water': targetType = 2; break;
            case 'paint_sand': targetType = 3; break;
            case 'paint_bridge': targetType = 4; break;
            case 'paint_lava': targetType = 5; break;
            case 'paint_dirt': targetType = 6; break;
            default: return; // Can only fill with tile types, not objects
        }

        const originalType = this.map.grid[startRow][startCol].type;
        if (originalType === targetType) return; // Nothing to do

        // BFS
        const queue: { c: number, r: number }[] = [{ c: startCol, r: startRow }];
        const visited = new Set<string>();
        visited.add(`${startCol},${startRow}`);

        this.history.beginCompound('fill');

        while (queue.length > 0) {
            const currentObj = queue.shift();
            if (!currentObj) break;
            const { c, r } = currentObj;

            // Apply fill
            this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, c, r, originalType, targetType));
            this.map.grid[r][c].type = targetType;
            this.map.grid[r][c].decor = null;

            // Neighbors
            const neighbors = [
                { c: c, r: r - 1 },
                { c: c, r: r + 1 },
                { c: c - 1, r: r },
                { c: c + 1, r: r }
            ];

            for (const n of neighbors) {
                if (n.c >= 0 && n.c < this.map.cols && n.r >= 0 && n.r < this.map.rows) {
                    const key = `${n.c},${n.r}`;
                    if (!visited.has(key) && this.map.grid[n.r][n.c].type === originalType) {
                        visited.add(key);
                        queue.push(n);
                    }
                }
            }
        }

        this.history.commitCompound();
        Pathfinder.invalidateCache();
        this._tileDirty = true;
    }

    /**
     * Place an object on the map
     */
    private placeObject(col: number, row: number, type: string, size: number): void {
        // Проверка границ для больших объектов
        if (col + size > this.map.cols || row + size > this.map.rows) {
            return; // Выходит за границы
        }

        // Удалить существующие объекты в этой области
        this.map.objects = this.map.objects.filter(obj => {
            const objSize = obj.size || 1;
            // Проверка пересечения
            const overlaps = !(col + size <= obj.x || col >= obj.x + objSize ||
                row + size <= obj.y || row >= obj.y + objSize);
            return !overlaps;
        });

        // Добавить новый объект
        const newObj = {
            type,
            x: col,
            y: row,
            properties: {},
            size: size > 1 ? size : undefined
        };
        this.map.objects.push(newObj);
        this._tileDirty = true;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.width, this.game.height);

        if (this._tileDirty) {
            for (let y = 0; y < this.map.rows; y++) {
                for (let x = 0; x < this.map.cols; x++) {
                    this.map.tiles[y][x] = this.map.grid[y][x].type;
                }
            }

            // CRITICAL FIX: Regenerate prerendered cache after tile changes
            // The Map.draw() uses a cached canvas that must be updated when tiles change
            this.map.prerender();
            this._tileDirty = false;
        }

        // We do NOT overwrite map.waypoints here every frame anymore.
        // It prevents saving them correctly.
        this.map.draw(ctx);
        this.map.drawAnimatedTiles(ctx, this.time);

        // Draw dynamic objects (e.g., Crystals) that were stripped from baked prerendering
        const dynamicRenderables = this.map.getDynamicRenderables(this.time);
        for (let i = 0; i < dynamicRenderables.length; i++) {
            dynamicRenderables[i].render(ctx);
        }

        if (this.state.gridVisible) {
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 0.5;
            const TS = 64; // Fallback, assuming CONFIG.TILE_SIZE=64 if not imported. Wait, CONFIG is imported!
            // Let's check config import. EditorScene has CONFIG actually? Yes, it uses CONFIG.TILE_SIZE below.
            const gridSize = 64; // We can use CONFIG.TILE_SIZE if we know it exists, but hardcoding 64 is safe as TS=64 is standard in this project. Wait, I see "CONFIG.TILE_SIZE" below so I will use it.
            const w = this.map.cols * CONFIG.TILE_SIZE;
            const h = this.map.rows * CONFIG.TILE_SIZE;
            ctx.beginPath();
            for (let x = 0; x <= w; x += CONFIG.TILE_SIZE) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
            }
            for (let y = 0; y <= h; y += CONFIG.TILE_SIZE) {
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
            }
            ctx.stroke();
        }

        this.fog.draw(ctx);

        // --- Phase 5: Time of Day (Night Preview) ---
        if (this.state.timeOfDay === 'night') {
            if ((this.lighting as any).width !== this.game.width || (this.lighting as any).height !== this.game.height) {
                this.lighting.resize(this.game.width, this.game.height);
            }
            this.lighting.clear();
            this.lighting.ambientLight = 0.4;

            // Draw torches as lights
            const TS = CONFIG.TILE_SIZE;
            for (let i = 0; i < this.map.objects.length; i++) {
                const obj = this.map.objects[i];
                if (obj.type === 'torch_stand') {
                    this.lighting.addLight(obj.x * TS + TS / 2, obj.y * TS + TS / 2, 120, '#ff9800', 1.0);
                }
            }

            this.lighting.render(ctx);
            // Draw torches above darkness temporarily since we just preview lighting
            this.map.drawTorches(ctx, this.time * 60);
        }

        // Draw waypoints with WaypointManager
        this.waypointMgr.draw(ctx);


        const input = this.game.input;
        if (input.hoverCol >= 0) {
            const x = input.hoverCol * CONFIG.TILE_SIZE;
            const y = input.hoverRow * CONFIG.TILE_SIZE;

            ctx.strokeStyle = 'yellow';
            if (this.state.mode === 'paint_grass') ctx.strokeStyle = 'red';
            if (this.state.mode === 'eraser') ctx.strokeStyle = '#ff6600';
            if (this.state.mode === 'set_start') ctx.strokeStyle = 'cyan';
            if (this.state.mode === 'set_end') ctx.strokeStyle = 'magenta';
            if (this.state.mode === 'place_waypoint') ctx.strokeStyle = '#00ff00';

            if (this.state.mode === 'paint_fog') {
                // Show current fog density with color intensity
                const density = this.fog.getFog(input.hoverCol, input.hoverRow);
                const intensity = density * 40 + 80; // 80-280 range
                ctx.strokeStyle = `rgb(${intensity}, ${intensity + 30}, ${intensity + 50})`;

                // Draw density indicator
                ctx.fillStyle = `rgba(200, 215, 230, ${density * 0.15})`;
                ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

                // Draw density number
                if (density > 0) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(density.toString(), x + CONFIG.TILE_SIZE / 2, y + CONFIG.TILE_SIZE / 2);
                }
            }

            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        if (this.statusBar) {
            this.statusBar.innerText = `📍 (${input.hoverCol}, ${input.hoverRow}) │ 🖌️ ${this.state.mode} │ Brush: ${this.state.brushSize}x${this.state.brushSize} │ Grid: ${this.state.gridVisible ? 'ON' : 'OFF'} │ ${this.state.timeOfDay === 'day' ? '☀️ Day' : '🌙 Night'} │ Obj: ${this.map.objects.length}`;
        }
    }

    private openWaveConfig() {
        // Resolve sparse editor waypoints → dense BFS path
        if (this.waypointMgr.isValid()) {
            const resolved = this.resolveFullPath();
            if (!resolved) return; // Error already shown to user
            this.map.waypoints = resolved;
        } else {
            alert('Set Start and End points first!');
            return;
        }

        const currentWaves = this.map.waves || [];

        this.activeWaveEditor = new WaveEditor(
            currentWaves,
            this.map.allowedCards,
            (waves, allowedCards) => {
                this.saveMap(waves, allowedCards);
                this.activeWaveEditor = null;
            },
            () => {
                // Cancelled
                this.activeWaveEditor = null;
            },
        );
    }

    private saveMap(waves: any[], allowedCards?: string[]) {
        // [FIX] Ensure map waves are updated before serialization
        this.map.waves = waves;
        this.map.allowedCards = allowedCards;

        // Resolve sparse editor waypoints → dense BFS path for validation
        if (this.waypointMgr.isValid()) {
            const resolved = this.resolveFullPath();
            if (!resolved) return; // BFS failed — error already shown
            this.map.waypoints = resolved;
            this.map.waypointsMode = 'FULLPATH';
        }

        // Validate before save
        Pathfinder.invalidateCache(); // Ensure fresh BFS
        const errors = this.map.validatePath();
        if (errors.length > 0) {
            const reasons = errors.map(e => `  (${e.x},${e.y}): ${e.reason}`).join('\n');
            alert(`Cannot save map — path validation failed:\n${reasons}`);
            return;
        }

        const data = serializeMap(this.map);
        data.fogData = this.fog.getFogData();
        data.manualPath = this.waypointMgr.isValid(); // Using waypoint manager
        data.timeOfDay = this.state.timeOfDay;
        data.allowedCards = allowedCards;

        const name = prompt('Enter map name:', this.currentMapName || 'MyMap');
        if (!name) return;

        if (MapStorage.saveLocal(name, data)) {
            this.currentMapName = name; // Update current name
            alert(`Map "${name}" saved successfully!`);
            this.refreshMapsPanel(); // Refresh UI
        } else {
            alert('Failed to save map (Storage full?)');
        }
    }

    /**
     * Resolve sparse editor waypoints (Start, WP1, WP2, ..., End)
     * into a dense tile-by-tile BFS path.
     * Returns null if any segment is unreachable.
     */
    private resolveFullPath(): { x: number; y: number }[] | null {
        const sparse = this.waypointMgr.getFullPath();
        if (sparse.length < 2) {
            alert('Need at least Start and End points!');
            return null;
        }

        Pathfinder.invalidateCache();
        const fullPath: { x: number; y: number }[] = [];

        for (let i = 0; i < sparse.length - 1; i++) {
            const from = sparse[i];
            const to = sparse[i + 1];
            const segment = Pathfinder.findPath(this.map.grid, from, to);

            if (segment.length === 0) {
                alert(`No path between (${from.x},${from.y}) → (${to.x},${to.y}).\nCheck that road tiles connect these points.`);
                return null;
            }

            // Append segment, skip first point on subsequent segments to avoid duplicates
            const startIdx = (i === 0) ? 0 : 1;
            for (let j = startIdx; j < segment.length; j++) {
                fullPath.push(segment[j]);
            }
        }

        return fullPath;
    }

    private createUI() {
        this.sidebar = new EditorSidebar(this.state);
        this.sidebar.onSaveMode = () => this.openWaveConfig();
        this.sidebar.onExport = () => this.exportCurrentMap();
        this.sidebar.onImport = () => this.importMapFromFile();
        this.sidebar.onMenu = () => this.game.toMenu();

        // Hidden file input for JSON import
        this._fileInput = document.createElement('input');
        this._fileInput.type = 'file';
        this._fileInput.accept = '.json';
        this._fileInput.style.display = 'none';
        this._fileInput.onchange = () => this.handleFileImport();
        // Append input to sidebar container or body since it's hidden
        this.sidebar.getElement().appendChild(this._fileInput);
    }

    // FEATURE: Create saved maps panel
    private createMapsPanel() {
        this.mapsPanel = document.createElement('div');
        Object.assign(this.mapsPanel.style, {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        });

        // Add to sidebar at the bottom
        this.sidebar.injectCustomElement('📁 SAVED MAPS', this.mapsPanel);

        this.refreshMapsPanel();
    }

    private refreshMapsPanel() {
        const gen = ++this._refreshGeneration;

        // Clear current content
        this.mapsPanel.innerHTML = '';

        // Фаза 1 (sync): показать local карты мгновенно
        const localMaps = MapStorage.getLocalMaps();
        const localNames = Object.keys(localMaps);

        if (localNames.length === 0) {
            const empty = document.createElement('div');
            empty.style.color = '#888';
            empty.style.padding = '10px';
            empty.innerText = 'No saved maps';
            empty.id = 'maps-panel-empty';
            this.mapsPanel.appendChild(empty);
        } else {
            localNames.forEach((name) => {
                this.createMapPanelItem(name, localMaps[name], 'local', false);
            });
        }

        // Фаза 2 (async): дописать bundled карты
        MapStorage.getBundledMaps().then(bundled => {
            if (gen !== this._refreshGeneration) return; // race condition guard

            const bundledNames = Object.keys(bundled).sort();
            if (bundledNames.length === 0) return;

            // Удалить "No saved maps" если он был
            const emptyEl = this.mapsPanel.querySelector('#maps-panel-empty');
            if (emptyEl) emptyEl.remove();

            // Обновить local карты: пометить overridesBundled
            for (const name of localNames) {
                if (name in bundled) {
                    const existingItem = this.mapsPanel.querySelector(`[data-map-name="${name}"]`) as HTMLElement;
                    if (existingItem) {
                        const nameSpan = existingItem.querySelector('.map-name') as HTMLElement;
                        if (nameSpan && !nameSpan.innerText.includes('⚡')) {
                            nameSpan.innerText = `💾 ${name} ⚡`;
                        }
                        // Добавить кнопку Restore
                        this.addRestoreButton(existingItem, name);
                    }
                }
            }

            // Добавить bundled карты (только те, что не перезаписаны)
            for (const name of bundledNames) {
                if (localNames.includes(name)) continue; // local override — уже показана
                this.createMapPanelItem(name, bundled[name], 'bundled', false);
            }
        }).catch(e => {
            console.warn('[EditorScene] Failed to load bundled maps', e);
        });
    }

    /** Создать элемент карты в панели */
    private createMapPanelItem(name: string, data: IMapData, source: 'bundled' | 'local', overridesBundled: boolean) {
        const item = document.createElement('div');
        item.setAttribute('data-map-name', name);
        Object.assign(item.style, {
            background: source === 'bundled' ? '#1a2a3a' : '#222',
            padding: '8px 5px',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box'
        });

        const nameSpan = document.createElement('span');
        nameSpan.className = 'map-name';
        nameSpan.title = name;
        Object.assign(nameSpan.style, {
            color: '#fff',
            flex: '1',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginRight: '5px',
            fontSize: '12px'
        });

        const icon = source === 'bundled' ? '📦' : '💾';
        const suffix = overridesBundled ? ' ⚡' : '';
        nameSpan.innerText = `${icon} ${name}${suffix}`;

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '5px';
        btnContainer.style.flexShrink = '0'; // Prevent buttons from squishing

        // Load button — always available
        const loadBtn = document.createElement('button');
        loadBtn.innerText = '📂';
        loadBtn.title = 'Load';
        Object.assign(loadBtn.style, {
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
        });
        loadBtn.onclick = () => this.loadMap(name, data);
        btnContainer.appendChild(loadBtn);

        // Delete button — only for local maps
        if (source === 'local') {
            const delBtn = document.createElement('button');
            delBtn.innerText = '🗑️';
            delBtn.title = 'Delete';
            Object.assign(delBtn.style, {
                background: '#f44336',
                color: '#fff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
            });
            delBtn.onclick = () => this.deleteMap(name);
            btnContainer.appendChild(delBtn);
        }

        // Restore button for overridden
        if (overridesBundled) {
            this.addRestoreButton(item, name);
        }

        item.appendChild(nameSpan);
        item.appendChild(btnContainer);
        this.mapsPanel.appendChild(item);
    }

    /** Добавить кнопку «Восстановить оригинал» */
    private addRestoreButton(item: HTMLElement, name: string) {
        const btnContainer = item.querySelector('div') as HTMLElement;
        if (!btnContainer) return;
        // Не добавлять дважды
        if (btnContainer.querySelector('.restore-btn')) return;

        const restoreBtn = document.createElement('button');
        restoreBtn.innerText = '⟳';
        restoreBtn.title = 'Восстановить оригинал';
        restoreBtn.className = 'restore-btn';
        Object.assign(restoreBtn.style, {
            background: '#ff9800',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
        });
        restoreBtn.onclick = () => {
            if (!confirm(`Восстановить оригинал карты "${name}"? Локальные изменения будут удалены.`)) return;
            MapStorage.deleteLocal(name);
            this.refreshMapsPanel();
        };
        btnContainer.appendChild(restoreBtn);
    }

    /** Экспорт текущей карты как JSON-файл */
    private exportCurrentMap() {
        const localMaps = MapStorage.getLocalMaps();
        if (!this.currentMapName || !localMaps[this.currentMapName]) {
            alert('Сначала сохраните карту через WAVES & SAVE');
            return;
        }

        const data = localMaps[this.currentMapName];
        const blob = MapStorage.createExportBlob(data);
        const fileName = MapStorage.sanitizeFileName(this.currentMapName) + '.json';

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    /** Инициировать импорт через hidden file input */
    private importMapFromFile() {
        this._fileInput.value = ''; // Reset для повторного выбора того же файла
        this._fileInput.click();
    }

    /** Обработка выбранного файла */
    private async handleFileImport() {
        const file = this._fileInput.files?.[0];
        if (!file) return;

        try {
            const data = await MapStorage.importFromFile(file);
            const defaultName = file.name.replace(/\.json$/i, '');
            const name = prompt('Имя карты:', defaultName);
            if (!name) return;

            // Проверить конфликт имён
            const existing = MapStorage.getLocalMaps();
            if (name in existing) {
                if (!confirm(`Карта "${name}" уже существует. Перезаписать?`)) return;
            }

            MapStorage.saveLocal(name, data);
            this.loadMap(name, data);
            this.refreshMapsPanel();
            alert(`Карта "${name}" импортирована!`);
        } catch (e) {
            alert(`Ошибка импорта: ${(e as Error).message}`);
        }
    }

    private loadMap(name: string, data: any) {
        if (!confirm(`Load map "${name}"? Current work will be lost.`)) return;

        let mapData: IMapData;
        try {
            mapData = migrateMapData(data);
        } catch (e) {
            alert(`Failed to load map "${name}": ${(e as Error).message}`);
            return;
        }

        // Load map data into editor
        this.currentMapName = name;
        this.map = new MapManager(mapData);
        this.fog = new FogSystem(mapData);

        // Sync time of day
        if (mapData.timeOfDay) {
            this.state.setTimeOfDay(mapData.timeOfDay);
        }

        this._tileDirty = true;

        // Clear history on new map load
        this.history.clear();

        // Load waypoints into WaypointManager
        this.waypointMgr.clearAll();
        if (mapData.waypoints && mapData.waypoints.length > 0) {
            // First point is always Start
            this.waypointMgr.setStart(mapData.waypoints[0]);

            // Last point is always End (if more than 1)
            if (mapData.waypoints.length > 1) {
                this.waypointMgr.setEnd(mapData.waypoints[mapData.waypoints.length - 1]);
            }

            // Middle points are waypoints
            for (let i = 1; i < mapData.waypoints.length - 1; i++) {
                this.waypointMgr.addWaypoint(mapData.waypoints[i]);
            }
        }

        // Render loaded fog
        this.fog.update(0);
    }

    private deleteMap(name: string) {
        if (!confirm(`Delete map "${name}"? This cannot be undone.`)) return;

        MapStorage.deleteLocal(name);
        this.refreshMapsPanel();
    }

    private handleGlobalKey(e: KeyboardEvent) {
        // Ignore if typing in input fields
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        // Ctrl+Z - Undo
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (this.history.undo()) {
                this._tileDirty = true;
                this.fog.update(0); // Re-render fog after undo
            }
            return; // Fixed: was return; in original? Yes
        }

        // Ctrl+Shift+Z - Redo
        if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
            e.preventDefault();
            if (this.history.redo()) {
                this._tileDirty = true;
                this.fog.update(0); // Re-render fog after redo
            }
            return;
        }

        // Ctrl+S - Save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.openWaveConfig();
            return;
        }

        // E - Eraser mode
        if (e.key === 'e' || e.key === 'E') {
            this.state.setMode('eraser');
            return;
        }

        if (e.key === 'Alt') {
            this.isAltDown = true;
            return;
        }

        if (e.key === '[') {
            const newSize = Math.max(1, this.state.brushSize - 1);
            this.state.setBrushSize(newSize as 1 | 2 | 3);
            return;
        }

        if (e.key === ']') {
            const newSize = Math.min(3, this.state.brushSize + 1);
            this.state.setBrushSize(newSize as 1 | 2 | 3);
            return;
        }

        if (e.key === 'f' || e.key === 'F') {
            // Hotkey F to fill with current paint mode
            // Actually Fill is meant to fill the area with the current material.
            // Let's implement real fill logic in applyFill!
            if (this.isPaintMode(this.state.mode) && this.state.mode !== 'eraser' && this.state.mode !== 'paint_fog') {
                const input = this.game.input;
                if (input.hoverCol >= 0 && input.hoverRow >= 0) {
                    this.applyFill(input.hoverCol, input.hoverRow, this.state.mode);
                    this._tileDirty = true;
                    this.fog.update(0);
                }
            } else {
                this.state.setMode('fill');
            }
            return;
        }

        if (e.key === 'g' || e.key === 'G') {
            this.state.setGridVisible(!this.state.gridVisible);
            return;
        }

        // Removed 1-3 toolbar categories logic
    }

    private isPaintMode(mode: EditorMode): boolean {
        return mode === 'paint_road' || mode === 'paint_grass' ||
            mode === 'paint_water' || mode === 'paint_sand' ||
            mode === 'paint_bridge' || mode === 'paint_lava' ||
            mode === 'eraser' || mode === 'paint_fog';
    }
}
