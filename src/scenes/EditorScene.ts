import { Scene } from '../Scene';
import { Game } from '../Game';
import { GameScene } from './GameScene';
import { MenuScene } from './MenuScene'; 
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { IMapData } from '../MapData';
import { serializeMap } from '../Utils'; // Импорт нового сериалайзера

export class EditorScene implements Scene {
    private game: Game;
    private map: MapManager;
    private container: HTMLElement;
    
    private mode: 'paint' | 'path' | 'eraser' = 'paint'; 
    private selectedTile: number = 1;

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
        // Удаляем UI, чтобы не дублировался
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

        if (this.mode === 'paint') {
            this.map.grid[row][col].type = this.selectedTile;
            if (this.selectedTile === 1) this.map.grid[row][col].decor = null;
        } 
        else if (this.mode === 'eraser') {
            this.map.grid[row][col].type = 0; // Grass
        }
        else if (this.mode === 'path') {
            const exists = this.map.waypoints.find(wp => wp.x === col && wp.y === row);
            if (!exists) {
                this.map.waypoints.push({ x: col, y: row });
                this.map.grid[row][col].type = 1; // Auto paint path
                this.map.grid[row][col].decor = null;
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        this.map.draw(ctx);
        
        const input = this.game.input;
        if (input.hoverCol >= 0) {
            const x = input.hoverCol * CONFIG.TILE_SIZE;
            const y = input.hoverRow * CONFIG.TILE_SIZE;
            ctx.strokeStyle = this.mode === 'eraser' ? 'red' : 'yellow';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    private saveMap() {
        if (this.map.waypoints.length < 2) { 
            alert("Нужно минимум 2 точки пути (Start/End)!"); 
            return; 
        }

        // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
        const data = serializeMap(this.map);
        
        try {
            const json = JSON.stringify(data);
            localStorage.setItem('NEWTOWER_MAP', json);
            alert("Карта сохранена! Теперь можно загрузить её из Меню.");
        } catch (e) {
            console.error("Save failed", e);
            alert("Ошибка сохранения (QuotaExceeded?).");
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

        addBtn("🌲 Paint Grass", () => { this.mode = 'paint'; this.selectedTile = 0; });
        addBtn("🟫 Paint Path", () => { this.mode = 'paint'; this.selectedTile = 1; });
        addBtn("📍 Waypoint", () => { this.mode = 'path'; }, '#e91e63');
        
        const sep = document.createElement('div');
        sep.style.width = '2px'; sep.style.background = '#666';
        this.container.appendChild(sep);

        addBtn("💾 SAVE", () => this.saveMap(), '#1976d2');
        addBtn("🚪 MENU", () => this.game.changeScene(new MenuScene(this.game)), '#d32f2f');
        
        document.body.appendChild(this.container);
    }
}