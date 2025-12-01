import { Scene } from '../Scene';
import { Game } from '../Game';
import { GameScene } from './GameScene';
import { EditorScene } from './EditorScene';
import { DEMO_MAP } from '../MapData';

export class MenuScene implements Scene {
    private game: Game;
    private container: HTMLElement;

    constructor(game: Game) {
        this.game = game;
        this.createUI();
    }

    public onEnter() {
        this.container.style.display = 'flex';
        // Скрываем игровые интерфейсы на всякий случай
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';
        const hand = document.getElementById('hand-container');
        if (hand) hand.style.display = 'none';
    }

    public onExit() {
        this.container.style.display = 'none';
    }

    public update() {}

    public draw(ctx: CanvasRenderingContext2D) {
        // Отрисовка фона
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        
        // Сетка
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        const s = 64;
        for(let x=0; x<this.game.canvas.width; x+=s) {
            ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, this.game.canvas.height); ctx.stroke();
        }
        for(let y=0; y<this.game.canvas.height; y+=s) {
            ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(this.game.canvas.width, y); ctx.stroke();
        }

        // Текст
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText("NEW TOWER", this.game.canvas.width/2, 150);
    }

    private createUI() {
        this.container = document.createElement('div');
        this.container.className = 'menu-container';
        Object.assign(this.container.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '20px', pointerEvents: 'none'
        });

        // Кнопка: DEMO
        this.createBtn("▶ PLAY DEMO", () => {
            this.game.changeScene(new GameScene(this.game, DEMO_MAP));
        });

        // Кнопка: CUSTOM MAP (Исправленная логика)
        this.createBtn("📂 LOAD CUSTOM MAP", () => {
            try {
                // ЧИТАЕМ ТОЛЬКО ЗДЕСЬ, В МОМЕНТ КЛИКА
                const savedJson = localStorage.getItem('NEWTOWER_MAP');
                
                if (savedJson) {
                    console.log("Loading map...");
                    const data = JSON.parse(savedJson);
                    
                    // Минимальная проверка
                    if (!data.tiles || !data.waypoints) {
                        alert("Файл сохранения поврежден.");
                        return;
                    }
                    
                    this.game.changeScene(new GameScene(this.game, data));
                } else {
                    alert("Нет сохраненной карты. Создайте её в редакторе!");
                }
            } catch (e) {
                console.error(e);
                alert("Ошибка чтения сохранения.");
            }
        });

        // Кнопка: EDITOR
        this.createBtn("🛠 EDITOR", () => {
            this.game.changeScene(new EditorScene(this.game));
        });

        document.body.appendChild(this.container);
    }

    private createBtn(text: string, onClick: () => void) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            pointerEvents: 'auto',
            padding: '15px 40px', fontSize: '24px', cursor: 'pointer',
            background: '#333', color: '#fff', border: '2px solid #555',
            borderRadius: '8px', width: '300px', fontFamily: 'Segoe UI'
        });
        btn.onclick = onClick;
        btn.onmouseover = () => btn.style.background = '#444';
        btn.onmouseout = () => btn.style.background = '#333';
        this.container.appendChild(btn);
    }
}