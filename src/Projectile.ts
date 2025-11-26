import { Enemy } from './Enemy';

// Описываем характеристики снаряда
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
    
    // Характеристики
    public damage: number = 0;
    public life: number = 0;
    public color: string = '#fff';
    public effects: any[] = [];
    public pierce: number = 0;
    public hitList: Enemy[] = []; // Кого мы уже задели (для сквозных выстрелов)

    constructor() {
        this.reset();
    }

    // Инициализация (вызывается при выстреле)
    init(x: number, y: number, target: {x: number, y: number}, stats: IProjectileStats) {
        this.x = x; 
        this.y = y; 
        this.alive = true;
        this.damage = stats.dmg; 
        this.color = stats.color; 
        this.effects = stats.effects;
        this.pierce = stats.pierce || 0; 
        this.hitList = [];
        
        // Вычисляем угол полета
        const angle = Math.atan2(target.y - y, target.x - x);
        const speed = stats.speed;
        this.vx = Math.cos(angle) * speed; 
        this.vy = Math.sin(angle) * speed;
        
        this.life = 100; // Живет 100 кадров (около 1.5 сек), чтобы не лететь вечно
    }

    reset() {
        this.x = 0; this.y = 0;
        this.hitList = [];
        this.alive = false;
    }

    update(enemies: Enemy[]) {
        if (!this.alive) return;

        // Движение
        this.x += this.vx; 
        this.y += this.vy; 
        this.life--;
        
        // Если время жизни вышло
        if(this.life <= 0) {
            this.alive = false;
            return;
        }

        // Проверка столкновений
        for(let e of enemies) {
            if (!e.isAlive()) continue;

            // Если уже попали в этого врага (для пробивающих снарядов) — пропускаем
            if(this.hitList.indexOf(e) !== -1) continue;
            
            // Простая проверка дистанции (радиус врага + радиус пули)
            // У врага нет поля radius в нашем коде, добавим жесткое число 16
            if (Math.hypot(e.x - this.x, e.y - this.y) < (16 + this.radius)) {
                this.hit(e);
                
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

    hit(target: Enemy) {
        target.takeDamage(this.damage);
        
        // Тут можно добавить эффекты (замедление, взрыв), пока оставим базу
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;
        ctx.fillStyle = this.color; 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); 
        ctx.fill();
    }
}