import { CONFIG } from './config.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // Кэшируем элементы, чтобы не искать их каждый кадр
        this.elMoney = document.getElementById('money');
        this.elWave = document.getElementById('wave');
        this.elLives = document.getElementById('lives');
        this.elForgeBtn = document.getElementById('forge-btn');
        this.elStartBtn = document.getElementById('start-wave-btn');
        this.elGameOver = document.getElementById('game-over');
        this.elFinalWave = document.getElementById('final-wave');

        // Подписываемся на события игры
        const evt = game.events;

        evt.on('ui-update', () => this.renderStats());
        evt.on('wave-start', () => this.toggleStartBtn(false));
        evt.on('wave-end', () => this.toggleStartBtn(true));
        evt.on('game-over', (wave) => this.showGameOver(wave));
    }

    renderStats() {
        // Обновляем текст
        this.elMoney.innerText = this.game.money;
        this.elWave.innerText = this.game.wave + "/" + CONFIG.WAVES.length;
        this.elLives.innerText = this.game.lives;

        // Логика кнопки Кузницы
        const cardSys = this.game.cardSys;
        const canForge = cardSys && cardSys.canForge();
        const hasMoney = this.game.money >= CONFIG.FORGE.COST;

        if (canForge && hasMoney) {
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span>КОВАТЬ`;
        } else {
            this.elForgeBtn.disabled = true;
            this.elForgeBtn.innerHTML = `<span>⚒️</span>${CONFIG.FORGE.COST}💰`;
        }
    }

    toggleStartBtn(active) {
        this.elStartBtn.disabled = !active;
    }

    showGameOver(wave) {
        this.elGameOver.style.display = 'flex';
        this.elFinalWave.innerText = wave;
    }
}