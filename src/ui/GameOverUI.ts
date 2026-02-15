import { IGameScene } from '../scenes/IGameScene';

export class GameOverUI {
    private scene: IGameScene;
    private elGameOver: HTMLElement;
    private elFinalWave: HTMLElement;
    private elRestartBtn: HTMLButtonElement;

    // Bound handler
    private boundRestart: () => void;

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.elGameOver = document.getElementById('game-over')!;
        this.elFinalWave = document.getElementById('final-wave')!;
        this.elRestartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

        this.initListeners();

        this.boundRestart = () => {
            this.scene.restart();
            this.hide();
        };
        this.elRestartBtn.addEventListener('click', this.boundRestart);
    }

    private initListeners() {
        // Empty if everything moved to constructor or keep other listeners here
    }

    public dispose() {
        if (this.elRestartBtn) {
            this.elRestartBtn.removeEventListener('click', this.boundRestart);
        }
    }

    public show(wave: number) {
        this.elFinalWave.innerText = wave.toString();
        this.elGameOver.style.display = 'flex';
    }

    public hide() {
        this.elGameOver.style.display = 'none';
    }
}
