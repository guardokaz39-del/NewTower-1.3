import { IGameScene } from '../scenes/IGameScene';

export interface IGameEndStats {
    waves: number;
    kills: number;
    money: number;
}

export class GameOverUI {
    private scene: IGameScene;
    private elContainer: HTMLElement;
    private elTitle: HTMLElement;
    private elStatWaves: HTMLElement;
    private elStatKills: HTMLElement;
    private elStatMoney: HTMLElement;
    private elRestartBtn: HTMLButtonElement;
    private elMenuBtn: HTMLButtonElement;

    // Bound handlers for safe unsubscription
    private boundRestart: () => void;
    private boundMenu: () => void;

    constructor(scene: IGameScene) {
        this.scene = scene;

        // DOM refs — fail-fast if missing
        this.elContainer = document.getElementById('game-over')!;
        this.elTitle = document.getElementById('game-end-title')!;
        this.elStatWaves = document.getElementById('stat-waves')!;
        this.elStatKills = document.getElementById('stat-kills')!;
        this.elStatMoney = document.getElementById('stat-money')!;
        this.elRestartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
        this.elMenuBtn = document.getElementById('menu-btn') as HTMLButtonElement;

        this.boundRestart = () => {
            this.hide();
            this.scene.restart();
        };
        this.boundMenu = () => {
            this.hide();
            this.scene.game.toMenu();
        };

        this.elRestartBtn.addEventListener('click', this.boundRestart);
        this.elMenuBtn.addEventListener('click', this.boundMenu);
    }

    public show(wave: number, stats: IGameEndStats, isVictory: boolean): void {
        // Title & color variant
        this.elTitle.innerText = isVictory ? 'ПОБЕДА!' : 'НЕУДАЧА';
        this.elContainer.classList.toggle('victory', isVictory);

        // Stats
        this.elStatWaves.innerText = wave.toString();
        this.elStatKills.innerText = stats.kills.toString();
        this.elStatMoney.innerText = stats.money.toString();

        this.elContainer.style.display = 'flex';
    }

    public hide(): void {
        this.elContainer.style.display = 'none';
        this.elContainer.classList.remove('victory');
    }

    public dispose(): void {
        if (this.elRestartBtn) {
            this.elRestartBtn.removeEventListener('click', this.boundRestart);
        }
        if (this.elMenuBtn) {
            this.elMenuBtn.removeEventListener('click', this.boundMenu);
        }
    }
}
