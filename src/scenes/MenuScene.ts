import { BaseScene } from '../BaseScene';
import { Game } from '../Game';
import { DEMO_MAP, IMapData } from '../MapData';
import { validateMap } from '../Utils';
import { MapStorage } from '../MapStorage';
import { MapManager } from '../Map';
import { CONFIG } from '../Config';
import { UIUtils } from '../UIUtils';
import { Assets } from '../Assets';
import { VISUALS } from '../VisualConfig';
import { StressTestScene } from './StressTestScene';
import { MapSelectionUI } from '../ui/MapSelectionUI';
import { EventBus, Events } from '../EventBus';

export class MenuScene extends BaseScene {
    private game: Game;
    private container!: HTMLElement;
    private mapSelectionUI?: MapSelectionUI;
    private playRequestSub!: () => void;

    constructor(game: Game) {
        super();
        this.game = game;
        // UI creation moved to onEnterImpl
    }

    protected onEnterImpl() {
        if (!this.container) {
            this.createUI();
        }
        if (!this.mapSelectionUI) {
            this.mapSelectionUI = new MapSelectionUI(() => {
                this.mapSelectionUI?.hide();
                this.container.style.display = 'flex';
            });
            this.mapSelectionUI.init();
        }

        this.container.style.display = 'flex';
        this.mapSelectionUI.hide();

        // Подписываемся на запуск карты
        this.playRequestSub = EventBus.getInstance().on(Events.UI_MAP_PLAY_REQUESTED, (data: IMapData) => {
            const isValid = validateMap(data);
            if (isValid) {
                this.game.toGame(data);
            } else {
                console.error('Map is invalid!');
                alert('Map is invalid!');
            }
        });

        // Hide game UI layers via UIRoot
        this.game.uiRoot.hideGameUI();
    }

    protected onExitImpl() {
        if (this.container) this.container.style.display = 'none';

        if (this.playRequestSub) {
            this.playRequestSub();
        }

        if (this.mapSelectionUI) {
            this.mapSelectionUI.destroy();
            this.mapSelectionUI = undefined; // Для повторной ре-инициализации при возврате
        }
    }

    public update(dt: number) { }

    public draw(ctx: CanvasRenderingContext2D) {
        // === Фоновое Изображение ===
        const bgImage = Assets.get('menu_start');
        if (bgImage) {
            // Cover-fit с центрированием (масштабирует чтобы покрыть весь canvas)
            const scale = Math.max(
                this.game.width / bgImage.width,
                this.game.height / bgImage.height
            );
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

        UIUtils.createButton(this.container, '🧪 STRESS TEST', () => {
            // Dynamic import to avoid circular dependency if any, 
            // but standard import is fine here as MenuScene -> StressTestScene is one way usually.
            // However, to be safe let's use the import at top.
            this.game.changeScene(new StressTestScene(this.game));
        }, { width: '300px', fontSize: '24px', padding: '15px 40px', background: 'linear-gradient(135deg, #444, #222)' });

        document.body.appendChild(this.container);
    }

    private showMapSelection() {
        this.container.style.display = 'none';
        this.mapSelectionUI?.show();
    }

    // createBtn removed - replaced by UIUtils.createButton
}
