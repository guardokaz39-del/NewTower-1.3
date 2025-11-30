import { Scene } from '../Scene';
import { Game } from '../Game';
import { GameScene } from './GameScene';
import { EditorScene } from './EditorScene';
import { DEMO_MAP, IMapData } from '../MapData';

export class MenuScene implements Scene {
    private game: Game;
    private container: HTMLElement;

    constructor(game: Game) {
        this.game = game;
        this.container = this.createUI();
    }

    public onEnter() {
        // Показываем меню
        document.body.appendChild(this.container);
        
        // Скрываем игровой интерфейс (важно!)
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';
        
        const hand = document.getElementById('hand-container');
        if (hand) hand.style.display = 'none';
    }

    public onExit() {
        // Удаляем меню при выходе
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    public update() {}

    public draw(ctx: CanvasRenderingContext2D) {
        // Рисуем темный фон
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        
        // Рисуем декоративную сетку
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        const s = 64;
        for(let x=0; x<this.game.canvas.width; x+=s) {
            for(let y=0; y<this.game.canvas.height; y+=s) {
                ctx.strokeRect(x, y, s, s);
            }
        }
    }

    private createUI(): HTMLElement {
        const div = document.createElement('div');
        Object.assign(div.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '20px', zIndex: '1000', pointerEvents: 'auto'
        });

        const title = document.createElement('h1');
        title.innerText = "NEW TOWER";
        title.style.color = '#fff';
        title.style.fontSize = '64px';
        title.style.textShadow = '0 0 20px #00ffff';
        div.appendChild(title);

        // Кнопка PLAY DEMO
        this.createBtn(div, "▶ PLAY DEMO", '#4caf50', () => {
            this.game.changeScene(new GameScene(this.game, DEMO_MAP));
        });

        // Кнопка LOAD SAVED (проверяет localStorage)
        const savedJson = localStorage.getItem('NEWTOWER_MAP');
        const loadText = savedJson ? "📂 LOAD CUSTOM MAP" : "📂 NO SAVES FOUND";
        const loadColor = savedJson ? '#2196f3' : '#555';
        
        this.createBtn(div, loadText, loadColor, () => {
            if (savedJson) {
                try {
                    const data: IMapData = JSON.parse(savedJson);
                    this.game.changeScene(new GameScene(this.game, data));
                } catch(e) {
                    alert("Save file corrupted!");
                }
            }
        });

        // Кнопка EDITOR
        this.createBtn(div, "🛠 EDITOR", '#ff9800', () => {
            this.game.changeScene(new EditorScene(this.game));
        });

        return div;
    }

    private createBtn(parent: HTMLElement, text: string, color: string, onClick: () => void) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            padding: '15px 40px', fontSize: '24px', cursor: 'pointer',
            background: 'rgba(0,0,0,0.8)', color: color, 
            border: `2px solid ${color}`, borderRadius: '8px',
            width: '320px', transition: 'all 0.2s', fontFamily: 'monospace', fontWeight: 'bold'
        });
        
        btn.onmouseover = () => { btn.style.background = color; btn.style.color = '#000'; };
        btn.onmouseout = () => { btn.style.background = 'rgba(0,0,0,0.8)'; btn.style.color = color; };
        btn.onclick = onClick;
        
        parent.appendChild(btn);
    }
}