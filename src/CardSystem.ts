import { Game } from './Game';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export interface ICard {
    id: string;
    type: any;
    level: number;
    isDragging: boolean;
}

export class CardSystem {
    private game: Game;
    public hand: ICard[] = [];
    public forgeSlots: (ICard | null)[] = [null, null];
    public isForging: boolean = false;
    
    public dragCard: ICard | null = null;
    private ghostEl: HTMLElement;

    private handContainer: HTMLElement;
    private forgeContainers: HTMLElement[];

    constructor(game: Game) {
        this.game = game;
        this.handContainer = document.getElementById('hand')!;
        this.forgeContainers = [
            document.getElementById('forge-slot-0')!, 
            document.getElementById('forge-slot-1')!
        ];
        this.ghostEl = document.getElementById('drag-ghost')!;

        // Стартовые карты
        this.addCard('FIRE', 1);
        this.addCard('ICE', 1);
        this.addCard('SNIPER', 1);
    }

    public startDrag(card: ICard, e: MouseEvent) {
        if (this.isForging) return;
        
        this.dragCard = card;
        card.isDragging = true;
        
        this.ghostEl.style.display = 'flex';
        this.ghostEl.className = `card type-${card.type.id}`;
        this.ghostEl.innerHTML = `
            <div class="card-level">${card.level}</div>
            <div class="card-icon">${card.type.icon}</div>
        `;
        
        this.updateDrag(e.clientX, e.clientY);
        this.render();
    }

    public updateDrag(x: number, y: number) {
        if (!this.dragCard) return;
        this.ghostEl.style.left = (x - 35) + 'px';
        this.ghostEl.style.top = (y - 50) + 'px';
    }

    public endDrag(e: MouseEvent) {
        if (!this.dragCard) return;

        this.ghostEl.style.display = 'none';
        
        // Проверка зоны Кузницы
        const forgeRect = document.getElementById('forge-panel')!.getBoundingClientRect();
        if (
            e.clientX >= forgeRect.left && e.clientX <= forgeRect.right &&
            e.clientY >= forgeRect.top && e.clientY <= forgeRect.bottom
        ) {
            const idx = e.clientX < (forgeRect.left + forgeRect.width/2) ? 0 : 1;
            this.putInForge(idx, this.dragCard);
        } 
        // Проверка Игрового Поля
        else {
            const canvasRect = this.game.canvas.getBoundingClientRect();
            if (e.clientY < canvasRect.bottom) {
                const success = this.game.handleCardDrop(this.dragCard);
                if (success) {
                    this.hand = this.hand.filter(c => c.id !== this.dragCard!.id);
                }
            }
        }

        this.dragCard.isDragging = false;
        this.dragCard = null;
        this.render();
    }

    public addCard(typeKey: string, level: number): boolean {
        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) return false;
        const type = (CONFIG.CARD_TYPES as any)[typeKey];
        if (!type) return false;

        const card: ICard = { id: generateUUID(), type, level, isDragging: false };
        this.hand.push(card);
        this.render();
        return true;
    }

    public putInForge(slotIdx: number, card: ICard) {
        if (this.forgeSlots[slotIdx]) {
            this.hand.push(this.forgeSlots[slotIdx]!);
        }
        this.forgeSlots[slotIdx] = card;
        this.hand = this.hand.filter(c => c.id !== card.id);
        this.render();
        this.game.ui.update();
    }

    public canForge(): boolean {
        const [c1, c2] = this.forgeSlots;
        return !!(c1 && c2 && c1.type.id === c2.type.id && c1.level === c2.level && c1.level < 3);
    }

    // ИСПРАВЛЕНИЕ ЗДЕСЬ: используем CONFIG.ECONOMY.FORGE_COST
    public tryForge() {
        const cost = CONFIG.ECONOMY.FORGE_COST;

        if (!this.canForge() || this.game.money < cost) return;
        
        this.game.money -= cost;
        this.game.ui.update();
        this.isForging = true;
        
        const f0 = this.forgeContainers[0].firstElementChild;
        const f1 = this.forgeContainers[1].firstElementChild;
        if(f0) f0.classList.add('shaking');
        if(f1) f1.classList.add('shaking');

        setTimeout(() => {
            const c1 = this.forgeSlots[0]!;
            const newLevel = c1.level + 1;
            let typeKey = 'FIRE';
            for (const key in CONFIG.CARD_TYPES) {
                if ((CONFIG.CARD_TYPES as any)[key].id === c1.type.id) typeKey = key;
            }

            this.game.effects.add({
                type: 'explosion', x: window.innerWidth - 100, y: window.innerHeight - 100,
                life: 30, radius: 50, color: '#fff'
            });

            this.forgeSlots = [null, null];
            this.isForging = false;
            this.addCard(typeKey, newLevel);
            this.render();
            this.game.ui.update();
        }, 600);
    }

    public render() {
        this.handContainer.innerHTML = '';
        this.hand.forEach(card => {
            const el = this.createCardElement(card);
            el.onmousedown = (e) => this.startDrag(card, e);
            if(card.isDragging) el.classList.add('dragging-placeholder');
            this.handContainer.appendChild(el);
        });

        this.forgeContainers.forEach((el, idx) => {
            el.innerHTML = '';
            const slotCard = this.forgeSlots[idx];
            if (slotCard) {
                const cardEl = this.createCardElement(slotCard);
                cardEl.onclick = () => {
                    this.forgeSlots[idx] = null;
                    this.hand.push(slotCard);
                    this.render();
                    this.game.ui.update();
                };
                el.appendChild(cardEl);
            }
        });
    }

    private createCardElement(card: ICard): HTMLElement {
        const el = document.createElement('div');
        el.className = `card type-${card.type.id}`;
        el.innerHTML = `<div class="card-level">${card.level}</div><div class="card-icon">${card.type.icon}</div>`;
        return el;
    }
}