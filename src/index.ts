import { Game } from './Game';
import { MapStorage } from './MapStorage';
import { CONFIG } from './Config';
import { CrashHandler } from './CrashHandler';

// Expose MapStorage to window for debugging
(window as any).MapStorage = MapStorage;

window.addEventListener('DOMContentLoaded', () => {
    new CrashHandler();

    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('❌ ОШИБКА: Canvas не найден!');
        return;
    }

    try {
        const game = new Game('game-canvas');
        game.start();

        // Theme Switcher Logic Removed (Ink Mode deprecated)
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.style.display = 'none'; // Hide the button
        }

        console.log('✅ Игра готова. Нажмите ⚔️, чтобы начать волну.');
    } catch (e) {
        console.error('Критическая ошибка:', e);
    }
});
