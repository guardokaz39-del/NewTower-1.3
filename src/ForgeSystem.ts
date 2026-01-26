import { IGameScene } from './scenes/IGameScene';
import { CardSystem, ICard } from './CardSystem';
import { CONFIG } from './Config';

export class ForgeSystem {
    private scene: IGameScene;
    private slotEls: HTMLElement[];

    public forgeSlots: (ICard | null)[] = [null, null];
    public isForging: boolean = false;

    constructor(scene: IGameScene) {
        this.scene = scene;
        // Кэшируем DOM элементы слотов. 
        // В идеале это должно быть в UIManager, но пока оставим здесь для совместимости.
        this.slotEls = [document.getElementById('forge-slot-0')!, document.getElementById('forge-slot-1')!];
    }

    /**
     * Проверяет, отпустили ли мышь над слотом кузницы.
     * Если да - кладет карту в слот.
     */
    public tryDropCard(mouseX: number, mouseY: number, card: ICard): boolean {
        // Нельзя класть карты, пока идет процесс ковки
        if (this.isForging) return false;

        // Проверяем каждый слот
        for (let i = 0; i < this.slotEls.length; i++) {
            const rect = this.slotEls[i].getBoundingClientRect();

            // Простая проверка: курсор внутри прямоугольника слота?
            if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
                // Если слот занят - не кладем
                if (this.forgeSlots[i] !== null) {
                    return false;
                }

                // Успех: кладем карту
                this.putInForgeSlot(i, card);
                return true;
            }
        }
        return false;
    }

    public canForge(): boolean {
        const c1 = this.forgeSlots[0];
        const c2 = this.forgeSlots[1];
        return !!(c1 && c2 && c1.type.id === c2.type.id && c1.level === c2.level && c1.level < 3);
    }

    public putInForgeSlot(slotIdx: number, card: ICard) {
        this.scene.cardSys.removeCardFromHand(card);
        this.forgeSlots[slotIdx] = card;
        this.render();
        // UI update via generic update or event would be better
        this.scene.ui.update();
    }

    public returnFromForge(slotIdx: number) {
        const card = this.forgeSlots[slotIdx];
        if (card) {
            this.forgeSlots[slotIdx] = null;
            this.scene.cardSys.hand.push(card); // Push back to hand
            this.scene.cardSys.render(); // Re-render hand
            this.render();
            this.scene.ui.update();
        }
    }

    public tryForge() {
        if (!this.canForge()) return;

        // Progressive Forge Cost
        const card = this.forgeSlots[0]!;
        const cost = card.level === 1
            ? CONFIG.ECONOMY.FORGE_COST_LVL1   // 50
            : CONFIG.ECONOMY.FORGE_COST_LVL2;  // 65

        // Logic decoupled from UI floating text hopefully? 
        // No, we still need feedback.
        if (this.scene.money < cost) {
            this.scene.showFloatingText('Need Money!', 500, 500, 'red');
            return;
        }

        if (!this.scene.spendMoney(cost)) {
            return;
        }
        this.isForging = true;

        // Get forge slot position for particle effects
        const forgeSlot0 = this.slotEls[0];
        const forgeSlot1 = this.slotEls[1];
        const canvas = this.scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        // Add visual feedback to forge slots (CSS classes)
        if (forgeSlot0) forgeSlot0.classList.add('forging');
        if (forgeSlot1) forgeSlot1.classList.add('forging');

        // Calculate center position between slots for effects
        let effectX = 200;
        let effectY = canvas.height - 300;

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
            // const intensity = 1 + (forgeFrame / 16); 

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

            // Add upgraded card back to hand
            this.scene.cardSys.addCard(typeKey, newLevel);

            // Enhanced completion effects
            this.scene.effects.add({
                type: 'explosion',
                x: effectX,
                y: effectY,
                radius: 60,
                life: 35,
                color: '#ffd700', // Gold
            });

            // Burst of particles
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

            // Re-render
            this.render();
            this.scene.ui.update();

        }, 800);
    }

    public render() {
        this.slotEls.forEach((el, idx) => {
            el.innerHTML = '';
            const slotCard = this.forgeSlots[idx];
            if (slotCard) {
                const cardEl = CardSystem.createCardElement(slotCard);
                cardEl.onclick = () => this.returnFromForge(idx);
                el.appendChild(cardEl);
            } else {
                el.innerText = (idx + 1).toString();
            }
        });
    }

    public update() {
        // No per-frame update needed for now
    }
}
