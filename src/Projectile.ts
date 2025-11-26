import { Enemy } from './Enemy';
import { EffectSystem } from './EffectSystem'; // Нужен для взрывов

export interface IProjectileStats {
    dmg: number;
    speed: number;
    color: string;
    effects: any[];
    pierce: number;
}

export class Projectile {
    public x: number = 0;
    public y: number = 0;
    public vx: number = 0;
    public vy: number = 0;
    public radius: number = 4;
    public alive: boolean = false;
    
    public damage: number = 0;
    public life: number = 0;
    public color: string = '#fff';
    public effects: any[] = [];
    public pierce: number = 0;
    public hitList: Enemy[] = [];

    constructor() {
        this.reset();
    }

    init(x: number, y: number, target: {x: number, y: number}, stats: IProjectileStats) {
        this.x = x; 
        this.y = y; 
        this.alive = true;
        this.damage = stats.dmg; 
        this.color = stats.color; 
        this.effects = stats.effects; // <-- Тут лежат эффекты (splash, slow)
        this.pierce = stats.pierce || 0; 
        this.hitList = [];
        
        const angle = Math.atan2(target.y - y, target.x - x);
        const speed = stats.speed;
        this.vx = Math.cos(angle) * speed; 
        this.vy = Math.sin(angle) * speed;
        
        this.life = 100;
    }

    reset() {
        this.x = 0; this.y = 0;
        this.hitList = [];
        this.alive = false;
    }

    // Теперь update принимает еще и EffectSystem, чтобы создавать взрывы
    update(enemies: Enemy[], effectsSys: EffectSystem) {
        if (!this.alive) return;

        this.x += this.vx; 
        this.y += this.vy; 
        this.life--;
        
        if(this.life <= 0) {
            this.alive = false;
            return;
        }

        for(let e of enemies) {
            if (!e.isAlive()) continue;
            if(this.hitList.indexOf(e) !== -1) continue;
            
            if (Math.hypot(e.x - this.x, e.y - this.y) < (16 + this.radius)) {
                // Передаем весь список врагов в hit, чтобы сделать Splash
                this.hit(e, enemies, effectsSys);
                
                if(this.pierce > 0) { 
                    this.pierce--; 
                    this.hitList.push(e); 
                } else { 
                    this.alive = false; 
                    break; 
                }
            }
        }
    }

    // Логика попадания
    hit(target: Enemy, allEnemies: Enemy[], effectsSys: EffectSystem) {
        // 1. Прямой урон
        target.takeDamage(this.damage);

        // 2. Проверяем Сплэш (Взрыв)
        const splash = this.effects.find(e => e.type === 'splash');
        if (splash) {
            // Рисуем взрыв
            effectsSys.add({
                type: 'explosion', x: target.x, y: target.y, 
                radius: splash.radius, life: 15, color: 'rgba(255, 100, 0, 0.5)'
            });

            // Наносим урон соседям
            for (let neighbor of allEnemies) {
                if (neighbor === target || !neighbor.isAlive()) continue;
                const dist = Math.hypot(neighbor.x - target.x, neighbor.y - target.y);
                if (dist <= splash.radius) {
                    neighbor.takeDamage(this.damage * 0.7); // 70% урона по площади
                }
            }
        }

        // 3. Проверяем Замедление (Лед)
        const slow = this.effects.find(e => e.type === 'slow');
        if (slow) {
            // Применяем статус (тип, длительность, сила)
            // slow.dur берется из конфига Tower.ts
            target.applyStatus('slow', slow.dur || 60, 0.4); // 40% замедление
            
            // Эффект частиц льда
            effectsSys.add({
                type: 'particle', x: target.x, y: target.y, life: 20, color: '#00bcd4'
            });
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;
        ctx.fillStyle = this.color; 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); 
        ctx.fill();
    }
}