import { IGameScene } from './scenes/IGameScene';
import { GameHUD } from './ui/GameHUD';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverUI } from './ui/GameOverUI';
import { ShopUI } from './ui/ShopUI';

export class UIManager {
    private scene: IGameScene;

    // Components
    public shop: ShopUI;
    public hud: GameHUD;
    public pauseMenu: PauseMenu;
    public gameOver: GameOverUI;

    // Ссылки на контейнеры для скрытия/показа
    private elHandContainer: HTMLElement;
    private elUiLayer: HTMLElement;

    constructor(scene: IGameScene) {
        this.scene = scene;

        // Init Components
        this.shop = new ShopUI(scene);
        this.hud = new GameHUD(scene);
        console.log('✨ UIManager: Initializing PauseMenu...');
        this.pauseMenu = new PauseMenu(scene);
        this.gameOver = new GameOverUI(scene);

        // Контейнеры
        this.elHandContainer = document.getElementById('hand-container')!;
        this.elUiLayer = document.getElementById('ui-layer')!;
    }

    public updatePauseMenu(paused: boolean) {
        this.pauseMenu.update(paused);
    }

    // --- НОВЫЕ МЕТОДЫ УПРАВЛЕНИЯ ВИДИМОСТЬЮ ---
    public show() {
        // Показываем игровые элементы
        this.elUiLayer.style.display = 'block';
        this.elHandContainer.style.display = 'block';
        // Убедимся, что Game Over скрыт при старте
        this.gameOver.hide();
        this.update();
    }

    public hide() {
        // Прячем всё при выходе в меню или редактор
        this.elUiLayer.style.display = 'none';
        this.elHandContainer.style.display = 'none';
        this.gameOver.hide();
    }
    // ------------------------------------------

    public showGameOver(wave: number) {
        this.gameOver.show(wave);
    }

    public hideGameOver() {
        this.gameOver.hide();
    }

    public update() {
        if (!this.scene) return;

        this.hud.update();
        this.shop.update();
    }
}
