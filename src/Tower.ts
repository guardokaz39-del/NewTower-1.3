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

    // Статический метод для предпросмотра характеристик (когда карты еще не в башне)
    public static getPreviewStats(cards: ICard[]): any {
        // Создаем временную башню, чтобы посчитать статы
        const dummy = new Tower(0, 0);
        dummy.cards = cards;
        return dummy.getStats();
    }

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

        this.cards.forEach(c => {
            const lvl = c.level;
            const type = c.type.id;
            
            if(type === 'sniper') { 
                s.range += CONFIG.CARDS.SNIPER.RANGE_PER_LVL * lvl; 
                s.dmg += CONFIG.CARDS.SNIPER.DAMAGE_PER_LVL * lvl; 
                s.speed = CONFIG.CARDS.SNIPER.SPEED_SET; 
                if(lvl >= CONFIG.CARDS.SNIPER.PIERCE_LVL_REQ) s.pierce += 1; 
                s.color = '#4caf50'; 
            }
            if(type === 'fire') { 
                const splashR = CONFIG.CARDS.FIRE.SPLASH_RADIUS_BASE + (lvl * CONFIG.CARDS.FIRE.SPLASH_PER_LVL);
                s.effects.push({ type: 'splash', radius: splashR });
                s.dmg += CONFIG.CARDS.FIRE.DAMAGE_PER_LVL * lvl;
                s.cd += CONFIG.CARDS.FIRE.CD_INCREASE; 
                s.speed = 6; 
                s.color = '#f44336'; 
            }
            if(type === 'ice') { 
                const dur = CONFIG.CARDS.ICE.SLOW_DUR_BASE + (lvl * CONFIG.CARDS.ICE.SLOW_DUR_PER_LVL);
                s.effects.push({ type: 'slow', dur: dur, power: CONFIG.CARDS.ICE.SLOW_POWER });
                s.dmg += CONFIG.CARDS.ICE.DAMAGE_PER_LVL * lvl;
                s.color = '#00bcd4'; 
                s.speed = 10; 
            }
        });

        const multiCards = this.cards.filter(c => c.type.id === 'multi');
        if (multiCards.length > 0) {
            const maxLvl = Math.max(...multiCards.map(c => c.level));
            s.projCount = 1 + maxLvl; 
            s.spread = 0.3;
            s.dmg *= CONFIG.CARDS.MULTI.DMG_PENALTY; 
            s.color = '#ff9800';
        }

        return s;
    }

    addCard(c: ICard): boolean { 
        if(this.cards.length < 3) { 
            this.cards.push(c); 
            return true; 
        } 
        return false; 
    }
    
    update(enemies: Enemy[], projectiles: Projectile[], pool: ObjectPool<Projectile>) {
        const s = this.getStats();
        
        if(this.cooldown > 0) this.cooldown--;
        
        // Улучшенный поиск: Ищем того, кто ближе всего к базе (прошел дальше всех)
        // Но при этом находится в радиусе атаки
        let target: Enemy | null = null;
        
        // Фильтруем тех, кто в радиусе
        const candidates = enemies.filter(e => {
            if (!e.isAlive()) return false;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            return dist <= s.range;
        });

        // Если есть кандидаты, берем первого (так как массив enemies обычно отсортирован по спавну, 
        // но лучше бы добавить enemy.distTraveled. Пока берем просто первого попавшегося в радиусе,
        // но можно сортировать по близости к башне)
        if (candidates.length > 0) {
            // Берем самого близкого к башне (классика)
            candidates.sort((a, b) => {
                const dA = Math.hypot(a.x - this.x, a.y - this.y);
                const dB = Math.hypot(b.x - this.x, b.y - this.y);
                return dA - dB;
            });
            target = candidates[0];
        }
        
        if(target) {
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            
            if(this.cooldown <= 0) { 
                const startAngle = this.angle - (s.spread * (s.projCount - 1)) / 2;
                
                for(let i = 0; i < s.projCount; i++) {
                    const currentAngle = startAngle + i * s.spread;
                    const fakeTarget = {
                        x: this.x + Math.cos(currentAngle) * 100,
                        y: this.y + Math.sin(currentAngle) * 100
                    };
                    const p = pool.obtain();
                    p.init(this.x, this.y, fakeTarget, s);
                    projectiles.push(p);
                }
                this.cooldown = s.cd; 
            }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = CONFIG.COLORS.TOWER_BASE; 
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI*2); ctx.fill();

        for(let i=0; i<3; i++) {
            const a = (i * (Math.PI*2/3)) - Math.PI/2;
            ctx.beginPath(); 
            ctx.arc(this.x + Math.cos(a)*12, this.y + Math.sin(a)*12, 4, 0, Math.PI*2);
            ctx.fillStyle = this.cards[i] ? this.cards[i].type.color : '#444'; 
            ctx.fill(); ctx.stroke();
        }

        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle);
        ctx.fillStyle = '#333'; ctx.fillRect(-5, -5, 25, 10);
        ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}