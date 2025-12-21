import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';

export class BestiarySystem {
    private scene: GameScene;
    private unlockedEnemies: Set<string> = new Set();

    private btn!: HTMLElement;
    private panel!: HTMLElement;
    private listContainer!: HTMLElement;
    private isVisible: boolean = false;

    constructor(scene: GameScene) {
        this.scene = scene;

        // Создаем UI элементы
        this.createUI();

        // По умолчанию открываем первого врага
        this.unlock('grunt');
    }

    public unlock(typeId: string) {
        const id = typeId.toLowerCase();
        if (!this.unlockedEnemies.has(id)) {
            this.unlockedEnemies.add(id);
            // Можно добавить всплывающее уведомление через scene.showFloatingText
            // Но пока просто обновим список, если панель открыта
            if (this.isVisible) this.renderList();
        }
    }

    private createUI() {
        // 1. Кнопка (Книга)
        this.btn = document.createElement('div');
        this.btn.innerText = '📖';
        this.btn.title = 'Bestiary';
        Object.assign(this.btn.style, {
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '40px',
            height: '40px',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: '2px solid #aaa',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: '100',
            userSelect: 'none',
            transition: 'transform 0.1s',
        });

        this.btn.onmousedown = () => (this.btn.style.transform = 'scale(0.9)');
        this.btn.onmouseup = () => (this.btn.style.transform = 'scale(1)');
        this.btn.onclick = () => this.toggle();

        document.body.appendChild(this.btn);

        // 2. Панель (Список)
        this.panel = document.createElement('div');
        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '70px',
            left: '20px',
            width: '300px',
            maxHeight: '400px',
            background: 'rgba(20, 20, 30, 0.95)',
            border: '2px solid #888',
            borderRadius: '8px',
            padding: '10px',
            display: 'none',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto',
            zIndex: '100',
            color: '#fff',
            fontFamily: 'Segoe UI, sans-serif',
        });

        // Заголовок панели
        const title = document.createElement('div');
        title.innerText = 'BESTIARY';
        title.style.textAlign = 'center';
        title.style.fontWeight = 'bold';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '5px';
        this.panel.appendChild(title);

        // Контейнер для элементов
        this.listContainer = document.createElement('div');
        this.listContainer.style.display = 'flex';
        this.listContainer.style.flexDirection = 'column';
        this.listContainer.style.gap = '8px';
        this.panel.appendChild(this.listContainer);

        document.body.appendChild(this.panel);
    }

    private toggle() {
        this.isVisible = !this.isVisible;
        this.panel.style.display = this.isVisible ? 'flex' : 'none';
        if (this.isVisible) {
            this.renderList();
        }
    }

    private renderList() {
        this.listContainer.innerHTML = '';

        // Проходим по всем типам врагов из конфига
        const types = CONFIG.ENEMY_TYPES;
        for (const key in types) {
            const conf = types[key as keyof typeof types];
            const isUnlocked = this.unlockedEnemies.has(conf.id.toLowerCase());

            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
            });

            if (isUnlocked) {
                row.innerHTML = `
                    <div style="font-size: 24px; width: 30px; text-align: center;">${conf.symbol}</div>
                    <div>
                        <div style="font-weight: bold; color: ${conf.color || '#fff'}">${key}</div>
                        <div style="font-size: 11px; color: #aaa;">HP: ${Math.round(CONFIG.ENEMY.BASE_HP * conf.hpMod)} | Spd: ${conf.speed}</div>
                        <div style="font-size: 11px; color: gold;">Reward: ${conf.reward}💰</div>
                    </div>
                `;
            } else {
                row.innerHTML = `
                    <div style="font-size: 24px; width: 30px; text-align: center; filter: grayscale(1); opacity: 0.5;">❓</div>
                    <div>
                        <div style="font-weight: bold; color: #555">???</div>
                        <div style="font-size: 11px; color: #555;">Locked</div>
                    </div>
                `;
            }
            this.listContainer.appendChild(row);
        }
    }
}
