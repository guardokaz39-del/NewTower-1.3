import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';

export class InputSystem {
    private scene: GameScene;
    private canvas: HTMLCanvasElement;

    public mouseX: number = 0;
    public mouseY: number = 0;
    public hoverCol: number = -1;
    public hoverRow: number = -1;

    public isMouseDown: boolean = false;
    
    // Таймер для различения Клика и Удержания
    private holdTimer: number = 0;
    private holdStartCol: number = -1;
    private holdStartRow: number = -1;
    private readonly HOLD_THRESHOLD: number = 15; // Примерно 250мс (при 60fps)

    constructor(scene: GameScene) {
        this.scene = scene;
        // Канвас находится в движке (game), к которому у сцены есть доступ
        this.canvas = scene.game.canvas;
        this.initListeners();
    }

    public updateMousePos(clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        this.mouseX = (clientX - rect.left) * scaleX;
        this.mouseY = (clientY - rect.top) * scaleY;

        if (this.mouseX < 0 || this.mouseY < 0 || this.mouseX > this.canvas.width || this.mouseY > this.canvas.height) {
            this.hoverCol = -1;
            this.hoverRow = -1;
        } else {
            this.hoverCol = Math.floor(this.mouseX / CONFIG.TILE_SIZE);
            this.hoverRow = Math.floor(this.mouseY / CONFIG.TILE_SIZE);
        }
    }

    public forceReset() {
        this.isMouseDown = false;
        this.holdTimer = 0;
        this.holdStartCol = -1;
        this.holdStartRow = -1;
        this.scene.stopBuildingTower();
    }

    private initListeners() {
        window.addEventListener('mousemove', (e) => {
            this.updateMousePos(e.clientX, e.clientY);
            
            // Обращаемся к cardSys через сцену
            if (this.scene.cardSys.dragCard) {
                this.scene.cardSys.updateDrag(e.clientX, e.clientY);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { 
                this.isMouseDown = true;
                this.updateMousePos(e.clientX, e.clientY);
                
                // Начинаем отсчет удержания
                if (this.hoverCol >= 0) {
                    this.holdStartCol = this.hoverCol;
                    this.holdStartRow = this.hoverRow;
                    this.holdTimer = 0;
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            this.updateMousePos(e.clientX, e.clientY);

            // Если мы тащили карту - это дроп
            if (this.scene.cardSys.dragCard) {
                this.scene.cardSys.endDrag(e);
                this.forceReset();
                return;
            }

            // Если мы просто кликнули (быстро отпустили)
            if (this.isMouseDown && this.holdTimer < this.HOLD_THRESHOLD) {
                // Это КЛИК -> Выделяем или Сбрасываем
                this.scene.handleGridClick(this.hoverCol, this.hoverRow);
            }

            this.forceReset();
        });
    }

    public update() {
        // Логика УДЕРЖАНИЯ (стройка)
        if (this.isMouseDown && !this.scene.cardSys.dragCard) {
            // Если мышь все еще на той же клетке
            if (this.hoverCol === this.holdStartCol && this.hoverRow === this.holdStartRow && this.hoverCol !== -1) {
                this.holdTimer++;
                // Если держим долго -> начинаем строить
                if (this.holdTimer >= this.HOLD_THRESHOLD) {
                    this.scene.startBuildingTower(this.hoverCol, this.hoverRow);
                }
            } else {
                // Сдвинули мышь - сброс
                this.holdTimer = 0;
                this.holdStartCol = this.hoverCol;
                this.holdStartRow = this.hoverRow;
                this.scene.stopBuildingTower();
            }
        }
    }
}