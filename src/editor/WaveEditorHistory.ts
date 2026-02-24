import { IWaveConfig } from '../MapData';

/**
 * Undo/Redo history for the Wave Editor.
 * Uses JSON snapshots of the full IWaveConfig[] array.
 * Compact diff is unnecessary — wave arrays are small.
 */
export class WaveEditorHistory {
    private undoStack: { label: string; snapshot: string }[] = [];
    private redoStack: { label: string; snapshot: string }[] = [];
    private readonly maxSize = 30;

    /** Save current state before mutation. Call BEFORE modifying data. */
    public push(label: string, waves: IWaveConfig[]): void {
        this.undoStack.push({ label, snapshot: JSON.stringify(waves) });
        this.redoStack = []; // New action invalidates redo
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    /** Undo last change. Returns previous state or null. */
    public undo(currentWaves: IWaveConfig[]): IWaveConfig[] | null {
        const entry = this.undoStack.pop();
        if (!entry) return null;

        // Save current state to redo stack
        this.redoStack.push({ label: entry.label, snapshot: JSON.stringify(currentWaves) });

        return JSON.parse(entry.snapshot);
    }

    /** Redo last undone change. Returns next state or null. */
    public redo(currentWaves: IWaveConfig[]): IWaveConfig[] | null {
        const entry = this.redoStack.pop();
        if (!entry) return null;

        // Save current state to undo stack
        this.undoStack.push({ label: entry.label, snapshot: JSON.stringify(currentWaves) });

        return JSON.parse(entry.snapshot);
    }

    public canUndo(): boolean { return this.undoStack.length > 0; }
    public canRedo(): boolean { return this.redoStack.length > 0; }
    public getUndoLabel(): string | null {
        return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].label : null;
    }

    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
