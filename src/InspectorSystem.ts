import { GameScene } from './scenes/GameScene';
import { Tower } from './Tower';
import { CONFIG } from './Config';

export class InspectorSystem {
    private scene: GameScene;
    private elInspector: HTMLElement;
    private elName: HTMLElement;
    private elStats: HTMLElement;
    private elCardsContainer: HTMLElement;
    private elSellBtn: HTMLButtonElement;

    private currentTower: Tower | null = null;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.elInspector = document.createElement('div');

        // Create inspector panel
        this.elInspector.id = 'inspector-panel';
        this.elInspector.className = 'ui-panel'; // Use existing panel style
        Object.assign(this.elInspector.style, {
            background: 'rgba(20, 20, 30, 0.95)',
            border: '2px solid #555',
            borderRadius: '8px',
            padding: '15px',
            color: '#fff',
            display: 'none',
            pointerEvents: 'auto',
            marginBottom: '15px', // Space above shop panel
        });

        this.elName = document.createElement('h3');
        this.elName.style.margin = '0 0 10px 0';
        this.elName.style.textAlign = 'center';

        this.elStats = document.createElement('div');
        this.elStats.style.fontSize = '13px';
        this.elStats.style.marginBottom = '10px';

        this.elCardsContainer = document.createElement('div');
        Object.assign(this.elCardsContainer.style, {
            borderTop: '1px solid #555',
            paddingTop: '10px',
            marginTop: '10px',
        });

        this.elSellBtn = document.createElement('button');
        this.elSellBtn.innerText = '🗑️ ПРОДАТЬ БАШНЮ';
        Object.assign(this.elSellBtn.style, {
            marginTop: '10px',
            padding: '12px',
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            width: '100%',
            fontSize: '14px',
        });

