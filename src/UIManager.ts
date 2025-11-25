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
        
        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;

        // Подключаем кнопку старта
        this.elStartBtn.addEventListener('click', () => {
             // Пока просто выводим лог, позже подключим реальный старт
             console.log("Кнопка старта нажата");
             // this.game.startWave(); 
        });
    }

    public update() {
        this.elMoney.innerText = this.game.money.toString();
        this.elLives.innerText = this.game.lives.toString();
        // Временно просто показываем номер волны
        this.elWave.innerText = "1/" + CONFIG.WAVES.length;
    }
}