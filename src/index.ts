import { Game } from './Game';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("❌ ОШИБКА: Canvas не найден!");
        return;
    }

    try {
        const game = new Game('game-canvas');
        game.start();

        console.log("✅ Игра готова. Нажмите ⚔️, чтобы начать волну.");
        
    } catch (e) {
        console.error("Критическая ошибка:", e);
    }
});