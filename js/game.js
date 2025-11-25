import { CONFIG } from './config.js';
import { MapManager } from './map.js';
import { CardSystem } from './card.js';
import { Tower } from './tower.js';
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js'; 
import { ObjectPool } from './utils.js';
import { EventEmitter } from './events.js'; // +
import { UIManager } from './ui.js';       // +

class Game {
    constructor() {
        this.canvas=document.getElementById('gameCanvas'); this.ctx=this.canvas.getContext('2d');
        this.effectsLayer = document.getElementById('effects-layer');
        this.resize();
        
        // 1. Инициализация Событий и UI
        this.events = new EventEmitter();
        
        this.money= CONFIG.PLAYER.START_MONEY; 
        this.lives= CONFIG.PLAYER.START_LIVES; 
        this.wave=0; 
        
        this.enemies=[]; this.towers=[]; this.effects=[]; this.projectiles=[];
        this.projectilePool = new ObjectPool(() => new Projectile());

        this.map = new MapManager(Math.floor(this.canvas.width/64), Math.floor((this.canvas.height-160)/64));
        this.cardSys = new CardSystem(this);
        
        // 2. Подключаем UI Менеджер ПОСЛЕ создания систем (чтобы он мог читать cardSys)
        this.ui = new UIManager(this);

        this.clouds = [];
        for(let i=0; i<12; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height,
                speed: 0.1 + Math.random() * 0.15, size: 60 + Math.random() * 120
            });
        }
        
        this.holdStart = 0; this.isHolding = false;
        this.holdCol = -1; this.holdRow = -1; this.holdDuration = 800; 
        this.isWavePerfect = true; 

        this.canvas.addEventListener('mousedown',e=>this.onMouseDown(e));
        this.canvas.addEventListener('mousemove',e=>this.move(e));
        window.addEventListener('mouseup',e=>this.onMouseUp(e));
        
        // UI сам слушает кнопку, нам тут листенер не нужен, но пока оставим старт через метод
        document.getElementById('start-wave-btn').addEventListener('click',()=>this.startWave());
        
        this.forgeBtn = document.getElementById('forge-btn'); // Оставляем ссылку для CardSystem пока что
        this.forgeBtn.addEventListener('click', () => { this.cardSys.tryForge(); });
        
        this.ghost=document.getElementById('drag-ghost');
        this.infoEl = document.getElementById('tower-info');
        
        // Первичное обновление
        this.updateUI(); 
        
        this.lastTime = 0;
        requestAnimationFrame((t) => this.loop(t));
    }
    
    resize(){ this.canvas.width=window.innerWidth; this.canvas.height=window.innerHeight; }
    
    // Центральный метод обновления интерфейса
    updateUI() {
        // Вместо прямого изменения DOM, мы просто кричим "Обновись!"
        this.events.emit('ui-update');
    }

    startWave() { 
        if(this.active) return;
        if (this.wave >= CONFIG.WAVES.length) { alert("Все волны пройдены!"); return; }

        this.wave++;
        this.active = true;
        this.isWavePerfect = true;
        
        // Событие старта волны
        this.events.emit('wave-start'); 
        this.updateUI();

        this.currentWaveData = CONFIG.WAVES[this.wave - 1]; 
        this.groupIndex = 0;      
        this.groupSpawned = 0;    
        this.spawnTimer = 60;     
    }

    spawnEnemy(typeKey, startOpts = null) {
        this.enemies.push(new Enemy(this.map.path, this.wave, typeKey, startOpts));
    }
    
    spawnLoot(x, y) {
        const typeKeys = Object.keys(CONFIG.CARD_TYPES);
        const randKey = typeKeys[Math.floor(Math.random()*typeKeys.length)];
        const cardType = CONFIG.CARD_TYPES[randKey];
        
        const panelRect = document.getElementById('hand-panel').getBoundingClientRect();
        this.addEffect({
            type: 'loot', startX: x, startY: y,
            endX: panelRect.left + 200, endY: panelRect.top + panelRect.height/2,
            controlX: (x + panelRect.left + 200)/2, controlY: y - 200, 
            progress: 0, 
            cardType: cardType, 
            cardKey: randKey,
            el: null
        });
    }
    
    hitBase() { 
        this.lives--; 
        this.isWavePerfect = false; 
        this.updateUI(); 
        if(this.lives<=0) this.gameOver(); 
        
        this.canvas.style.transform = 'translate(5px, 5px)';
        setTimeout(() => this.canvas.style.transform = 'none', 50);
    }
    
    gameOver() {
        this.active = false;
        // Событие конца игры
        this.events.emit('game-over', this.wave);
    }

    addEffect(eff) { this.effects.push(eff); }
    
    move(e) {
        const r=this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - r.left; this.mouseY = e.clientY - r.top;
        const c = Math.floor(this.mouseX/64); const r_row = Math.floor(this.mouseY/64);
        this.hoverCol = c; this.hoverRow = r_row;
        if(this.dragCard) {
             this.ghost.style.left=(e.pageX - 35)+'px'; this.ghost.style.top=(e.pageY - 50)+'px';
        }
        if (this.isHolding && (c !== this.holdCol || r_row !== this.holdRow)) this.isHolding = false;
        const t = this.towers.find(t=>t.col===c && t.row===r_row);
        if (t && !this.dragCard) this.showInfo(t); else this.hideInfo();
    }

    onMouseDown(e) {
        if (this.dragCard) return;
        const c = this.hoverCol; const rw = this.hoverRow;
        if (this.map.isBuildable(c, rw) && !this.towers.find(t=>t.col===c && t.row===rw)) {
            this.isHolding = true; this.holdStart = performance.now(); this.holdCol = c; this.holdRow = rw;
        }
    }

    onMouseUp(e) {
        if (this.dragCard) { this.dragEnd(e); return; }
        this.isHolding = false;
    }

    tryBuild() {
        if (this.money >= CONFIG.TOWER.COST) {
            this.money -= CONFIG.TOWER.COST;
            const newTower = new Tower(this.holdCol, this.holdRow);
            this.towers.push(newTower);
            this.updateUI();
            this.addEffect({type: 'explosion', x: newTower.x, y: newTower.y, radius: 30, life: 20, color: '#fff'});
            this.isHolding = false; 
        }
    }

    startDragging(c,e) { 
        this.dragCard=c; 
        this.ghost.style.display='flex'; 
        this.ghost.className=`card type-${c.type.id} lvl-${c.level}`; 
        this.ghost.innerHTML=`<div class="card-icon">${c.type.icon}</div><div class="card-level">${c.level}</div>`; 
        this.ghost.style.left=(e.pageX - 35)+'px'; this.ghost.style.top=(e.pageY - 50)+'px';
        this.hideInfo();
    }
    
    dragEnd(e) {
        if(!this.dragCard) return;
        this.ghost.style.display='none';
        let dropped = false;
        const fRect=document.getElementById('forge-panel').getBoundingClientRect();
        if(e.clientX>=fRect.left && e.clientX<=fRect.right && e.clientY>=fRect.top && e.clientY<=fRect.bottom) {
            const idx = e.clientX<fRect.left+fRect.width/2?0:1;
            this.cardSys.putInForge(idx, this.dragCard); dropped = true;
        } else {
            const r=this.canvas.getBoundingClientRect();
            if(e.clientY<r.bottom) {
                const c=Math.floor((e.clientX-r.left)/64), rw=Math.floor((e.clientY-r.top)/64);
                const t=this.towers.find(t=>t.col===c && t.row===rw);
                if(t && t.addCard(this.dragCard)) { 
                    this.cardSys.hand = this.cardSys.hand.filter(c=>c.id!==this.dragCard.id);
                    dropped = true;
                    if (this.hoverCol === t.col && this.hoverRow === t.row) this.showInfo(t);
                }
            }
        }
        if(!dropped) this.dragCard.isDragging = false;
        this.cardSys.render(); this.dragCard=null;
    }

    showInfo(t) {
        const stats = t.getStats();
        this.infoEl.style.display = 'block';
        this.infoEl.style.left = t.x + 'px'; this.infoEl.style.top = (t.y - 40) + 'px';
        document.getElementById('info-dmg').innerText = stats.dmg;
        document.getElementById('info-spd').innerText = (60/stats.cd).toFixed(1) + '/сек';
        document.getElementById('info-rng').innerText = stats.range;
        const cardsContainer = document.getElementById('info-cards');
        cardsContainer.innerHTML = '';
        t.cards.forEach(c => {
            const mc = document.createElement('div');
            mc.className = 'mini-card'; mc.style.backgroundColor = c.type.color; mc.innerText = c.level;
            cardsContainer.appendChild(mc);
        });
        if(t.cards.length === 0) cardsContainer.innerHTML = '<span style="font-size:10px; color:#888">Пусто</span>';
    }

    hideInfo() { this.infoEl.style.display = 'none'; }

    loop(timestamp) {
        try {
            if (!this.lastTime) this.lastTime = timestamp;
            let dt = (timestamp - this.lastTime) / 1000;
            if (dt > 0.1) dt = 0.1; 
            this.lastTime = timestamp;
            const timeScale = dt * 60;

            this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
            this.map.draw(this.ctx);
            
            if(this.hoverCol!==undefined && this.map.isBuildable(this.hoverCol, this.hoverRow)) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.fillRect(this.hoverCol*64, this.hoverRow*64, 64, 64);
                if (this.isHolding) {
                    const progress = (performance.now() - this.holdStart) / this.holdDuration;
                    const px = this.hoverCol * 64 + 10; const py = this.hoverRow * 64 - 10;
                    this.ctx.fillStyle = '#333'; this.ctx.fillRect(px, py, 44, 8); 
                    this.ctx.fillStyle = '#00ff00'; this.ctx.fillRect(px+1, py+1, 42 * Math.min(progress, 1), 6); 
                    if (progress >= 1) this.tryBuild();
                }
            }
            
            this.towers.forEach(t=>t.draw(this.ctx));
            
            if (this.infoEl.style.display === 'block') {
                const t = this.towers.find(t=>t.col===this.hoverCol && t.row===this.hoverRow);
                if(t) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; 
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.beginPath(); this.ctx.arc(t.x, t.y, t.getStats().range, 0, Math.PI*2); this.ctx.fill(); this.ctx.stroke();
                }
            }
            
            this.enemies.forEach(e=>e.draw(this.ctx));
            
            this.projectiles.forEach(p => p.update(dt, this.enemies, this));
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                if (!this.projectiles[i].alive) {
                    this.projectilePool.free(this.projectiles[i]);
                    this.projectiles.splice(i, 1);
                }
            }
            this.projectiles.forEach(p => p.draw(this.ctx));
            
            this.clouds.forEach(c => {
                c.x += c.speed * timeScale; 
                if(c.x > this.canvas.width + c.size) c.x = -c.size;
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; 
                this.ctx.beginPath();
                this.ctx.arc(c.x, c.y, c.size, 0, Math.PI*2);
                this.ctx.arc(c.x + c.size*0.6, c.y + c.size*0.2, c.size*0.8, 0, Math.PI*2);
                this.ctx.fill();
            });

            this.effects=this.effects.filter(e=>e.life===undefined || e.life>0);
            this.effects.forEach(e=>{ 
                if (e.type === 'explosion') {
                    e.life -= timeScale;
                    this.ctx.fillStyle=`rgba(255,100,0,${Math.max(0, e.life/20)})`;
                    this.ctx.beginPath(); this.ctx.arc(e.x,e.y,e.radius,0,Math.PI*2); this.ctx.fill();
                }
                else if (e.type === 'particle') {
                    e.life -= timeScale;
                    e.x += e.vx * timeScale; e.y += e.vy * timeScale; e.vx *= 0.9; e.vy *= 0.9;
                    this.ctx.fillStyle = e.color; this.ctx.globalAlpha = Math.max(0, e.life / 30);
                    this.ctx.fillRect(e.x, e.y, 4, 4); this.ctx.globalAlpha = 1;
                }
                else if (e.type === 'text') {
                    e.life -= timeScale;
                    e.y += e.vy * timeScale;
                    this.ctx.fillStyle = e.color; this.ctx.font = "bold 16px Arial";
                    this.ctx.globalAlpha = Math.max(0, e.life / 40);
                    this.ctx.fillText(e.text, e.x - 10, e.y);
                    this.ctx.globalAlpha = 1;
                    this.ctx.lineWidth = 1; this.ctx.strokeStyle = 'black'; this.ctx.strokeText(e.text, e.x - 10, e.y);
                }
                else if (e.type === 'loot') {
                    e.progress += 0.02 * timeScale;
                    if(!e.el) {
                        e.el = document.createElement('div'); 
                        e.el.className = `loot-item card type-${e.cardType ? e.cardType.id : 'unknown'}`;
                        e.el.style.background = e.cardType ? e.cardType.color : '#ccc'; 
                        e.el.innerHTML = e.cardType ? e.cardType.icon : '?';
                        this.effectsLayer.appendChild(e.el);
                    }
                    if(e.progress >= 1) {
                        e.life = 0; 
                        e.el.remove(); 
                        
                        const success = this.cardSys.addCard(e.cardKey, 1, true);
                        if (!success) {
                            this.money += 15;
                            this.updateUI();
                            const panelRect = document.getElementById('hand-panel').getBoundingClientRect();
                            this.addEffect({
                                type: 'text', x: panelRect.left + 80, y: panelRect.top - 20, 
                                text: "HAND FULL!", color: '#f44336', life: 60, vy: -1
                            });
                            this.addEffect({
                                type: 'text', x: panelRect.left + 80, y: panelRect.top + 10, 
                                text: "+15💰", color: '#ffd700', life: 60, vy: -1
                            });
                        }
                    } else {
                        const t = e.progress; const invT = 1 - t;
                        const curX = invT*invT * e.startX + 2*invT*t * e.controlX + t*t * e.endX;
                        const curY = invT*invT * e.startY + 2*invT*t * e.controlY + t*t * e.endY;
                        e.el.style.left = (curX - 20) + 'px'; e.el.style.top = (curY - 28) + 'px';
                        e.el.style.transform = `scale(${0.5 + t*0.5}) rotate(${t*360}deg)`;
                    }
                }
            });
            this.effects = this.effects.filter(e => {
                if (e.type === 'loot' && e.life <= 0 && e.el) e.el.remove();
                return e.life === undefined || e.life > 0;
            });
            
            if(this.active) {
                if (this.currentWaveData && this.groupIndex < this.currentWaveData.length) {
                    this.spawnTimer += timeScale; 
                    const group = this.currentWaveData[this.groupIndex];
                    
                    if (this.spawnTimer >= group.interval) {
                        this.spawnEnemy(group.type);
                        this.spawnTimer = 0;
                        this.groupSpawned++;
                        if (this.groupSpawned >= group.count) {
                            this.groupIndex++;
                            this.groupSpawned = 0;
                            this.spawnTimer = -60; 
                        }
                    }
                }
                else if(this.enemies.length === 0) { 
                    this.active = false; 
                    // Событие конца волны
                    this.events.emit('wave-end');
                    
                    let waveReward = 25 + 5 * this.wave;
                    let text = `Wave Clear: +${waveReward}`;
                    let color = '#fff';

                    if (this.isWavePerfect) {
                        const perfectBonus = 15 + 5 * this.wave;
                        waveReward += perfectBonus;
                        text += `\nPERFECT! +${perfectBonus}`;
                        color = '#ffd700';
                    }
                    
                    this.money += waveReward;
                    this.updateUI();

                    this.addEffect({ 
                        type: 'text', x: this.canvas.width/2, y: this.canvas.height/2, 
                        text: text, color: color, life: 120, vy: -0.5 
                    });
                }

                this.enemies.forEach(e=>e.update(dt, this)); 
                this.enemies=this.enemies.filter(e=>e.alive);
                this.towers.forEach(t=>t.update(dt, this.enemies,this));
            }
        } catch (err) { console.error("Loop Error:", err); this.active = false; }
        requestAnimationFrame((t)=>this.loop(t));
    }
}
new Game();