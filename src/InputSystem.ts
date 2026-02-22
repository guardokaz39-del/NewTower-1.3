import { Game } from './Game';
import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';
import { SoundManager } from './SoundManager';

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
    private readonly HOLD_THRESHOLD: number = 0.2; // 0.2 seconds (was 12 frames)

    constructor(game: Game) {
        this.game = game;
        this.canvas = game.canvas;

        // Bind methods to context
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.initListeners();
    }

    private initListeners() {
        // Prevent default touch actions (scrolling) on canvas
        this.canvas.style.touchAction = 'none';

        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));
        window.addEventListener('pointerup', this.onPointerUp);
    }

    public destroy() {
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('pointerleave', this.onPointerLeave.bind(this));
        window.removeEventListener('pointerup', this.onPointerUp);
    }

    private onPointerMove(e: PointerEvent) {
        const rect = this.canvas.getBoundingClientRect();

        // Map screen pixels to logical game pixels
        // game.width is the logical width (e.g. 1000), rect.width is display width (e.g. 1000)
        // If CSS stretches the canvas, this handles it.
        const scaleX = this.game.width / rect.width;
        const scaleY = this.game.height / rect.height;

        this.mouseX = (e.clientX - rect.left) * scaleX;
        this.mouseY = (e.clientY - rect.top) * scaleY;

        this.hoverCol = Math.floor(this.mouseX / CONFIG.TILE_SIZE);
        this.hoverRow = Math.floor(this.mouseY / CONFIG.TILE_SIZE);

        const scene = this.game.currentScene;
        // Pass logical coordinates to drag update
        if (scene instanceof GameScene) {
            if (scene.cardSys && scene.cardSys.dragCard) {
                // dragCard expects global screen coords or logical?
                // CardSystem usually uses DOM elements or Canvas drawing?
                // CardSystem ghost uses DOM style.left/top, so it needs real viewport coordinates (clientX/Y)
                scene.cardSys.updateDrag(e.clientX, e.clientY);
            }
        }
    }

    private onPointerLeave(_e: PointerEvent) {
        // Reset hover position when mouse leaves canvas to prevent stuck highlights
        this.hoverCol = -1;
        this.hoverRow = -1;
    }

    private onPointerDown(e: PointerEvent) {
        SoundManager.resume();
        if (e.isPrimary && e.button === 0) {
            this.isMouseDown = true;
            this.holdStartCol = this.hoverCol;
            this.holdStartRow = this.hoverRow;
            this.holdTimer = 0;

            // Allow dragging outside canvas to be tracked if needed, 
            // but for now relying on window.pointerup is fine.
            // this.canvas.setPointerCapture(e.pointerId);
        }
    }

    private onPointerUp(e: PointerEvent) {
        if (this.isMouseDown) {
            this.isMouseDown = false;
            // this.canvas.releasePointerCapture(e.pointerId);
        }

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
    }

    public update(dt: number) {
        const scene = this.game.currentScene;

        if (this.isMouseDown && scene instanceof GameScene) {
            if (!scene.cardSys.dragCard) {
                if (
                    this.hoverCol === this.holdStartCol &&
                    this.hoverRow === this.holdStartRow &&
                    this.hoverCol !== -1
                ) {
                    this.holdTimer += dt;
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
