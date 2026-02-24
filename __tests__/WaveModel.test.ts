import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeWaveConfig } from '../src/Utils';
import { WaveModel } from '../src/editor/WaveModel';
import { IWaveConfig } from '../src/MapData';

// ============================================================
// normalizeWaveConfig — Round-trip preservation
// ============================================================
describe('normalizeWaveConfig', () => {
    it('should preserve new wave-level fields after round-trip', () => {
        const input = {
            enemies: [{ type: 'ORC', count: 3 }],
            name: 'Boss Wave!',
            startDelay: 2.5,
            waitForClear: true,
            bonusReward: 50,
            shuffleMode: 'none',
        };

        const result = normalizeWaveConfig(input);

        expect(result.name).toBe('Boss Wave!');
        expect(result.startDelay).toBe(2.5);
        expect(result.waitForClear).toBe(true);
        expect(result.bonusReward).toBe(50);
        expect(result.shuffleMode).toBe('none');
    });

    it('should preserve new group-level fields (baseInterval, delayBefore, pattern)', () => {
        const input = {
            enemies: [{
                type: 'GRUNT',
                count: 5,
                baseInterval: 0.4,
                delayBefore: 3.0,
                pattern: 'swarm',
            }],
        };

        const result = normalizeWaveConfig(input);
        const group = result.enemies[0];

        expect(group.baseInterval).toBe(0.4);
        expect(group.delayBefore).toBe(3.0);
        expect(group.pattern).toBe('swarm');
    });

    it('should clamp baseInterval < 0.05 to 0.05', () => {
        const input = {
            enemies: [{ type: 'ORC', count: 1, baseInterval: 0.01 }],
        };
        const result = normalizeWaveConfig(input);
        expect(result.enemies[0].baseInterval).toBe(0.05);
    });

    it('should clamp delayBefore < 0 to 0', () => {
        const input = {
            enemies: [{ type: 'ORC', count: 1, delayBefore: -5 }],
        };
        const result = normalizeWaveConfig(input);
        expect(result.enemies[0].delayBefore).toBe(0);
    });

    it('should clamp count < 1 to 1', () => {
        const input = {
            enemies: [{ type: 'ORC', count: 0 }],
        };
        const result = normalizeWaveConfig(input);
        expect(result.enemies[0].count).toBe(1);
    });

    it('should handle legacy config without new fields (backward compat)', () => {
        const legacy = {
            enemies: [{ type: 'grunt', count: 5, spawnRate: 'medium' }],
        };
        const result = normalizeWaveConfig(legacy);

        expect(result.enemies[0].type).toBe('grunt');
        expect(result.enemies[0].count).toBe(5);
        expect(result.enemies[0].spawnRate).toBe('medium');
        // New fields should NOT exist (not undefined but absent)
        expect(result.name).toBeUndefined();
        expect(result.startDelay).toBeUndefined();
        expect(result.shuffleMode).toBeUndefined();
        expect(result.enemies[0].baseInterval).toBeUndefined();
        expect(result.enemies[0].delayBefore).toBeUndefined();
    });

    it('should return empty enemies for null/invalid input', () => {
        expect(normalizeWaveConfig(null).enemies).toEqual([]);
        expect(normalizeWaveConfig({}).enemies).toEqual([]);
        expect(normalizeWaveConfig({ enemies: 'bad' }).enemies).toEqual([]);
    });

    it('should reject invalid shuffleMode values', () => {
        const input = {
            enemies: [{ type: 'ORC', count: 1 }],
            shuffleMode: 'invalid_mode',
        };
        const result = normalizeWaveConfig(input);
        expect(result.shuffleMode).toBeUndefined();
    });

    it('should trim wave name and ignore empty strings', () => {
        const input1 = {
            enemies: [{ type: 'ORC', count: 1 }],
            name: '  Boss Rush  ',
        };
        expect(normalizeWaveConfig(input1).name).toBe('Boss Rush');

        const input2 = {
            enemies: [{ type: 'ORC', count: 1 }],
            name: '   ',
        };
        expect(normalizeWaveConfig(input2).name).toBeUndefined();
    });
});

