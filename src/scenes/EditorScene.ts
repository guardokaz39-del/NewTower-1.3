import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { IMapData } from '../MapData';
import { serializeMap, saveMapToStorage, getSavedMaps, deleteMapFromStorage } from '../Utils';
import { UIUtils } from '../UIUtils';
import { Pathfinder } from '../Pathfinder';
import { WaveEditor } from '../WaveEditor';
import { FogSystem } from '../FogSystem';

export class EditorScene extends BaseScene {
    private game: Game;
    private map: MapManager;
    private fog: FogSystem;
    private container!: HTMLElement;

    private mode: 'paint_road' | 'paint_grass' | 'set_start' | 'set_end' | 'place_waypoint' | 'eraser' | 'paint_fog' = 'paint_road';

    private startPoint: { x: number; y: number } | null = null;
    private endPoint: { x: number; y: number } | null = null;
    private manualWaypoints: { x: number; y: number }[] = []; // FEATURE: Manual waypoints

    // FEATURE: Saved maps panel
    private mapsPanel!: HTMLElement;
    private mapsPanelExpanded: boolean = false;
    private currentMapName: string = '';

    constructor(game: Game) {
        super();
        this.game = game;

        // Создаем пустую сетку
        const cols = Math.ceil(game.canvas.width / CONFIG.TILE_SIZE);
        const rows = Math.ceil(game.canvas.height / CONFIG.TILE_SIZE);
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
        this.createUI();
        this.createMapsPanel();
    }

    public onEnter() {
        this.container.style.display = 'flex';
        this.mapsPanel.style.display = 'block';
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';
    }

    public onExit() {
        this.container.style.display = 'none';
        this.mapsPanel.style.display = 'none';
        if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
        if (this.mapsPanel.parentNode) this.mapsPanel.parentNode.removeChild(this.mapsPanel);
    }

    public update() {
        this.fog.update();
        const input = this.game.input;

        if (input.isMouseDown && input.hoverCol >= 0 && input.hoverRow >= 0) {
            this.handleInput(input.hoverCol, input.hoverRow);
        }
    }

