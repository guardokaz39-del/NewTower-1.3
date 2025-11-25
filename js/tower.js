import { CONFIG } from './config.js';

export class Tower {
    constructor(c,r) {
        this.col=c; this.row=r; this.x=c*64+32; this.y=r*64+32;
        this.cards=[]; this.cooldown=0; this.angle=0;
    }

    getStats() {
        let s = { 
            range: CONFIG.TOWER.BASE_RANGE, 
            dmg: CONFIG.TOWER.BASE_DMG, 
            cd: CONFIG.TOWER.BASE_CD, 
            speed: 8, 
            color: '#ffd700', effects:[], pierce: 0,
            projCount: 1, // По умолчанию 1 выстрел
            spread: 0     // Разброс в радианах
        };

        // Сбор данных о картах
        let multiCards = [];
        
        this.cards.forEach(c => {
            const lvl = c.level;
            
            if(c.type.id === 'sniper') { 
                s.range += 60*lvl; 
                s.dmg += 8*lvl; 
                s.speed = 15; 
                s.cd += 10; 
                s.color = '#4caf50'; 
                if(lvl >= 3) s.pierce = 1; 
            }
            if(c.type.id === 'fire') { 
                s.effects.push({type:'splash', radius:40+(lvl*20)}); 
                s.color = '#f44336'; 
                s.dmg += 5*lvl; 
                s.speed = 6; 
            }
            if(c.type.id === 'ice') { 
                s.effects.push({type:'slow', dur:60*lvl}); 
                s.color = '#00bcd4'; 
                s.speed = 10; 
            }
            if(c.type.id === 'multi') {
                multiCards.push(c);
                s.color = '#ff9800';
            }
        });

        // ЛОГИКА МУЛЬТИВЫСТРЕЛА
        if (multiCards.length > 0) {
            // Находим максимальный уровень карты, чтобы определить режим стрельбы
            const maxLvl = Math.max(...multiCards.map(c => c.level));
            let dmgMod = 1.0;
            let cdMod = 1.0;

            if (maxLvl === 1) {
                s.projCount = 2; dmgMod = 0.6; cdMod = 1.1; // 10% медленнее
            } else if (maxLvl === 2) {
                s.projCount = 3; dmgMod = 0.45; cdMod = 1.1; 
            } else if (maxLvl >= 3) {
                s.projCount = 3; dmgMod = 0.5; cdMod = 1.0; // Без штрафа к скорости
            }

            // Бонусы за дубликаты (Stacking)
            // Если карт > 1, добавляем бонусы за каждую ЛИШНЮЮ
            const extraCards = multiCards.length - 1;
            if (extraCards > 0) {
                dmgMod += 0.15 * extraCards; // +15% за копию
                cdMod -= 0.07 * extraCards;  // +7% к скорости (уменьшение CD)
            }

            s.dmg = Math.floor(s.dmg * dmgMod);
            s.cd = Math.floor(s.cd * cdMod);
            s.spread = 0.3; // Разброс около 17 градусов
        }

        return s;
    }

    addCard(c) { if(this.cards.length<3) { this.cards.push(c); return true; } return false; }
    
    update(dt, enemies, game) {
        const s = this.getStats();
        const timeScale = dt * 60;
        
        if(this.cooldown > 0) this.cooldown -= timeScale;
        
        let target=null, min=Infinity;
        // Не стреляем по умирающим врагам (dying)
        for(let e of enemies) {
            if (e.dying) continue; 
            const d = Math.hypot(e.x-this.x, e.y-this.y);
            if(d<=s.range && d<min) { min=d; target=e; }
        }
        
        if(target) {
            this.angle = Math.atan2(target.y-this.y, target.x-this.x);
            
            if(this.cooldown <= 0) { 
                // Цикл для мультивыстрела
                const startAngle = this.angle - (s.spread * (s.projCount - 1)) / 2;
                
                for(let i = 0; i < s.projCount; i++) {
                    const currentAngle = startAngle + i * s.spread;
                    
                    // Создаем временный таргет-объект для задания угла
                    // (Так как Projectile считает угол от цели, мы "обманываем" его)
                    const fakeTarget = {
                        x: this.x + Math.cos(currentAngle) * 100,
                        y: this.y + Math.sin(currentAngle) * 100
                    };

                    const p = game.projectilePool.obtain();
                    p.init(this.x, this.y, fakeTarget, s);
                    game.projectiles.push(p);
                }
                
                this.cooldown = s.cd; 
            }
        }
    }
    
    draw(ctx) {
        ctx.fillStyle=CONFIG.COLORS.TOWER_BASE; ctx.beginPath(); ctx.arc(this.x,this.y,20,0,Math.PI*2); ctx.fill();
        for(let i=0;i<3;i++) {
            const a=(i*(Math.PI*2/3))-Math.PI/2;
            ctx.beginPath(); ctx.arc(this.x+Math.cos(a)*12,this.y+Math.sin(a)*12,4,0,Math.PI*2);
            ctx.fillStyle=this.cards[i]?this.cards[i].type.color:'#444'; ctx.fill(); ctx.stroke();
        }
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle);
        ctx.fillStyle='#333'; ctx.fillRect(-5,-5,25,10);
        
        // Визуальное отличие для Мультивыстрела (широкое дуло)
        if (this.cards.some(c => c.type.id === 'multi')) {
             ctx.fillStyle='#ff9800'; 
             ctx.fillRect(-8, -8, 25, 4); // Доп стволы
             ctx.fillRect(-8, 4, 25, 4);
        }

        ctx.fillStyle='#666'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}