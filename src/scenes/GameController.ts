import { ICard } from '../CardSystem';
import { CONFIG } from '../Config';
import { Tower } from '../Tower';
import { GameState } from './GameState';
import { EntityManager } from './EntityManager';
import { EffectSystem } from '../EffectSystem';
import { InspectorSystem } from '../InspectorSystem';
import { UIManager } from '../UIManager';
import { MetricsSystem } from '../MetricsSystem';
import { IMapData } from '../MapData';
import { EventEmitter } from '../Events';
import { SoundManager } from '../SoundManager';
import { EventBus, Events } from '../EventBus';

/**
 * Handles user actions and game controller logic:
 * - Tower building/selection
 * - Card drop handling
 * - Grid click handling
 * - Keyboard hotkeys
 */
export class GameController {
    private recentActionIds: Set<string> = new Set();
    private unsubCardDrop: () => void = () => {};

    // Bound handler for safe unsubscription
    private onCardDropped = (data: any) => {
        if (data.actionId) {
            if (this.recentActionIds.has(data.actionId)) {
                console.warn(`Duplicate card action detected: ${data.actionId}`);
                return;
            }
            this.recentActionIds.add(data.actionId);
            if (this.recentActionIds.size > 256) {
                const first = this.recentActionIds.values().next().value;
                if (first) this.recentActionIds.delete(first);
            }
        }
        this.handleCardDrop(data.card, data.x, data.y);
    };

    constructor(
        private state: GameState,
        private entityManager: EntityManager,
        private effects: EffectSystem,
        private inspector: InspectorSystem,
        private ui: UIManager,
        private metrics: MetricsSystem,
        private mapData: IMapData,
        private map: any, // MapManager reference (using any to avoid types circle for now or need import)
        private isBuildable: (col: number, row: number) => boolean,
        private cardSys: any, // CardSystem reference
        private events: EventEmitter,
    ) {
        this.unsubCardDrop = EventBus.getInstance().on(Events.CARD_DROPPED, this.onCardDropped);
    }

    public dispose(): void {
        this.unsubCardDrop();
    }

    public handleMenuAction(action: { type: 'UNLOCK' | 'CLICK_SLOT' | 'REMOVE_CARD'; slotId: number }, tower: Tower) {
        if (action.type === 'UNLOCK') {
            const cost = CONFIG.ECONOMY.SLOT_UNLOCK_COST[action.slotId];
            if (this.state.money >= cost) {
                if (tower.unlockSlot(action.slotId)) {
                    this.state.spendMoney(cost);
                    this.showFloatingText('Slot Unlocked!', tower.x, tower.y, '#ffd700');
                    SoundManager.play('upgrade_unlock');
                }
            } else {
                this.showFloatingText('Not enough money!', tower.x, tower.y, '#ff4444');
                SoundManager.play('error');
            }
        } else if (action.type === 'REMOVE_CARD') {
            // Immediate removal (used by Inspector) -> SELLS the card
            const slot = tower.slots.find((s) => s.id === action.slotId);
            if (slot && slot.card) {
                const card = tower.removeCardFromSlot(action.slotId);
                if (card) {
                    // SELL LOGIC
                    const prices = CONFIG.ECONOMY.CARD_SELL_PRICES;
                    const refund = prices[card.level] || 5;
                    this.state.addMoney(refund);

                    this.showFloatingText(`+${refund}💰`, tower.x, tower.y, 'gold');
                    SoundManager.play('ui_click');

                    tower.selectedSlotId = -1;

                    // CRITICAL: Refresh Inspector to show empty slot immediately
                    this.inspector.selectTower(tower);
                }
            }
        } else if (action.type === 'CLICK_SLOT') {
            // First click selects the slot
            if (tower.selectedSlotId !== action.slotId) {
                tower.selectedSlotId = action.slotId;
                // Optional: Sound for selection
                // TODO: Add slot selection sound if needed
            } else {
                // Second click on SAME slot -> Action (Remove Card)
                // Only if there is a card
                const slot = tower.slots.find((s) => s.id === action.slotId);
                if (slot && slot.card) {
                    const card = tower.removeCardFromSlot(action.slotId);
                    if (card) {
                        this.cardSys.addCardWithEvolution(card.type.id, card.level, card.evolutionPath);
                        this.showFloatingText('Card Removed', tower.x, tower.y, '#fff');
                        tower.selectedSlotId = -1; // Reset selection after action
                    }
                } else {
                    // Clicking empty selected slot again - maybe Deselect?
                    tower.selectedSlotId = -1;
                }
            }
        }
        this.ui.update();
    }

    private lastErrorTime: number = 0;

    // === Tower Building ===

