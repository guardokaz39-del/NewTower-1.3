import { CONFIG } from './Config';
import { Game } from './Game';
import { ShopSystem } from './ShopSystem'; // <-- Новый импорт

export class UIManager {
    private game: Game;
    
    // Новая система
    public shop: ShopSystem;
    
    private elMoney: HTMLElement;
    private elWave: HTMLElement;
    private elLives: HTMLElement;
    private elForgeBtn: HTMLButtonElement;
    private elStartBtn: HTMLButtonElement;
    
    private elGameOver: HTMLElement;
    private elFinalWave: HTMLElement;
    private elRestartBtn: HTMLButtonElement;

    constructor(game: Game) {
        this.game = game;
        
        // Инициализируем Shop System здесь
        this.shop = new ShopSystem(game);
        
        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;
        
        this.elGameOver = document.getElementById('game-over')!;
        this.elFinalWave = document.getElementById('final-wave')!;
        this.elRestartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

        this.elStartBtn.addEventListener('click', () => this.game.startWave());
        this.elRestartBtn.addEventListener('click', () => {
            this.game.restart();
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
        // 1. Обновляем цифры
        this.elMoney.innerText = this.game.money.toString();
        this.elLives.innerText = this.game.lives.toString();
        this.elWave.innerText = this.game.wave + "/" + CONFIG.WAVES.length;
        
        // 2. Логика Кузницы
        const cardSys = this.game.cardSys;
        const forgeCost = CONFIG.ECONOMY.FORGE_COST;
        const canForge = cardSys && cardSys.canForge();
        const hasMoney = this.game.money >= forgeCost;

        if (canForge && hasMoney) {
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> КОВАТЬ`;
            this.elForgeBtn.onclick = () => this.game.cardSys.tryForge();
        } else {
            this.elForgeBtn.disabled = true;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> ${forgeCost}💰`;
            this.elForgeBtn.onclick = null;
        }
        
        // 3. Логика Магазина
        this.shop.updateBtnState();
    }
}