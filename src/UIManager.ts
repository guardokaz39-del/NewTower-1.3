import { CONFIG } from './Config';
import { GameScene } from './scenes/GameScene'; // Изменили импорт
import { ShopSystem } from './ShopSystem';

export class UIManager {
    private scene: GameScene; // Заменили game на scene
    
    public shop: ShopSystem;
    
    private elMoney: HTMLElement;
    private elWave: HTMLElement;
    private elLives: HTMLElement;
    private elForgeBtn: HTMLButtonElement;
    private elStartBtn: HTMLButtonElement;
    
    private elGameOver: HTMLElement;
    private elFinalWave: HTMLElement;
    private elRestartBtn: HTMLButtonElement;

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

        // Используем this.scene
        this.elStartBtn.addEventListener('click', () => this.scene.waveManager.startWave());
        this.elRestartBtn.addEventListener('click', () => {
            this.scene.restart();
            this.hideGameOver();
        });
    }

    public showGameOver(wave: number) {
        this.elFinalWave.innerText = wave.toString();
        this.elGameOver.style.display = 'flex';
    }

    public hideGameOver() {
        this.elGameOver.style.display = 'none';
    }

    public update() {
        // Данные берем из сцены
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

        // Кнопка волны
        if (this.scene.waveManager.isWaveActive) {
             this.elStartBtn.innerText = '⏳';
             this.elStartBtn.disabled = true;
             this.elStartBtn.style.background = '#555';
        } else {
             this.elStartBtn.innerText = '⚔️';
             this.elStartBtn.disabled = false;
             this.elStartBtn.style.background = '#d32f2f';
        }

        this.shop.update();
    }
}