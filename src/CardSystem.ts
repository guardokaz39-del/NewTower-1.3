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

    constructor(scene: IGameScene, startingCards: string[] = ['FIRE', 'ICE', 'SNIPER']) {
        this.scene = scene;
        this.handContainer = document.getElementById('hand')!;
        this.forgeContainers = [document.getElementById('forge-slot-0')!, document.getElementById('forge-slot-1')!];

        this.ghostEl = document.getElementById('drag-ghost')!;
        this.ghostEl.style.pointerEvents = 'none';

        // Add starting cards
        startingCards.forEach(cardKey => this.addCard(cardKey, 1));
    }

    public startDrag(card: ICard, e: PointerEvent) {
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

    public endDrag(e: PointerEvent) {
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

        if (!this.scene.spendMoney(cost)) {
            // Should not happen as we check above, but for safety
            return;
        }
        this.isForging = true;

        // Get forge slot position for particle effects
        const forgeSlot0 = document.getElementById('forge-slot-0');
        const forgeSlot1 = document.getElementById('forge-slot-1');
        const canvas = this.scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        // Add visual feedback to forge slots (CSS animation)
        if (forgeSlot0) forgeSlot0.classList.add('forging');
        if (forgeSlot1) forgeSlot1.classList.add('forging');

        // Calculate center position between slots for effects
        let effectX = 200; // Left side of screen (forge is on left)
        let effectY = canvas.height - 300; // Above forge panel

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
        let forgeFrame = 0;
        const particleInterval = setInterval(() => {
            forgeFrame++;
            const intensity = 1 + (forgeFrame / 16); // Crescendo effect

            for (let i = 0; i < 5; i++) {
                this.scene.effects.add({
                    type: 'particle',
                    x: effectX + (Math.random() - 0.5) * 80,
                    y: effectY + (Math.random() - 0.5) * 50,
                    vx: (Math.random() - 0.5) * 6,
                    vy: -(Math.random() * 4 + 1),
                    life: 30 + Math.random() * 20,
                    radius: Math.random() * 4 + 2,
                    color: Math.random() > 0.5 ? '#ff9800' : '#ffeb3b', // Orange/Yellow sparks
                });
            }
        }, 50);

        // Forging complete
        setTimeout(() => {
            clearInterval(particleInterval);

            // Remove forging animation from slots
            if (forgeSlot0) forgeSlot0.classList.remove('forging');
            if (forgeSlot1) forgeSlot1.classList.remove('forging');

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

            // Enhanced completion effects
            // Big golden explosion
            this.scene.effects.add({
                type: 'explosion',
                x: effectX,
                y: effectY,
                radius: 60,
                life: 35,
                color: '#ffd700', // Gold
            });

            // Burst of particles in all directions
            for (let i = 0; i < 24; i++) {
                const angle = (i / 24) * Math.PI * 2;
                this.scene.effects.add({
                    type: 'particle',
                    x: effectX,
                    y: effectY,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    life: 40,
                    radius: 4,
                    color: '#ffd700',
                });
            }

            this.scene.showFloatingText('⚒️ FORGED!', effectX, effectY - 30, 'gold');
        }, 800);
    }

    public render() {
        this.handContainer.innerHTML = '';
        this.hand.forEach((card) => {
            const el = this.createCardElement(card);
            el.onpointerdown = (e) => this.startDrag(card, e);
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
        el.className = `card type-${card.type.id} level-${card.level}`;

        // Звездочки уровня
        let stars = '★'.repeat(card.level);

        // Получаем характеристики карты в зависимости от типа и уровня
        let statsHTML = this.getCardStatsHTML(card);

        el.innerHTML = `
            <div class="card-level">${stars}</div>
            <div class="card-icon">${card.type.icon}</div>
            <div class="card-stats">${statsHTML}</div>
        `;
        return el;
    }

    private getCardStatsHTML(card: ICard): string {
        const type = card.type.id;
        const level = card.level;

        // Определяем какие характеристики показывать для каждого типа карты
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
