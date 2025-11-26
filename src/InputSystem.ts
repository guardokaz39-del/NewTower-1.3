import { Game } from './Game';

export class InputSystem {
    private game: Game;
    private canvas: HTMLCanvasElement;

    // Состояние курсора
    public mouseX: number = 0;
    public mouseY: number = 0;
    
    // Состояние сетки (над какой клеткой мышь)
    public hoverCol: number = -1;
    public hoverRow: number = -1;

    // Состояние нажатия
    public isMouseDown: boolean = false;
    public isDragging: boolean = false;

    constructor(game: Game) {
        this.game = game;
        this.canvas = game.canvas;
        this.initListeners();
    }

    private initListeners() {
        // Движение мыши
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;

            // Пересчет в координаты сетки (64px - размер клетки)
            this.hoverCol = Math.floor(this.mouseX / 64);
            this.hoverRow = Math.floor(this.mouseY / 64);

            // Если мы что-то тащим (карту), обновляем "призрака"
            if (this.game.cardSys.dragCard) {
                this.game.cardSys.updateDrag(e.clientX, e.clientY);
            }
        });

        // Нажатие
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // ЛКМ
                this.isMouseDown = true;
                // Сообщаем игре о клике для начала строительства
                this.game.handleGridClick(this.hoverCol, this.hoverRow);
            }
        });

        // Отпускание (глобально, на случай если ушли за пределы канваса)
        window.addEventListener('mouseup', (e) => {
            this.isMouseDown = false;
            
            // Если тащили карту - отпускаем
            if (this.game.cardSys.dragCard) {
                this.game.cardSys.endDrag(e);
            }
        });
    }
}