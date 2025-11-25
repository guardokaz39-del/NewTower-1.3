import { CONFIG } from './config.js';

export class Enemy {
    constructor(path, wave, typeKey = 'GRUNT', startOpts = null) {
        this.path = path;
        if (startOpts) {
            this.idx = startOpts.idx; this.x = startOpts.x; this.y = startOpts.y;
        } else {
            this.idx = 0; this.x = path[0].x * 64 + 32; this.y = path[0].y * 64 + 32;
        }
        
        this.type = CONFIG.ENEMY_TYPES[typeKey];
        const waveScaling = Math.pow(CONFIG.ENEMY.HP_GROWTH, Math.max(0, wave - 1));
        this.maxHp = Math.floor(CONFIG.ENEMY.BASE_HP * this.type.hpMod * waveScaling);
        this.hp = this.maxHp;
        this.baseSpeed = this.type.speed;
        this.reward = this.type.reward;
        
        this.alive = true; 
        this.dying = false; 
        this.deathTimer = 0; 
        
        this.status = []; 
        this.radius = this.type.id === 'boss' ? 24 : 16;
        this.abilityCd = this.type.summonCd || 0;
        
        this.hitFlashTimer = 0; 
    }

    applyStatus(t, d) { this.status.push({type: t, dur: d}); }
    
    update(dt, game) { 
        if (!this.alive) return;
        const timeScale = dt * 60;

        // --- ЛОГИКА СМЕРТИ ---
        if (this.dying) {
            this.deathTimer += timeScale;
            if (this.deathTimer > 15) { 
                this.alive = false; 
            }
            return; 
        }

        if (this.hitFlashTimer > 0) this.hitFlashTimer -= timeScale;

        // Способности
        if (this.type.ability === 'summon') {
            this.abilityCd -= timeScale;
            if (this.abilityCd <= 0) {
                this.abilityCd = this.type.summonCd;
                game.spawnEnemy(this.type.summonType, { x: this.x, y: this.y, idx: this.idx }, true); 
                game.addEffect({ type: 'explosion', x: this.x, y: this.y, radius: 40, life: 20, color: '#purple' });
            }
        }

        let currentSpeed = this.baseSpeed;
        this.status = this.status.filter(s => s.dur > 0);
        this.status.forEach(s => { 
            s.dur -= timeScale; 
            if (s.type === 'slow') currentSpeed *= 0.6; 
        });

        const t = this.path[this.idx + 1]; 
        if (!t) { 
            this.alive = false; 
            game.hitBase(); 
            return; 
        }

        const dx = (t.x * 64 + 32) - this.x; 
        const dy = (t.y * 64 + 32) - this.y; 
        const dist = Math.hypot(dx, dy);
        const moveDist = currentSpeed * timeScale;

        if (dist < moveDist) {
            this.idx++; 
        } else { 
            this.x += (dx / dist) * moveDist; 
            this.y += (dy / dist) * moveDist; 
        }
    }
    
    takeDamage(amount, game) {
        if (this.dying) return; 

        this.hp -= amount;
        this.hitFlashTimer = 8; // Увеличил время вспышки с 5 до 8 кадров
        
        if (this.hp <= 0) { 
            this.dying = true;
            this.deathTimer = 0;
            this.hitFlashTimer = 0; // Убираем вспышку при смерти

            game.money += this.reward; 
            game.updateUI(); 
            
            const pColor = this.type.color;
            for(let i=0; i<6; i++) {
                game.addEffect({
                    type: 'particle', x: this.x, y: this.y, 
                    vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, color: pColor, life: 30
                });
            }
            game.addEffect({ type: 'text', x: this.x, y: this.y, text: `+${this.reward}$`, color: '#ffd700', life: 40, vy: -1 });
            
            if (Math.random() < CONFIG.ENEMY.DROP_CHANCE) game.spawnLoot(this.x, this.y); 
            if (this.type.id === 'boss' && game.wave === CONFIG.WAVES.length) setTimeout(() => alert("ПОБЕДА! Вы одолели Демона!"), 100);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Эффект удара (Усиленная тряска + увеличение)
        if (this.hitFlashTimer > 0 && !this.dying) {
            // Тряска стала сильнее (было *4, стало *6)
            ctx.translate((Math.random()-0.5)*6, (Math.random()-0.5)*6);
            ctx.scale(1.2, 1.2); 
            
            // РИСУЕМ БЕЛУЮ ПОДЛОЖКУ ПРИ УДАРЕ (Вспышка)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI*2);
            ctx.fill();
        }

        // Анимация смерти
        if (this.dying) {
            const scale = 1 - (this.deathTimer / 15);
            ctx.scale(scale, scale);
            ctx.rotate(this.deathTimer * 0.5);
        }

        // Отрисовка Босса
        if (this.type.id === 'boss') {
            ctx.fillStyle = `rgba(255, 0, 0, ${0.2 + Math.sin(Date.now()/200)*0.1})`;
            ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill();
        }

        ctx.font = (this.type.id === 'boss' ? '48px' : '32px') + ' Segoe UI, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillText(this.type.symbol, 0, 2);
        
        // Основной символ
        ctx.fillStyle = '#fff';
        if (this.status.some(s => s.type === 'slow')) ctx.fillStyle = '#81d4fa';
        
        // Если удар - делаем эмодзи полупрозрачным, чтобы было видно белую подложку
        if (this.hitFlashTimer > 0 && !this.dying) ctx.globalAlpha = 0.5;
        
        ctx.fillText(this.type.symbol, 0, 0);
        ctx.globalAlpha = 1.0;

        // Полоска здоровья
        if (!this.dying) {
            const hpPct = Math.max(0, this.hp / this.maxHp);
            const barW = this.type.id === 'boss' ? 50 : 24;
            const barY = - (this.type.id === 'boss' ? 35 : 22);
            
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-barW/2, barY, barW, 4);
            
            // Полоска тоже трясется и меняет цвет
            ctx.fillStyle = hpPct > 0.5 ? '#4caf50' : '#f44336';
            if (this.hitFlashTimer > 0) ctx.fillStyle = '#fff'; // Белая полоска при ударе
            
            ctx.fillRect(-barW/2, barY, barW * hpPct, 4);
        }
        
        ctx.restore();
    }
}