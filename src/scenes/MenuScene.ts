import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { DEMO_MAP, IMapData } from '../MapData';
import { validateMap, getSavedMaps } from '../Utils';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';

export class MenuScene extends BaseScene {
    private game: Game;
    private container: HTMLElement;
    private mapSelectionContainer: HTMLElement;

    constructor(game: Game) {
        super();
        this.game = game;
        this.createUI();
        this.createMapSelectionUI();
    }

    public onEnter() {
        this.container.style.display = 'flex';
        this.mapSelectionContainer.style.display = 'none';

        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';
        const hand = document.getElementById('hand-container');
        if (hand) hand.style.display = 'none';
    }

    public onExit() {
        this.container.style.display = 'none';
        this.mapSelectionContainer.style.display = 'none';
    }

    public update() { }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        const s = 64;
        for (let x = 0; x < this.game.canvas.width; x += s) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.game.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.game.canvas.height; y += s) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.game.canvas.width, y);
            ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('NEW TOWER', this.game.canvas.width / 2, 150);
    }

    private createUI() {
        this.container = document.createElement('div');
        this.container.className = 'menu-container';
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            pointerEvents: 'none',
        });

        this.createBtn(this.container, '▶ START GAME', () => {
            this.showMapSelection();
        });

        this.createBtn(this.container, '🛠 EDITOR', () => {
            this.game.toEditor();
        });

        document.body.appendChild(this.container);
    }

    private createMapSelectionUI() {
        this.mapSelectionContainer = document.createElement('div');
        Object.assign(this.mapSelectionContainer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.9)',
            zIndex: '2000',
            color: '#fff',
        });

        const title = document.createElement('h2');
        title.innerText = 'SELECT MAP';
        title.style.marginBottom = '20px';
        this.mapSelectionContainer.appendChild(title);

        const listContainer = document.createElement('div');
        Object.assign(listContainer.style, {
            display: 'flex',
            gap: '20px',
            overflowX: 'auto',
            maxWidth: '90%',
            padding: '20px',
            border: '1px solid #444',
            borderRadius: '8px',
            background: '#222',
        });
        this.mapSelectionContainer.appendChild(listContainer);

        // Function to refresh list
        (this.mapSelectionContainer as any).refreshList = () => {
            listContainer.innerHTML = '';

            // DEMO MAP
            this.createMapCard(listContainer, 'Demo Map', DEMO_MAP);

            // SAVED MAPS
            const saved = getSavedMaps();
            for (const key in saved) {
                this.createMapCard(listContainer, key, saved[key]);
            }
        };

        const backBtn = document.createElement('button');
        backBtn.innerText = 'BACK';
        Object.assign(backBtn.style, {
            marginTop: '20px',
            padding: '10px 30px',
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
        });
        backBtn.onclick = () => {
            this.mapSelectionContainer.style.display = 'none';
            this.container.style.display = 'flex';
        };
        this.mapSelectionContainer.appendChild(backBtn);

        document.body.appendChild(this.mapSelectionContainer);
    }

    private createMapCard(parent: HTMLElement, name: string, data: IMapData) {
        try {
            const card = document.createElement('div');
            Object.assign(card.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                background: '#333',
                padding: '10px',
                borderRadius: '8px',
                minWidth: '200px',
                cursor: 'pointer',
                border: '2px solid transparent',
                transition: '0.2s',
            });

            // Preview Canvas
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 150;
            const ctx = canvas.getContext('2d')!;

            // Render preview
            // We need a temporary MapManager to draw
            const tempMap = new MapManager(data);
            // Scale context to fit
            ctx.save();
            const scale = Math.min(200 / (tempMap.cols * CONFIG.TILE_SIZE), 150 / (tempMap.rows * CONFIG.TILE_SIZE));
            ctx.scale(scale, scale);
            tempMap.draw(ctx);
            ctx.restore();

            card.appendChild(canvas);

            const label = document.createElement('div');
            label.innerText = name;
            label.style.fontWeight = 'bold';
            card.appendChild(label);

            card.onmouseover = () => (card.style.borderColor = '#fff');
            card.onmouseout = () => (card.style.borderColor = 'transparent');
            card.onclick = () => {
                console.log('Map card clicked:', name);
                console.log('Map data:', data);
                const isValid = validateMap(data);
                console.log('Map validation result:', isValid);
                if (isValid) {
                    console.log('Calling toGame...');
                    this.game.toGame(data);
                } else {
                    console.error('Map is invalid!');
                    alert('Map is invalid!');
                }
            };

            parent.appendChild(card);
        } catch (e) {
            console.error(`Failed to render map card for ${name}`, e);
            const errCard = document.createElement('div');
            errCard.innerText = `❌ ${name} (Corrupted)`;
            Object.assign(errCard.style, {
                background: '#300',
                color: '#f88',
                padding: '10px',
                borderRadius: '8px',
                minWidth: '200px',
                textAlign: 'center',
            });
            parent.appendChild(errCard);
        }
    }

    private showMapSelection() {
        this.container.style.display = 'none';
        this.mapSelectionContainer.style.display = 'flex';
        if ((this.mapSelectionContainer as any).refreshList) {
            (this.mapSelectionContainer as any).refreshList();
        }
    }

    private createBtn(parent: HTMLElement, text: string, onClick: () => void) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            pointerEvents: 'auto',
            padding: '15px 40px',
            fontSize: '24px',
            cursor: 'pointer',
            background: '#333',
            color: '#fff',
            border: '2px solid #555',
            borderRadius: '8px',
            width: '300px',
            fontFamily: 'Segoe UI',
        });
        btn.onclick = onClick;
        btn.onmouseover = () => (btn.style.background = '#444');
        btn.onmouseout = () => (btn.style.background = '#333');
        parent.appendChild(btn);
    }
}
