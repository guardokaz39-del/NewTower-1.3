import { Enemy } from '../Enemy';
import { Tower } from '../Tower';
import { ICard } from '../CardSystem';
import { CONFIG, getEnemyType } from '../Config';
import { EntityFactory } from '../EntityFactory';
import { GameState } from './GameState';
import { EffectSystem } from '../EffectSystem';
import { MetricsSystem } from '../MetricsSystem';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { SoundManager } from '../SoundManager';
import { EventBus, Events } from '../EventBus';
import { playDeathAnimation } from '../effects';

/**
 * Manages entity lifecycle:
 * - Tower building/selling
 * - Enemy spawning/death
 * - Projectile cleanup
 * - Visual effects coordination
 */
export class EntityManager {
    constructor(
        private state: GameState,
        private effects: EffectSystem,
        private metrics: MetricsSystem,
    ) { }

    // === Tower Management ===

    /**
     * Validate if a tower can be built at the given position
     */
    public canBuildTower(col: number, row: number, mapData: any, isBuildable: (c: number, r: number) => boolean): { valid: boolean; reason?: string } {
        if (!isBuildable(col, row)) {
            return { valid: false, reason: "Can't build here!" };
        }

        // Check existing tower
        const existingTower = this.state.towers.find((t) => t.col === col && t.row === row);
        if (existingTower) {
            return { valid: false, reason: 'Tower already here!' };
        }

        // Check money
        if (this.state.money < CONFIG.ECONOMY.TOWER_COST) {
            return { valid: false, reason: 'Not enough money!' };
        }

        return { valid: true };
    }

    /**
     * Build a tower at the specified position
     */
    public buildTower(col: number, row: number): Tower {
        this.state.spendMoney(CONFIG.ECONOMY.TOWER_COST);
        this.metrics.trackMoneySpent(CONFIG.ECONOMY.TOWER_COST);

        const tower = EntityFactory.createTower(col, row);
        tower.isBuilding = true;
        tower.buildProgress = 0;
        this.state.towers.push(tower);

        this.metrics.trackTowerBuilt();
        return tower;
    }

    /**
     * Sell an existing tower
     */
    public sellTower(tower: Tower): number {
        const idx = this.state.towers.indexOf(tower);
        if (idx === -1) return 0;

        this.state.towers.splice(idx, 1);
        const refund = Math.floor(CONFIG.ECONOMY.TOWER_COST * CONFIG.ECONOMY.SELL_REFUND);
        this.state.addMoney(refund);

        // Visual feedback
        this.showFloatingText(`+${refund}💰`, tower.x, tower.y, 'gold');

        if (this.state.selectedTower === tower) {
            this.state.selectTower(null);
        }

        return refund;
    }

    /**
     * Add a card to a tower or create new tower if none exists
     */
    public addCardToTower(card: ICard, col: number, row: number, isBuildable: (c: number, r: number) => boolean): boolean {
        let tower = this.state.towers.find((t) => t.col === col && t.row === row);

        // If no tower exists, we do NOT build one automatically on drop
        // User requested: "if card is carried not to tower base but to empty cell... it should return to hand"
        if (!tower) {
            return false;
        }

        // Add card to tower
        if (tower.addCard(card)) {
            this.metrics.trackCardUsed(card.type.id);
            return true;
        }

        return false;
    }

    /**
     * Sell a card from a tower
     */
    public sellCardFromTower(tower: Tower, cardIndex: number): { card: ICard | null; refund: number } {
        const card = tower.removeCard(cardIndex);
        if (!card) return { card: null, refund: 0 };

        const prices = CONFIG.ECONOMY.CARD_SELL_PRICES;
        const refund = prices[card.level] || 5;
        this.state.addMoney(refund);

        this.showFloatingText(`+${refund}💰`, tower.x, tower.y - 30, 'gold');
        this.metrics.trackMoneyEarned(refund);

        return { card, refund };
    }

    // === Enemy Management ===

    /**
     * Spawn an enemy of the given type
     */
    public spawnEnemy(type: string, waypoints: { x: number; y: number }[]): Enemy | null {
        if (!waypoints || waypoints.length === 0) return null;

        PerformanceMonitor.startTimer('Spawn');

        const enemy = this.state.enemyPool.obtain();
        EntityFactory.setupEnemy(enemy, type, this.state.wave, waypoints);
        this.state.enemies.push(enemy);

        // Notify systems
        EventBus.getInstance().emit(Events.ENEMY_SPAWNED, type);

        PerformanceMonitor.endTimer('Spawn');
        return enemy;
    }

