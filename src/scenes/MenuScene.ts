import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { DEMO_MAP, IMapData } from '../MapData';
import { validateMap, getSavedMaps } from '../Utils';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { UIUtils } from '../UIUtils';
import { Assets } from '../Assets';

export class MenuScene extends BaseScene {
    private game: Game;
    private container!: HTMLElement;
    private mapSelectionContainer!: HTMLElement;

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

        // Cleanup canvas elements to prevent memory leaks
        this.clearMapPreviews();
    }

    public update(dt: number) { }

    public draw(ctx: CanvasRenderingContext2D) {
        // === Фоновое Изображение ===
        const bgImage = Assets.get('menu_start');
        if (bgImage) {
            // Cover-fit с центрированием (масштабирует чтобы покрыть весь canvas)
            const scale = Math.max(
                this.game.canvas.width / bgImage.width,
                this.game.canvas.height / bgImage.height
            );
            const x = (this.game.canvas.width - bgImage.width * scale) / 2;
            const y = (this.game.canvas.height - bgImage.height * scale) / 2;

            ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);

            // Затемнение для читабельности
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        } else {
            // === Fallback - старый фон (сетка) ===
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
        }

        // === Заголовок ===
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px Segoe UI';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Двойная тень для глубины
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;
        ctx.fillText('NEW TOWER', this.game.canvas.width / 2, 150);

        // Дополнительная подсветка
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = -2;
        ctx.fillText('NEW TOWER', this.game.canvas.width / 2, 150);

        ctx.restore();
    }


    private createUI() {
        this.container = UIUtils.createContainer({
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            display: 'none',
            flexDirection: 'column',
            alignItems: 'flex-start', // Сдвиг влево
            justifyContent: 'center',
            gap: '20px',
            pointerEvents: 'none'
        });
        // Добавляем paddingLeft вручную
        this.container.style.paddingLeft = '15%';

        UIUtils.createButton(this.container, '▶ START GAME', () => {
            this.showMapSelection();
        }, { width: '300px', fontSize: '24px', padding: '15px 40px' });

        UIUtils.createButton(this.container, '🛠 EDITOR', () => {
            this.game.toEditor();
        }, { width: '300px', fontSize: '24px', padding: '15px 40px' });

        document.body.appendChild(this.container);
    }

    private createMapSelectionUI() {
        this.mapSelectionContainer = UIUtils.createContainer({
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '2000',
            color: '#fff'
        });
        // Фоновое изображение вручную (из корня)
        this.mapSelectionContainer.style.backgroundImage = 'url("../map.jpg")';
        this.mapSelectionContainer.style.backgroundSize = 'cover';
        this.mapSelectionContainer.style.backgroundPosition = 'center';
        this.mapSelectionContainer.style.backgroundRepeat = 'no-repeat';

        // Затемняющий overlay с градиентом для лучшего фокуса
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.7) 100%)',
            zIndex: '-1',
            pointerEvents: 'none'
        });
        this.mapSelectionContainer.appendChild(overlay);

        const title = document.createElement('h2');
        title.innerText = 'SELECT MAP';
        Object.assign(title.style, {
            marginBottom: '30px',
            fontSize: '42px',
            fontWeight: 'bold',
            textShadow: '0 4px 8px rgba(0,0,0,0.9)',
            letterSpacing: '2px'
        });
        this.mapSelectionContainer.appendChild(title);

        const listContainer = document.createElement('div');
        Object.assign(listContainer.style, {
            display: 'flex',
            gap: '25px',
            overflowX: 'auto',
            overflowY: 'hidden',
            maxWidth: '90%',
            maxHeight: '70vh',
            padding: '30px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '15px',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.3) rgba(0,0,0,0.2)'
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

        UIUtils.createButton(this.mapSelectionContainer, 'BACK', () => {
            this.mapSelectionContainer.style.display = 'none';
            this.container.style.display = 'flex';
        }, {
            background: 'linear-gradient(135deg, #d32f2f, #b71c1c)',
            fontSize: '20px',
            padding: '12px 40px',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(211, 47, 47, 0.5)',
            width: 'auto'
        });

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
                background: 'rgba(30, 30, 40, 0.85)',
                padding: '15px',
                borderRadius: '12px',
                minWidth: '220px',
                cursor: 'pointer',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(5px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Плавная кривая
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                transform: 'translateZ(0)' // GPU acceleration
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
            label.style.fontSize = '16px';
            label.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
            card.appendChild(label);

            card.onmouseover = () => {
                card.style.borderColor = '#00ffff';
                card.style.transform = 'scale(1.05) translateY(-5px)';
                card.style.boxShadow = '0 8px 25px rgba(0, 255, 255, 0.4)';
            };
            card.onmouseout = () => {
                card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                card.style.transform = 'scale(1)';
                card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            };
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

    /**
     * Clears canvas previews to prevent memory leaks
     */
    private clearMapPreviews(): void {
        // Find the list container with map cards
        const listContainer = this.mapSelectionContainer.querySelector('div[style*="overflowX"]') as HTMLElement;
        if (!listContainer) return;

        // Clear all canvas contexts before removing from DOM
        const canvases = listContainer.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });

        // Remove all map cards to free memory
        listContainer.innerHTML = '';
    }

    private showMapSelection() {
        this.container.style.display = 'none';
        this.mapSelectionContainer.style.display = 'flex';
        if ((this.mapSelectionContainer as any).refreshList) {
            (this.mapSelectionContainer as any).refreshList();
        }
    }

    // createBtn removed - replaced by UIUtils.createButton
}