        // CRITICAL: Use addEventListener for better event handling
        this.elSellBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling to canvas
            e.preventDefault();
            console.log('Sell button clicked! Tower:', this.currentTower);
            if (this.currentTower) {
                this.scene.sellTower(this.currentTower);
            }
        });

        this.elInspector.appendChild(this.elName);
        this.elInspector.appendChild(this.elStats);
        this.elInspector.appendChild(this.elCardsContainer);
        this.elInspector.appendChild(this.elSellBtn);

        // CRITICAL: Attach to #ui-right container, NOT document.body
        // This ensures proper event handling within the UI layer
        const uiRight = document.getElementById('ui-right');
        if (uiRight) {
            // Insert at the beginning so it appears above shop
            uiRight.insertBefore(this.elInspector, uiRight.firstChild);
        } else {
            // Fallback to body if ui-right not found
            document.body.appendChild(this.elInspector);
        }
    }

    public selectTower(tower: Tower) {
        this.currentTower = tower;
        this.elInspector.style.display = 'block';
        this.updateInfo();
    }

    public hide() {
        this.currentTower = null;
        this.elInspector.style.display = 'none';
    }

    private updateInfo() {
        if (!this.currentTower) return;

        this.elName.innerText = '🏰 Башня';

        // Get tower stats
        const stats = this.currentTower.getStats();

        // Build stats display
        let statsHTML = '';
        statsHTML += `<div>⚔️ Урон: ${stats.dmg.toFixed(1)}</div>`;
        statsHTML += `<div>📏 Радиус: ${stats.range.toFixed(0)}</div>`;
        statsHTML += `<div>⏱️ Скорость: ${(1 / stats.cd).toFixed(1)}/с</div>`;
        if (stats.pierce > 0) {
            statsHTML += `<div>🎯 Пробивание: ${stats.pierce}</div>`;
        }
        this.elStats.innerHTML = statsHTML;

        // Clear and rebuild cards container
        this.elCardsContainer.innerHTML = '';

        // === TARGETING MODE SELECTOR ===
        const targetingSection = document.createElement('div');
        Object.assign(targetingSection.style, {
            borderBottom: '1px solid #555',
            paddingBottom: '10px',
            marginBottom: '10px',
        });

        const targetingLabel = document.createElement('div');
        targetingLabel.innerText = 'Приоритет цели:';
        Object.assign(targetingLabel.style, {
            fontSize: '12px',
            color: '#aaa',
            marginBottom: '5px',
            textAlign: 'center',
        });
        targetingSection.appendChild(targetingLabel);

        const targetingRow = document.createElement('div');
        Object.assign(targetingRow.style, {
            display: 'flex',
            gap: '5px',
            justifyContent: 'center',
        });

        // Create buttons for each targeting mode
        Object.values(CONFIG.TARGETING_MODES).forEach((mode: any) => {
            const btn = document.createElement('button');
            btn.innerText = mode.icon;
            btn.title = `${mode.name}: ${mode.desc}`;

            const isActive = this.currentTower!.targetingMode === mode.id;
            Object.assign(btn.style, {
                width: '36px',
                height: '36px',
                fontSize: '18px',
                background: isActive ? '#4caf50' : '#444',
                border: `2px solid ${isActive ? '#fff' : '#666'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
            });

            btn.addEventListener('mouseenter', () => {
                if (!isActive) btn.style.background = '#555';
            });
            btn.addEventListener('mouseleave', () => {
                if (!isActive) btn.style.background = '#444';
            });

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.currentTower) {
                    this.currentTower.targetingMode = mode.id;
                    console.log('Targeting mode changed to:', mode.id);
                    this.updateInfo(); // Refresh to show new selection
                }
            });

            targetingRow.appendChild(btn);
        });

        targetingSection.appendChild(targetingRow);
        this.elCardsContainer.appendChild(targetingSection);
        // === END TARGETING MODE SELECTOR ===

        const label = document.createElement('div');
        label.style.fontSize = '12px';
        label.style.color = '#aaa';
        label.style.marginBottom = '5px';
        label.style.textAlign = 'center';
        label.innerText = 'Карты (клик = продать):';
        this.elCardsContainer.appendChild(label);

        const cardsRow = document.createElement('div');
        Object.assign(cardsRow.style, {
            display: 'flex',
            gap: '5px',
            justifyContent: 'center',
        });

        for (let i = 0; i < 3; i++) {
            const slotEl = document.createElement('div');

            if (this.currentTower.cards[i]) {
                const card = this.currentTower.cards[i];
                const stars = '★'.repeat(card.level);
                const sellPrice = CONFIG.ECONOMY.CARD_SELL_PRICES[card.level] || 5;

                Object.assign(slotEl.style, {
                    width: '50px',
                    height: '70px',
                    background: card.type.color,
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255,255,255,0.3)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                });

                slotEl.innerHTML = `
                    <div style="position: absolute; top: 2px; left: 2px; font-size: 8px; color: #fff;">${stars}</div>
                    <div style="font-size: 24px;">${card.type.icon}</div>
                    <div style="font-size: 10px; color: #fff; margin-top: 2px;">${sellPrice}💰</div>
                `;

                // Hover effect
                slotEl.onmouseenter = () => {
                    slotEl.style.transform = 'scale(1.1)';
                    slotEl.style.boxShadow = '0 0 10px gold';
                };
                slotEl.onmouseleave = () => {
                    slotEl.style.transform = 'scale(1)';
                    slotEl.style.boxShadow = 'none';
                };

                // Click to sell card
                const cardIndex = i;
                slotEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Card sell clicked! Index:', cardIndex, 'Tower:', this.currentTower);
                    if (this.currentTower) {
                        this.scene.sellCardFromTower(this.currentTower, cardIndex);
                    }
                });
            } else {
                // Empty slot
                Object.assign(slotEl.style, {
                    width: '50px',
                    height: '70px',
                    background: '#333',
                    borderRadius: '4px',
                    border: '1px dashed #555',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#555',
                    fontSize: '18px',
                });
                slotEl.innerText = '?';
            }

            cardsRow.appendChild(slotEl);
        }

        this.elCardsContainer.appendChild(cardsRow);

        // Update sell button with refund amount
        const refund = Math.floor(CONFIG.ECONOMY.TOWER_COST * CONFIG.ECONOMY.SELL_REFUND);
        this.elSellBtn.innerText = `🗑️ ПРОДАТЬ (+${refund}💰)`;
    }
}
