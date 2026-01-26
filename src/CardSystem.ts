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

    // Dragging state
    public dragCard: ICard | null = null;
    private ghostEl: HTMLElement;

    private handContainer: HTMLElement;

    constructor(scene: IGameScene, startingCards: string[] = ['FIRE', 'ICE', 'SNIPER']) {
        this.scene = scene;
        this.handContainer = document.getElementById('hand')!;

        this.ghostEl = document.getElementById('drag-ghost')!;
        this.ghostEl.style.pointerEvents = 'none';

        // Add starting cards
        startingCards.forEach(cardKey => this.addCard(cardKey, 1));
    }

    public startDrag(card: ICard, e: PointerEvent) {
        if (this.scene.forge.isForging) return;
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

    public endDrag(e: PointerEvent) {
        if (!this.dragCard) return;

        // Check forge slots FIRST via ForgeSystem
        const droppedInForge = this.scene.forge.tryDropCard(e.clientX, e.clientY, this.dragCard);

        if (!droppedInForge) {
            // Drop on Canvas
            const rect = this.scene.game.canvas.getBoundingClientRect();
            const inCanvas =
                e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

            if (inCanvas) {
                const x = (e.clientX - rect.left) * (this.scene.game.canvas.width / rect.width);
                const y = (e.clientY - rect.top) * (this.scene.game.canvas.height / rect.height);
                this.scene.events.emit('CARD_DROPPED', { card: this.dragCard, x, y });
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

    public removeCardFromHand(card: ICard) {
        const index = this.hand.indexOf(card);
        if (index !== -1) {
            this.hand.splice(index, 1);
            this.render();
            this.scene.ui.update();
        }
    }

    public render() {
        this.handContainer.innerHTML = '';
        this.hand.forEach((card) => {
            const el = CardSystem.createCardElement(card);
            el.onpointerdown = (e: any) => this.startDrag(card, e);
            if (card.isDragging) el.classList.add('dragging-placeholder');
            this.handContainer.appendChild(el);
        });
    }

    public static createCardElement(card: ICard): HTMLElement {
        const el = document.createElement('div');
        el.className = `card type-${card.type.id} level-${card.level}`;

        // Star rating
        let stars = '★'.repeat(card.level);

        // Stats HTML
        let statsHTML = this.getCardStatsHTML(card);

        el.innerHTML = `
            <div class="card-level">${stars}</div>
            <div class="card-icon">${card.type.icon}</div>
            <div class="card-stats">${statsHTML}</div>
        `;
        return el;
    }

    public static getCardStatsHTML(card: ICard): string {
        const type = card.type.id;
        const level = card.level;

        switch (type) {
            case 'fire':
                if (level === 1) {
                    return `<div class="card-stat-primary">Урон +15</div><div class="card-stat-line">Взрыв 50</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">Урон +30</div><div class="card-stat-line">Взрыв 85</div>`;
                } else {
                    return `<div class="card-stat-primary">Урон +30</div><div class="card-stat-line">Взрыв + 💀</div>`;
                }

            case 'ice':
                if (level === 1) {
                    return `<div class="card-stat-primary">Урон +3</div><div class="card-stat-line">❄️ 30%</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">Урон +6</div><div class="card-stat-line">❄️ 45%</div>`;
                } else {
                    return `<div class="card-stat-primary">Урон +9</div><div class="card-stat-line">❄️ 75% + ⛓️</div>`;
                }

            case 'sniper':
                if (level === 1) {
                    return `<div class="card-stat-primary">Урон +14</div><div class="card-stat-line">🎯 +80</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">Урон +24</div><div class="card-stat-line">🎯 +160</div>`;
                } else {
                    return `<div class="card-stat-primary">Урон +46</div><div class="card-stat-line">🎯 +240 💫</div>`;
                }

            case 'multi':
                if (level === 1) {
                    return `<div class="card-stat-primary">2 снаряда</div><div class="card-stat-line">0.8x урон</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">3 снаряда</div><div class="card-stat-line">0.6x урон</div>`;
                } else {
                    return `<div class="card-stat-primary">4 снаряда</div><div class="card-stat-line">0.45x урон</div>`;
                }

            case 'minigun':
                if (level === 1) {
                    return `<div class="card-stat-primary">⚡ Раскрутка</div><div class="card-stat-line">+3 урон/с</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">⚡ Раскрутка</div><div class="card-stat-line">+урон +крит</div>`;
                } else {
                    return `<div class="card-stat-primary">⚡ Раскрутка</div><div class="card-stat-line">до +30 урон</div>`;
                }

            default:
                return `<div class="card-stat-line">${card.type.desc}</div>`;
        }
    }
}
