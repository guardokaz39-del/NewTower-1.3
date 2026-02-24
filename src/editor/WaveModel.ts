import { IWaveConfig, IWaveGroupRaw } from '../MapData';
import { ThreatService } from './ThreatService';
import { WaveEditorHistory } from './WaveEditorHistory';

type ChangeListener = () => void;

/**
 * Model class for the Wave Editor.
 * Manages the data state and ensures we work on a draft copy.
 */
export class WaveModel {
    private waves: IWaveConfig[];
    private listeners: ChangeListener[] = [];
    private history = new WaveEditorHistory();

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
        this.history.push('Add Wave', this.waves);
        this.waves.push({
            enemies: [{
                type: 'GRUNT',
                count: 5,
                pattern: 'normal',
                baseInterval: 0.66,
            }],
            shuffleMode: 'none', // New maps: designer controls order
        });
        this.notify();
    }

    public removeWave(index: number) {
        if (index >= 0 && index < this.waves.length) {
            this.history.push('Remove Wave', this.waves);
            this.waves.splice(index, 1);
            this.notify();
        }
    }

    public addEnemyGroup(waveIndex: number) {
        const wave = this.waves[waveIndex];
        if (wave) {
            this.history.push('Add Enemy Group', this.waves);
            wave.enemies.push({
                type: 'GRUNT',
                count: 1,
                pattern: 'normal',
                baseInterval: 0.66,
            });
            this.notify();
        }
    }

    public removeEnemyGroup(waveIndex: number, groupIndex: number) {
        const wave = this.waves[waveIndex];
        if (wave && wave.enemies.length > groupIndex) {
            this.history.push('Remove Enemy Group', this.waves);
            wave.enemies.splice(groupIndex, 1);
            this.notify();
        }
    }

    // Explicitly typed for IWaveGroupRaw partial updates
    public updateEnemyGroup(waveIndex: number, groupIndex: number, updates: Partial<IWaveGroupRaw>) {
        const wave = this.waves[waveIndex];
        if (wave && wave.enemies[groupIndex]) {
            this.history.push('Update Enemy Group', this.waves);
            Object.assign(wave.enemies[groupIndex], updates);
            this.notify();
        }
    }

    public moveWave(fromIndex: number, toIndex: number) {
        if (fromIndex < 0 || fromIndex >= this.waves.length || toIndex < 0 || toIndex >= this.waves.length) return;

        this.history.push('Move Wave', this.waves);
        const element = this.waves[fromIndex];
        this.waves.splice(fromIndex, 1);
        this.waves.splice(toIndex, 0, element);
        this.notify();
    }

    // --- New Methods ---

    public updateWaveSettings(index: number, updates: Partial<Pick<IWaveConfig, 'name' | 'startDelay' | 'waitForClear' | 'bonusReward' | 'shuffleMode'>>) {
        const wave = this.waves[index];
        if (!wave) return;
        this.history.push('Update Wave Settings', this.waves);
        Object.assign(wave, updates);
        this.notify();
    }

    public updateGroupTiming(waveIndex: number, groupIndex: number, updates: { baseInterval?: number; delayBefore?: number }) {
        const wave = this.waves[waveIndex];
        if (!wave || !wave.enemies[groupIndex]) return;
        this.history.push('Update Group Timing', this.waves);
        Object.assign(wave.enemies[groupIndex], updates);
        this.notify();
    }

    public duplicateWave(index: number) {
        if (index < 0 || index >= this.waves.length) return;
        this.history.push('Duplicate Wave', this.waves);
        const copy: IWaveConfig = JSON.parse(JSON.stringify(this.waves[index]));
        this.waves.splice(index + 1, 0, copy);
        this.notify();
    }

    public duplicateGroup(waveIndex: number, groupIndex: number) {
        const wave = this.waves[waveIndex];
        if (!wave || !wave.enemies[groupIndex]) return;
        this.history.push('Duplicate Group', this.waves);
        const copy: IWaveGroupRaw = JSON.parse(JSON.stringify(wave.enemies[groupIndex]));
        wave.enemies.splice(groupIndex + 1, 0, copy);
        this.notify();
    }

    public moveGroup(waveIndex: number, fromIdx: number, toIdx: number) {
        const wave = this.waves[waveIndex];
        if (!wave || fromIdx < 0 || fromIdx >= wave.enemies.length || toIdx < 0 || toIdx >= wave.enemies.length) return;
        this.history.push('Move Group', this.waves);
        const [element] = wave.enemies.splice(fromIdx, 1);
        wave.enemies.splice(toIdx, 0, element);
        this.notify();
    }

    public getEstimatedDuration(waveIndex: number): number {
        const wave = this.waves[waveIndex];
        if (!wave || !wave.enemies) return 0;
        let total = wave.startDelay ?? 0;
        wave.enemies.forEach(g => {
            total += g.delayBefore ?? 0;
            const interval = g.baseInterval ?? 0.66;
            total += g.count * interval;
        });
        return total;
    }

    public undo(): boolean {
        const state = this.history.undo(this.waves);
        if (!state) return false;
        this.waves = state;
        this.notify();
        return true;
    }

    public redo(): boolean {
        const state = this.history.redo(this.waves);
        if (!state) return false;
        this.waves = state;
        this.notify();
        return true;
    }

    public canUndo(): boolean { return this.history.canUndo(); }
    public canRedo(): boolean { return this.history.canRedo(); }

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
        this.history.clear();
    }
}
