import { describe, it, expect, vi } from 'vitest';
import { MapManager } from '../src/Map';
import { EditorScene } from '../src/scenes/EditorScene';
import { DEMO_MAP } from '../src/MapData';

describe('EditorScene Tools', () => {
    it('applies fill tool correctly (BFS flood fill)', () => {
        // Mock game map setup for EditorScene
        const mockMapData = {
            width: 5, height: 5,
            tiles: [
                [0, 0, 0, 1, 0],
                [0, 0, 1, 1, 0],
                [0, 1, 1, 0, 0],
                [0, 0, 1, 0, 0],
                [0, 0, 1, 1, 1]
            ],
            waypoints: [] as any[], waves: [] as any[], objects: [] as any[]
        };

        // Mock game and scene
        const editor = Object.create(EditorScene.prototype);
        editor.map = new MapManager(mockMapData);
        editor.history = {
            beginCompound: vi.fn(),
            pushInCompound: vi.fn(),
            commitCompound: vi.fn()
        };

        // Expose private applyFill
        const applyFill = editor['applyFill'].bind(editor);

        // Fill grass (0) at 0,0 with water (2)
        applyFill(0, 0, 'paint_water');

        // Check if BFS flooded the enclosed area correctly
        expect(editor.map.grid[0][0].type).toBe(2);
        expect(editor.map.grid[1][0].type).toBe(2);
        expect(editor.map.grid[2][0].type).toBe(2);

        // Road barrier should remain road (1)
        expect(editor.map.grid[0][3].type).toBe(1);

        // The grass (0) on the other side of the road shouldn't be filled
        expect(editor.map.grid[0][4].type).toBe(0);


        // Check history pushes - 10 grass tiles should be filled in the enclosed area
        expect(editor.history.pushInCompound).toHaveBeenCalledTimes(10);
    });

    it('applies brush size correctly across multiple tiles', () => {
        const mockMapData = {
            width: 5, height: 5,
            tiles: [
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0]
            ],
            waypoints: [] as any[], waves: [] as any[], objects: [] as any[]
        };

        const editor = Object.create(EditorScene.prototype);
        editor.map = new MapManager(mockMapData);
        editor.state = {
            mode: 'paint_sand',
            brushSize: 3
        };
        editor.history = {
            beginCompound: vi.fn(),
            pushInCompound: vi.fn(),
            commitCompound: vi.fn()
        };
        editor.isPaintMode = () => true;
        editor.applyToolAt = vi.fn();

        // Expose private handleInput
        const handleInput = editor['handleInput'].bind(editor);

        // Use brush size 3 at center (2,2)
        handleInput(2, 2);

        // A 3x3 brush should call applyToolAt 9 times around the center
        expect(editor.applyToolAt).toHaveBeenCalledTimes(9);

        // Verify bounds of calls (start X should be 2 - 1 = 1, end X should be 3)
        // first call is (1, 1)
        expect(editor.applyToolAt).toHaveBeenCalledWith(1, 1, -1);
        // last call is (3, 3)
        expect(editor.applyToolAt).toHaveBeenCalledWith(3, 3, -1);
    });
});
