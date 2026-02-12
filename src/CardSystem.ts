import { IGameScene } from './scenes/IGameScene';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export interface ICard {
    id: string;
    type: any;
    level: number;
    isDragging: boolean;
    evolutionPath?: string;  // 'inferno', 'napalm', 'frost', etc. undefined = 'classic'
}

export class CardSystem {
    private scene: IGameScene;
    public hand: ICard[] = [];

    // Dragging state
    public dragCard: ICard | null = null;
    private ghostEl: HTMLElement;

    private handContainer: HTMLElement;

    constructor(scene: IGameScene, startingCards: string[] = ['FIRE', 'ICE', 'SNIPER']) {
        this.scene = scene;
        this.handContainer = document.getElementById('hand')!;

        this.ghostEl = document.getElementById('drag-ghost')!;
        this.ghostEl.style.pointerEvents = 'none';

        // Add starting cards
        startingCards.forEach(cardKey => this.addCard(cardKey, 1));
    }

    public startDrag(card: ICard, e: PointerEvent) {
        if (this.scene.forge.isForging) return;
        this.dragCard = card;
        card.isDragging = true;

        this.ghostEl.style.display = 'block';
        this.ghostEl.innerHTML = `<div style="font-size:32px;">${card.type.icon}</div>`;
        this.updateDrag(e.clientX, e.clientY);

        this.render();
    }

    public updateDrag(x: number, y: number) {
        if (!this.dragCard) return;
        this.ghostEl.style.left = `${x}px`;
        this.ghostEl.style.top = `${y}px`;
    }

    public endDrag(e: PointerEvent) {
        if (!this.dragCard) return;

        // Check forge slots FIRST via ForgeSystem
        const droppedInForge = this.scene.forge.tryDropCard(e.clientX, e.clientY, this.dragCard);

        if (!droppedInForge) {
            // Drop on Canvas
            const rect = this.scene.game.canvas.getBoundingClientRect();
            const inCanvas =
                e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

            if (inCanvas) {
                // Use logical game dimensions for coordinate mapping
                // rect.width is display width, game.width is logical width
                const x = (e.clientX - rect.left) * (this.scene.game.width / rect.width);
                const y = (e.clientY - rect.top) * (this.scene.game.height / rect.height);
                this.scene.events.emit('CARD_DROPPED', { card: this.dragCard, x, y });
            }
        }

        this.dragCard.isDragging = false;
        this.dragCard = null;
        this.ghostEl.style.display = 'none';
        this.render();
    }

    public addCard(typeKey: string, level: number = 1) {
        this.addCardWithEvolution(typeKey, level, undefined);
    }

    public addCardWithEvolution(typeKey: string, level: number, evolutionPath?: string) {
        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
            this.scene.showFloatingText('Hand Full!', window.innerWidth / 2, window.innerHeight - 100, 'red');
            return;
        }

        const type = CONFIG.CARD_TYPES[typeKey];
        if (!type) {
            console.warn(`Unknown card type: ${typeKey}`);
            return;
        }

