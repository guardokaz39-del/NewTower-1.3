import { Assets } from './Assets';
import { Scene } from './Scene';
import { MenuScene } from './scenes/MenuScene';
import { InputSystem } from './InputSystem';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    public input: InputSystem;
    public currentScene: Scene | null = null;
    private lastTime: number = 0;

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
            await Assets.loadAll();
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

    public toGame(mapData?: any) {
        import('./scenes/GameScene')
            .then(({ GameScene }) => {
                this.changeScene(new GameScene(this, mapData));
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
        this.lastTime = timestamp;

        this.input.update();

        if (this.currentScene) {
            this.currentScene.update();
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
