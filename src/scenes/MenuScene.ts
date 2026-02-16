import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { DEMO_MAP, IMapData } from '../MapData';
import { validateMap, getSavedMaps } from '../Utils';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { UIUtils } from '../UIUtils';
import { Assets } from '../Assets';
import { VISUALS } from '../VisualConfig';
import { StressTestScene } from './StressTestScene';

export class MenuScene extends BaseScene {
    private game: Game;
    private container!: HTMLElement;
    private mapSelectionContainer!: HTMLElement;

    constructor(game: Game) {
        super();
        this.game = game;
        // UI creation moved to onEnterImpl
    }

    protected onEnterImpl() {
        if (!this.container) {
            this.createUI();
        }
        if (!this.mapSelectionContainer) {
            this.createMapSelectionUI();
        }

        this.container.style.display = 'flex';
        this.mapSelectionContainer.style.display = 'none';

        // Hide game UI layers via UIRoot
        this.game.uiRoot.hideGameUI();
    }

    protected onExitImpl() {
        if (this.container) this.container.style.display = 'none';
        if (this.mapSelectionContainer) this.mapSelectionContainer.style.display = 'none';

        // Cleanup canvas elements to prevent memory leaks
        this.clearMapPreviews();
    }

    public update(dt: number) {}

    public draw(ctx: CanvasRenderingContext2D) {
        // === Фоновое Изображение ===
        const bgImage = Assets.get('menu_start');
        if (bgImage) {
            // Cover-fit с центрированием (масштабирует чтобы покрыть весь canvas)
            const scale = Math.max(this.game.width / bgImage.width, this.game.height / bgImage.height);
            const x = (this.game.width - bgImage.width * scale) / 2;
            const y = (this.game.height - bgImage.height * scale) / 2;

            ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);

            // Затемнение для читабельности
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, this.game.width, this.game.height);
        } else {
            // === Fallback - старый фон (сетка) ===
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, this.game.width, this.game.height);

            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            const s = 64;
            const gridSize = 64;
            for (let x = 0; x < this.game.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.game.height);
                ctx.stroke();
            }
            for (let y = 0; y < this.game.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.game.width, y);
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
        ctx.fillText('NEW TOWER', this.game.width / 2, 150);

        // Дополнительная подсветка
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = -2;
        ctx.fillText('NEW TOWER', this.game.width / 2, 150);

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
            pointerEvents: 'none',
        });
        // Добавляем paddingLeft вручную
        this.container.style.paddingLeft = '15%';

        UIUtils.createButton(
            this.container,
            '▶ START GAME',
            () => {
                this.showMapSelection();
            },
            { width: '300px', fontSize: '24px', padding: '15px 40px' },
        );

        UIUtils.createButton(
            this.container,
            '🛠 EDITOR',
            () => {
                this.game.toEditor();
            },
            { width: '300px', fontSize: '24px', padding: '15px 40px' },
        );

        UIUtils.createButton(
            this.container,
            '🧪 STRESS TEST',
            () => {
                // Dynamic import to avoid circular dependency if any,
                // but standard import is fine here as MenuScene -> StressTestScene is one way usually.
                // However, to be safe let's use the import at top.
                this.game.changeScene(new StressTestScene(this.game));
            },
            {
                width: '300px',
                fontSize: '24px',
                padding: '15px 40px',
                background: 'linear-gradient(135deg, #444, #222)',
            },
        );

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
            color: '#fff',
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
            pointerEvents: 'none',
        });
        this.mapSelectionContainer.appendChild(overlay);

        const title = document.createElement('h2');
        title.innerText = 'SELECT MAP';
        Object.assign(title.style, {
            marginBottom: `${VISUALS.UI.SPACING.xl}px`,
            fontSize: VISUALS.UI.FONTS.size.huge,
            fontWeight: VISUALS.UI.FONTS.weight.bold,
            textShadow: VISUALS.UI.SHADOWS.lg,
            letterSpacing: '2px',
        });
        this.mapSelectionContainer.appendChild(title);

        const listContainer = document.createElement('div');
        Object.assign(listContainer.style, {
            display: 'flex',
            gap: `${VISUALS.UI.SPACING.lg}px`,
            overflowX: 'auto',
            overflowY: 'hidden',
            maxWidth: '90%',
            maxHeight: '70vh',
            padding: `${VISUALS.UI.SPACING.xl}px`,
            border: `${VISUALS.UI.BORDERS.width.normal} solid ${VISUALS.UI.COLORS.glass.border}`,
            borderRadius: VISUALS.UI.BORDERS.radius.xl,
            background: VISUALS.UI.COLORS.glass.bgLight,
            backdropFilter: 'blur(10px)',
            boxShadow: VISUALS.UI.SHADOWS.xl,
            scrollbarWidth: 'thin',
            scrollbarColor: `${VISUALS.UI.COLORS.glass.borderHover} ${VISUALS.UI.COLORS.glass.bgDark}`,
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

        UIUtils.createButton(
            this.mapSelectionContainer,
            'BACK',
            () => {
                this.mapSelectionContainer.style.display = 'none';
                this.container.style.display = 'flex';
            },
            {
                background: `linear-gradient(135deg, ${VISUALS.UI.COLORS.danger}, #b71c1c)`,
                fontSize: VISUALS.UI.FONTS.size.xl,
                padding: `${VISUALS.UI.SPACING.md}px ${VISUALS.UI.SPACING.xxl}px`,
                border: `${VISUALS.UI.BORDERS.width.normal} solid ${VISUALS.UI.COLORS.glass.border}`,
                borderRadius: VISUALS.UI.BORDERS.radius.lg,
                boxShadow: VISUALS.UI.SHADOWS.glow.danger,
                width: 'auto',
            },
        );

        document.body.appendChild(this.mapSelectionContainer);
    }

    private createMapCard(parent: HTMLElement, name: string, data: IMapData) {
        try {
            const card = document.createElement('div');
            Object.assign(card.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: `${VISUALS.UI.SPACING.sm}px`,
                background: VISUALS.UI.COLORS.glass.bg,
                padding: `${VISUALS.UI.SPACING.md}px`,
                borderRadius: VISUALS.UI.BORDERS.radius.lg,
                minWidth: '220px',
                cursor: 'pointer',
                border: `${VISUALS.UI.BORDERS.width.thick} solid ${VISUALS.UI.COLORS.glass.border}`,
                backdropFilter: 'blur(5px)',
                transition: VISUALS.UI.TRANSITIONS.presets.normal,
                boxShadow: VISUALS.UI.SHADOWS.md,
                transform: 'translateZ(0)', // GPU acceleration
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
            label.style.fontWeight = VISUALS.UI.FONTS.weight.bold;
            label.style.fontSize = VISUALS.UI.FONTS.size.lg;
            label.style.textShadow = VISUALS.UI.SHADOWS.md;
            card.appendChild(label);

            card.onmouseover = () => {
                card.style.borderColor = VISUALS.UI.COLORS.primary;
                card.style.transform = 'scale(1.05) translateY(-5px)';
                card.style.boxShadow = VISUALS.UI.SHADOWS.glow.primary;
            };
            card.onmouseout = () => {
                card.style.borderColor = VISUALS.UI.COLORS.glass.border;
                card.style.transform = 'scale(1)';
                card.style.boxShadow = VISUALS.UI.SHADOWS.md;
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
        canvases.forEach((canvas) => {
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
