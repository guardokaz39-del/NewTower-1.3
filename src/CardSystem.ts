import { IGameScene } from './scenes/IGameScene';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export interface ICard {
    id: string;
    type: any;
    level: number;
    isDragging: boolean;
}

export class CardSystem {
    private scene: IGameScene;
    public hand: ICard[] = [];
    public forgeSlots: (ICard | null)[] = [null, null];
    public isForging: boolean = false;

    public dragCard: ICard | null = null;
    private ghostEl: HTMLElement;

    private handContainer: HTMLElement;
    private forgeContainers: HTMLElement[];

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.handContainer = document.getElementById('hand')!;
        this.forgeContainers = [document.getElementById('forge-slot-0')!, document.getElementById('forge-slot-1')!];

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

        // FIX: Check forge slots FIRST before canvas
        const droppedInForge = this.scene.forge.tryDropCard(e.clientX, e.clientY, this.dragCard);

        if (!droppedInForge) {
            // Логика дропа на канвас
            const rect = this.scene.game.canvas.getBoundingClientRect();
            const inCanvas =
                e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

            if (inCanvas) {
                const x = (e.clientX - rect.left) * (this.scene.game.canvas.width / rect.width);
                const y = (e.clientY - rect.top) * (this.scene.game.canvas.height / rect.height);
                this.scene.handleCardDrop(this.dragCard, x, y);
            }
        }

        this.dragCard.isDragging = false;
        this.dragCard = null;
        this.ghostEl.style.display = 'none';
        this.render();
    }

    public addCard(typeKey: string, level: number = 1) {
        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
            this.scene.showFloatingText('Hand Full!', window.innerWidth / 2, window.innerHeight - 100, 'red');
            return;
        }

        const type = CONFIG.CARD_TYPES[typeKey];
        if (!type) {
            console.warn(`Unknown card type: ${typeKey}`);
            return;
        }

        const card: ICard = {
            id: generateUUID(),
            type: type,
            level: level,
            isDragging: false,
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
            this.scene.showFloatingText('Need Money!', 500, 500, 'red');
            return;
        }

        this.scene.money -= cost;
        this.isForging = true;

        // Get forge slot position for particle effects
        const forgeSlot0 = document.getElementById('forge-slot-0');
        const forgeSlot1 = document.getElementById('forge-slot-1');
        const canvas = this.scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        // Calculate center position between slots for effects
        let effectX = canvas.width / 2;
        let effectY = canvas.height - 200;

        if (forgeSlot0 && forgeSlot1) {
            const rect0 = forgeSlot0.getBoundingClientRect();
            const rect1 = forgeSlot1.getBoundingClientRect();
            const centerX = (rect0.left + rect1.right) / 2;
            const centerY = (rect0.top + rect0.bottom) / 2;

            // Convert screen coords to canvas coords
            effectX = (centerX - canvasRect.left) * (canvas.width / canvasRect.width);
            effectY = (centerY - canvasRect.top) * (canvas.height / canvasRect.height);
        }

        // Spawn particles during forge animation
        const particleInterval = setInterval(() => {
            for (let i = 0; i < 3; i++) {
                this.scene.effects.add({
                    type: 'particle',
                    x: effectX + (Math.random() - 0.5) * 60,
                    y: effectY + (Math.random() - 0.5) * 40,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -(Math.random() * 3 + 1),
                    life: 30,
                    radius: Math.random() * 3 + 2,
                    color: Math.random() > 0.5 ? '#ff9800' : '#ffeb3b', // Orange/Yellow sparks
                });
            }
        }, 50);

        // Forging complete
        setTimeout(() => {
            clearInterval(particleInterval);

            const c1 = this.forgeSlots[0]!;
            const newLevel = c1.level + 1;

            // Find card type key
            let typeKey = 'FIRE';
            for (const k in CONFIG.CARD_TYPES) {
                if (CONFIG.CARD_TYPES[k].id === c1.type.id) {
                    typeKey = k;
                    break;
                }
            }

            this.forgeSlots = [null, null];
            this.isForging = false;
            this.addCard(typeKey, newLevel);

            // Big explosion effect on completion
            this.scene.effects.add({
                type: 'explosion',
                x: effectX,
                y: effectY,
                radius: 50,
                life: 30,
                color: '#ffd700', // Gold
            });

            this.scene.showFloatingText('⚒️ FORGED!', effectX, effectY - 30, 'gold');
        }, 800);
    }

    public render() {
        this.handContainer.innerHTML = '';
        this.hand.forEach((card) => {
            const el = this.createCardElement(card);
            el.onmousedown = (e) => this.startDrag(card, e);
            if (card.isDragging) el.classList.add('dragging-placeholder');
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
