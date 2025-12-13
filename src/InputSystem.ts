import { Game } from './Game';
import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';

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

            this.hoverCol = Math.floor(this.mouseX / CONFIG.TILE_SIZE);
            this.hoverRow = Math.floor(this.mouseY / CONFIG.TILE_SIZE);

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
            if (scene instanceof GameScene) {
                // Если тащили карту
                if (scene.cardSys.dragCard) {
                    scene.cardSys.endDrag(e);
                    return;
                }

                // CRITICAL FIX: Only process grid clicks if click was on the canvas
                // Otherwise UI clicks (sell button, cards) will trigger grid click and deselect tower
                const clickTarget = e.target as HTMLElement;
                const clickedOnCanvas = clickTarget === this.canvas;

                if (!clickedOnCanvas) {
                    // Click was on a UI element, don't process as grid click
                    this.holdTimer = 0;
                    return;
                }

                // Если это был клик (не удержание)
                if (this.holdTimer < this.HOLD_THRESHOLD) {
                    // Вызов метода GameScene
                    scene.handleGridClick(this.hoverCol, this.hoverRow);
                }
            }

            this.holdTimer = 0;
        });
    }

    public update() {
        const scene = this.game.currentScene;

        if (this.isMouseDown && scene instanceof GameScene) {
            if (!scene.cardSys.dragCard) {
                if (
                    this.hoverCol === this.holdStartCol &&
                    this.hoverRow === this.holdStartRow &&
                    this.hoverCol !== -1
                ) {
                    this.holdTimer++;
                    if (this.holdTimer >= this.HOLD_THRESHOLD) {
                        // Вызов строительства
                        scene.startBuildingTower(this.hoverCol, this.hoverRow);
                    }
                } else {
                    this.holdTimer = 0;
                }
            }
        }
    }
}
