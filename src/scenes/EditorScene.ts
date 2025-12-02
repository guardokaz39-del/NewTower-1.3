import { Scene } from '../Scene';
import { Game } from '../Game';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { IMapData } from '../MapData';
import { serializeMap, saveMapToStorage } from '../Utils';
import { Pathfinder } from '../Pathfinder';
import { WaveEditor } from '../WaveEditor';

export class EditorScene implements Scene {
    private game: Game;
    private map: MapManager;
    private container: HTMLElement;

    private mode: 'paint_road' | 'paint_grass' | 'set_start' | 'set_end' = 'paint_road';

    private startPoint: { x: number, y: number } | null = null;
    private endPoint: { x: number, y: number } | null = null;

    constructor(game: Game) {
        this.game = game;

        // Создаем пустую сетку
        const cols = Math.ceil(game.canvas.width / CONFIG.TILE_SIZE);
        const rows = Math.ceil(game.canvas.height / CONFIG.TILE_SIZE);
        const emptyTiles = Array(rows).fill(0).map(() => Array(cols).fill(0));

        const emptyData: IMapData = {
            width: cols, height: rows,
            tiles: emptyTiles, waypoints: [], objects: []
        };

        this.map = new MapManager(emptyData);
        this.createUI();
    }

    public onEnter() {
        this.container.style.display = 'flex';
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';
    }

    public onExit() {
        this.container.style.display = 'none';
        if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
    }

    public update() {
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
        }
        else if (this.mode === 'paint_grass') {
            this.map.grid[row][col].type = 0;
        }
        else if (this.mode === 'set_start') {
            this.startPoint = { x: col, y: row };
            this.map.grid[row][col].type = 1;
        }
        else if (this.mode === 'set_end') {
            this.endPoint = { x: col, y: row };
            this.map.grid[row][col].type = 1;
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

        this.map.waypoints = [];
        if (this.startPoint) this.map.waypoints.push(this.startPoint);
        if (this.endPoint) this.map.waypoints.push(this.endPoint);

        this.map.draw(ctx);

        const input = this.game.input;
        if (input.hoverCol >= 0) {
            const x = input.hoverCol * CONFIG.TILE_SIZE;
            const y = input.hoverRow * CONFIG.TILE_SIZE;

            ctx.strokeStyle = 'yellow';
            if (this.mode === 'paint_grass') ctx.strokeStyle = 'red';
            if (this.mode === 'set_start') ctx.strokeStyle = 'cyan';
            if (this.mode === 'set_end') ctx.strokeStyle = 'magenta';

            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    private openWaveConfig() {
        if (!this.startPoint || !this.endPoint) {
            alert("Set Start and End points first!");
            return;
        }

        const path = Pathfinder.findPath(this.map.grid, this.startPoint, this.endPoint);
        if (path.length === 0) {
            alert("No path found between Start and End! Make sure they are connected by Road tiles.");
            return;
        }

        this.map.waypoints = path;

        const currentWaves = (this.map as any).waves || [];

        new WaveEditor(currentWaves, (waves) => {
            this.saveMap(waves);
        }, () => {
            // Cancelled
        });
    }

    private saveMap(waves: any[]) {
        const data = serializeMap(this.map);
        data.waves = waves;

        const name = prompt("Enter map name:", "MyMap");
        if (!name) return;

        if (saveMapToStorage(name, data)) {
            alert(`Map "${name}" saved successfully!`);
        } else {
            alert("Failed to save map (Storage full?)");
        }
    }

    private createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '10px', padding: '10px',
            background: 'rgba(0,0,0,0.8)', borderRadius: '8px', zIndex: '1000'
        });

        const addBtn = (text: string, onClick: () => void, color: string = '#444') => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            Object.assign(btn.style, {
                background: color, color: '#fff', border: '1px solid #666',
                padding: '8px 15px', cursor: 'pointer', borderRadius: '4px',
                fontSize: '16px', fontWeight: 'bold'
            });
            btn.onclick = onClick;
            this.container.appendChild(btn);
        };

        addBtn("🌲 Grass", () => { this.mode = 'paint_grass'; }, '#388e3c');
        addBtn("🟫 Road", () => { this.mode = 'paint_road'; }, '#795548');

        const sep1 = document.createElement('div');
        sep1.style.width = '10px';
        this.container.appendChild(sep1);

        addBtn("🏁 Start", () => { this.mode = 'set_start'; }, '#00bcd4');
        addBtn("🛑 End", () => { this.mode = 'set_end'; }, '#e91e63');

        const sep2 = document.createElement('div');
        sep2.style.width = '10px';
        this.container.appendChild(sep2);

        addBtn("⚙️ WAVES & SAVE", () => this.openWaveConfig(), '#ff9800');
        addBtn("🚪 MENU", () => this.game.toMenu(), '#d32f2f');

        document.body.appendChild(this.container);
    }
}