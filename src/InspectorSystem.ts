import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';
import { Tower } from './Tower';

export class InspectorSystem {
    private scene: GameScene;
    private elInspector: HTMLElement;
    private elName: HTMLElement;
    private elStats: HTMLElement;
    private elSellBtn: HTMLButtonElement;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.createUI();
    }

    private createUI() {
        this.elInspector = document.createElement('div');
        this.elInspector.id = 'inspector-panel';
        
        // --- ВИЗУАЛЬНЫЕ ПРАВКИ ---
        Object.assign(this.elInspector.style, {
            position: 'absolute', 
            bottom: '280px', // Подняли выше магазина (магазин ~220px высотой + отступ)
            right: '20px',   // Выровняли по правому краю, как магазин
            width: '260px',  // Фиксированная ширина для аккуратности
            
            background: 'rgba(20, 20, 30, 0.95)', // Единый стиль с другими панелями
            border: '2px solid #555', 
            borderRadius: '8px',
            padding: '15px', 
            color: '#fff', 
            display: 'none',
            fontFamily: 'Segoe UI, sans-serif', 
            zIndex: '100',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        });
        // -------------------------

        this.elName = document.createElement('div');
        this.elName.style.fontWeight = 'bold';
        this.elName.style.fontSize = '18px';
        this.elName.style.marginBottom = '10px';
        this.elName.style.borderBottom = '1px solid #777';
        this.elName.style.paddingBottom = '5px';
        this.elInspector.appendChild(this.elName);

        this.elStats = document.createElement('div');
        this.elStats.style.fontSize = '14px';
        this.elStats.style.lineHeight = '1.6';
        this.elInspector.appendChild(this.elStats);

        this.elSellBtn = document.createElement('button');
        this.elSellBtn.innerText = 'SELL';
        Object.assign(this.elSellBtn.style, {
            marginTop: '15px', width: '100%', padding: '8px',
            background: '#d32f2f', color: '#fff', border: 'none',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
        });
        this.elSellBtn.onclick = () => {
            if (this.scene.selectedTower) {
                this.scene.sellTower(this.scene.selectedTower);
                this.scene.selectedTower = null;
            }
        };
        this.elInspector.appendChild(this.elSellBtn);

        document.body.appendChild(this.elInspector);
    }

    public update() {
        const tower = this.scene.selectedTower;
        
        if (!tower) {
            this.elInspector.style.display = 'none';
            return;
        }

        this.elInspector.style.display = 'block';
        
        // Определяем имя башни по картам (примерно)
        let name = "Empty Tower";
        if (tower.cards.length > 0) {
            // Берем имя первой карты или комбинированное
            name = tower.cards[0].type.name;
            if (tower.cards.length > 1) name += " +";
        } else if (tower.isBuilding) {
             name = "Building...";
        }
        
        this.elName.innerText = name;

        const stats = tower.getStats();
        // refund cost
        const refund = Math.floor(tower.costSpent * CONFIG.ECONOMY.SELL_REFUND);

        // Форматируем вывод
        this.elStats.innerHTML = `
            <div style="display:flex; justify-content:space-between;"><span>Damage:</span> <span style="color:#ff5252; font-weight:bold;">${stats.dmg}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Range:</span> <span style="color:#448aff; font-weight:bold;">${stats.range}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Speed:</span> <span style="color:#69f0ae; font-weight:bold;">${(60/stats.cd).toFixed(1)}/s</span></div>
            <div style="margin-top:8px; border-top:1px solid #444; padding-top:5px; color:#aaa; font-size:12px;">
                Cards: ${tower.cards.length} / 3
            </div>
        `;
        
        this.elSellBtn.innerHTML = `SELL (+${refund}💰)`;
    }
}