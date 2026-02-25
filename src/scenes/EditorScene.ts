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
import { EditorToolbar, EditorMode } from '../editor/EditorToolbar';
import { WaypointManager } from '../editor/WaypointManager';
import { EditorHistory, EditorActions } from '../editor/EditorHistory';

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

    // Race condition guard для async refreshMapsPanel
    private _refreshGeneration: number = 0;

    // Hidden file input for JSON import
    private _fileInput!: HTMLInputElement;

    // Track previous mouse state for click detection (not hold)
    private prevMouseDown: boolean = false;
    private lastClickedTile: { col: number; row: number } | null = null;

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

        // Setup hotkeys with automatic cleanup
        this.on(document, 'keydown', (e: Event) => this.handleGlobalKey(e as KeyboardEvent));
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
                this.handleInput(input.hoverCol, input.hoverRow);
                this.lastClickedTile = { col: input.hoverCol, row: input.hoverRow };

                // Trigger fog re-render after data change (static, no animation)
                this.fog.update(0);
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
        if (col >= this.map.cols || row >= this.map.rows) return;

        const oldTileType = this.map.grid[row][col].type;
        const oldFogDensity = this.fog.getFog(col, row);

        if (this.mode === 'paint_road') {
            console.log('[EditorScene] paint_road mode active, tile type:', oldTileType, '→ 1');
            if (oldTileType !== 1) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 1));
                this.map.grid[row][col].type = 1;
                this.map.grid[row][col].decor = null;
                Pathfinder.invalidateCache();
                console.log('[EditorScene] Road painted at', col, row);
            } else {
                console.log('[EditorScene] Tile already road, skipping');
            }
        } else if (this.mode === 'paint_grass') {
            if (oldTileType !== 0) {
                this.history.pushInCompound(EditorActions.createTileAction(this.map.grid, col, row, oldTileType, 0));
                this.map.grid[row][col].type = 0;
                Pathfinder.invalidateCache();
            }
        } else if (this.mode === 'eraser') {
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
                }
            }
        } else if (this.mode === 'set_start') {
            const oldState = {
                start: this.waypointMgr.getStart(),
                end: this.waypointMgr.getEnd(),
                waypoints: this.waypointMgr.getWaypoints()
            };
            this.history.push(EditorActions.createWaypointAction(this.waypointMgr, 'setStart', { x: col, y: row }, oldState));
            this.waypointMgr.setStart({ x: col, y: row });
            this.map.grid[row][col].type = 1;
        } else if (this.mode === 'set_end') {
            const oldState = {
                start: this.waypointMgr.getStart(),
                end: this.waypointMgr.getEnd(),
                waypoints: this.waypointMgr.getWaypoints()
            };
            this.history.push(EditorActions.createWaypointAction(this.waypointMgr, 'setEnd', { x: col, y: row }, oldState));
            this.waypointMgr.setEnd({ x: col, y: row });
            this.map.grid[row][col].type = 1;
        } else if (this.mode === 'place_waypoint') {
            if (this.waypointMgr.canAddWaypoint()) {
                const oldState = {
                    start: this.waypointMgr.getStart(),
                    end: this.waypointMgr.getEnd(),
                    waypoints: this.waypointMgr.getWaypoints()
                };
                this.history.push(EditorActions.createWaypointAction(this.waypointMgr, 'addWaypoint', { x: col, y: row }, oldState));
                this.waypointMgr.addWaypoint({ x: col, y: row });
            }
        } else if (this.mode === 'paint_fog') {
            // Cycle fog density: 0 → 1 → 2 → 3 → 4 → 5 → 0
            this.fog.cycleFogDensity(col, row);
            const newFogDensity = this.fog.getFog(col, row);
            if (oldFogDensity !== newFogDensity) {
                this.history.pushInCompound(EditorActions.createFogAction(this.fog, col, row, oldFogDensity, newFogDensity));
            }
        } else if (this.mode === 'place_stone') {
            this.placeObject(col, row, 'stone', 1);
        } else if (this.mode === 'place_rock') {
            // Скалы - рандомный размер 2-3 тайла
            const size = Math.random() > 0.5 ? 3 : 2;
            this.placeObject(col, row, 'rock', size);
        } else if (this.mode === 'place_tree') {
            this.placeObject(col, row, 'tree', 1);
        } else if (this.mode === 'place_wheat') {
            this.placeObject(col, row, 'wheat', 1);
        } else if (this.mode === 'place_flowers') {
            this.placeObject(col, row, 'flowers', 1);
        }
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
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.width, this.game.height);

        for (let y = 0; y < this.map.rows; y++) {
            for (let x = 0; x < this.map.cols; x++) {
                this.map.tiles[y][x] = this.map.grid[y][x].type;
            }
        }

        // CRITICAL FIX: Regenerate prerendered cache after tile changes
        // The Map.draw() uses a cached canvas that must be updated when tiles change
        this.map.prerender();

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

    private saveMap(waves: any[]) {
        // [FIX] Ensure map waves are updated before serialization
        this.map.waves = waves;

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
            zIndex: '1000'
        });

        const addBtn = (text: string, onClick: () => void, color: string = '#444') => {
            UIUtils.createButton(this.controlsContainer, text, onClick, {
                background: color,
                border: '1px solid #666',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                width: '100%'
            });
        };

        addBtn('🗑️ Clear Path', () => {
            this.waypointMgr.clearAll();
        }, '#e91e63');

        addBtn('⚙️ WAVES & SAVE', () => this.openWaveConfig(), '#ff9800');
        addBtn('📥 Экспорт JSON', () => this.exportCurrentMap(), '#2196f3');
        addBtn('📤 Импорт JSON', () => this.importMapFromFile(), '#9c27b0');
        addBtn('🚪 MENU', () => this.game.toMenu(), '#d32f2f');

        // Hidden file input for JSON import
        this._fileInput = document.createElement('input');
        this._fileInput.type = 'file';
        this._fileInput.accept = '.json';
        this._fileInput.style.display = 'none';
        this._fileInput.onchange = () => this.handleFileImport();
        this.controlsContainer.appendChild(this._fileInput);

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
            zIndex: '2000'
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

    private refreshMapsPanel() {
        const gen = ++this._refreshGeneration;

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
            padding: '10px',
            marginBottom: '5px',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        });

        const nameSpan = document.createElement('span');
        nameSpan.className = 'map-name';
        nameSpan.style.color = '#fff';
        nameSpan.style.flex = '1';
        const icon = source === 'bundled' ? '📦' : '💾';
        const suffix = overridesBundled ? ' ⚡' : '';
        nameSpan.innerText = `${icon} ${name}${suffix}`;

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '5px';

        // Load button — always available
        const loadBtn = document.createElement('button');
        loadBtn.innerText = '📂';
        loadBtn.title = 'Load';
        Object.assign(loadBtn.style, {
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            padding: '5px 10px',
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
                padding: '5px 10px',
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
            padding: '5px 10px',
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
                this.fog.update(0); // Re-render fog after undo
            }
            return; // Fixed: was return; in original? Yes
        }

        // Ctrl+Shift+Z - Redo
        if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
            e.preventDefault();
            if (this.history.redo()) {
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

    private isPaintMode(mode: EditorMode): boolean {
        return mode === 'paint_road' || mode === 'paint_grass' ||
            mode === 'eraser' || mode === 'paint_fog';
    }
}
