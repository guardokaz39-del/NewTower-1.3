import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { IMapData, IMapObject, migrateMapData } from '../MapData';
import { serializeMap } from '../Utils';
import { UIUtils } from '../UIUtils';
import { Pathfinder } from '../Pathfinder';
import { WaveEditor } from '../WaveEditor';
import { FogSystem } from '../FogSystem';
import { EditorToolbar, EditorMode } from '../editor/EditorToolbar';
import { WaypointManager } from '../editor/WaypointManager';
import { EditorHistory, EditorActions } from '../editor/EditorHistory';
import { StorageManager } from '../modules/persistence/StorageManager';
import { MAP_SAVES_NAMESPACE, SaveMeta } from '../modules/persistence/types';

export class EditorScene extends BaseScene {
    private game: Game;
    private map: MapManager;
    private fog: FogSystem;
    private toolbar!: EditorToolbar;
    private controlsContainer!: HTMLElement;
    private waypointMgr!: WaypointManager;
    private history!: EditorHistory;
    private activeWaveEditor: WaveEditor | null = null;

    private mode: EditorMode = 'paint_road';

    // FEATURE: Saved maps panel
    private mapsPanel!: HTMLElement;
    private mapsPanelExpanded: boolean = false;
    private currentMapName: string = '';
    private mapsMeta: SaveMeta[] = [];
    private storage = StorageManager.getInstance();

