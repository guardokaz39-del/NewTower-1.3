import { Game } from './Game';
import { Enemy } from './Enemy';

// Ждем полной загрузки страницы
window.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена. Запускаем игру...');

    try {
        // 1. Создаем игру (теперь элемент точно существует)
        const game = new Game('game-canvas');

        // 2. Создаем тестового врага для проверки
        const orc = new Enemy({ 
            id: 'orc_1', 
            health: 100, 
            speed: 2,
            x: 0,
            y: 300 
        });

        game.addEnemy(orc);

        // 3. Запускаем
        game.start();
        
    } catch (e) {
        console.error("Критическая ошибка запуска:", e);
        alert("Ошибка запуска игры! Проверьте консоль (F12).");
    }
});