    /**
     * Update enemy counter in HUD
     */
    private updateEnemyCounterUI(): void {
        // This will be called from updateEnemies
    }

    /**
     * Process enemy death - rewards, effects, cleanup
     */
    public handleEnemyDeath(enemy: Enemy): void {
        const reward = enemy.reward || 5;
        this.state.addMoney(reward);
        this.metrics.trackEnemyKilled();
        this.metrics.trackMoneyEarned(reward);

        const enemyTypeConf = getEnemyType(enemy.typeId.toUpperCase());

        // === Архетип-специфичная анимация смерти ===
        playDeathAnimation(this.effects, enemy, enemyTypeConf);

        // Soft death sound (throttled by SoundManager)
        SoundManager.play('death');

        // Floating text with emoji (Phase 2.2: pool-based spawn)
        this.effects.spawn({
            type: 'text',
            text: `+${reward}💰`,
            x: enemy.x,
            y: enemy.y,
            life: 0.6,
            color: 'gold',
            vy: -90,
        });

        // Coin particle burst (Phase 2.2: zero-alloc spawnParticle)
        const particleCount = Math.min(3 + Math.floor(reward / 5), 8);
        for (let p = 0; p < particleCount; p++) {
            this.effects.spawnParticle(
                'particle',
                enemy.x + (Math.random() - 0.5) * 20,
                enemy.y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 360,
                -(Math.random() * 240 + 120),
                0.4 + Math.random() * 0.25,
                3 + Math.random() * 2,
                Math.random() > 0.3 ? '#ffd700' : '#ffeb3b'
            );
        }
    }

    /**
 * Process enemy reaching the end - lose life, cleanup
     */
    public handleEnemyFinished(enemy: Enemy): void {
        const damage = enemy.typeId === 'sapper_rat' ? 5 : 1;
        this.state.loseLife(damage, this.effects); // Pass effects for screen flash

        if (damage > 1) {
            this.showFloatingText(`CRYITICAL BREACH! -${damage}❤️`, enemy.x, enemy.y - 20, '#d32f2f');
            SoundManager.play('explosion'); // Louder/Standard
        }

        this.metrics.trackLifeLost();
        // Removed triggerShake - flash effect is enough
        if (damage === 1) SoundManager.play('explosion', 1);
    }

    /**
     * Update all enemies and handle death/finish
     */
    public updateEnemies(dt: number, flowField: any): void { // Using 'any' to avoid circular ref, but should be FlowField
        const enemies = this.state.enemies;
        // Phase 2.1: Sub-step movement to prevent tunneling at low FPS
        const MAX_MOVE_STEP = 1 / 60; // 16.66ms movement chunks

        // Phase 2.2: Forward iteration with swap-and-pop (O(1) removal)
        let i = 0;
        while (i < enemies.length) {
            const e = enemies[i];

            // Sub-step movement only (prevents tunneling for fast enemies)
            let remaining = dt;
            while (remaining > 0) {
                const step = remaining < MAX_MOVE_STEP ? remaining : MAX_MOVE_STEP;
                e.move(step, flowField);
                remaining -= step;
            }
            // Status updates (timers, burn, shield) run once with full dt
            e.update(dt);

            let removed = false;
            if (!e.isAlive()) {
                this.handleEnemyDeath(e);
                this.state.enemyPool.free(e);
                // Swap-and-pop: O(1) instead of O(n) splice
                enemies[i] = enemies[enemies.length - 1];
                enemies.length--;
                removed = true;
            } else if (e.finished) {
                this.handleEnemyFinished(e);
                this.state.enemyPool.free(e);
                enemies[i] = enemies[enemies.length - 1];
                enemies.length--;
                removed = true;
            }

            if (!removed) i++;
        }
    }

    // === Projectile Management ===

    // Projectiles are now managed by ProjectileSystem

    // === Helper Methods ===

    private showFloatingText(text: string, x: number, y: number, color: string = '#fff'): void {
        this.effects.add({ type: 'text', text, x, y, life: 1.0, color, vy: -60 });
    }

    /**
     * Get tower at specific grid position
     */
    public getTowerAt(col: number, row: number): Tower | null {
        return this.state.towers.find((t) => t.col === col && t.row === row) || null;
    }
}
