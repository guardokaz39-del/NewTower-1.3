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

/**
 * Handles user actions and game controller logic:
 * - Tower building/selection
 * - Card drop handling
 * - Grid click handling
 * - Keyboard hotkeys
 */
export class GameController {
    constructor(
        private state: GameState,
        private entityManager: EntityManager,
        private effects: EffectSystem,
        private inspector: InspectorSystem,
        private ui: UIManager,
        private metrics: MetricsSystem,
        private mapData: IMapData,
        private isBuildable: (col: number, row: number) => boolean,
        private cardSys: any, // CardSystem reference
    ) { }

    // === Tower Building ===

    public startBuildingTower(col: number, row: number): void {
        const screenX = col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const screenY = row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const validation = this.entityManager.canBuildTower(col, row, this.mapData, this.isBuildable);

        if (!validation.valid) {
            this.showFloatingText(validation.reason!, screenX, screenY, 'red');
            return;
        }

        const tower = this.entityManager.buildTower(col, row);
        this.ui.update();
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
            card.type.id === 'multi'
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
            case 'KeyS':
                if (this.state.selectedTower) {
                    this.sellTower(this.state.selectedTower);
                }
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
        this.effects.add({ type: 'text', text, x, y, life: 60, color, vy: -1 });
    }
}