    public startBuildingTower(col: number, row: number): void {
        const screenX = col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const screenY = row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const validation = this.entityManager.canBuildTower(col, row, this.mapData, this.isBuildable);

        if (this.map.flowField) {
            // Retrieve spawn points from map waypoints (usually first point is spawn)
            // But we might need all spawns if multiple.
            // For now, assuming first waypoint is spawn.
            const spawns = this.map.waypoints.length > 0 ? [this.map.waypoints[0]] : [];

            // Check if blocking
            const isSafe = this.map.flowField.checkBuildability(this.map.grid, col, row, spawns);
            if (!isSafe) {
                this.showFloatingText('Path Blocked!', screenX, screenY, 'red');
                return;
            }
        }

        if (!validation.valid) {
            // Debounce error text to prevent infinite spam
            const now = Date.now();
            if (now - this.lastErrorTime > 500) {
                this.showFloatingText(validation.reason!, screenX, screenY, 'red');
                this.lastErrorTime = now;
            }
            return;
        }

        const tower = this.entityManager.buildTower(col, row);
        this.ui.update();

        // Trigger Flow Field update (Debounced)
        this.requestFlowFieldUpdate();
    }

    private requestFlowFieldUpdate() {
        if (this.map && this.map.requestFlowFieldUpdate) {
            this.map.requestFlowFieldUpdate();
        }
    }

    // === Grid Click Handling ===

    public handleGridClick(col: number, row: number): void {
        const tower = this.entityManager.getTowerAt(col, row);
        if (tower) {
            this.state.selectTower(tower);
            this.inspector.selectTower(tower);
        } else {
            this.state.selectTower(null);
            this.inspector.hide();
        }
    }

    // === Card Drop Handling ===

    public handleCardDrop(card: ICard, x: number, y: number): boolean {
        const col = Math.floor(x / CONFIG.TILE_SIZE);
        const row = Math.floor(y / CONFIG.TILE_SIZE);

        // Check if this is a tower card
        if (
            card.type.id === 'fire' ||
            card.type.id === 'ice' ||
            card.type.id === 'sniper' ||
            card.type.id === 'multi' ||
            card.type.id === 'minigun'
        ) {
            const success = this.entityManager.addCardToTower(card, col, row, this.isBuildable);

            if (success) {
                this.cardSys.removeCardFromHand(card);
                this.showFloatingText('Card installed!', x, y, 'lime');
                this.ui.update();

                // Refresh inspector if this tower is selected
                const tower = this.entityManager.getTowerAt(col, row);
                if (tower && this.state.selectedTower === tower) {
                    this.inspector.selectTower(tower);
                }
                return true;
            } else {
                const tower = this.entityManager.getTowerAt(col, row);
                if (tower && tower.cards.length >= 3) {
                    this.showFloatingText('Tower full!', x, y, 'orange');
                } else if (this.state.money < CONFIG.ECONOMY.TOWER_COST) {
                    this.showFloatingText('Not enough money!', x, y, 'red');
                } else {
                    this.showFloatingText("Can't build here", x, y, 'red');
                }
                return false;
            }
        }

        return false;
    }

    // === Tower Selling ===

    public sellTower(tower: Tower): void {
        const refund = this.entityManager.sellTower(tower);
        if (refund > 0) {
            this.inspector.hide();
            this.ui.update();
        }
    }

    public sellCardFromTower(tower: Tower, cardIndex: number): void {
        const result = this.entityManager.sellCardFromTower(tower, cardIndex);
        if (result.card) {
            this.ui.update();
            // Refresh inspector to show updated card slots
            this.inspector.selectTower(tower);
        }
    }

    // === Card Management ===

    public giveRandomCard(): void {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const key = keys[Math.floor(Math.random() * keys.length)];
        this.cardSys.addCard(key, 1);
        this.ui.update();
    }

    // === Keyboard Hotkeys ===

    public handleKeyDown(e: KeyboardEvent): void {
        if (this.state.paused) return;

        switch (e.code) {
            case 'Space':
                this.handleSpaceKey();
                break;

            case 'Delete':
            case 'Backspace':
                if (this.state.selectedTower) {
                    this.sellTower(this.state.selectedTower);
                }
                break;

            case 'KeyM':
                console.log('CHEAT: Give Minigun');
                this.cardSys.addCard('MINIGUN', 1);
                this.ui.update();
                this.showFloatingText('+ MINIGUN', window.innerWidth / 2, window.innerHeight / 2, '#d0f');
                break;
            case 'Digit1':
            case 'Digit2':
            case 'Digit3':
            case 'Digit4':
            case 'Digit5':
                // Card selection hotkeys (if implemented in future)
                break;
        }
    }

    private handleSpaceKey(): void {
        // Space key logic will be handled by WaveManager
        // Just toggle time scale if wave is active
        const waveActive = false; // This should come from WaveManager

        if (waveActive) {
            this.state.toggleTimeScale();
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const text = this.state.timeScale === 2.0 ? '>> 2x Speed' : '> 1x Speed';
            this.showFloatingText(text, centerX, centerY, '#fff');
        }
    }

    // === Helper Methods ===

    public showFloatingText(text: string, x: number, y: number, color: string = '#fff'): void {
        this.effects.add({ type: 'text', text, x, y, life: 1.0, color, vy: -60 });
    }
}