        const card: ICard = {
            id: generateUUID(),
            type: type,
            level: level,
            isDragging: false,
            evolutionPath: evolutionPath,  // May be undefined for Lv1/classic cards
        };
        this.hand.push(card);
        this.render();
        this.scene.ui.update();
    }

    public addRandomCardToHand() {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.addCard(randomKey, 1);
    }

    public removeCardFromHand(card: ICard) {
        const index = this.hand.indexOf(card);
        if (index !== -1) {
            this.hand.splice(index, 1);
            this.render();
            this.scene.ui.update();
        }
    }

    public render() {
        this.handContainer.innerHTML = '';
        this.hand.forEach((card) => {
            const el = CardSystem.createCardElement(card);
            el.onpointerdown = (e: any) => this.startDrag(card, e);
            if (card.isDragging) el.classList.add('dragging-placeholder');
            this.handContainer.appendChild(el);
        });
    }

    public static createCardElement(card: ICard): HTMLElement {
        const el = document.createElement('div');
        el.className = `card type-${card.type.id} level-${card.level}`;

        // Add evolution-specific styling class
        if (card.evolutionPath && card.evolutionPath !== 'classic') {
            el.classList.add(`evo-${card.evolutionPath}`);
        }

        // Star rating
        let stars = '★'.repeat(card.level);

        // Stats HTML - use evolution-specific if available
        let statsHTML = this.getCardStatsHTML(card);

        // Evolution badge (for evolved cards)
        let evoBadge = '';
        let playstyleTag = '';
        if (card.evolutionPath && card.evolutionPath !== 'classic') {
            const evoIcon = this.getEvolutionIcon(card.evolutionPath);
            const playstyle = this.getEvolutionPlaystyle(card.evolutionPath);
            evoBadge = `<div class="evo-badge">${evoIcon}</div>`;
            if (playstyle) {
                playstyleTag = `<div class="evo-playstyle">${playstyle}</div>`;
            }
        }

        el.innerHTML = `
            ${evoBadge}
            <div class="card-level">${stars}</div>
            <div class="card-icon">${card.type.icon}</div>
            <div class="card-stats">${statsHTML}</div>
            ${playstyleTag}
        `;
        return el;
    }

    /**
     * Get evolution icon by path ID
     */
    private static getEvolutionIcon(evolutionPath: string): string {
        const icons: Record<string, string> = {
            'inferno': '🌋', 'napalm': '🔥', 'meteor': '☄️', 'hellfire': '👹', 'magma': '🌊', 'scorch': '🔥',
            'frost': '❄️', 'shatter': '💎', 'absolutezero': '🧊', 'blizzard': '🌨️', 'permafrost': '💠', 'glacier': '🏔️',
            'precision': '🎯', 'penetrator': '🔫', 'executor': '⚔️', 'headhunter': '🎭', 'railgun': '⚡', 'marksman': '🏹',
            'barrage': '💥', 'spread': '🎯', 'storm': '🌪️', 'volley': '🎆', 'homing': '🎯', 'twin': '👯',
            'chaingun': '⚡', 'gatling': '💪', 'autocannon': '🔧', 'rotary': '🌀', 'devastator': '💀', 'suppressor': '🛡️',
        };
        return icons[evolutionPath] || '✨';
    }

    /**
     * Get evolution playstyle label
     */
    private static getEvolutionPlaystyle(evolutionPath: string): string {
        const playstyles: Record<string, string> = {
            // Fire
            'inferno': 'НЮКА', 'napalm': 'DOT', 'meteor': 'MEGA', 'hellfire': 'CHAIN', 'magma': 'BURN', 'scorch': 'STACK',
            // Ice
            'frost': 'СТОП', 'shatter': 'УРОН', 'absolutezero': 'FREEZE', 'blizzard': 'AOE', 'permafrost': 'КАЗНЬ', 'glacier': 'RANGE',
            // Sniper
            'precision': 'БОСС', 'penetrator': 'ЛИНИЯ', 'executor': 'DELETE', 'headhunter': 'HUNTER', 'railgun': 'LASER', 'marksman': 'HYBRID',
            // Multi
            'barrage': 'ВЕЕР', 'spread': 'ТОЧНЫЙ', 'storm': 'ХАОС', 'volley': 'SPAM', 'homing': 'TRACK', 'twin': 'x2 HIT',
            // Minigun
            'chaingun': 'BURST', 'gatling': 'SUSTAIN', 'autocannon': '∞', 'rotary': 'SPEED', 'devastator': 'RAMP', 'suppressor': 'CC',
        };
        return playstyles[evolutionPath] || '';
    }

    public static getCardStatsHTML(card: ICard): string {
        // Check for evolution-specific display
        if (card.evolutionPath && card.evolutionPath !== 'classic') {
            return this.getEvolutionStatsHTML(card.evolutionPath);
        }

        const type = card.type.id;
        const level = card.level;

        switch (type) {
            case 'fire':
                if (level === 1) {
                    return `<div class="card-stat-primary">Урон +12</div><div class="card-stat-line">Взрыв 45</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">Урон +22</div><div class="card-stat-line">Взрыв 70</div>`;
                } else {
                    return `<div class="card-stat-primary">Урон +25</div><div class="card-stat-line">Взрыв + 💀</div>`;
                }

            case 'ice':
                if (level === 1) {
                    return `<div class="card-stat-primary">Урон +1</div><div class="card-stat-line">❄️ 30%</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">Урон +3</div><div class="card-stat-line">❄️ 45%</div>`;
                } else {
                    return `<div class="card-stat-primary">Урон +6</div><div class="card-stat-line">❄️ 75% ⛓️</div>`;
                }

            case 'sniper':
                if (level === 1) {
                    return `<div class="card-stat-primary">Урон +14</div><div class="card-stat-line">🎯 +80</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">Урон +24</div><div class="card-stat-line">🎯 +160</div>`;
                } else {
                    return `<div class="card-stat-primary">Урон +46</div><div class="card-stat-line">🎯 +240 💫</div>`;
                }

            case 'multi':
                if (level === 1) {
                    return `<div class="card-stat-primary">2 снаряда</div><div class="card-stat-line">0.8x урон</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">3 снаряда</div><div class="card-stat-line">0.6x урон</div>`;
                } else {
                    return `<div class="card-stat-primary">4 снаряда</div><div class="card-stat-line">0.45x урон</div>`;
                }

            case 'minigun':
                if (level === 1) {
                    return `<div class="card-stat-primary">⚡ Раскрутка</div><div class="card-stat-line">+4 урон/с</div>`;
                } else if (level === 2) {
                    return `<div class="card-stat-primary">⚡ Раскрутка</div><div class="card-stat-line">+5 урон +крит</div>`;
                } else {
                    return `<div class="card-stat-primary">⚡ Раскрутка</div><div class="card-stat-line">до +45 урон</div>`;
                }

            default:
                return `<div class="card-stat-line">${card.type.desc}</div>`;
        }
    }

    /**
     * Get evolution-specific stats display
     */
    private static getEvolutionStatsHTML(evolutionPath: string): string {
        const stats: Record<string, { primary: string; secondary: string }> = {
            // Fire
            'inferno': { primary: '💥 AoE 120', secondary: '-35% скорость' },
            'napalm': { primary: '🔥 32 DoT', secondary: '+10% скорость' },
            'meteor': { primary: '☄️ AoE 160', secondary: 'MEGA урон' },
            'hellfire': { primary: '👹 Взрыв', secondary: '75% урона' },
            'magma': { primary: '🌊 60 DoT', secondary: '12 dps × 5s' },
            'scorch': { primary: '🔥 Стаки', secondary: '+25% скорость' },
            // Ice
            'frost': { primary: '❄️ 70% СТОП', secondary: '0 урона' },
            'shatter': { primary: '💎 +60%', secondary: 'vs замедл.' },
            'absolutezero': { primary: '🧊 85% FREEZE', secondary: '0 урона' },
            'blizzard': { primary: '🌨️ Цепь', secondary: '100px' },
            'permafrost': { primary: '💠 +80%!', secondary: 'Казнь' },
            'glacier': { primary: '🏔️ Дальность', secondary: '+10% range' },
            // Sniper
            'precision': { primary: '🎯 30% крит', secondary: 'x2.5' },
            'penetrator': { primary: '🔫 Pierce 3', secondary: '-10%/цель' },
            'executor': { primary: '⚔️ 40% крит', secondary: 'x3.0' },
            'headhunter': { primary: '🎭 +100%', secondary: 'vs >70% HP' },
            'railgun': { primary: '⚡ Pierce 6', secondary: '300 range' },
            'marksman': { primary: '🏹 Pierce 4', secondary: '20% крит' },
            // Multi
            'barrage': { primary: '💥 4 снаряда', secondary: '60° веер' },
            'spread': { primary: '🎯 2 мощных', secondary: '85% урон' },
            'storm': { primary: '🌪️ 6 снарядов', secondary: 'хаос' },
            'volley': { primary: '🎆 +30% APS', secondary: 'spam' },
            'homing': { primary: '🎯 Наведение', secondary: '3 снаряда' },
            'twin': { primary: '👯 x2 удар', secondary: '100% урон' },
            // Minigun
            'chaingun': { primary: '⚡ 3с огонь', secondary: '+8 dps/с' },
            'gatling': { primary: '💪 10с огонь', secondary: '+4 dps/с' },
            'autocannon': { primary: '🔧 ∞ ОГОНЬ', secondary: 'Без перегрева' },
            'rotary': { primary: '🌀 x3.5 speed', secondary: '+5% крит/с' },
            'devastator': { primary: '💀 +100 урон', secondary: 'на макс' },
            'suppressor': { primary: '🛡️ 20% slow', secondary: 'на макс' },
        };

        const s = stats[evolutionPath];
        if (!s) return '';
        return `<div class="card-stat-primary">${s.primary}</div><div class="card-stat-line">${s.secondary}</div>`;
    }
}