// ============================================================
// WaveModel — Core operations
// ============================================================
describe('WaveModel', () => {
    let model: WaveModel;

    beforeEach(() => {
        model = new WaveModel([
            {
                enemies: [
                    { type: 'GRUNT', count: 5, pattern: 'normal', baseInterval: 0.66 },
                ],
                shuffleMode: 'none',
            },
        ]);
    });

    it('addWave() should increase wave count and use shuffleMode=none', () => {
        const before = model.getWaveCount();
        model.addWave();
        expect(model.getWaveCount()).toBe(before + 1);

        const newWave = model.getWave(model.getWaveCount() - 1);
        expect(newWave.shuffleMode).toBe('none');
        expect(newWave.enemies[0].baseInterval).toBe(0.66);
    });

    it('duplicateWave() should create a deep copy', () => {
        model.duplicateWave(0);
        expect(model.getWaveCount()).toBe(2);

        // Modify original — copy should not change
        model.updateEnemyGroup(0, 0, { type: 'ORC' });
        expect(model.getWave(1).enemies[0].type).toBe('GRUNT');
    });

    it('updateWaveSettings() should update name and startDelay', () => {
        model.updateWaveSettings(0, { name: 'Test Wave', startDelay: 5 });

        const wave = model.getWave(0);
        expect(wave.name).toBe('Test Wave');
        expect(wave.startDelay).toBe(5);
    });

    it('updateGroupTiming() should update baseInterval and delayBefore', () => {
        model.updateGroupTiming(0, 0, { baseInterval: 0.3, delayBefore: 2.0 });

        const group = model.getWave(0).enemies[0];
        expect(group.baseInterval).toBe(0.3);
        expect(group.delayBefore).toBe(2.0);
    });

    it('undo()/redo() should restore and re-apply state', () => {
        // Initial state
        expect(model.getWave(0).enemies[0].type).toBe('GRUNT');

        // Mutate
        model.updateEnemyGroup(0, 0, { type: 'ORC' });
        expect(model.getWave(0).enemies[0].type).toBe('ORC');

        // Undo
        const undone = model.undo();
        expect(undone).toBe(true);
        expect(model.getWave(0).enemies[0].type).toBe('GRUNT');

        // Redo
        const redone = model.redo();
        expect(redone).toBe(true);
        expect(model.getWave(0).enemies[0].type).toBe('ORC');
    });

    it('undo() should return false when stack is empty', () => {
        expect(model.undo()).toBe(false);
    });

    it('getEstimatedDuration() should calculate correctly', () => {
        // Wave: startDelay=2, 1 group with 5 enemies @ 0.66s + delayBefore=1
        model.updateWaveSettings(0, { startDelay: 2 });
        model.updateGroupTiming(0, 0, { baseInterval: 0.66, delayBefore: 1 });

        // total = startDelay(2) + delayBefore(1) + count(5) * interval(0.66)
        const duration = model.getEstimatedDuration(0);
        expect(duration).toBeCloseTo(2 + 1 + 5 * 0.66, 2);
    });

    it('duplicateGroup() should deep copy a group', () => {
        model.duplicateGroup(0, 0);

        const wave = model.getWave(0);
        expect(wave.enemies.length).toBe(2);

        // Modify original — copy intact
        model.updateEnemyGroup(0, 0, { count: 99 });
        expect(wave.enemies[1].count).toBe(5);
    });

    it('moveGroup() should reorder groups within a wave', () => {
        model.addEnemyGroup(0);
        model.updateEnemyGroup(0, 1, { type: 'ORC' });

        model.moveGroup(0, 1, 0); // Move ORC before GRUNT

        expect(model.getWave(0).enemies[0].type).toBe('ORC');
        expect(model.getWave(0).enemies[1].type).toBe('GRUNT');
    });

    it('removeWave/removeEnemyGroup should push history', () => {
        model.addWave();
        expect(model.getWaveCount()).toBe(2);

        model.removeWave(1);
        expect(model.getWaveCount()).toBe(1);

        // Undo should restore the removed wave
        model.undo();
        expect(model.getWaveCount()).toBe(2);
    });

    it('validate() requires at least one wave with at least one group', () => {
        expect(model.validate()).toBe(true);

        // Empty enemies
        model.removeEnemyGroup(0, 0);
        expect(model.validate()).toBe(false);
    });
});

// ============================================================
// WaveModel — Phase 4-5
// ============================================================
describe('WaveModel — Phase 4-5', () => {
    let model: WaveModel;

    beforeEach(() => {
        model = new WaveModel([
            {
                enemies: [
                    { type: 'GRUNT', count: 5, pattern: 'normal', baseInterval: 0.66 },
                ],
                shuffleMode: 'none',
            },
        ]);
    });

    it('replaceAllWaves replaces all waves and pushes history', () => {
        model.replaceAllWaves([{ enemies: [{ type: 'ORC', count: 10, pattern: 'normal', baseInterval: 1 }] }]);
        expect(model.getWaveCount()).toBe(1);
        expect(model.getWave(0).enemies[0].type).toBe('ORC');

        model.undo();
        expect(model.getWave(0).enemies[0].type).toBe('GRUNT');
    });

    it('replaceAllWaves with empty array creates default wave', () => {
        model.replaceAllWaves([]);
        expect(model.getWaveCount()).toBe(1);
        expect(model.getWave(0).enemies[0].type).toBe('GRUNT'); // default fallback
    });

    it('validateExtended returns errors for empty wave', () => {
        model.removeEnemyGroup(0, 0);
        const { isValid, errors } = model.validateExtended();
        expect(isValid).toBe(false);
        expect(errors.some(e => e.message === 'Волна без групп врагов')).toBe(true);
    });

    it('validateExtended returns error for count < 1', () => {
        model.updateEnemyGroup(0, 0, { count: 0 });
        const { isValid, errors } = model.validateExtended();
        expect(isValid).toBe(false);
        expect(errors.some(e => e.field === 'count')).toBe(true);
    });

    it('validateExtended returns error for baseInterval <= 0', () => {
        model.updateEnemyGroup(0, 0, { baseInterval: 0 });
        const { isValid, errors } = model.validateExtended();
        expect(isValid).toBe(false);
        expect(errors.some(e => e.field === 'baseInterval')).toBe(true);
    });

    it('moveWaveUp/Down reorders correctly', () => {
        model.addWave();
        model.updateWaveSettings(0, { name: 'Wave 1' });
        model.updateWaveSettings(1, { name: 'Wave 2' });

        model.moveWaveDown(0);
        expect(model.getWave(0).name).toBe('Wave 2');
        expect(model.getWave(1).name).toBe('Wave 1');

        model.moveWaveUp(1);
        expect(model.getWave(0).name).toBe('Wave 1');
        expect(model.getWave(1).name).toBe('Wave 2');
    });
});

