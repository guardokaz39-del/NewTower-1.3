import { Assets } from './Assets';
import { IMapData } from './MapData';
import { Scene } from './Scene';
import { MenuScene } from './scenes/MenuScene';
import { InputSystem } from './InputSystem';
import { SoundManager } from './SoundManager';
import { CardSelectionUI } from './CardSelectionUI';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    public input: InputSystem;
    public currentScene: Scene | null = null;
    private lastTime: number = 0;
    private cardSelection: CardSelectionUI;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found!');
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.input = new InputSystem(this);
        this.loop = this.loop.bind(this);
    }

    public async start() {
        this.drawLoadingScreen();

        try {
            await SoundManager.init();

            // Global Audio Resume logic (Deduplicated from UIManager)
            const resumeAudio = () => {
                SoundManager.resume();
            };
            window.addEventListener('click', resumeAudio, { once: true });
            window.addEventListener('keydown', resumeAudio, { once: true });

            await Assets.loadAll();

            // FIXED: Initialize card selection UI AFTER Assets loaded (DOM is ready)
            this.cardSelection = new CardSelectionUI((selectedCards) => {
                // Callback: when selection is complete, load the game with selected cards
                this.startGameWithCards(selectedCards);
            });

            console.log('Game started!');
            this.toMenu();
            this.loop(0);
        } catch (e) {
            console.error('FATAL ERROR: Failed to load assets', e);
            this.ctx.fillStyle = 'red';
            this.ctx.fillText('FAILED TO LOAD ASSETS', 50, 50);
        }
    }

    private drawLoadingScreen() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '30px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LOADING ASSETS...', this.canvas.width / 2, this.canvas.height / 2);
    }

    public changeScene(newScene: Scene) {
        if (this.currentScene) {
            this.currentScene.onExit();
        }
        this.currentScene = newScene;
        this.currentScene.onEnter();
    }

    public toMenu() {
        this.changeScene(new MenuScene(this));
    }

    private pendingMapData?: IMapData;

    public toGame(mapData?: IMapData) {
        // Store map data and show card selection
        this.pendingMapData = mapData;
        this.cardSelection.show();
    }

    private startGameWithCards(selectedCards: string[]) {
        import('./scenes/GameScene')
            .then(({ GameScene }) => {
                // Pass selected cards to GameScene via global or constructor
                (window as any)._STARTING_CARDS = selectedCards;
                this.changeScene(new GameScene(this, this.pendingMapData));
            })
            .catch((err) => {
                console.error('Failed to load GameScene:', err);
                this.drawError('Failed to load GameScene. Check console.');
                setTimeout(() => this.toMenu(), 3000);
            });
    }

    public toEditor() {
        import('./scenes/EditorScene')
            .then(({ EditorScene }) => {
                this.changeScene(new EditorScene(this));
            })
            .catch((err) => {
                console.error('Failed to load EditorScene:', err);
                this.drawError('Failed to load EditorScene. Check console.');
                setTimeout(() => this.toMenu(), 3000);
            });
    }

    private loop(timestamp: number) {
        // 1. Вычисляем дельту (в секундах)
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Защита от скачков: ограничиваем dt до 0.1 (10 FPS минимум)
        // Если dt больше, просто замедляем игру, но не пропускаем кадр
        if (dt > 0.1) {
            // dt = 0.1; // Optional: Force clamp?
            // For now, let's just SKIP the return so logic runs even if slow
            // But if we want to avoid huge jumps, we clamp:
        }
        const safeDt = Math.min(dt, 0.1);

        // 2. Передаем safeDt дальше
        this.input.update(safeDt);
        if (this.currentScene) {
            this.currentScene.update(safeDt);
            this.currentScene.draw(this.ctx);
        }

        requestAnimationFrame(this.loop);
    }
    private drawError(msg: string) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'red';
        this.ctx.font = '30px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(msg, this.canvas.width / 2, this.canvas.height / 2);
    }
}
