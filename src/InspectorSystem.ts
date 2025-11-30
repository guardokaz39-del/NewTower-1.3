import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';
import { Tower } from './Tower';

export class InspectorSystem {
    private scene: GameScene;
    private elInspector: HTMLElement;
    private elName: HTMLElement;
    private elStats: HTMLElement;
    private elSellBtn: HTMLButtonElement;
    
    private currentTower: Tower | null = null;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.elInspector = document.createElement('div'); 
        // ... (код создания UI опустим для краткости, он у тебя есть) ...
        
        // Создаем элементы (упрощенно, чтобы не ломать твой код создания UI)
        this.elInspector.id = 'inspector-panel';
        Object.assign(this.elInspector.style, {
             position: 'absolute', bottom: '280px', right: '20px', 
             width: '260px', background: 'rgba(20, 20, 30, 0.95)',
             border: '2px solid #555', borderRadius: '8px', padding: '15px', 
             color: '#fff', display: 'none'
        });
        
        this.elName = document.createElement('h3');
        this.elStats = document.createElement('div');
        this.elSellBtn = document.createElement('button');
        this.elSellBtn.innerText = "SELL";
        
        this.elSellBtn.onclick = () => {
            if (this.currentTower) this.scene.sellTower(this.currentTower);
        };

        this.elInspector.appendChild(this.elName);
        this.elInspector.appendChild(this.elStats);
        this.elInspector.appendChild(this.elSellBtn);
        document.body.appendChild(this.elInspector);
    }

    // --- НОВЫЙ МЕТОД ---
    public selectTower(tower: Tower) {
        this.currentTower = tower;
        this.elInspector.style.display = 'block';
        this.updateInfo();
    }

    // --- НОВЫЙ МЕТОД ---
    public hide() {
        this.currentTower = null;
        this.elInspector.style.display = 'none';
    }

    private updateInfo() {
        if (!this.currentTower) return;
        this.elName.innerText = "Tower";
        // Здесь твоя логика обновления статов
    }
}