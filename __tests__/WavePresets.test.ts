import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getBuiltinPresets, saveCustomPreset, loadCustomPresets, deleteCustomPreset } from '../src/editor/WavePresets';

describe('WavePresets', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('getBuiltinPresets returns at least 5 presets', () => {
        const presets = getBuiltinPresets();
        expect(presets.length).toBeGreaterThanOrEqual(5);
    });

    it('each preset has valid IWaveConfig[]', () => {
        const presets = getBuiltinPresets();
        presets.forEach(p => {
            expect(p.id).toBeDefined();
            expect(p.name).toBeDefined();
            expect(p.waves.length).toBeGreaterThan(0);
            p.waves.forEach(w => {
                expect(w.enemies.length).toBeGreaterThan(0);
            });
        });
    });

    it('saveCustomPreset → loadCustomPresets round-trip', () => {
        expect(loadCustomPresets().length).toBe(0);
        saveCustomPreset('My Preset', [{ enemies: [{ type: 'ORC', count: 10, pattern: 'normal', baseInterval: 1 }] }]);

        const custom = loadCustomPresets();
        expect(custom.length).toBe(1);
        expect(custom[0].name).toBe('My Preset');
        expect(custom[0].waves[0].enemies[0].type).toBe('ORC');
    });

    it('deleteCustomPreset removes from storage', () => {
        saveCustomPreset('My Preset', [{ enemies: [{ type: 'ORC', count: 10, pattern: 'normal', baseInterval: 1 }] }]);
        const custom = loadCustomPresets();
        expect(custom.length).toBe(1);

        deleteCustomPreset(custom[0].id);
        expect(loadCustomPresets().length).toBe(0);
    });
});
