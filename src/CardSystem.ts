import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export interface ICard {
    id: string;
    type: any;
    level: number;
    isDragging: boolean;
}

export class CardSystem {
    private scene: GameScene;
    public hand: ICard[] = [];
    public forgeSlots: (ICard | null)[] = [null, null];
    public isForging: boolean = false;
    
    public dragCard: ICard | null = null;
    private ghostEl: HTMLElement;

    private handContainer: HTMLElement;
    private forgeContainers: HTMLElement[];

    constructor(scene: GameScene) {
        this.scene = scene;
        this.handContainer = document.getElementById('hand')!;
        this.forgeContainers = [
            document.getElementById('forge-slot-0')!, 
            document.getElementById('forge-slot-1')!
        ];
        this.ghostEl = document.getElementById('drag-ghost')!;

        // Стартовый набор (можно убрать позже)
        this.addCard('FIRE', 1);
        this.addCard('ICE', 1);
        this.addCard('SNIPER', 1);
    }

    public startDrag(card: ICard, e: MouseEvent) {
        if (this.isForging) return;
        
        this.dragCard = card;
        card.isDragging = true;
        
        this.ghostEl.style.display = 'block';
        this.ghostEl.innerHTML = this.createCardHTML(card);
        this.updateDrag(e.clientX, e.clientY);
        
        this.render();
    }

    public updateDrag(x: number, y: number) {
        if (!this.dragCard) return;
        this.ghostEl.style.left = `${x}px`;
        this.ghostEl.style.top = `${y}px`;
    }

    public endDrag(e: MouseEvent) {
        if (!this.dragCard) return;

        let dropSuccess = false;

        // 1. Пробуем бросить на Карту (для башни)
        if (this.scene.handleCardDrop(this.dragCard)) {
            // Если карта применена на башню -> удаляем из руки
            this.hand = this.hand.filter(c => c !== this.dragCard);
            dropSuccess = true;
        }
        // 2. Если не на карту, пробуем бросить в Кузницу
        else if (this.scene.forge.tryDropCard(e.clientX, e.clientY, this.dragCard)) {
            // Если попали в слот кузницы -> удаляем из руки
            this.hand = this.hand.filter(c => c !== this.dragCard);
            dropSuccess = true;
        }

        this.dragCard.isDragging = false;
        this.dragCard = null;
        this.ghostEl.style.display = 'none';
        this.render();
        this.scene.ui.update(); // Обновляем кнопку ковки
    }

    // Добавляем карту в конкретный слот кузницы
    public putInForgeSlot(index: number, card: ICard) {
        this.forgeSlots[index] = card;
        this.render();
    }

    // Возвращаем карту из слота обратно в руку
    public returnFromForge(index: number) {
        if (this.isForging) return; // Нельзя забирать во время ковки
        
        const card = this.forgeSlots[index];
        if (card) {
            this.forgeSlots[index] = null;
            this.hand.push(card);
            this.render();
            this.scene.ui.update();
        }
    }

    public addCard(typeKey: string, level: number) {
        const type = (CONFIG.CARD_TYPES as any)[typeKey];
        if (!type) return;

        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
             this.scene.showFloatingText("Hand Full!", window.innerWidth/2, window.innerHeight - 100, 'red');
             return;
        }

        const newCard: ICard = {
            id: generateUUID(),
            type: type,
            level: level,
            isDragging: false
        };
        this.hand.push(newCard);
        this.render();
    }

    public canForge(): boolean {
        const c1 = this.forgeSlots[0];
        const c2 = this.forgeSlots[1];
        if (!c1 || !c2) return false;
        // Можно ковать только одинаковые типы и уровни, и если уровень < 3
        return c1.type.id === c2.type.id && c1.level === c2.level && c1.level < 3;
    }

    public tryForge() {
        if (!this.canForge()) return;
        
        const cost = CONFIG.ECONOMY.FORGE_COST;
        if (this.scene.money < cost) return;

        this.scene.money -= cost;
        this.isForging = true;
        
        const c1 = this.forgeSlots[0]!;
        const typeKey = Object.keys(CONFIG.CARD_TYPES).find(k => CONFIG.CARD_TYPES[k].id === c1.type.id)!;
        const newLevel = c1.level + 1;

        this.scene.showFloatingText("Forging...", window.innerWidth/2, window.innerHeight/2, 'orange');
        
        // Визуальная тряска слотов (можно добавить CSS класс)
        this.forgeContainers.forEach(el => el.classList.add('shaking'));

        setTimeout(() => {
            this.scene.effects.add({
                type: 'explosion', x: window.innerWidth/2, y: window.innerHeight/2, 
                life: 30, radius: 50, color: '#fff'
            });

            this.forgeSlots = [null, null];
            this.isForging = false;
            this.forgeContainers.forEach(el => el.classList.remove('shaking'));

            this.addCard(typeKey, newLevel);
            this.render();
            this.scene.ui.update();
        }, 600);
    }

    public render() {
        // Рендер Руки
        this.handContainer.innerHTML = '';
        this.hand.forEach(card => {
            const el = this.createCardElement(card);
            el.onmousedown = (e) => this.startDrag(card, e);
            if(card.isDragging) el.classList.add('dragging-placeholder');
            this.handContainer.appendChild(el);
        });

        // Рендер Слотов Кузницы
        this.forgeContainers.forEach((el, idx) => {
            el.innerHTML = '';
            const slotCard = this.forgeSlots[idx];
            if (slotCard) {
                const cardEl = this.createCardElement(slotCard);
                // Клик по карте в слоте возвращает её в руку
                cardEl.onclick = () => this.returnFromForge(idx);
                el.appendChild(cardEl);
            } else {
                el.innerText = (idx + 1).toString(); // Номер слота если пустой
            }
        });
    }

    private createCardElement(card: ICard): HTMLElement {
        const el = document.createElement('div');
        el.className = `card type-${card.type.id}`;
        // Подсветка для мультишота или других редких карт
        if (card.type.id === 'multi') el.style.borderColor = 'orange';
        
        el.innerHTML = this.createCardHTML(card);
        return el;
    }

    private createCardHTML(card: ICard): string {
         return `
            <div class=\"card-level\">${card.level}</div>
            <div class=\"card-icon\">${card.type.icon}</div>
        `;
    }
}