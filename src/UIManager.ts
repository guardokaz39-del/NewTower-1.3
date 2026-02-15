import { IGameScene } from './scenes/IGameScene';
import { GameHUD } from './ui/GameHUD';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverUI } from './ui/GameOverUI';
import { ShopUI } from './ui/ShopUI';

export type UIMode = 'menu' | 'game' | 'gameOver';

export class UIManager {
    private scene: IGameScene;

    public currentMode: UIMode = 'menu';

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

        // Containes via UIRoot
        this.elHandContainer = this.scene.game.uiRoot.getLayer('hand');
        this.elUiLayer = this.scene.game.uiRoot.getLayer('ui');
    }

    public updatePauseMenu(paused: boolean) {
        this.pauseMenu.update(paused);
    }

    // --- НОВЫЕ МЕТОДЫ УПРАВЛЕНИЯ ВИДИМОСТЬЮ ---
    public setMode(mode: UIMode) {
        this.currentMode = mode;

        switch (mode) {
            case 'menu':
                this.hide();
                break;
            case 'game':
                this.show();
                break;
            case 'gameOver':
                // Handled in showGameOver mostly, but ensure overlays
                this.elUiLayer.style.display = 'block';
                this.elHandContainer.style.display = 'none'; // Hide hand on game over
                break;
        }
    }

    private show() {
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
        this.setMode('gameOver');
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

    public destroy() {
        // Destroy components to clean up listeners
        if (this.shop) this.shop.destroy();
        if (this.hud) this.hud.destroy();
        if (this.gameOver) this.gameOver.dispose();

        // Clear dynamic UI layers (hand), but KEEP static UI layer (HUD/Shop structure)
        if (this.scene && this.scene.game && this.scene.game.uiRoot) {
            // this.scene.game.uiRoot.clearLayer('ui'); // DO NOT CLEAR STATIC UI
            this.scene.game.uiRoot.clearLayer('hand');
            this.scene.game.uiRoot.clearLayer('tooltip');
        }
    }
}
