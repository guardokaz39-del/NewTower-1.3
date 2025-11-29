import { Game } from './Game';
import { CONFIG } from './Config';

export class BestiarySystem {
    private game: Game;
    private unlockedEnemies: Set<string> = new Set();
    private panel: HTMLElement;
    private btn: HTMLElement;

    constructor(game: Game) {
        this.game = game;
        this.btn = this.createBtn(); // Сначала создаем кнопку
        this.panel = this.createPanel(); // Потом панель
        this.unlock('GRUNT');
    }

    public unlock(typeId: string) {
        if (!this.unlockedEnemies.has(typeId)) {
            this.unlockedEnemies.add(typeId);
            this.game.showFloatingText("NEW ENEMY ENTRY!", window.innerWidth/2, 100, '#00ffff');
        }
    }

    private createBtn(): HTMLElement {
        const btn = document.createElement('div');
        btn.innerText = '📖';
        Object.assign(btn.style, {
            fontSize: '30px', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '5px',
            width: '50px', height: '50px', display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            border: '2px solid #555'
        });
        btn.onclick = () => this.toggle();
        
        // Вставляем в левую колонку ПЕРЕД кузницей
        const leftCol = document.getElementById('ui-left');
        const forge = document.getElementById('forge-container');
        if (leftCol) {
            if (forge) leftCol.insertBefore(btn, forge);
            else leftCol.appendChild(btn);
        } else {
            document.body.appendChild(btn); // Фоллбэк
        }
        
        return btn;
    }

    private createPanel(): HTMLElement {
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '600px', height: '500px', background: '#2c3e50', border: '4px solid #34495e',
            borderRadius: '10px', display: 'none', flexDirection: 'column', zIndex: '2000',
            color: 'white', padding: '20px', boxShadow: '0 0 50px rgba(0,0,0,0.8)'
        });
        
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h2 style="margin:0;">BESTIARY</h2>
                <button id="close-bestiary" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">❌</button>
            </div>
            <div id="bestiary-list" style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; overflow-y: auto;"></div>
        `;
        
        document.body.appendChild(panel);
        document.getElementById('close-bestiary')!.onclick = () => this.toggle();

        return panel;
    }

    public toggle() {
        const isHidden = this.panel.style.display === 'none';
        if (isHidden) {
            this.renderContent();
            this.panel.style.display = 'flex';
        } else {
            this.panel.style.display = 'none';
        }
    }

    private renderContent() {
        const list = document.getElementById('bestiary-list')!;
        list.innerHTML = '';

        for (const key in CONFIG.ENEMY_TYPES) {
            const conf = (CONFIG.ENEMY_TYPES as any)[key];
            const isUnlocked = this.unlockedEnemies.has(key);
            
            const item = document.createElement('div');
            item.style.background = 'rgba(0,0,0,0.3)';
            item.style.padding = '10px';
            item.style.borderRadius = '5px';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '15px';

            if (isUnlocked) {
                item.innerHTML = `
                    <div style="font-size: 40px;">${conf.symbol}</div>
                    <div>
                        <div style="font-weight:bold; color:${conf.color}">${conf.name}</div>
                        <div style="font-size:12px; color:#aaa;">${conf.desc}</div>
                        <div style="font-size:12px; margin-top:5px;">HP: ${CONFIG.ENEMY.BASE_HP * conf.hpMod} | Spd: ${conf.speed}</div>
                    </div>
                `;
            } else {
                item.innerHTML = `
                    <div style="font-size: 40px; filter: grayscale(1);">❓</div>
                    <div>
                        <div style="font-weight:bold; color:#555">Locked</div>
                        <div style="font-size:12px; color:#555;">Encounter this enemy to unlock</div>
                    </div>
                `;
            }
            list.appendChild(item);
        }
    }
}