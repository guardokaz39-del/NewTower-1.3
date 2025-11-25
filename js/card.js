import { CONFIG } from './config.js';
import { generateUUID } from './utils.js';

export class CardSystem {
    constructor(game) {
        this.game = game;
        this.hand = [];
        this.forgeSlots = [null, null];
        this.isForging = false; 

        this.handContainer = document.getElementById('hand');
        this.forgeContainers = [document.getElementById('forge-slot-0'), document.getElementById('forge-slot-1')];
        
        // Стартовые карты
        this.addCard('FIRE', 1); this.addCard('ICE', 1); this.addCard('SNIPER', 1);
    }
    
    // Возвращает true, если карта добавлена, false - если нет места или ошибка
    addCard(typeKey, level, anim=false) {
        // 1. Проверка места
        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) return false;

        // 2. Безопасное получение типа
        const type = CONFIG.CARD_TYPES[typeKey];
        if (!type) {
            console.warn(`CardSystem: Попытка добавить неизвестный тип карты '${typeKey}'`);
            return false;
        }

        // 3. Создание карты с надежным ID
        const card = { 
            id: generateUUID(), 
            type: type, 
            level: level, 
            isDragging: false 
        };
        
        this.hand.push(card);
        this.render();
        
        if(anim) {
            const lastEl = this.handContainer.lastElementChild;
            if(lastEl) lastEl.classList.add('spawn-pop');
        }
        
        return true;
    }
    
    putInForge(idx, card) {
        if (this.isForging) return; 

        if(this.forgeSlots[idx]) {
            const returned = this.forgeSlots[idx];
            returned.isDragging = false;
            this.hand.push(returned);
        }
        this.forgeSlots[idx] = card;
        this.hand = this.hand.filter(c=>c.id!==card.id);
        
        this.render();
        this.game.updateUI(); 
    }

    canForge() {
        if (this.isForging) return false;
        const [c1, c2] = this.forgeSlots;
        return c1 && c2 && c1.type.id === c2.type.id && c1.level === c2.level && c1.level < 3;
    }

    tryForge() {
        if (!this.canForge()) return;
        if (this.game.money < CONFIG.FORGE.COST) return;

        this.game.money -= CONFIG.FORGE.COST;
        this.game.updateUI();
        this.isForging = true;

        const el1 = this.forgeContainers[0].firstElementChild;
        const el2 = this.forgeContainers[1].firstElementChild;

        if (el1) el1.classList.add('shaking');
        if (el2) el2.classList.add('shaking');

        setTimeout(() => {
            if (el1) { el1.classList.remove('shaking'); el1.classList.add('merging'); el1.style.transform = 'translateX(42px) scale(0.8)'; }
            if (el2) { el2.classList.remove('shaking'); el2.classList.add('merging'); el2.style.transform = 'translateX(-42px) scale(0.8)'; }

            setTimeout(() => {
                const c1 = this.forgeSlots[0];
                // Безопасное получение ключа для новой карты (через поиск в конфиге или просто Uppercase id)
                const newTypeKey = c1.type.id.toUpperCase(); 
                const newLevel = c1.level + 1;

                const fRect = document.getElementById('forge-panel').getBoundingClientRect();
                this.game.addEffect({
                    type: 'explosion', 
                    x: fRect.left + fRect.width/2, 
                    y: window.innerHeight - 80, 
                    radius: 60, life: 15, color: '#fff'
                });

                this.forgeSlots = [null, null];
                this.isForging = false;
                this.render();
                
                // Добавляем карту. Если вдруг места нет (маловероятно при ковке, но все же) - деньги не возвращаем, считаем что сгорела :)
                // Хотя по логике ковки место освобождается (2 ушли, 1 пришла).
                this.addCard(newTypeKey, newLevel, true); 
                this.game.updateUI();

            }, 300); 
        }, 500); 
    }

    render() {
        // Безопасная очистка
        if(!this.handContainer) return;
        this.handContainer.innerHTML='';
        
        this.hand.forEach(c => {
            const el = this.createEl(c);
            if(c.isDragging) el.classList.add('dragging-placeholder');
            this.handContainer.appendChild(el);
        });
        
        this.forgeContainers.forEach((el,i)=>{
            el.innerHTML=''; 
            if(this.forgeSlots[i]) el.appendChild(this.createEl(this.forgeSlots[i], true, i));
        });
    }
    
    createEl(card, isForge=false, idx=-1) {
        const el=document.createElement('div');
        // Защита от отсутствия card.type
        if (!card.type) return el;

        el.className=`card type-${card.type.id} lvl-${card.level}`;
        el.innerHTML=`<div class="card-level">${card.level}</div><div class="card-icon">${card.type.icon}</div>`;
        el.onmousedown=(e)=>{
            if (this.isForging) return; 

            if(isForge) { 
                this.forgeSlots[idx]=null; 
                this.render(); 
                this.game.updateUI(); 
                this.game.startDragging(card,e);
            }
            else {
                card.isDragging = true;
                this.render();
                this.game.startDragging(card,e);
            }
        };
        return el;
    }
}