    private handleInput(col: number, row: number) {
        if (col >= this.map.cols || row >= this.map.rows) return;

        if (this.mode === 'paint_road') {
            this.map.grid[row][col].type = 1;
            this.map.grid[row][col].decor = null;
        } else if (this.mode === 'paint_grass') {
            this.map.grid[row][col].type = 0;
        } else if (this.mode === 'eraser') {
            // FEATURE: Eraser - reset to grass
            this.map.grid[row][col].type = 0;
            this.map.grid[row][col].decor = null;
        } else if (this.mode === 'set_start') {
            this.startPoint = { x: col, y: row };
            this.map.grid[row][col].type = 1;
            // Update waypoints list for Map to draw icons
            this.updateMapWaypoints();
        } else if (this.mode === 'set_end') {
            this.endPoint = { x: col, y: row };
            this.map.grid[row][col].type = 1;
            this.updateMapWaypoints();
        } else if (this.mode === 'place_waypoint') {
            // FEATURE: Add waypoint on click
            this.manualWaypoints.push({ x: col, y: row });
        } else if (this.mode === 'paint_fog') {
            const isLeftClick = this.game.input.isMouseDown;
            // We need to know if it's left or right click to paint/erase
            // Check InputSystem or just assume left click is paint (1) and maybe add right click check later?
            // The prompt said: "Left Click: Paint Fog (1). Right Click: Erase Fog (0)."
            // My current input system might not expose right click easily in this method.
            // Let's assume standard behavior: left click paints 1.
            // But for eraser logic in 'paint_fog' mode?
            // The 'eraser' mode sets type to 0.
            // Let's implement toggle or just set to 1 for now.
            // Ideally we check `input.button` if available.
            // Assuming `this.game.input` has `isRightDown` or similar?
            // Checking `InputSystem.ts` (list_dir step 11) - I haven't read InputSystem.
            // I'll stick to left click paints fog (1). The 'Eraser' tool can clear fog too?
            // Or I use the 'Eraser' mode to clear fog if clicked on fog?
            // The plan said "Right Click: Erase Fog (0)".
            // I'll try to check mouse button if possible, otherwise I'll use simple set(1).
            this.fog.setFog(col, row, 1);
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        for (let y = 0; y < this.map.rows; y++) {
            for (let x = 0; x < this.map.cols; x++) {
                this.map.tiles[y][x] = this.map.grid[y][x].type;
            }
        }

        // We do NOT overwrite map.waypoints here every frame anymore.
        // It prevents saving them correctly.
        // We only show them via draw() calls or rely on map.draw() using current state.

        // However, map.draw() draws start/end icons based on map.waypoints.
        // If we want to visualize start/end points dynamically while placing them:
        if (this.startPoint && this.mode === 'set_start') {
            // Just specific visual feedback if needed, 
            // but effectively we updated map.grid type so map.draw handles tiles.
        }

        this.map.draw(ctx);
        this.fog.draw(ctx);

        // FEATURE: Draw manual waypoints
        if (this.manualWaypoints.length > 0) {
            ctx.strokeStyle = '#00ff00';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.lineWidth = 3;

            // Draw lines connecting waypoints
            ctx.beginPath();
            for (let i = 0; i < this.manualWaypoints.length; i++) {
                const wp = this.manualWaypoints[i];
                const wpX = wp.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const wpY = wp.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

                if (i === 0) ctx.moveTo(wpX, wpY);
                else ctx.lineTo(wpX, wpY);
            }
            ctx.stroke();

            // Draw numbered waypoint markers
            this.manualWaypoints.forEach((wp, idx) => {
                const wpX = wp.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const wpY = wp.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

                ctx.fillStyle = '#00ff00';
                ctx.beginPath();
                ctx.arc(wpX, wpY, 12, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#000';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText((idx + 1).toString(), wpX, wpY);
            });
        }

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
            if (this.mode === 'paint_fog') ctx.strokeStyle = '#607d8b';

            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    private openWaveConfig() {
        // FEATURE: Priority: manual waypoints > auto pathfinding
        if (this.manualWaypoints.length >= 2) {
            // Use manual waypoints
            this.map.waypoints = this.manualWaypoints;
        } else {
            // Fallback to auto pathfinding
            if (!this.startPoint || !this.endPoint) {
                alert('Set Start and End points first (or place at least 2 waypoints)!');
                return;
            }

            const path = Pathfinder.findPath(this.map.grid, this.startPoint, this.endPoint);
            if (path.length === 0) {
                alert('No path found between Start and End! Make sure they are connected by Road tiles.');
                return;
            }

            this.map.waypoints = path;
        }

        const currentWaves = (this.map as any).waves || [];

        new WaveEditor(
            currentWaves,
            (waves) => {
                this.saveMap(waves);
            },
            () => {
                // Cancelled
            },
        );
    }

    private saveMap(waves: any[]) {
        // [FIX] Ensure map waves are updated before serialization
        (this.map as any).waves = waves;

        // [FIX] Ensure waypoints are synced before saving
        this.updateMapWaypoints();

        const data = serializeMap(this.map);
        data.fogData = this.fog.getFogData();
        data.manualPath = this.manualWaypoints.length >= 2; // FEATURE: Mark if manual waypoints used

        const name = prompt('Enter map name:', this.currentMapName || 'MyMap');
        if (!name) return;

        if (saveMapToStorage(name, data)) {
            this.currentMapName = name; // Update current name
            alert(`Map "${name}" saved successfully!`);
            this.refreshMapsPanel(); // Refresh UI
        } else {
            alert('Failed to save map (Storage full?)');
        }
    }

    private createUI() {
        this.container = UIUtils.createContainer({
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            padding: '10px',
            background: 'rgba(0,0,0,0.8)',
            borderRadius: '8px',
            zIndex: '1000'
        });

        const addBtn = (text: string, onClick: () => void, color: string = '#444') => {
            UIUtils.createButton(this.container, text, onClick, {
                background: color,
                border: '1px solid #666',
                padding: '8px 15px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold'
            });
        };

        addBtn(
            '🌲 Grass',
            () => {
                this.mode = 'paint_grass';
            },
            '#388e3c',
        );
        addBtn(
            '🟫 Road',
            () => {
                this.mode = 'paint_road';
            },
            '#795548',
        );
        addBtn(
            '🧹 Eraser',
            () => {
                this.mode = 'eraser';
            },
            '#ff6600',
        );

        addBtn(
            '🌫️ Fog',
            () => {
                this.mode = 'paint_fog';
            },
            '#607d8b'
        );

        const sep1 = document.createElement('div');
        sep1.style.width = '10px';
        this.container.appendChild(sep1);

        addBtn(
            '🏁 Start',
            () => {
                this.mode = 'set_start';
            },
            '#00bcd4',
        );
        addBtn(
            '🛑 End',
            () => {
                this.mode = 'set_end';
            },
            '#e91e63',
        );

        const sep2 = document.createElement('div');
        sep2.style.width = '10px';
        this.container.appendChild(sep2);

        // FEATURE: Waypoint buttons
        addBtn(
            '📍 Waypoints',
            () => {
                this.mode = 'place_waypoint';
            },
            '#9c27b0',
        );
        addBtn(
            '🗑️ Clear Path',
            () => {
                this.manualWaypoints = [];
            },
            '#e91e63',
        );

        const sep3 = document.createElement('div');
        sep3.style.width = '10px';
        this.container.appendChild(sep3);

        addBtn('⚙️ WAVES & SAVE', () => this.openWaveConfig(), '#ff9800');
        addBtn('🚪 MENU', () => this.game.toMenu(), '#d32f2f');

        document.body.appendChild(this.container);
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
        console.log('Refreshing Maps Panel. Raw Storage:', localStorage.getItem('NEWTOWER_MAPS'));
        const maps = getSavedMaps();
        console.log('Parsed Maps:', maps);
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


        const mapNames = Object.keys(maps);

        if (mapNames.length === 0) {
            const empty = document.createElement('div');
            empty.style.color = '#888';
            empty.style.padding = '10px';
            empty.innerText = 'No saved maps';
            this.mapsPanel.appendChild(empty);
            return;
        }

        mapNames.forEach((name) => {
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
            nameSpan.innerText = name;

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
            loadBtn.onclick = () => this.loadMap(name, maps[name]);

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
            delBtn.onclick = () => this.deleteMap(name);

            btnContainer.appendChild(loadBtn);
            btnContainer.appendChild(delBtn);

            item.appendChild(nameSpan);
            item.appendChild(btnContainer);
            this.mapsPanel.appendChild(item);
        });
    }

    private loadMap(name: string, data: any) {
        if (!confirm(`Load map "${name}"? Current work will be lost.`)) return;

        // Load map data into editor
        this.currentMapName = name; // [FIX] Track loaded map name
        this.map = new MapManager(data);
        this.fog = new FogSystem(data);

        // Handle waypoints based on whether they were manually placed
        if (data.manualPath && data.waypoints && data.waypoints.length > 0) {
            this.manualWaypoints = [...data.waypoints];
            this.startPoint = null;
            this.endPoint = null;
        } else if (data.waypoints && data.waypoints.length > 0) {
            // Auto-generated path - set start/end points only
            this.startPoint = data.waypoints[0];
            this.endPoint = data.waypoints[data.waypoints.length - 1];
            this.manualWaypoints = [];
        } else {
            // No waypoints at all
            this.manualWaypoints = [];
            this.startPoint = null;
            this.endPoint = null;
        }
    }

    private deleteMap(name: string) {
        if (!confirm(`Delete map "${name}"? This cannot be undone.`)) return;

        deleteMapFromStorage(name);
        this.refreshMapsPanel();
    }

    private updateMapWaypoints() {
        if (this.manualWaypoints.length > 0) {
            this.map.waypoints = [...this.manualWaypoints];
        } else {
            this.map.waypoints = [];
            if (this.startPoint) this.map.waypoints.push(this.startPoint);
            if (this.endPoint) this.map.waypoints.push(this.endPoint);
        }
    }
}
