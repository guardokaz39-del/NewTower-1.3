import { CONFIG } from './Config';

/**
 * Card Selection System
 * Shows overlay where player select s 3 starting cards
 */
export class CardSelectionUI {
    private overlay: HTMLElement;
    private grid: HTMLElement;
    private counter: HTMLElement;
    private startButton: HTMLButtonElement;
    private selectedCards: string[] = [];
    private onComplete: (cards: string[]) => void;

    constructor(onComplete: (cards: string[]) => void) {
        this.onComplete = onComplete;
        console.log('CardSelectionUI: Constructor called');

        // Don't check elements here - they might not exist yet
        // Elements will be checked in show() method
    }

    public show() {
        console.log('CardSelectionUI.show() called');

        // FIXED: Check elements HERE, not in constructor
        this.overlay = document.getElementById('card-selection-overlay')!;
        this.grid = document.getElementById('card-selection-grid')!;
        this.counter = document.getElementById('selected-count')!;
        this.startButton = document.getElementById('start-game-btn') as HTMLButtonElement;

        if (!this.overlay || !this.grid || !this.counter || !this.startButton) {
            console.error('CardSelectionUI: Required DOM elements not found!');
            console.error('overlay:', this.overlay);
            console.error('grid:', this.grid);
            console.error('counter:', this.counter);
            console.error('startButton:', this.startButton);
            alert('ERROR: Card selection UI elements not found. Check console.');
            return;
        }

        // Add click listener (only once)
        if (!this.startButton.onclick) {
            this.startButton.addEventListener('click', () => this.complete());
        }

        console.log('CardSelectionUI: All elements found successfully');

        this.selectedCards = [];
        this.overlay.classList.add('show');
        this.render();
    }

    public hide() {
        this.overlay.classList.remove('show');
    }

    private render() {
        console.log('CardSelectionUI.render() called');
        this.grid.innerHTML = '';

        // Get all base card types
        const baseCards = Object.keys(CONFIG.CARD_TYPES);
        console.log('Base cards available:', baseCards);

        // Add 2 random cards
        const randomCards = [
            baseCards[Math.floor(Math.random() * baseCards.length)],
            baseCards[Math.floor(Math.random() * baseCards.length)],
        ];

        const availableCards = [...baseCards, ...randomCards];
        console.log('Total cards to display:', availableCards);

        // Render cards
        availableCards.forEach((cardKey, index) => {
            const config = CONFIG.CARD_TYPES[cardKey];
            if (!config) {
                console.warn(`Card config not found for key: ${cardKey}`);
                return;
            }

            const cardEl = document.createElement('div');
            // Use same structure as CardSystem
            cardEl.className = `card type-${config.id} level-1`;
            cardEl.style.animationDelay = `${index * 0.05}s`;
            cardEl.style.cursor = 'pointer';

            // Get stats HTML for level 1
            const statsHTML = this.getCardStatsHTML(config.id);

            cardEl.innerHTML = `
                <div class="card-level">★</div>
                <div class="card-icon">${config.icon}</div>
                <div class="card-stats">${statsHTML}</div>
            `;

            cardEl.addEventListener('click', () => this.selectCard(cardKey, cardEl));
            this.grid.appendChild(cardEl);
        });

        console.log(`Rendered ${availableCards.length} cards`);

        // Update counter and button
        this.updateUI();
    }

    private selectCard(cardKey: string, cardEl: HTMLElement) {
        if (cardEl.classList.contains('selected')) {
            // Deselect
            cardEl.classList.remove('selected');
            const index = this.selectedCards.indexOf(cardKey);
            if (index !== -1) {
                this.selectedCards.splice(index, 1);
            }
        } else {
            // Select (if not full)
            if (this.selectedCards.length < 5) {
                cardEl.classList.add('selected');
                this.selectedCards.push(cardKey);
            }
        }

        this.updateUI();
    }

    private updateUI() {
        this.counter.textContent = this.selectedCards.length.toString();
        this.startButton.disabled = this.selectedCards.length !== 5;
    }

    private complete() {
        if (this.selectedCards.length === 5) {
            this.hide();
            this.onComplete(this.selectedCards);
        }
    }

    private getCardStatsHTML(typeId: string): string {
        // Same logic as CardSyst em, but always level 1
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
