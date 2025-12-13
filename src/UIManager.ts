import { CONFIG } from './Config';
import { IGameScene } from './scenes/IGameScene';
import { ShopSystem } from './ShopSystem';

export class UIManager {
    private scene: IGameScene;
    public shop: ShopSystem;

    private elMoney: HTMLElement;
    private elWave: HTMLElement;
    private elLives: HTMLElement;
    private elForgeBtn: HTMLButtonElement;
    private elStartBtn: HTMLButtonElement;

    private elGameOver: HTMLElement;
    private elFinalWave: HTMLElement;
    private elRestartBtn: HTMLButtonElement;

    // Ссылки на контейнеры для скрытия/показа
    private elHandContainer: HTMLElement;
    private elUiLayer: HTMLElement;

    // === ANIMATED STATS ===
    private prevMoney: number = 0;
    private prevLives: number = 20;
    // =======================

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.shop = new ShopSystem(scene);

        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;

        this.elGameOver = document.getElementById('game-over')!;
        this.elFinalWave = document.getElementById('final-wave')!;
        this.elRestartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

        // Контейнеры
        this.elHandContainer = document.getElementById('hand-container')!;
        this.elUiLayer = document.getElementById('ui-layer')!;

        this.elStartBtn.addEventListener('click', () => this.scene.waveManager.startWave());
        this.elRestartBtn.addEventListener('click', () => {
            this.scene.restart();
            this.hideGameOver();
        });

        // Initial values
        this.prevMoney = this.scene.money;
        this.prevLives = this.scene.lives;
    }

    // --- НОВЫЕ МЕТОДЫ УПРАВЛЕНИЯ ВИДИМОСТЬЮ ---
    public show() {
        // Показываем игровые элементы
        this.elUiLayer.style.display = 'block';
        this.elHandContainer.style.display = 'block';
        // Убедимся, что Game Over скрыт при старте
        this.elGameOver.style.display = 'none';
        this.update();
    }

    public hide() {
        // Прячем всё при выходе в меню или редактор
        this.elUiLayer.style.display = 'none';
        this.elHandContainer.style.display = 'none';
        this.elGameOver.style.display = 'none';
    }
    // ------------------------------------------

    public showGameOver(wave: number) {
        this.elFinalWave.innerText = wave.toString();
        this.elGameOver.style.display = 'flex';
    }

    public hideGameOver() {
        this.elGameOver.style.display = 'none';
    }

    // === ANIMATED FLASH HELPER ===
    private flashElement(el: HTMLElement, color: string) {
        el.style.transition = 'color 0.1s, transform 0.1s';
        el.style.color = color;
        el.style.transform = 'scale(1.3)';
        setTimeout(() => {
            el.style.color = '';
            el.style.transform = 'scale(1)';
        }, 200);
    }
    // ==============================

    public update() {
        if (!this.scene) return;

        // === ANIMATED STATS ===
        const currentMoney = this.scene.money;
        const currentLives = this.scene.lives;

        if (currentMoney > this.prevMoney) {
            this.flashElement(this.elMoney.parentElement || this.elMoney, '#4caf50'); // Green
        } else if (currentMoney < this.prevMoney) {
            this.flashElement(this.elMoney.parentElement || this.elMoney, '#f44336'); // Red
        }

        if (currentLives < this.prevLives) {
            this.flashElement(this.elLives.parentElement || this.elLives, '#f44336'); // Red
        }

        this.prevMoney = currentMoney;
        this.prevLives = currentLives;
        // =======================

        this.elMoney.innerText = this.scene.money.toString();
        this.elLives.innerText = this.scene.lives.toString();
        this.elWave.innerText = this.scene.wave + '/' + CONFIG.WAVES.length;

        const cardSys = this.scene.cardSys;
        const forgeCost = CONFIG.ECONOMY.FORGE_COST;
        const canForge = cardSys && cardSys.canForge();
        const hasMoney = this.scene.money >= forgeCost;

        if (canForge && hasMoney) {
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> КОВАТЬ`;
            this.elForgeBtn.onclick = () => this.scene.cardSys.tryForge();
        } else {
            this.elForgeBtn.disabled = true;
            if (!canForge) this.elForgeBtn.innerHTML = `<span>⚒️</span> НЕТ КАРТ`;
            else if (!hasMoney) this.elForgeBtn.innerHTML = `<span>⚒️</span> ${forgeCost}💰`;
        }

        if (this.scene.waveManager.isWaveActive) {
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

        this.shop.update();
    }
}

