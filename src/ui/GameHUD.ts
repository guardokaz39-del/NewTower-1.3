import { IGameScene } from '../scenes/IGameScene';
import { CONFIG } from '../Config';
import { UIUtils } from '../UIUtils';
import { EventBus, Events } from '../EventBus';
import { VISUALS } from '../VisualConfig';

export class GameHUD {
    private scene: IGameScene;

    private elMoney: HTMLElement;
    private elWave: HTMLElement;
    private elLives: HTMLElement;
    private elEnemyCounter: HTMLElement;
    private elForgeBtn: HTMLButtonElement;
    private elStartBtn: HTMLButtonElement;
    // private elPauseBtn: HTMLButtonElement; // REMOVED

    private boundStartWave: () => void;
    private boundForge: () => void;

    // Subscription Unsubscribers
    private unsubMoney: () => void = () => { };
    private unsubLives: () => void = () => { };
    private unsubWaveStart: () => void = () => { };
    private unsubWaveEnd: () => void = () => { };

    constructor(scene: IGameScene) {
        this.scene = scene;

        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elEnemyCounter = document.getElementById('enemy-counter')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;
        // Pause button removed

        // Bind callbacks
        this.boundStartWave = () => this.scene.waveManager.startWave();
        this.boundForge = () => this.handleForgeClick();

        this.initListeners();
        this.initSubscriptions();

        // Initial values
        this.updateMoney(this.scene.money);
        this.updateLives(this.scene.lives);
        this.updateWaveText(this.scene.wave);
    }

    private initListeners() {
        if (this.elStartBtn) this.elStartBtn.addEventListener('click', this.boundStartWave);
        if (this.elForgeBtn) this.elForgeBtn.addEventListener('click', this.boundForge);
    }

    private handleForgeClick() {
        // FIX: Use forge system
        if (!this.scene.forge || !this.scene.forge.canForge()) return;

        // Determine cost based on card level
        const card = this.scene.forge.forgeSlots[0];
        const forgeCost = card && card.level >= 2
            ? CONFIG.ECONOMY.FORGE_COST_LVL2
            : CONFIG.ECONOMY.FORGE_COST_LVL1;

        if (this.scene.money >= forgeCost) {
            this.scene.forge.tryForge();
            // Button state will update on next tick or via event if we add more events
        }
    }

    private initSubscriptions() {
        const bus = EventBus.getInstance();
        this.unsubMoney = bus.on(Events.MONEY_CHANGED, (money: number) => this.updateMoney(money));
        this.unsubLives = bus.on(Events.LIVES_CHANGED, (lives: number) => this.updateLives(lives));
        this.unsubWaveStart = bus.on(Events.WAVE_STARTED, (wave: number) => {
            this.updateWaveText(wave);
            this.updateStartBtn(true);
        });
        this.unsubWaveEnd = bus.on(Events.WAVE_COMPLETED, () => this.updateStartBtn(false));
    }

    public destroy() {
        if (this.elStartBtn) this.elStartBtn.removeEventListener('click', this.boundStartWave);
        if (this.elForgeBtn) this.elForgeBtn.removeEventListener('click', this.boundForge);

        this.unsubMoney();
        this.unsubLives();
        this.unsubWaveStart();
        this.unsubWaveEnd();
    }

    private updateMoney(newMoney: number) {
        // Flash animation
        const current = parseInt(this.elMoney.innerText) || 0;
        if (newMoney > current) {
            UIUtils.flashElement(this.elMoney.parentElement || this.elMoney, VISUALS.UI.COLORS.success);
        } else if (newMoney < current) {
            UIUtils.flashElement(this.elMoney.parentElement || this.elMoney, VISUALS.UI.COLORS.danger);
        }
        this.elMoney.innerText = newMoney.toString();
        this.updateForgeBtn(newMoney);
    }

    private updateLives(newLives: number) {
        const current = parseInt(this.elLives.innerText) || 0;
        if (newLives < current) {
            UIUtils.flashElement(this.elLives.parentElement || this.elLives, VISUALS.UI.COLORS.danger);
        }
        this.elLives.innerText = newLives.toString();
    }

    private updateWaveText(wave: number) {
        this.elWave.innerText = wave.toString();
    }

    public updateEnemyCounter(currentCount: number) {
        this.elEnemyCounter.innerText = currentCount.toString();
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
        const forgeSys = this.scene.forge;

        // Determine cost based on slot
        let forgeCost: number = CONFIG.ECONOMY.FORGE_COST_LVL1;
        if (forgeSys && forgeSys.forgeSlots[0] && forgeSys.forgeSlots[0].level >= 2) {
            forgeCost = CONFIG.ECONOMY.FORGE_COST_LVL2;
        }

        const canForge = forgeSys && forgeSys.canForge();
        const hasMoney = money >= forgeCost;

        if (canForge && hasMoney) {
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> ${forgeCost}💰`;
            this.elForgeBtn.style.opacity = '1';
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
