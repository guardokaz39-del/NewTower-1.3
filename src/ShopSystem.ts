import { IGameScene } from './scenes/IGameScene';
import { CONFIG } from './Config';

export class ShopSystem {
    private scene: IGameScene;

    private elShopBtn: HTMLButtonElement;
    private elSlotsContainer: HTMLElement;

    private shopCards: string[] = [];
    private selectedSlot: number = -1;

    public readonly cost: number = 100;

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.elShopBtn = document.getElementById('shop-btn') as HTMLButtonElement;
        this.elSlotsContainer = document.getElementById('shop-slots')!;

        this.initListeners();
        this.rerollShop();
    }

    private initListeners() {
        this.elShopBtn.addEventListener('click', () => this.buySelectedCard());
    }

    public rerollShop() {
        this.shopCards = [];
        for (let i = 0; i < 3; i++) {
            this.shopCards.push(this.getRandomCardKey());
        }
        this.selectedSlot = -1;
        this.render();
    }

    private getRandomCardKey(): string {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        return keys[Math.floor(Math.random() * keys.length)];
    }

    public selectSlot(index: number) {
        if (index < 0 || index >= this.shopCards.length) return;

        if (this.selectedSlot === index) {
            this.selectedSlot = -1;
        } else {
            this.selectedSlot = index;
        }
        this.render();
        this.scene.ui.update();
    }

    public buySelectedCard() {
        if (this.selectedSlot === -1) return;

        if (this.scene.money < this.cost) {
            this.scene.showFloatingText('Не хватает золота!', 800, 800, 'red');
            return;
        }

        if (this.scene.cardSys.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
            this.scene.showFloatingText('Рука переполнена!', 800, 800, 'orange');
            return;
        }

        this.scene.money -= this.cost;
        this.scene.metrics.trackMoneySpent(this.cost);

        const cardKey = this.shopCards[this.selectedSlot];
        this.scene.cardSys.addCard(cardKey, 1);

        this.scene.effects.add({
            type: 'text',
            text: `- ${this.cost}💰`,
            x: this.scene.game.canvas.width - 200,
            y: this.scene.game.canvas.height - 100,
            life: 60,
            color: 'gold',
            vy: -1,
        });

        this.shopCards[this.selectedSlot] = this.getRandomCardKey();
        this.selectedSlot = -1;

        this.render();
        this.scene.ui.update();
    }

    public update() {
        this.elShopBtn.innerHTML = `<span>🛒</span> ${this.cost}💰`;

        const canAfford = this.scene.money >= this.cost;
        const hasSelection = this.selectedSlot !== -1;

        if (canAfford && hasSelection) {
            this.elShopBtn.disabled = false;
            this.elShopBtn.style.opacity = '1';
            this.elShopBtn.style.cursor = 'pointer';
        } else {
            this.elShopBtn.disabled = true;
            this.elShopBtn.style.opacity = '0.5';
            this.elShopBtn.style.cursor = 'not-allowed';
        }
    }

    private render() {
        this.elSlotsContainer.innerHTML = '';

        this.shopCards.forEach((key, idx) => {
            const typeConfig = CONFIG.CARD_TYPES[key];

            // Контейнер слота
            const slot = document.createElement('div');
            slot.className = 'slot shop-slot';

            // --- ВИЗУАЛЬНОЕ ИЗМЕНЕНИЕ ---
            // Создаем карту внутри, точно такую же, как в руке
            const cardVisual = document.createElement('div');
            cardVisual.className = `card type-${typeConfig.id}`;
            // Убираем pointer-events, чтобы клик проходил сквозь карту на слот
            // Немного уменьшаем (scale), чтобы влезла в слот красиво
            cardVisual.style.pointerEvents = 'none';
            cardVisual.style.transform = 'scale(0.9)';

            // В магазине мы продаем карты 1 уровня
            cardVisual.innerHTML = `
                <div class="card-level">1</div>
                <div class="card-icon">${typeConfig.icon}</div>
            `;

            slot.appendChild(cardVisual);
            // -----------------------------

            // Подсветка выбора
            if (this.selectedSlot === idx) {
                slot.style.border = '2px solid #00ffff';
                slot.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)';
                slot.style.background = 'rgba(255, 255, 255, 0.1)';
            } else {
                slot.style.border = '1px solid #555';
                slot.style.boxShadow = 'none';
                slot.style.background = 'rgba(0, 0, 0, 0.3)';
            }

            slot.style.cursor = 'pointer';
            slot.onclick = () => this.selectSlot(idx);

            this.elSlotsContainer.appendChild(slot);
        });
    }
}
