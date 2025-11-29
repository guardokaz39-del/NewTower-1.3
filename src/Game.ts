import { CrashHandler } from './CrashHandler';
const crashHandler = new CrashHandler();

import { Assets } from './Assets';
import { Scene } from './Scene';
import { GameScene } from './scenes/GameScene';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    
    private currentScene: Scene | null = null;
    private lastTime: number = 0;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found!');
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Инициализация глобальных ассетов
        Assets.init();
        
        this.loop = this.loop.bind(this);
    }

    public start() {
        // Запускаем игровую сцену
        this.changeScene(new GameScene(this));
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
        // const dt = timestamp - this.lastTime; // Можно использовать для дельта-тайма
        this.lastTime = timestamp;

        if (this.currentScene) {
            this.currentScene.update();
            this.currentScene.draw(this.ctx);
        }

        requestAnimationFrame(this.loop);
    }
}