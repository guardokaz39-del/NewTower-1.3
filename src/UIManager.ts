import { CONFIG } from './Config';
import { GameScene } from './scenes/GameScene';
import { ShopSystem } from './ShopSystem';

export class UIManager {
    private scene: GameScene;
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

    constructor(scene: GameScene) {
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

    public update() {
        if (!this.scene) return;

        this.elMoney.innerText = this.scene.money.toString();
        this.elLives.innerText = this.scene.lives.toString();
        this.elWave.innerText = this.scene.wave + "/" + CONFIG.WAVES.length;
        
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
             this.elStartBtn.innerText = '⏳';
             this.elStartBtn.disabled = true;
             this.elStartBtn.style.opacity = '0.5';
        } else {
             this.elStartBtn.innerText = '⚔️';
             this.elStartBtn.disabled = false;
             this.elStartBtn.style.opacity = '1';
        }

        this.shop.update();
    }
}