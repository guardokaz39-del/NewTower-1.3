import { IGameScene } from '../scenes/IGameScene';
import { CONFIG } from '../Config';
import { EventBus, Events } from '../EventBus';
import { VISUALS } from '../VisualConfig';
import { getAllCardKeys } from '../MapData';

export class ShopUI {
    private scene: IGameScene;

    private elShopBtn: HTMLButtonElement;
    private elRefreshBtn: HTMLButtonElement; // [NEW]
    private elSlotsContainer: HTMLElement;

    private shopCards: string[] = [];
    private selectedSlot: number = -1;

    public readonly cost: number = 100;
    public readonly refreshCost: number = CONFIG.ECONOMY.SHOP_REROLL_COST; // [NEW]

    private boundBuy: () => void;
    private boundRefresh: () => void;
    private boundMoneyChanged: (money: number) => void;
    private unsubMoney: () => void = () => { };

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.elShopBtn = document.getElementById('shop-btn') as HTMLButtonElement;
        this.elRefreshBtn = document.getElementById('shop-refresh-btn') as HTMLButtonElement; // [NEW]
        this.elSlotsContainer = document.getElementById('shop-slots')!;

        // Bind callbacks
        this.boundBuy = () => this.buySelectedCard();
        this.boundRefresh = () => this.rerollWithCost();
        this.boundMoneyChanged = () => this.update();

        this.initListeners();
        this.rerollShop();
    }

    private initListeners() {
        if (this.elShopBtn) this.elShopBtn.addEventListener('click', this.boundBuy);
        if (this.elRefreshBtn) this.elRefreshBtn.addEventListener('click', this.boundRefresh);

        this.unsubMoney = EventBus.getInstance().on(Events.MONEY_CHANGED, this.boundMoneyChanged);
    }

    public destroy() {
        if (this.elShopBtn) this.elShopBtn.removeEventListener('click', this.boundBuy);
        if (this.elRefreshBtn) this.elRefreshBtn.removeEventListener('click', this.boundRefresh);

        this.unsubMoney();
    }

    public rerollWithCost() {
        if (this.scene.money < this.refreshCost) {
            this.scene.showFloatingText('Not enough gold!', 800, 800, 'red');
            return;
        }

        if (this.scene.spendMoney(this.refreshCost)) {
            this.scene.metrics.trackMoneySpent(this.refreshCost);
            this.scene.showFloatingText(`- ${this.refreshCost}💰`, 800, 800, 'gold');
            this.rerollShop();

            // Anim refresh
            this.elRefreshBtn.classList.add('shaking');
            setTimeout(() => this.elRefreshBtn.classList.remove('shaking'), 500);
        }
    }

    public rerollShop() {
        this.shopCards = [];
        let allKeys = this.scene.mapData?.allowedCards ?? getAllCardKeys();
        if (allKeys.length === 0) allKeys = getAllCardKeys(); // fail-safe

        // IMPROVED: Ensure diversity - no duplicates if possible
        const shuffled = [...allKeys].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 3; i++) {
            this.shopCards.push(shuffled[i % Math.max(1, shuffled.length)]);
        }

        this.selectedSlot = -1;
        this.render();
    }

    private getRandomCardKey(): string {
        let keys = this.scene.mapData?.allowedCards ?? getAllCardKeys();
        if (keys.length === 0) keys = getAllCardKeys(); // fail-safe
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
        this.update();
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

        if (!this.scene.spendMoney(this.cost)) {
            this.scene.showFloatingText('Error: Transaction Failed', 800, 800, 'red');
            return;
        }
        this.scene.metrics.trackMoneySpent(this.cost);

        const cardKey = this.shopCards[this.selectedSlot];
        this.scene.cardSys.addCard(cardKey, 1);

        this.scene.effects.add({
            type: 'text',
            text: `- ${this.cost}💰`,
            x: this.scene.game.width - 200,
            y: this.scene.game.height - 100,
            life: 60,
            color: 'gold',
            vy: -1,
        });

        this.shopCards[this.selectedSlot] = this.getRandomCardKey();
        this.selectedSlot = -1;

        this.render();
        this.update();
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

        // Refresh Btn State
        this.elRefreshBtn.innerHTML = `↻ ${this.refreshCost}💰`; // NEW: Update text dynamically
        if (this.scene.money >= this.refreshCost) {
            this.elRefreshBtn.disabled = false;
            this.elRefreshBtn.style.opacity = '1';
            this.elRefreshBtn.style.cursor = 'pointer';
        } else {
            this.elRefreshBtn.disabled = true;
            this.elRefreshBtn.style.opacity = '0.5';
            this.elRefreshBtn.style.cursor = 'not-allowed';
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
            cardVisual.className = `card type-${typeConfig.id} level-1`;
            // Убираем pointer-events, чтобы клик проходил сквозь карту на слот
            cardVisual.style.pointerEvents = 'none';

            // Get stats HTML for level 1
            const statsHTML = this.getCardStatsHTML(typeConfig.id);

            // В магазине мы продаем карты 1 уровня
            cardVisual.innerHTML = `
                <div class="card-level">★</div>
                <div class="card-icon">${typeConfig.icon}</div>
                <div class="card-stats">${statsHTML}</div>
            `;

            slot.appendChild(cardVisual);
            // -----------------------------

            // Подсветка выбора
            if (this.selectedSlot === idx) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }

            // Clean inline styles that might persist if we swapped logic
            // slot.style.border = '';
            // slot.style.boxShadow = '';
            // slot.style.background = '';

            slot.style.cursor = 'pointer';
            slot.onclick = () => this.selectSlot(idx);

            this.elSlotsContainer.appendChild(slot);
        });
    }

    private getCardStatsHTML(typeId: string): string {
        // Same logic as CardSystem, but always level 1
        switch (typeId) {
            case 'fire':
                return `<div class="card-stat-primary">Урон +15</div><div class="card-stat-line">Взрыв 50</div>`;
            case 'ice':
                return `<div class="card-stat-primary">Урон +3</div><div class="card-stat-line">❄️ 30%</div>`;
            case 'sniper':
                return `<div class="card-stat-primary">Урон +14</div><div class="card-stat-line">🎯 +80</div>`;
            case 'multi':
                return `<div class="card-stat-primary">2 снаряда</div><div class="card-stat-line">0.8x урон</div>`;
            case 'minigun':
                return `<div class="card-stat-primary">⚡ Раскрутка</div><div class="card-stat-line">+3 урон/с</div>`;
            default:
                return `<div class="card-stat-line">Карта</div>`;
        }
    }
}
