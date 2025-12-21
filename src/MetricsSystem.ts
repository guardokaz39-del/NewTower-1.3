import { SaveManager } from './SaveManager';

/**
 * Metrics Collection System
 * Collects gameplay statistics for balancing
 */

export interface IGameMetrics {
    gamesPlayed: number;
    wavesReached: number[];         // Array of max waves reached per game
    averageWaveReached: number;
    towersBuilt: number;
    cardsUsed: Record<string, number>; // Count per card type
    moneySpent: number;
    moneyEarned: number;
    enemiesKilled: number;
    livesLost: number;
    gamesWon: number;
}

export class MetricsSystem {
    private metrics: IGameMetrics;
    private currentGameMetrics: {
        waveReached: number;
        towersBuilt: number;
        cardsUsed: Record<string, number>;
        moneySpent: number;
        moneyEarned: number;
        enemiesKilled: number;
        livesLost: number;
    };

    constructor() {
        // Try to load from localStorage
        const saved = localStorage.getItem('towerDefenseMetrics');
        if (saved) {
            this.metrics = JSON.parse(saved);
        } else {
            this.metrics = {
                gamesPlayed: 0,
                wavesReached: [],
                averageWaveReached: 0,
                towersBuilt: 0,
                cardsUsed: {},
                moneySpent: 0,
                moneyEarned: 0,
                enemiesKilled: 0,
                livesLost: 0,
                gamesWon: 0,
            };
        }

        this.currentGameMetrics = {
            waveReached: 0,
            towersBuilt: 0,
            cardsUsed: {},
            moneySpent: 0,
            moneyEarned: 0,
            enemiesKilled: 0,
            livesLost: 0,
        };
    }

    // Track actions
    public trackTowerBuilt() {
        this.currentGameMetrics.towersBuilt++;
    }

    public trackCardUsed(cardType: string) {
        if (!this.currentGameMetrics.cardsUsed[cardType]) {
            this.currentGameMetrics.cardsUsed[cardType] = 0;
        }
        this.currentGameMetrics.cardsUsed[cardType]++;
    }

    public trackMoneySpent(amount: number) {
        this.currentGameMetrics.moneySpent += amount;
    }

    public trackMoneyEarned(amount: number) {
        this.currentGameMetrics.moneyEarned += amount;
    }

    public trackEnemyKilled() {
        this.currentGameMetrics.enemiesKilled++;
    }

    public trackLifeLost() {
        this.currentGameMetrics.livesLost++;
    }

    public trackWaveReached(wave: number) {
        this.currentGameMetrics.waveReached = Math.max(this.currentGameMetrics.waveReached, wave);
    }

    // End game and save metrics
    public endGame(won: boolean) {
        this.metrics.gamesPlayed++;
        this.metrics.wavesReached.push(this.currentGameMetrics.waveReached);
        this.metrics.towersBuilt += this.currentGameMetrics.towersBuilt;
        this.metrics.moneySpent += this.currentGameMetrics.moneySpent;
        this.metrics.moneyEarned += this.currentGameMetrics.moneyEarned;
        this.metrics.enemiesKilled += this.currentGameMetrics.enemiesKilled;
        this.metrics.livesLost += this.currentGameMetrics.livesLost;

        // Merge card usage
        for (const [card, count] of Object.entries(this.currentGameMetrics.cardsUsed)) {
            if (!this.metrics.cardsUsed[card]) {
                this.metrics.cardsUsed[card] = 0;
            }
            this.metrics.cardsUsed[card] += count;
        }

        if (won) {
            this.metrics.gamesWon++;
        }

        // Calculate average wave reached
        const total = this.metrics.wavesReached.reduce((a, b) => a + b, 0);
        this.metrics.averageWaveReached = total / this.metrics.wavesReached.length;

        // Save to localStorage
        this.save();

        // Update Campaign Persistence
        SaveManager.updateProgress({
            money: this.currentGameMetrics.moneyEarned,
            kills: this.currentGameMetrics.enemiesKilled,
            waves: this.currentGameMetrics.waveReached,
            maxWave: this.currentGameMetrics.waveReached
        });

        // Log to console for debugging
        console.log('=== GAME METRICS ===');
        console.log(`Games Played: ${this.metrics.gamesPlayed}`);
        console.log(`Average Wave: ${this.metrics.averageWaveReached.toFixed(1)}`);
        console.log(`Win Rate: ${((this.metrics.gamesWon / this.metrics.gamesPlayed) * 100).toFixed(1)}%`);
        console.log('Card Usage:', this.metrics.cardsUsed);
    }

    public save() {
        localStorage.setItem('towerDefenseMetrics', JSON.stringify(this.metrics));
    }

    public getMetrics(): IGameMetrics {
        return { ...this.metrics };
    }

    public getCardUsagePercentages(): Record<string, number> {
        const total = Object.values(this.metrics.cardsUsed).reduce((a, b) => a + b, 0);
        const percentages: Record<string, number> = {};

        for (const [card, count] of Object.entries(this.metrics.cardsUsed)) {
            percentages[card] = (count / total) * 100;
        }

        return percentages;
    }

    public reset() {
        this.metrics = {
            gamesPlayed: 0,
            wavesReached: [],
            averageWaveReached: 0,
            towersBuilt: 0,
            cardsUsed: {},
            moneySpent: 0,
            moneyEarned: 0,
            enemiesKilled: 0,
            livesLost: 0,
            gamesWon: 0,
        };
        this.save();
    }
}
