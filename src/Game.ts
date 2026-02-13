import { Assets } from './Assets';
import { UIRoot } from './UIRoot';
import { IMapData } from './MapData';
import { Scene } from './Scene';
import { MenuScene } from './scenes/MenuScene';
import { InputSystem } from './InputSystem';
import { SoundManager } from './SoundManager';
import { CardSelectionUI } from './CardSelectionUI';
import { loadSessionData, saveSessionData } from './Utils';
import { Enemy } from './Enemy';
import { PerformanceMonitor } from './utils/PerformanceMonitor';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public uiRoot: UIRoot;

    public input: InputSystem;
    public currentScene: Scene | null = null;
    private lastTime: number = 0;
    private cardSelection: CardSelectionUI;

    // Logical dimensions (CSS pixels)
    public get width(): number {
        return this.canvas.width / this.dpr;
    }

    public get height(): number {
        return this.canvas.height / this.dpr;
    }

    private dpr: number = 1;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found!');
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.uiRoot = new UIRoot();

        // Initial resize
        this.resize();

        // Handle window resizing
        window.addEventListener('resize', () => this.resize());

        this.input = new InputSystem(this);
        this.loop = this.loop.bind(this);

        // Auto-save session state on unload
        window.addEventListener('beforeunload', () => {
            saveSessionData('lastEnemyId', Enemy.nextId);
        });
    }

    public resize() {
        // Cap DPR at 2.0 to balance quality and performance (saves battery/GPU)
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Get physical display size
        const rect = this.canvas.getBoundingClientRect();

        // NOTE: We rely on CSS (width: 100vw; height: 100vh) to set the display size.
        // If rect is 0 (hidden), stick to window dimensions as fallback.
        const displayWidth = rect.width || window.innerWidth;
        const displayHeight = rect.height || window.innerHeight;

        // Set buffer size (physical pixels)
        this.canvas.width = displayWidth * this.dpr;
        this.canvas.height = displayHeight * this.dpr;

        // Scale context so we draw in "logical" pixels (CSS pixels)
        this.ctx.scale(this.dpr, this.dpr);

        // OPTIONAL: Reset smoothing if needed (pixel art style?)
        // this.ctx.imageSmoothingEnabled = false;

        console.log(`[Game] Resized to ${displayWidth}x${displayHeight} (DPR: ${this.dpr}, Buffer: ${this.canvas.width}x${this.canvas.height})`);
    }

    public async start() {
        this.drawLoadingScreen();

        // Restore global state
        const lastId = loadSessionData('lastEnemyId');
        if (typeof lastId === 'number') {
            Enemy.nextId = lastId;
            console.log(`Restored Enemy.nextId: ${lastId}`);
        }

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

        // Destroy old input listeners to prevent duplication/leaks
        if (this.input) {
            this.input.destroy();
        }
        // Re-initialize input system for the new scene
        this.input = new InputSystem(this);

        this.currentScene = newScene;
        this.currentScene.onEnter();
    }

    private menuScene: MenuScene;

    // ...

    public toMenu() {
        if (!this.menuScene) {
            this.menuScene = new MenuScene(this);
        }
        this.changeScene(this.menuScene);
    }

    private pendingMapData?: IMapData;

    public toGame(mapData?: IMapData) {
        // Store map data and show card selection
        this.pendingMapData = mapData;
        this.cardSelection.show();
    }

    // ...

    private startGameWithCards(selectedCards: string[]) {
        import('./scenes/GameScene')
            .then(({ GameScene }) => {
                // Pass selected cards directly to constructor
                // Verify GameScene constructor signature update in next step
                this.changeScene(new GameScene(this, this.pendingMapData, selectedCards));
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
        PerformanceMonitor.beginFrame();

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
