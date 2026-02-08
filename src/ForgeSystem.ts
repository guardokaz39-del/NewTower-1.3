import { IGameScene } from './scenes/IGameScene';
import { CardSystem, ICard } from './CardSystem';
import { CONFIG } from './Config';
import { getEvolutionChoice, IEvolutionChoice, IEvolutionPath } from './cards';

export class ForgeSystem {
    private scene: IGameScene;
    private slotEls: HTMLElement[];

    public forgeSlots: (ICard | null)[] = [null, null];
    public isForging: boolean = false;

    // Evolution modal elements
    private evolutionModal: HTMLElement | null = null;
    private pendingForgeCallback: ((evolutionPath: string) => void) | null = null;

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.slotEls = [document.getElementById('forge-slot-0')!, document.getElementById('forge-slot-1')!];
        this.initEvolutionModal();
    }

    /**
     * Initialize the evolution choice modal
     */
    private initEvolutionModal() {
        this.evolutionModal = document.getElementById('evolution-modal');
        if (!this.evolutionModal) {
            // Create modal if it doesn't exist yet
            this.createEvolutionModal();
        }
    }

    private createEvolutionModal() {
        const modal = document.createElement('div');
        modal.id = 'evolution-modal';
        modal.innerHTML = `
            <div class="evo-container">
                <div class="evo-title">⚔️ ЭВОЛЮЦИЯ ⚔️</div>
                <div class="evo-subtitle">Выберите путь развития</div>
                <div class="evo-paths">
                    <div class="evo-path" data-path="A">
                        <div class="evo-path-icon" id="evo-icon-a"></div>
                        <div class="evo-path-name" id="evo-name-a"></div>
                        <div class="evo-path-desc" id="evo-desc-a"></div>
                    </div>
                    <div class="evo-path" data-path="B">
                        <div class="evo-path-icon" id="evo-icon-b"></div>
                        <div class="evo-path-name" id="evo-name-b"></div>
                        <div class="evo-path-desc" id="evo-desc-b"></div>
                    </div>
                </div>
                <button class="evo-cancel-btn">Отмена</button>
            </div>
        `;
        document.body.appendChild(modal);
        this.evolutionModal = modal;

        // Event listeners
        const pathA = modal.querySelector('[data-path="A"]') as HTMLElement;
        const pathB = modal.querySelector('[data-path="B"]') as HTMLElement;
        const cancelBtn = modal.querySelector('.evo-cancel-btn') as HTMLElement;

        pathA?.addEventListener('click', () => this.selectEvolutionPath('A'));
        pathB?.addEventListener('click', () => this.selectEvolutionPath('B'));
        cancelBtn?.addEventListener('click', () => this.cancelEvolution());

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.evolutionModal?.classList.contains('show')) {
                this.cancelEvolution();
            }
        });
    }

    /**
     * Проверяет, отпустили ли мышь над слотом кузницы.
     */
    public tryDropCard(mouseX: number, mouseY: number, card: ICard): boolean {
        if (this.isForging) return false;

        for (let i = 0; i < this.slotEls.length; i++) {
            const rect = this.slotEls[i].getBoundingClientRect();

            if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
                if (this.forgeSlots[i] !== null) {
                    return false;
                }
                this.putInForgeSlot(i, card);
                return true;
            }
        }
        return false;
    }

    /**
     * Check if forge is possible
     * Now also checks evolutionPath compatibility
     */
    public canForge(): boolean {
        const c1 = this.forgeSlots[0];
        const c2 = this.forgeSlots[1];

        if (!c1 || !c2) return false;
        if (c1.type.id !== c2.type.id) return false;
        if (c1.level !== c2.level) return false;
        if (c1.level >= 3) return false;

        // Check evolution path compatibility (cross-breeding prevention)
        const evo1 = c1.evolutionPath || 'classic';
        const evo2 = c2.evolutionPath || 'classic';
        if (evo1 !== evo2) {
            return false;
        }

        return true;
    }

    /**
     * Get reason why forging is not possible (for UI feedback)
     */
    public getForgeBlockReason(): string | null {
        const c1 = this.forgeSlots[0];
        const c2 = this.forgeSlots[1];

        if (!c1 || !c2) return null;
        if (c1.type.id !== c2.type.id) return 'Разные типы карт';
        if (c1.level !== c2.level) return 'Разные уровни';
        if (c1.level >= 3) return 'Максимальный уровень';

        const evo1 = c1.evolutionPath || 'classic';
        const evo2 = c2.evolutionPath || 'classic';
        if (evo1 !== evo2) {
            return '⚠️ Несовместимые эссенции!';
        }

        return null;
    }

    public putInForgeSlot(slotIdx: number, card: ICard) {
        this.scene.cardSys.removeCardFromHand(card);
        this.forgeSlots[slotIdx] = card;
        this.render();
        this.scene.ui.update();
    }

    public returnFromForge(slotIdx: number) {
        const card = this.forgeSlots[slotIdx];
        if (card) {
            this.forgeSlots[slotIdx] = null;
            this.scene.cardSys.hand.push(card);
            this.scene.cardSys.render();
            this.render();
            this.scene.ui.update();
        }
    }

    /**
     * Try to start forging - may show evolution choice
     */
    public tryForge() {
        if (!this.canForge()) {
            const reason = this.getForgeBlockReason();
            if (reason) {
                this.scene.showFloatingText(reason, 300, 500, 'red');
            }
            return;
        }

        const card = this.forgeSlots[0]!;
        const cost = card.level === 1
            ? CONFIG.ECONOMY.FORGE_COST_LVL1
            : CONFIG.ECONOMY.FORGE_COST_LVL2;

        if (this.scene.money < cost) {
            this.scene.showFloatingText('Нужно больше золота!', 500, 500, 'red');
            return;
        }

        // Check if evolution choice is available
        const evolutionChoice = getEvolutionChoice(
            card.type.id,
            card.level,
            card.evolutionPath
        );

        if (evolutionChoice) {
            // Show evolution choice modal
            this.showEvolutionChoice(evolutionChoice, (chosenPath) => {
                this.performForge(chosenPath, cost);
            });
        } else {
            // Classic forge (Lv1 cards without evolution system configured)
            this.performForge(card.evolutionPath || 'classic', cost);
        }
    }

    /**
     * Show the evolution choice modal
     */
    private showEvolutionChoice(choice: IEvolutionChoice, callback: (path: string) => void) {
        if (!this.evolutionModal) return;

        // Store callback and choice data
        this.pendingForgeCallback = callback;
        this.evolutionModal.dataset.pathA = choice.pathA.id;
        this.evolutionModal.dataset.pathB = choice.pathB.id;

        // Update UI
        const iconA = document.getElementById('evo-icon-a');
        const nameA = document.getElementById('evo-name-a');
        const descA = document.getElementById('evo-desc-a');
        const iconB = document.getElementById('evo-icon-b');
        const nameB = document.getElementById('evo-name-b');
        const descB = document.getElementById('evo-desc-b');

        if (iconA) iconA.textContent = choice.pathA.icon;
        if (nameA) nameA.textContent = choice.pathA.name;
        if (descA) descA.textContent = choice.pathA.description;
        if (iconB) iconB.textContent = choice.pathB.icon;
        if (nameB) nameB.textContent = choice.pathB.name;
        if (descB) descB.textContent = choice.pathB.description;

        // Show modal
        this.evolutionModal.classList.add('show');
    }

    /**
     * Handle evolution path selection
     */
    private selectEvolutionPath(pathKey: 'A' | 'B') {
        if (!this.evolutionModal || !this.pendingForgeCallback) return;

        const pathId = pathKey === 'A'
            ? this.evolutionModal.dataset.pathA
            : this.evolutionModal.dataset.pathB;

        // Hide modal
        this.evolutionModal.classList.remove('show');

        // Execute callback with chosen path
        if (pathId) {
            this.pendingForgeCallback(pathId);
        }
        this.pendingForgeCallback = null;
    }

    /**
     * Cancel evolution choice
     */
    private cancelEvolution() {
        if (!this.evolutionModal) return;
        this.evolutionModal.classList.remove('show');
        this.pendingForgeCallback = null;
    }

    /**
     * Actually perform the forge with chosen evolution path
     */
    private performForge(evolutionPath: string, cost: number) {
        if (!this.scene.spendMoney(cost)) {
            return;
        }
        this.isForging = true;

        const forgeSlot0 = this.slotEls[0];
        const forgeSlot1 = this.slotEls[1];
        const canvas = this.scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        if (forgeSlot0) forgeSlot0.classList.add('forging');
        if (forgeSlot1) forgeSlot1.classList.add('forging');

        let effectX = 200;
        let effectY = canvas.height - 300;

        if (forgeSlot0 && forgeSlot1) {
            const rect0 = forgeSlot0.getBoundingClientRect();
            const rect1 = forgeSlot1.getBoundingClientRect();
            const centerX = (rect0.left + rect1.right) / 2;
            const centerY = (rect0.top + rect0.bottom) / 2;
            effectX = (centerX - canvasRect.left) * (canvas.width / canvasRect.width);
            effectY = (centerY - canvasRect.top) * (canvas.height / canvasRect.height);
        }

        // Spawn particles during forge animation
        const particleInterval = setInterval(() => {
            for (let i = 0; i < 5; i++) {
                this.scene.effects.add({
                    type: 'particle',
                    x: effectX + (Math.random() - 0.5) * 80,
                    y: effectY + (Math.random() - 0.5) * 50,
                    vx: (Math.random() - 0.5) * 360,
                    vy: -(Math.random() * 240 + 60),
                    life: 0.5 + Math.random() * 0.3,
                    radius: Math.random() * 4 + 2,
                    color: Math.random() > 0.5 ? '#ff9800' : '#ffeb3b',
                });
            }
        }, 50);

        // Forging complete
        setTimeout(() => {
            clearInterval(particleInterval);

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

            // Add upgraded card with evolution path
            this.scene.cardSys.addCardWithEvolution(typeKey, newLevel, evolutionPath);

            // Enhanced completion effects
            this.scene.effects.add({
                type: 'explosion',
                x: effectX,
                y: effectY,
                radius: 60,
                life: 0.6,
                color: '#ffd700',
            });

            for (let i = 0; i < 24; i++) {
                const angle = (i / 24) * Math.PI * 2;
                this.scene.effects.add({
                    type: 'particle',
                    x: effectX,
                    y: effectY,
                    vx: Math.cos(angle) * 300,
                    vy: Math.sin(angle) * 300,
                    life: 0.65,
                    radius: 4,
                    color: '#ffd700',
                });
            }

            this.scene.showFloatingText('⚒️ FORGED!', effectX, effectY - 30, 'gold');

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
