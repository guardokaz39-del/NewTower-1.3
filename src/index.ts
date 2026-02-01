import { Game } from './Game';
import { getSavedMaps, deleteMapFromStorage } from './Utils';
import { CONFIG } from './Config';
import { CrashHandler } from './CrashHandler';

// Expose utils to window for EditorScene
(window as any).getSavedMaps = getSavedMaps;
(window as any).deleteMapFromStorage = deleteMapFromStorage;

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

        // Theme Switcher Logic
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                // Toggle Config
                if (CONFIG.VISUAL_STYLE === 'SPRITE') {
                    CONFIG.VISUAL_STYLE = 'INK';
                    document.body.classList.add('ink-mode');
                    themeBtn.innerText = '✒️'; // Pen icon for Ink mode
                    themeBtn.style.background = '#8d6e63';
                } else {
                    CONFIG.VISUAL_STYLE = 'SPRITE';
                    document.body.classList.remove('ink-mode');
                    themeBtn.innerText = '🎨'; // Palette icon for Sprite mode
                    themeBtn.style.background = '#444';
                }
                console.log(`Visual Style Switched to: ${CONFIG.VISUAL_STYLE}`);
            });

            // Set initial state
            if (CONFIG.VISUAL_STYLE === 'INK') {
                document.body.classList.add('ink-mode');
                themeBtn.innerText = '✒️';
                themeBtn.style.background = '#8d6e63';
            }
        }

        console.log('✅ Игра готова. Нажмите ⚔️, чтобы начать волну.');
    } catch (e) {
        console.error('Критическая ошибка:', e);
    }
});
