import { IWaveConfig, SpawnPattern, IWaveGroupRaw } from '../MapData';
import { ThreatService } from './ThreatService';

type ChangeListener = () => void;

/**
 * Model class for the Wave Editor.
 * Manages the data state and ensures we work on a draft copy.
 */
export class WaveModel {
    private waves: IWaveConfig[];
    private listeners: ChangeListener[] = [];

    constructor(initialWaves: IWaveConfig[]) {
        // Deep copy to ensure we hold a draft state
        this.waves = JSON.parse(JSON.stringify(initialWaves || []));

        // Ensure at least one wave if empty
        if (this.waves.length === 0) {
            this.addWave();
        }
    }

    // --- Data Access ---

    public getWaves(): IWaveConfig[] {
        return this.waves;
    }

    public getWave(index: number): IWaveConfig {
        return this.waves[index];
    }

    public getWaveCount(): number {
        return this.waves.length;
    }

    public getThreat(waveIndex: number): number {
        return ThreatService.calculateWaveThreat(this.waves[waveIndex]);
    }

    // --- Mutation Methods ---

    public addWave() {
        this.waves.push({
            enemies: [{
                type: 'GRUNT',
                count: 5,
                pattern: 'normal',
                spawnRate: 'medium' // Default for new waves
            }]
        });
        this.notify();
    }

    public removeWave(index: number) {
        if (index >= 0 && index < this.waves.length) {
            this.waves.splice(index, 1);
            this.notify();
        }
    }

    public addEnemyGroup(waveIndex: number) {
        const wave = this.waves[waveIndex];
        if (wave) {
            wave.enemies.push({
                type: 'GRUNT',
                count: 1,
                pattern: 'normal',
                spawnRate: 'medium'
            });
            this.notify();
        }
    }

    public removeEnemyGroup(waveIndex: number, groupIndex: number) {
        const wave = this.waves[waveIndex];
        if (wave && wave.enemies.length > groupIndex) {
            wave.enemies.splice(groupIndex, 1);
            this.notify();
        }
    }

    // Explicitly typed for IWaveGroupRaw partial updates
    public updateEnemyGroup(waveIndex: number, groupIndex: number, updates: Partial<IWaveGroupRaw>) {
        const wave = this.waves[waveIndex];
        if (wave && wave.enemies[groupIndex]) {
            Object.assign(wave.enemies[groupIndex], updates);
            this.notify();
        }
    }

    public moveWave(fromIndex: number, toIndex: number) {
        if (fromIndex < 0 || fromIndex >= this.waves.length || toIndex < 0 || toIndex >= this.waves.length) return;

        const element = this.waves[fromIndex];
        this.waves.splice(fromIndex, 1);
        this.waves.splice(toIndex, 0, element);
        this.notify();
    }

    // --- Validation ---

    public validate(): boolean {
        // Basic validation: must have waves, each wave must have enemies
        if (this.waves.length === 0) return false;

        for (const wave of this.waves) {
            if (!wave.enemies || wave.enemies.length === 0) return false;
            for (const group of wave.enemies) {
                if (group.count < 1) return false;
                if (!group.type) return false;
            }
        }
        return true;
    }

    // --- Observer Pattern ---

    public subscribe(listener: ChangeListener) {
        this.listeners.push(listener);
    }

    public unsubscribe(listener: ChangeListener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    public destroy() {
        this.listeners = [];
    }
}
