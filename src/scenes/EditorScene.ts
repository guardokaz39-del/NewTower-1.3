import { Scene } from '../Scene';
import { Game } from '../Game';
import { GameScene } from './GameScene';
import { MenuScene } from './MenuScene'; 
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { IMapData } from '../MapData';
import { Assets } from '../Assets';
import { generateDefaultWaves } from '../Utils'; // Не забудь этот импорт!

export class EditorScene implements Scene {
    private game: Game;
    private map: MapManager;
    private container: HTMLElement;
    
    private mode: 'paint' | 'path' | 'eraser' = 'paint'; 
    private selectedTile: number = 1;
    private isDrawing: boolean = false;

    constructor(game: Game) {
        this.game = game;
        
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
        // Скрываем интерфейс игры
        const uiLayer = document.getElementById('ui-layer'); if (uiLayer) uiLayer.style.display = 'none';
        const hand = document.getElementById('hand-container'); if (hand) hand.style.display = 'none';
        const gameOver = document.getElementById('game-over'); if (gameOver) gameOver.style.display = 'none';
        
        this.game.canvas.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
        this.game.canvas.addEventListener('mousemove', this.onMouseMove);
    }

    public onExit() {
        this.container.style.display = 'none';
        this.game.canvas.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.game.canvas.removeEventListener('mousemove', this.onMouseMove);
    }

    public update() {}

    public draw(ctx: CanvasRenderingContext2D) {
        this.map.draw(ctx);
        this.drawEditorOverlay(ctx);
    }
    
    // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ (Без изменений) ---
    private drawEditorOverlay(ctx: CanvasRenderingContext2D) {
        if (this.map.waypoints.length > 0) {
            ctx.beginPath(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff';
            for (let i = 0; i < this.map.waypoints.length; i++) {
                const p = this.map.waypoints[i];
                const px = p.x * 64 + 32; const py = p.y * 64 + 32;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
            const s = this.map.waypoints[0];
            const e = this.map.waypoints[this.map.waypoints.length-1];
            if(s) this.drawIcon(ctx, '👹', s.x*64+32, s.y*64+32);
            if(e) this.drawIcon(ctx, '🏰', e.x*64+32, e.y*64+32);
        }
        const col = this.game.input.hoverCol; const row = this.game.input.hoverRow;
        if (col >= 0 && col < this.map.cols && row >= 0 && row < this.map.rows) {
            const x = col * 64; const y = row * 64;
            ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.strokeRect(x, y, 64, 64);
            if (this.mode === 'paint') {
                ctx.fillStyle = this.getTileColor(this.selectedTile); ctx.globalAlpha = 0.5; ctx.fillRect(x, y, 64, 64);
            } else if (this.mode === 'path') {
                ctx.fillStyle = 'rgba(255,0,0,0.3)'; ctx.fillRect(x,y,64,64);
            } else if (this.mode === 'eraser') {
                 ctx.fillStyle = 'rgba(255,200,200,0.5)'; ctx.fillRect(x,y,64,64);
            }
            ctx.globalAlpha = 1.0;
        }
    }
    private drawIcon(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, x, y);
    }
    private onMouseDown = () => {
        const col = this.game.input.hoverCol; const row = this.game.input.hoverRow;
        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return;
        if (this.mode === 'paint') { this.isDrawing = true; this.paint(col, row); }
        else if (this.mode === 'path') { if (!this.map.waypoints.find(p => p.x === col && p.y === row)) this.map.waypoints.push({x:col, y:row}); }
        else if (this.mode === 'eraser') { this.isDrawing = true; this.erase(col, row); }
    }
    private onMouseUp = () => { this.isDrawing = false; }
    private onMouseMove = () => { 
        if(this.isDrawing && this.mode === 'paint') this.paint(this.game.input.hoverCol, this.game.input.hoverRow); 
        if(this.isDrawing && this.mode === 'eraser') this.erase(this.game.input.hoverCol, this.game.input.hoverRow);
    }
    private paint(col: number, row: number) { if(col>=0) this.map.tiles[row][col] = this.selectedTile; }
    private erase(col: number, row: number) { if(col>=0) { this.map.tiles[row][col] = 0; this.map.waypoints = this.map.waypoints.filter(p => !(p.x===col && p.y===row)); } }
    private getTileColor(id: number) {
        switch(id) { case 0: return CONFIG.COLORS.GRASS; case 1: return CONFIG.COLORS.PATH; case 2: return CONFIG.COLORS.DECOR_BG; default: return '#fff'; }
    }

    // --- ОБНОВЛЕННЫЙ ИНТЕРФЕЙС ---
    private createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.9)', padding: '10px 20px', borderRadius: '12px',
            display: 'none', flexDirection: 'row', alignItems: 'center', gap: '15px', border: '2px solid #555'
        });
        
        const addBtn = (icon:string, cb:()=>void, color='#444') => {
            const b = document.createElement('button'); b.innerText=icon;
            Object.assign(b.style, { padding:'8px 12px', background:color, color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'18px' });
            b.onclick = cb; this.container.appendChild(b);
        };
        
        addBtn("🖌️", () => this.mode='paint');
        addBtn("👣", () => this.mode='path');
        addBtn("🧽", () => this.mode='eraser');
        
        const sep = document.createElement('div'); sep.style.width='1px'; sep.style.height='30px'; sep.style.background='#666'; this.container.appendChild(sep);
        
        addBtn("🟩", () => { this.mode='paint'; this.selectedTile=0; }, '#333');
        addBtn("🟫", () => { this.mode='paint'; this.selectedTile=1; }, '#333');
        addBtn("🌲", () => { this.mode='paint'; this.selectedTile=2; }, '#333');
        
        const sep2 = document.createElement('div'); sep2.style.width='1px'; sep2.style.height='30px'; sep2.style.background='#666'; this.container.appendChild(sep2);
        
        // --- КНОПКА SAVE ---
        addBtn("💾 SAVE", () => this.saveMap(), '#1976d2');

        // --- КНОПКА PLAY (ВЕРНУЛИ!) ---
        addBtn("▶ PLAY", () => {
             if (this.saveMap()) {
                // Сразу создаем данные и запускаем
                const data = this.createMapData();
                this.game.changeScene(new GameScene(this.game, data));
             }
        }, '#2e7d32');
        
        addBtn("🚪 EXIT", () => this.game.changeScene(new MenuScene(this.game)), '#d32f2f');
        
        document.body.appendChild(this.container);
    }

    private saveMap(): boolean {
        if(this.map.waypoints.length < 2) { 
            alert("Path too short!"); 
            return false; 
        }
        const data = this.createMapData();
        localStorage.setItem('NEWTOWER_MAP', JSON.stringify(data));
        return true;
    }

    private createMapData(): IMapData {
        const autoWaves = generateDefaultWaves(15); 
        return {
             width: this.map.cols, height: this.map.rows,
             tiles: this.map.tiles,
             waypoints: this.map.waypoints,
             objects: [],
             waves: autoWaves, // Сценарий
             startingMoney: 200,
             startingLives: 20
        };
    }
}