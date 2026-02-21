import { describe, it, expect, vi } from 'vitest';
import { GameController } from '../src/scenes/GameController';

describe('GameController Keybinds', () => {
    it('should strictly toggle time scale without starting the wave on Spacebar', () => {
        const mockState = {
            toggleTimeScale: vi.fn(),
            timeScale: 2.0,
            enemies: [] as any[]
        };

        const controller = Object.create(GameController.prototype);
        controller['state'] = mockState as any;
        controller['showFloatingText'] = vi.fn();

        const keyEvent = { code: 'Space', preventDefault: vi.fn() } as unknown as KeyboardEvent;

        controller.handleKeyDown(keyEvent);

        expect(mockState.toggleTimeScale).toHaveBeenCalledTimes(1);
        expect(controller['showFloatingText']).toHaveBeenCalledWith('>> 2x Speed', expect.any(Number), expect.any(Number), '#fff');
    });
});