    // Track previous mouse state for click detection (not hold)
    private prevMouseDown: boolean = false;
    private lastClickedTile: { col: number; row: number } | null = null;
    private needsPrerender: boolean = true;
    private routeWarningEl!: HTMLElement;
    private routeWarningMessage: string | null = null;

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
        this.waypointMgr = new WaypointManager();
        this.history = new EditorHistory();
        this.createUI();
        this.createMapsPanel();
        // Hotkeys are now set up in onEnterImpl
    }

    protected onEnterImpl() {
        this.toolbar.show();
        this.controlsContainer.style.display = 'flex';
        this.mapsPanel.style.display = 'block';

        // Hide standard game UI
        (this.game as any).uiRoot.hideGameUI(); // Cast as any if TS doesn't know yet

        // Initial fog render
        this.fog.update(0);
        this.markPrerenderDirty();

        // Setup hotkeys with automatic cleanup
        this.on(document, 'keydown', (e: Event) => this.handleGlobalKey(e as KeyboardEvent));

        void this.storage.initialize().then(() => this.refreshMapsPanel());
        this.setupSaveHotReload();
    }

    protected onExitImpl() {
        // Full DOM cleanup (EditorScene is recreated each time by Game.toEditor())
        if (this.toolbar) {
            this.toolbar.destroy();
        }
        if (this.controlsContainer && this.controlsContainer.parentNode) {
            this.controlsContainer.parentNode.removeChild(this.controlsContainer);
        }
        if (this.mapsPanel && this.mapsPanel.parentNode) {
            this.mapsPanel.parentNode.removeChild(this.mapsPanel);
        }
        if (this.history) {
            this.history.clear();
        }
        if (this.activeWaveEditor) {
            this.activeWaveEditor.destroy();
            this.activeWaveEditor = null;
        }
        // BaseScene.dispose() handles listener cleanup
    }

    public update(dt: number) {
        // Don't update fog animation in editor - only static rendering
        const input = this.game.input;

        // Begin compound action on mouse down (for paint modes)
        if (input.isMouseDown && !this.prevMouseDown) {
            if (this.isPaintMode(this.mode)) {
                this.history.beginCompound(this.mode);
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
                const changed = this.handleInput(input.hoverCol, input.hoverRow);
                this.lastClickedTile = { col: input.hoverCol, row: input.hoverRow };

                if (changed) {
                    this.markPrerenderDirty();
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

    private handleInput(col: number, row: number): boolean {
        if (col >= this.map.cols || row >= this.map.rows) return false;

        const oldTileType = this.map.grid[row][col].type;
        const oldFogDensity = this.fog.getFog(col, row);
        let changed = false;

        if (this.mode === 'paint_road') {
            console.log('[EditorScene] paint_road mode active, tile type:', oldTileType, '→ 1');
            if (oldTileType !== 1) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 1));
                this.map.grid[row][col].type = 1;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                console.log('[EditorScene] Road painted at', col, row);
                changed = true;
            } else {
                console.log('[EditorScene] Tile already road, skipping');
            }
        } else if (this.mode === 'paint_grass') {
            if (oldTileType !== 0) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 0));
                this.map.grid[row][col].type = 0;
                Pathfinder.invalidateCache();
                changed = true;
            }
        } else if (this.mode === 'eraser') {
            // FEATURE: Eraser - reset to grass, remove fog, and remove objects
            const hasObject = this.map.objects.find((obj) => {
                const size = obj.size || 1;
                return col >= obj.x && col < obj.x + size && row >= obj.y && row < obj.y + size;
            });

            if (oldTileType !== 0 || oldFogDensity !== 0 || hasObject) {
                // Сброс тайла в траву
                if (oldTileType !== 0) {
                    this.history.pushInCompound(
                        EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 0),
                    );
                    this.map.grid[row][col].type = 0;
                    this.map.grid[row][col].decor = null;
                    Pathfinder.invalidateCache();
                    changed = true;
                }
                // Удаление тумана
                if (oldFogDensity !== 0) {
                    this.history.pushInCompound(EditorActions.createFogAction(this.fog, col, row, oldFogDensity, 0));
                    this.fog.setFog(col, row, 0);
                    changed = true;
                }
                // Удаление объектов (все объекты, перекрывающие этот тайл)
                if (hasObject) {
                    this.map.objects = this.map.objects.filter((obj) => {
                        const size = obj.size || 1;
                        const overlaps = col >= obj.x && col < obj.x + size && row >= obj.y && row < obj.y + size;
                        return !overlaps;
                    });
                    changed = true;
                }
            }
        } else if (this.mode === 'set_start') {
            const oldState = {
                start: this.waypointMgr.getStart(),
                end: this.waypointMgr.getEnd(),
                waypoints: this.waypointMgr.getWaypoints(),
            };
            this.history.push(
                EditorActions.createWaypointAction(this.waypointMgr, 'setStart', { x: col, y: row }, oldState),
            );
            this.waypointMgr.setStart({ x: col, y: row });
            this.map.grid[row][col].type = 1;
            changed = true;
        } else if (this.mode === 'set_end') {
            const oldState = {
                start: this.waypointMgr.getStart(),
                end: this.waypointMgr.getEnd(),
                waypoints: this.waypointMgr.getWaypoints(),
            };
            this.history.push(
                EditorActions.createWaypointAction(this.waypointMgr, 'setEnd', { x: col, y: row }, oldState),
            );
            this.waypointMgr.setEnd({ x: col, y: row });
            this.map.grid[row][col].type = 1;
            changed = true;
        } else if (this.mode === 'place_waypoint') {
            if (this.waypointMgr.canAddWaypoint()) {
                const oldState = {
                    start: this.waypointMgr.getStart(),
                    end: this.waypointMgr.getEnd(),
                    waypoints: this.waypointMgr.getWaypoints(),
                };
                this.history.push(
                    EditorActions.createWaypointAction(this.waypointMgr, 'addWaypoint', { x: col, y: row }, oldState),
                );
                this.waypointMgr.addWaypoint({ x: col, y: row });
                changed = true;
            }
        } else if (this.mode === 'paint_fog') {
            // Cycle fog density: 0 → 1 → 2 → 3 → 4 → 5 → 0
            this.fog.cycleFogDensity(col, row);
            const newFogDensity = this.fog.getFog(col, row);
            if (oldFogDensity !== newFogDensity) {
                this.history.pushInCompound(
                    EditorActions.createFogAction(this.fog, col, row, oldFogDensity, newFogDensity),
                );
                changed = true;
            }
        } else if (this.mode === 'place_stone') {
            changed = this.placeObject(col, row, 'stone', 1);
        } else if (this.mode === 'place_rock') {
            // Скалы - рандомный размер 2-3 тайла
            const size = Math.random() > 0.5 ? 3 : 2;
            changed = this.placeObject(col, row, 'rock', size);
        } else if (this.mode === 'place_tree') {
            changed = this.placeObject(col, row, 'tree', 1);
        } else if (this.mode === 'place_wheat') {
            changed = this.placeObject(col, row, 'wheat', 1);
        } else if (this.mode === 'place_flowers') {
            changed = this.placeObject(col, row, 'flowers', 1);
        }

        return changed;
    }

    /**
     * Place an object on the map
     */
    private placeObject(col: number, row: number, type: string, size: number): boolean {
        // Проверка границ для больших объектов
        if (col + size > this.map.cols || row + size > this.map.rows) {
            return false; // Выходит за границы
        }

        // Удалить существующие объекты в этой области
        this.map.objects = this.map.objects.filter((obj) => {
            const objSize = obj.size || 1;
            // Проверка пересечения
            const overlaps = !(
                col + size <= obj.x ||
                col >= obj.x + objSize ||
                row + size <= obj.y ||
                row >= obj.y + objSize
            );
            return !overlaps;
        });

        // Добавить новый объект
        const newObj = {
            type,
            x: col,
            y: row,
            properties: {},
            size: size > 1 ? size : undefined,
        };
        this.map.objects.push(newObj);
        return true;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.width, this.game.height);

        if (this.needsPrerender) {
            this.syncTilesFromGrid();
            this.map.prerender();
            this.needsPrerender = false;
        }

        // We do NOT overwrite map.waypoints here every frame anymore.
        // It prevents saving them correctly.
        this.map.draw(ctx);
        this.fog.draw(ctx);

        // Draw waypoints with WaypointManager
        this.waypointMgr.draw(ctx);

        const input = this.game.input;
        if (input.hoverCol >= 0) {
            const x = input.hoverCol * CONFIG.TILE_SIZE;
            const y = input.hoverRow * CONFIG.TILE_SIZE;

            ctx.strokeStyle = 'yellow';
            if (this.mode === 'paint_grass') ctx.strokeStyle = 'red';
            if (this.mode === 'eraser') ctx.strokeStyle = '#ff6600';
            if (this.mode === 'set_start') ctx.strokeStyle = 'cyan';
            if (this.mode === 'set_end') ctx.strokeStyle = 'magenta';
            if (this.mode === 'place_waypoint') ctx.strokeStyle = '#00ff00';

            if (this.mode === 'paint_fog') {
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
    }

    private openWaveConfig() {
        if (!this.waypointMgr.isValid()) {
            alert('Set Start and End points first!');
            return;
        }

        const currentWaves = this.map.waves || [];

        this.activeWaveEditor = new WaveEditor(
            currentWaves,
            (waves) => {
                this.saveMap(waves);
                this.activeWaveEditor = null;
            },
            () => {
                // Cancelled
                this.activeWaveEditor = null;
            },
        );
    }

    private async saveMap(waves: any[]) {
        // [FIX] Ensure map waves are updated before serialization
        this.map.waves = waves;

        if (!this.waypointMgr.isValid()) {
            alert('Set Start and End points first!');
            return;
        }

        const controlPoints = this.waypointMgr.getFullPath();
        const routeResult = this.map.setRouteControlPoints(controlPoints);
        if (routeResult.ok === false) {
            this.setRouteWarning(routeResult.error);
            console.warn(`[EditorScene] Route invalid: ${routeResult.error}`);
        } else {
            this.setRouteWarning(null);
        }

        const data = serializeMap(this.map);
        data.fogData = this.fog.getFogData();
        data.manualPath = this.waypointMgr.isValid(); // Using waypoint manager
        data.route = { controlPoints };
        data.waypoints = [];

        const name = prompt('Enter map name:', this.currentMapName || 'MyMap');
        if (!name) return;

        if (await this.storage.saveMap(name, data)) {
            this.currentMapName = name; // Update current name
            alert(`Map "${name}" saved successfully!`);
            await this.refreshMapsPanel(); // Refresh UI
        } else {
            alert('Failed to save map (Storage full?)');
        }
    }

    private createUI() {
        // Create new modular toolbar
        this.toolbar = new EditorToolbar((mode) => {
            console.log('[EditorScene] Mode changed to:', mode);
            this.mode = mode;
        });

        // Create controls container for additional buttons (WAVES, MENU, Clear Path)
        this.controlsContainer = UIUtils.createContainer({
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px',
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '8px',
            zIndex: '1000',
        });

        const addBtn = (text: string, onClick: () => void, color: string = '#444') => {
            UIUtils.createButton(this.controlsContainer, text, onClick, {
                background: color,
                border: '1px solid #666',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                width: '100%',
            });
        };

        addBtn(
            '🗑️ Clear Path',
            () => {
                this.waypointMgr.clearAll();
                this.setRouteWarning(null);
                this.markPrerenderDirty();
            },
            '#e91e63',
        );

        addBtn('⚙️ WAVES & SAVE', () => this.openWaveConfig(), '#ff9800');
        this.routeWarningEl = document.createElement('div');
        Object.assign(this.routeWarningEl.style, {
            color: '#ff5252',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'none',
            maxWidth: '220px',
        });
        this.controlsContainer.appendChild(this.routeWarningEl);
        addBtn('⇪ Import browser saves', async () => {
            const imported = await this.storage.importBrowserMaps();
            alert(`Imported ${imported} map(s) from browser storage`);
            await this.refreshMapsPanel();
        }, '#607d8b');
        addBtn('🚪 MENU', () => this.game.toMenu(), '#d32f2f');

        document.body.appendChild(this.controlsContainer);
    }

    // FEATURE: Create saved maps panel
    private createMapsPanel() {
        this.mapsPanel = UIUtils.createContainer({
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            borderRadius: '8px',
            padding: '10px',
            maxWidth: '300px',
            maxHeight: '80vh',
            overflowY: 'auto',
            display: 'none',
            zIndex: '2000',
        });

        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            cursor: 'pointer',
            color: '#fff',
            fontWeight: 'bold',
        });

        header.innerHTML = `
            <span>📁 SAVED MAPS</span>
            <span style="font-size: 20px;">${this.mapsPanelExpanded ? '▼' : '▶'}</span>
        `;

        header.onclick = () => {
            this.mapsPanelExpanded = !this.mapsPanelExpanded;
            this.refreshMapsPanel();
        };

        this.mapsPanel.appendChild(header);
        document.body.appendChild(this.mapsPanel);
        this.refreshMapsPanel();
    }

    private async refreshMapsPanel() {
        this.mapsMeta = await this.storage.listMaps();

        // Clear current content except header
        while (this.mapsPanel.children.length > 1) {
            this.mapsPanel.removeChild(this.mapsPanel.lastChild!);
        }

        // Update toggle icon
        const header = this.mapsPanel.children[0] as HTMLElement;
        header.innerHTML = `
            <span>📁 SAVED MAPS</span>
            <span style="font-size: 20px;">${this.mapsPanelExpanded ? '▼' : '▶'}</span>
        `;

        if (!this.mapsPanelExpanded) return;

        if (this.mapsMeta.length === 0) {
            const empty = document.createElement('div');
            empty.style.color = '#888';
            empty.style.padding = '10px';
            empty.innerText = 'No saved maps';
            this.mapsPanel.appendChild(empty);
            return;
        }

        this.mapsMeta.forEach((meta) => {
            const item = document.createElement('div');
            Object.assign(item.style, {
                background: '#222',
                padding: '10px',
                marginBottom: '5px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            });

            const nameSpan = document.createElement('span');
            nameSpan.style.color = '#fff';
            nameSpan.style.flex = '1';
            nameSpan.innerText = meta.id;

            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '5px';

            const loadBtn = document.createElement('button');
            loadBtn.innerText = '📂 Load';
            Object.assign(loadBtn.style, {
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
            });
            loadBtn.onclick = () => void this.loadMap(meta.id);

            const delBtn = document.createElement('button');
            delBtn.innerText = '🗑️';
            Object.assign(delBtn.style, {
                background: '#f44336',
                color: '#fff',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
            });
            delBtn.onclick = () => void this.deleteMap(meta.id);

            btnContainer.appendChild(loadBtn);
            btnContainer.appendChild(delBtn);

            item.appendChild(nameSpan);
            item.appendChild(btnContainer);
            this.mapsPanel.appendChild(item);
        });
    }

    private async loadMap(name: string) {
        if (!confirm(`Load map "${name}"? Current work will be lost.`)) return;

        const rawMap = await this.storage.loadMap(name);
        if (!rawMap) {
            alert(`Failed to load map "${name}".`);
            return;
        }

        let mapData: IMapData;
        try {
            mapData = migrateMapData(rawMap);
        } catch (e) {
            alert(`Failed to load map "${name}": ${(e as Error).message}`);
            return;
        }

        // Load map data into editor
        this.currentMapName = name;
        this.map = new MapManager(mapData);
        this.fog = new FogSystem(mapData);

        // Clear history on new map load
        this.history.clear();

        // Load waypoints into WaypointManager
        this.waypointMgr.clearAll();
        const controlPoints = mapData.route?.controlPoints ?? mapData.waypoints;
        if (controlPoints && controlPoints.length > 0) {
            this.waypointMgr.setStart(controlPoints[0]);
            if (controlPoints.length > 1) {
                this.waypointMgr.setEnd(controlPoints[controlPoints.length - 1]);
            }
            for (let i = 1; i < controlPoints.length - 1; i++) {
                this.waypointMgr.addWaypoint(controlPoints[i]);
            }
        }

        this.setRouteWarning(null);

        this.fog.update(0);
        this.markPrerenderDirty();
    }

    private async deleteMap(name: string) {
        if (!confirm(`Delete map "${name}"? This cannot be undone.`)) return;

        await this.storage.deleteMap(name);
        await this.refreshMapsPanel();
    }

    private setupSaveHotReload(): void {
        if (!import.meta.hot) return;

        import.meta.hot.on('saves:changed', async (payload: { ns: string; id: string }) => {
            if (payload.ns !== MAP_SAVES_NAMESPACE) return;
            await this.refreshMapsPanel();
            if (payload.id === this.currentMapName) {
                const latest = await this.storage.loadMap(payload.id);
                if (latest) {
                    this.map = new MapManager(latest);
                    this.fog = new FogSystem(latest);
                    this.fog.update(0);
                    this.markPrerenderDirty();
                }
            }
        });
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
                this.fog.update(0); // Re-render fog after undo
                this.markPrerenderDirty();
            }
            return; // Fixed: was return; in original? Yes
        }

        // Ctrl+Shift+Z - Redo
        if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
            e.preventDefault();
            if (this.history.redo()) {
                this.fog.update(0); // Re-render fog after redo
                this.markPrerenderDirty();
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
            this.mode = 'eraser';
            // Also update toolbar UI if possible?
            // current toolbar implementation relies on callback to update scene, not vice versa.
            // Ideally we should sync toolbar state.
            return;
        }

        // 1-3 - Category selection
        if (e.key >= '1' && e.key <= '3') {
            const categoryIndex = parseInt(e.key) - 1;
            this.toolbar.selectCategory(categoryIndex);
            return;
        }
    }


    private markPrerenderDirty(): void {
        this.needsPrerender = true;
    }

    private syncTilesFromGrid(): void {
        for (let y = 0; y < this.map.rows; y++) {
            for (let x = 0; x < this.map.cols; x++) {
                this.map.tiles[y][x] = this.map.grid[y][x].type;
            }
        }
    }

    private isPaintMode(mode: EditorMode): boolean {
        return mode === 'paint_road' || mode === 'paint_grass' || mode === 'eraser' || mode === 'paint_fog';
    }

    private setRouteWarning(message: string | null): void {
        this.routeWarningMessage = message;
        if (!this.routeWarningEl) {
            return;
        }

        if (!message) {
            this.routeWarningEl.style.display = 'none';
            this.routeWarningEl.innerText = '';
            return;
        }

        this.routeWarningEl.style.display = 'block';
        this.routeWarningEl.innerText = `Route invalid: ${message}`;
    }
}
