import { CONFIG } from './Config';
import { Game } from './Game';

export class UIManager {
    private game: Game;
    
    // Ссылки на элементы
    private elMoney: HTMLElement;
    private elWave: HTMLElement;
    private elLives: HTMLElement;
    private elForgeBtn: HTMLButtonElement;
    private elStartBtn: HTMLButtonElement;

    constructor(game: Game) {
        this.game = game;
        
        // Получаем ссылки на элементы из index.html
        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;

        // Подключаем кнопку старта
        this.elStartBtn.addEventListener('click', () => {
             this.game.startWave(); 
        });
    }

    public update() {
        // 1. Обновляем цифры
        this.elMoney.innerText = this.game.money.toString();
        this.elLives.innerText = this.game.lives.toString();
        this.elWave.innerText = "1/" + CONFIG.WAVES.length;
        
        // 2. Логика кнопки Кузницы
        const cardSys = this.game.cardSys;
        
        // Проверяем: можно ли ковать (есть ли 2 карты) и есть ли деньги
        const canForge = cardSys && cardSys.canForge();
        const hasMoney = this.game.money >= CONFIG.FORGE.COST;

        if (canForge && hasMoney) {
            // АКТИВНО
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> КОВАТЬ`;
            
            // Назначаем действие на клик
            this.elForgeBtn.onclick = () => {
                this.game.cardSys.tryForge();
            };
        } else {
            // НЕАКТИВНО
            this.elForgeBtn.disabled = true;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> ${CONFIG.FORGE.COST}💰`;
            this.elForgeBtn.onclick = null;
        }
    }
}