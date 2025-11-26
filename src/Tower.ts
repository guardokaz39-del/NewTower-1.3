import { CONFIG } from './Config';
import { ICard } from './CardSystem';
import { Enemy } from './Enemy';
import { Projectile, IProjectileStats } from './Projectile';
import { ObjectPool } from './Utils';

export class Tower {
    public col: number;
    public row: number;
    public x: number;
    public y: number;
    
    public cards: ICard[] = [];
    public cooldown: number = 0;
    public angle: number = 0;

    constructor(c: number, r: number) {
        this.col = c; 
        this.row = r; 
        this.x = c * 64 + 32; 
        this.y = r * 64 + 32;
    }

    // Главная логика: расчет статов на основе карт
    getStats(): IProjectileStats & { range: number, cd: number, projCount: number, spread: number } {
        let s = { 
            range: CONFIG.TOWER.BASE_RANGE, 
            dmg: CONFIG.TOWER.BASE_DMG, 
            cd: CONFIG.TOWER.BASE_CD, 
            speed: 8, 
            color: '#ffd700', 
            effects: [] as any[], 
            pierce: 0,
            projCount: 1, 
            spread: 0
        };

        // Проходимся по всем картам в башне
        this.cards.forEach(c => {
            const lvl = c.level;
            
            if(c.type.id === 'sniper') { 
                s.range += 60 * lvl; 
                s.dmg += 8 * lvl; 
                s.speed = 15; 
                s.cd += 10; 
                s.color = '#4caf50'; 
                if(lvl >= 3) s.pierce = 1; 
            }
            if(c.type.id === 'fire') { 
                // s.effects.push({type:'splash', radius:40+(lvl*20)}); // Сплэш пока отключим для простоты
                s.color = '#f44336'; 
                s.dmg += 5 * lvl; 
                s.speed = 6; 
            }
            if(c.type.id === 'ice') { 
                // s.effects.push({type:'slow', dur:60*lvl}); 
                s.color = '#00bcd4'; 
                s.speed = 10; 
            }
        });

        // Отдельная обработка Мультивыстрела
        const multiCards = this.cards.filter(c => c.type.id === 'multi');
        if (multiCards.length > 0) {
            const maxLvl = Math.max(...multiCards.map(c => c.level));
            if (maxLvl === 1) { s.projCount = 2; s.cd *= 1.1; s.dmg *= 0.6; }
            else if (maxLvl === 2) { s.projCount = 3; s.cd *= 1.1; s.dmg *= 0.45; }
            else { s.projCount = 3; s.dmg *= 0.5; } 
            
            s.spread = 0.3; // Разброс угла
            s.color = '#ff9800';
        }

        return s;
    }

    // Добавить карту (если есть место)
    addCard(c: ICard): boolean { 
        if(this.cards.length < 3) { 
            this.cards.push(c); 
            return true; 
        } 
        return false; 
    }
    
    // Обновление состояния (поиск цели и стрельба)
    update(enemies: Enemy[], projectiles: Projectile[], pool: ObjectPool<Projectile>) {
        const s = this.getStats();
        
        if(this.cooldown > 0) this.cooldown--;
        
        // 1. Ищем ближайшего врага
        let target: Enemy | null = null;
        let minDist = Infinity;

        for(let e of enemies) {
            if (!e.isAlive()) continue; 
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if(d <= s.range && d < minDist) { 
                minDist = d; 
                target = e; 
            }
        }
        
        if(target) {
            // 2. Поворачиваемся к нему
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            
            // 3. Стреляем
            if(this.cooldown <= 0) { 
                const startAngle = this.angle - (s.spread * (s.projCount - 1)) / 2;
                
                for(let i = 0; i < s.projCount; i++) {
                    const currentAngle = startAngle + i * s.spread;
                    
                    // Создаем "фиктивную" цель в направлении выстрела
                    const fakeTarget = {
                        x: this.x + Math.cos(currentAngle) * 100,
                        y: this.y + Math.sin(currentAngle) * 100
                    };

                    // Берем снаряд из пула
                    const p = pool.obtain();
                    p.init(this.x, this.y, fakeTarget, s);
                    projectiles.push(p);
                }
                
                this.cooldown = s.cd; 
            }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        // Рисуем основание
        ctx.fillStyle = CONFIG.COLORS.TOWER_BASE; 
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI*2); ctx.fill();

        // Рисуем карты (цветные точки вокруг)
        for(let i=0; i<3; i++) {
            const a = (i * (Math.PI*2/3)) - Math.PI/2;
            ctx.beginPath(); 
            ctx.arc(this.x + Math.cos(a)*12, this.y + Math.sin(a)*12, 4, 0, Math.PI*2);
            ctx.fillStyle = this.cards[i] ? this.cards[i].type.color : '#444'; 
            ctx.fill(); ctx.stroke();
        }

        // Рисуем пушку
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle);
        ctx.fillStyle = '#333'; 
        ctx.fillRect(-5, -5, 25, 10);
        ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}