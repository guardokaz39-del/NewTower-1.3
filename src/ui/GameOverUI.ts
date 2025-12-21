import { IGameScene } from '../scenes/IGameScene';

export class GameOverUI {
    private scene: IGameScene;
    private elGameOver: HTMLElement;
    private elFinalWave: HTMLElement;
    private elRestartBtn: HTMLButtonElement;

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.elGameOver = document.getElementById('game-over')!;
        this.elFinalWave = document.getElementById('final-wave')!;
        this.elRestartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

        this.initListeners();
    }

    private initListeners() {
        this.elRestartBtn.addEventListener('click', () => {
            this.scene.restart();
            this.hide();
        });
    }

    public show(wave: number) {
        this.elFinalWave.innerText = wave.toString();
        this.elGameOver.style.display = 'flex';
    }

    public hide() {
        this.elGameOver.style.display = 'none';
    }
}
