import { Assets } from './Assets';
import { Scene } from './Scene';
import { MenuScene } from './scenes/MenuScene';
import { InputSystem } from './InputSystem';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    
    // InputSystem теперь живет здесь
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

        Assets.init();
        
        // Создаем InputSystem один раз
        this.input = new InputSystem(this);
        
        this.loop = this.loop.bind(this);
    }

    public start() {
        // Стартуем сразу с Меню (чтобы не потерять навигацию)
        this.changeScene(new MenuScene(this));
        this.loop(0);
    }

    public changeScene(newScene: Scene) {
        if (this.currentScene) {
            this.currentScene.onExit();
        }
        this.currentScene = newScene;
        this.currentScene.onEnter();
    }

    private loop(timestamp: number) {
        // const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Обновляем ввод (клики, мышь)
        this.input.update();

        // Обновляем текущую сцену
        if (this.currentScene) {
            this.currentScene.update();
            this.currentScene.draw(this.ctx);
        }

        requestAnimationFrame(this.loop);
    }
}