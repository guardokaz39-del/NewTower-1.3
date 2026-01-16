import { IGameScene } from '../scenes/IGameScene';
import { CONFIG } from '../Config';
import { UIUtils } from '../UIUtils';
import { EventBus, Events } from '../EventBus';

export class GameHUD {
    private scene: IGameScene;

    private elMoney: HTMLElement;
    private elWave: HTMLElement;
    private elLives: HTMLElement;
    private elForgeBtn: HTMLButtonElement;
    private elStartBtn: HTMLButtonElement;
    // private elPauseBtn: HTMLButtonElement; // REMOVED

    constructor(scene: IGameScene) {
        this.scene = scene;

        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;
        // Pause button removed

        this.initListeners();
        this.initSubscriptions();

        // Initial values
        this.updateMoney(this.scene.money);
        this.updateLives(this.scene.lives);
        this.updateWaveText(this.scene.wave);
    }

    private initListeners() {
        this.elStartBtn.addEventListener('click', () => this.scene.waveManager.startWave());

        // Pause button listener removed

        this.elForgeBtn.addEventListener('click', () => {
            if (this.scene.cardSys && this.scene.cardSys.canForge() && this.scene.money >= CONFIG.ECONOMY.FORGE_COST) {
                this.scene.cardSys.tryForge();
                // Button state will update on next tick or via event if we add more events
            }
        });
    }

    private initSubscriptions() {
        const bus = EventBus.getInstance();
        bus.on(Events.MONEY_CHANGED, (money: number) => this.updateMoney(money));
        bus.on(Events.LIVES_CHANGED, (lives: number) => this.updateLives(lives));
        bus.on(Events.WAVE_STARTED, (wave: number) => {
            this.updateWaveText(wave);
            this.updateStartBtn(true);
        });
        bus.on(Events.WAVE_COMPLETED, () => this.updateStartBtn(false));
        // Pause toggle event listener removed for button update (button doesn't exist)
    }

    private updateMoney(newMoney: number) {
        // Flash animation
        const current = parseInt(this.elMoney.innerText) || 0;
        if (newMoney > current) {
            UIUtils.flashElement(this.elMoney.parentElement || this.elMoney, '#4caf50');
        } else if (newMoney < current) {
            UIUtils.flashElement(this.elMoney.parentElement || this.elMoney, '#f44336');
        }
        this.elMoney.innerText = newMoney.toString();
        this.updateForgeBtn(newMoney);
    }

    private updateLives(newLives: number) {
        const current = parseInt(this.elLives.innerText) || 0;
        if (newLives < current) {
            UIUtils.flashElement(this.elLives.parentElement || this.elLives, '#f44336');
        }
        this.elLives.innerText = newLives.toString();
    }

    private updateWaveText(wave: number) {
        this.elWave.innerText = wave + '/' + CONFIG.WAVES.length;
    }

    private updateStartBtn(isWaveActive: boolean) {
        if (isWaveActive) {
            this.elStartBtn.innerText = '>>'; // Fast forward / Next wave
            this.elStartBtn.disabled = false;
            this.elStartBtn.style.opacity = '1';
            this.elStartBtn.title = 'Start next wave early for bonus!';
        } else {
            this.elStartBtn.innerText = '⚔️';
            this.elStartBtn.disabled = false;
            this.elStartBtn.style.opacity = '1';
            this.elStartBtn.title = 'Start Wave';
        }
    }

    private updateForgeBtn(money: number) {
        const cardSys = this.scene.cardSys;
        const forgeCost = CONFIG.ECONOMY.FORGE_COST;
        const canForge = cardSys && cardSys.canForge();
        const hasMoney = money >= forgeCost;

        if (canForge && hasMoney) {
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> КОВАТЬ`;
        } else {
            this.elForgeBtn.disabled = true;
            if (!canForge) this.elForgeBtn.innerHTML = `<span>⚒️</span> НЕТ КАРТ`;
            else if (!hasMoney) this.elForgeBtn.innerHTML = `<span>⚒️</span> ${forgeCost}💰`;
        }
    }

    // updatePauseBtn removed

    public update() {
        // Polling kept only for complex checks if needed, but currently mostly event driven.
        // Forge button might need polling if HAND changes without event.
        // Let's keep a light update for safety or refactor fully later.
        // For now, let's update ForgeBtn here to be safe as CardSystem doesn't emit events yet.
        if (!this.scene) return;
        this.updateForgeBtn(this.scene.money);

        // Also update start btn state just in case? Or rely on events.
        // Events should be enough for Start Btn.
        this.updateStartBtn(this.scene.waveManager.isWaveActive);
    }
}
