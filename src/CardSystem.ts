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
        this.ghostEl.style.pointerEvents = 'none'; 

        // Стартовые карты
        this.addCard('FIRE', 1);
        this.addCard('ICE', 1);
        this.addCard('SNIPER', 1);
    }

    public startDrag(card: ICard, e: MouseEvent) {
        if (this.isForging) return;
        this.dragCard = card;
        card.isDragging = true;
        
        this.ghostEl.style.display = 'block';
        this.ghostEl.innerHTML = `<div style="font-size:32px;">${card.type.icon}</div>`;
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

        // Логика дропа
        const rect = this.scene.game.canvas.getBoundingClientRect();
        const inCanvas = e.clientX >= rect.left && e.clientX <= rect.right && 
                         e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (inCanvas) {
            const x = (e.clientX - rect.left) * (this.scene.game.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.scene.game.canvas.height / rect.height);
            this.scene.handleCardDrop(this.dragCard, x, y);
        }

        this.dragCard.isDragging = false;
        this.dragCard = null;
        this.ghostEl.style.display = 'none';
        this.render();
    }

    public addCard(typeKey: string, level: number = 1) {
        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
            this.scene.showFloatingText("Hand Full!", window.innerWidth/2, window.innerHeight-100, 'red');
            return;
        }

        const type = (CONFIG.CARD_TYPES as any)[typeKey];
        const card: ICard = {
            id: generateUUID(),
            type: type,
            level: level,
            isDragging: false
        };
        this.hand.push(card);
        this.render();
        this.scene.ui.update();
    }
    
    public addRandomCardToHand() {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.addCard(randomKey, 1);
    }

    // ВАЖНО: Метод, который отсутствовал
    public removeCardFromHand(card: ICard) {
        const index = this.hand.indexOf(card);
        if (index !== -1) {
            this.hand.splice(index, 1);
            this.render();
            this.scene.ui.update();
        }
    }

    // Методы кузницы
    public canForge(): boolean {
        const c1 = this.forgeSlots[0];
        const c2 = this.forgeSlots[1];
        return !!(c1 && c2 && c1.type.id === c2.type.id && c1.level === c2.level && c1.level < 3);
    }
    
    public putInForgeSlot(slotIdx: number, card: ICard) {
        this.removeCardFromHand(card);
        this.forgeSlots[slotIdx] = card;
        this.render();
        this.scene.ui.update();
    }

    public returnFromForge(slotIdx: number) {
        const card = this.forgeSlots[slotIdx];
        if (card) {
            this.forgeSlots[slotIdx] = null;
            this.hand.push(card);
            this.render();
            this.scene.ui.update();
        }
    }

    public tryForge() {
        if (!this.canForge()) return;
        
        const cost = CONFIG.ECONOMY.FORGE_COST;
        if (this.scene.money < cost) {
            this.scene.showFloatingText("Need Money!", 500, 500, 'red');
            return;
        }
        
        this.scene.money -= cost;
        this.isForging = true;
        
        // Анимация...
        setTimeout(() => {
            const c1 = this.forgeSlots[0]!;
            const newLevel = c1.level + 1;
            
            // Находим ключ типа карты
            let typeKey = 'FIRE';
            for(let k in CONFIG.CARD_TYPES) {
                if((CONFIG.CARD_TYPES as any)[k].id === c1.type.id) typeKey = k;
            }

            this.forgeSlots = [null, null];
            this.isForging = false;
            this.addCard(typeKey, newLevel);
            this.scene.showFloatingText("FORGED!", window.innerWidth/2, window.innerHeight/2, 'gold');
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
                cardEl.onclick = () => this.returnFromForge(idx);
                el.appendChild(cardEl);
            } else {
                el.innerText = (idx + 1).toString();
            }
        });
    }

    private createCardElement(card: ICard): HTMLElement {
        const el = document.createElement('div');
        el.className = `card type-${card.type.id}`;
        if (card.type.id === 'multi') el.style.borderColor = 'orange';
        
        // Звездочки уровня
        let stars = '★'.repeat(card.level);

        el.innerHTML = `
            <div class="card-level">${stars}</div>
            <div class="card-icon">${card.type.icon}</div>
        `;
        return el;
    }
}