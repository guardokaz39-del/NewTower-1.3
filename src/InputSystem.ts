import { Game } from './Game';
import { GameScene } from './scenes/GameScene';

export class InputSystem {
    private game: Game;
    private canvas: HTMLCanvasElement;

    public mouseX: number = 0;
    public mouseY: number = 0;
    public hoverCol: number = -1;
    public hoverRow: number = -1;

    public isMouseDown: boolean = false;
    private holdTimer: number = 0;
    private holdStartCol: number = -1;
    private holdStartRow: number = -1;
    private readonly HOLD_THRESHOLD: number = 12; 

    constructor(game: Game) {
        this.game = game;
        this.canvas = game.canvas;
        this.initListeners();
    }

    private initListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;

            this.hoverCol = Math.floor(this.mouseX / 64); // 64 = TILE_SIZE
            this.hoverRow = Math.floor(this.mouseY / 64);

            // Только если сейчас ИГРА, обновляем перетаскивание карты
            const scene = this.game.currentScene;
            if (scene instanceof GameScene) {
                if (scene.cardSys && scene.cardSys.dragCard) {
                    scene.cardSys.updateDrag(e.clientX, e.clientY);
                }
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
                this.holdStartCol = this.hoverCol;
                this.holdStartRow = this.hoverRow;
                this.holdTimer = 0;
            }
        });

        window.addEventListener('mouseup', (e) => {
            this.isMouseDown = false;
            
            const scene = this.game.currentScene;
            
            // Логика только для GameScene
            if (scene instanceof GameScene) {
                // Если тащили карту - сбрасываем
                if (scene.cardSys.dragCard) {
                    scene.cardSys.endDrag(e);
                    return;
                }
                
                // Если был просто клик (быстрое нажатие)
                if (this.holdTimer < this.HOLD_THRESHOLD) {
                    scene.handleGridClick(this.hoverCol, this.hoverRow);
                }
            }

            this.holdTimer = 0;
        });
    }

    public update() {
        const scene = this.game.currentScene;
        
        // Логика удержания (строительство)
        if (this.isMouseDown && scene instanceof GameScene) {
            if (!scene.cardSys.dragCard) {
                if (this.hoverCol === this.holdStartCol && this.hoverRow === this.holdStartRow && this.hoverCol !== -1) {
                    this.holdTimer++;
                    // Если держим долго -> строим
                    if (this.holdTimer >= this.HOLD_THRESHOLD) {
                        scene.startBuildingTower(this.hoverCol, this.hoverRow);
                    }
                } else {
                    this.holdTimer = 0;
                }
            }
        }
    }
}