import { GameController } from '../src/scenes/GameController';

describe('GameController Keybinds', () => {
    it('should strictly toggle time scale without starting the wave on Spacebar', () => {
        const mockState = {
            toggleTimeScale: jest.fn(),
            timeScale: 2.0,
            enemies: [] as any[]
        };

        // Mock window for screen dimensions
        (global as any).window = { innerWidth: 1920, innerHeight: 1080 };

        const controller = Object.create(GameController.prototype);
        controller['state'] = mockState as any;
        controller['showFloatingText'] = jest.fn();

        const keyEvent = { code: 'Space', preventDefault: jest.fn() } as unknown as KeyboardEvent;

        controller.handleKeyDown(keyEvent);

        expect(mockState.toggleTimeScale).toHaveBeenCalledTimes(1);
        expect(controller['showFloatingText']).toHaveBeenCalledWith('>> 2x Speed', expect.any(Number), expect.any(Number), '#fff');
    });
});
