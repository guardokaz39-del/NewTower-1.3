import { Enemy } from './Enemy';

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
    public hitList: string[] = [];

    // Конструктор пустой!
    constructor() {}

    // Метод инициализации (вызывается из пула)
    public init(x: number, y: number, target: {x: number, y: number}, stats: IProjectileStats) {
        this.x = x; 
        this.y = y; 
        this.alive = true;
        this.damage = stats.dmg; 
        this.color = stats.color; 
        this.effects = stats.effects; 
        this.pierce = stats.pierce || 0; 
        this.hitList = [];
        
        const angle = Math.atan2(target.y - y, target.x - x);
        this.vx = Math.cos(angle) * stats.speed;
        this.vy = Math.sin(angle) * stats.speed;
        
        this.life = 120; // 2 секунды жизни
    }

    public update() {
        if (!this.alive) return;

        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        
        if (this.life <= 0 || this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 2000) {
            this.alive = false;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    public reset() {
        this.alive = false;
        this.hitList = [];
    }
}