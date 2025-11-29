import { Game } from './Game';
import { Tower } from './Tower';
import { CONFIG } from './Config';

export class InspectorSystem {
    private game: Game;
    private panel: HTMLElement;
    private content: HTMLElement;

    constructor(game: Game) {
        this.game = game;
        this.panel = document.createElement('div');
        this.content = document.createElement('div');
        this.initUI();
    }

    private initUI() {
        // Стили панели (теперь без position: absolute)
        Object.assign(this.panel.style, {
            width: '250px', // Ширина как у магазина
            background: 'rgba(20, 20, 30, 0.95)',
            border: '2px solid #444', borderRadius: '15px',
            padding: '15px', color: '#eee', fontFamily: 'Segoe UI, sans-serif',
            fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
            pointerEvents: 'auto'
        });

        this.panel.appendChild(this.content);

        // Вставляем в правую колонку в самое НАЧАЛО (prepend), чтобы быть НАД магазином
        const rightCol = document.getElementById('ui-right');
        if (rightCol) {
            rightCol.prepend(this.panel);
        } else {
            // Фоллбэк (старый стиль)
            this.panel.style.position = 'absolute';
            this.panel.style.top = '100px';
            this.panel.style.right = '20px';
            document.body.appendChild(this.panel);
        }
    }

    public update() {
        // 1. Предсказание (drag)
        const dragCard = this.game.cardSys.dragCard;
        const hoverTower = this.getHoverTower();

        if (dragCard && hoverTower && !hoverTower.isBuilding && hoverTower.cards.length < 3) {
            this.renderPrediction(hoverTower, dragCard);
            return;
        }

        // 2. Выбрана башня
        const selected = this.game.selectedTower;
        if (selected) {
            this.renderTowerStats(selected);
            return;
        }

        // 3. Дефолт
        this.renderGeneralInfo();
    }

    private getHoverTower(): Tower | undefined {
        const col = this.game.input.hoverCol;
        const row = this.game.input.hoverRow;
        return this.game.towers.find(t => t.col === col && t.row === row);
    }

    private renderPrediction(tower: Tower, card: any) {
        const current = tower.getStats();
        const futureCards = [...tower.cards, card];
        const future = Tower.getPreviewStats(futureCards);

        this.content.innerHTML = `
            <div style="text-align:center; font-weight:bold; color:cyan; margin-bottom:5px;">PREDICTION</div>
            <div>Dmg: ${current.dmg.toFixed(1)} ${this.getDiffStr(current.dmg, future.dmg)}</div>
            <div>Rng: ${current.range.toFixed(0)} ${this.getDiffStr(current.range, future.range)}</div>
            <div>Spd: ${(60/current.cd).toFixed(1)} ${this.getDiffStr(60/current.cd, 60/future.cd)}/s</div>
            <div style="font-size:12px; color:#aaa; margin-top:5px;">Release to Apply</div>
        `;
    }

    private getDiffStr(v1: number, v2: number): string {
        const diff = v2 - v1;
        if (Math.abs(diff) < 0.01) return '';
        const sign = diff > 0 ? '+' : '';
        const color = diff > 0 ? '#0f0' : '#f00';
        return `<span style="color:${color}">(${sign}${diff.toFixed(1)})</span>`;
    }

    private renderTowerStats(tower: Tower) {
        const s = tower.getStats();
        const refund = Math.floor(tower.costSpent * CONFIG.ECONOMY.SELL_REFUND);

        const cardsHtml = tower.cards.map(c => 
            `<span style="font-size:16px;" title="${c.type.name} Lvl ${c.level}">${c.type.icon}</span>`
        ).join(' ');

        this.content.innerHTML = `
            <div style="text-align:center; border-bottom:1px solid #555; padding-bottom:5px; margin-bottom:5px;">
                <strong>TOWER LVL ${tower.cards.length}</strong>
            </div>
            <div>Runes: ${cardsHtml || '<span style="color:#666">Empty</span>'}</div>
            <div style="margin-top:5px;">💥 Dmg: <span style="color:#ff9">${s.dmg.toFixed(1)}</span></div>
            <div>🎯 Rng: <span style="color:#9f9">${s.range.toFixed(0)}</span></div>
            <div>⚡ Spd: <span style="color:#9ff">${(60/s.cd).toFixed(1)}</span> /s</div>
            
            <button id="sell-btn" style="width:100%; margin-top:10px; background:#d32f2f; color:white; border:none; padding:5px; cursor:pointer;">
                SELL (+${refund}💰)
            </button>
        `;

        const btn = document.getElementById('sell-btn');
        if (btn) btn.onclick = () => {
            this.game.sellTower(tower);
            this.game.selectedTower = null; 
        };
    }

    private renderGeneralInfo() {
        this.content.innerHTML = `
            <div style="text-align:center; color:#aaa;">INFO</div>
            <div style="font-size:12px; margin-top:10px; text-align: center;">
                Select a tower to see stats
            </div>
        `;
    }
}