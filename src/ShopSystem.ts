import { Game } from './Game';
import { CONFIG } from './Config';

export class ShopSystem {
    private game: Game;
    private elShopBtn: HTMLButtonElement;
    public readonly cost: number = 100; // Цена покупки карты

    constructor(game: Game) {
        this.game = game;
        this.elShopBtn = document.getElementById('shop-btn') as HTMLButtonElement;
        this.initListeners();
    }

    private initListeners() {
        this.elShopBtn.addEventListener('click', () => this.buyCard());
    }

    // Основная логика покупки карты
    public buyCard(): boolean {
        // 1. Проверка денег
        if (this.game.money < this.cost) {
            // Теперь вызывается как public:
            this.game.showFloatingText("Не хватает золота!", 800, 800, 'red'); 
            return false;
        }
        
        // 2. Проверка лимита руки
        if (this.game.cardSys.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
             // Теперь вызывается как public:
             this.game.showFloatingText("Рука переполнена!", 800, 800, 'orange');
             return false;
        }

        // 3. Вычитаем деньги и выдаем карту
        this.game.money -= this.cost;
        this.game.giveRandomCard(); 
        
        this.game.effects.add({
            type: 'text', text: `- ${this.cost}💰`, 
            x: this.game.canvas.width - 100, y: this.game.canvas.height - 50,
            life: 60, color: 'gold', vy: -1
        });
        
        this.game.ui.update();
        return true;
    }

    // Обновляем состояние кнопки магазина
    public updateBtnState() {
        const canBuy = 
            this.game.money >= this.cost && 
            this.game.cardSys.hand.length < CONFIG.PLAYER.HAND_LIMIT;

        this.elShopBtn.disabled = !canBuy;
        this.elShopBtn.innerHTML = `<span>🛒</span> ${this.cost}💰`;
    }
}