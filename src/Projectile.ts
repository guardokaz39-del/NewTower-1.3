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

    private rotation: number = 0;
    private rotationSpeed: number = 0;
    private type: 'normal' | 'fire' | 'ice' | 'sniper' = 'normal';
    
    private trail: {x: number, y: number}[] = [];
    private readonly MAX_TRAIL = 10;

    constructor() {
        this.reset();
    }

    init(x: number, y: number, target: {x: number, y: number}, stats: IProjectileStats) {
        this.x = x; 
        this.y = y; 
        this.alive = true;
        this.damage = stats.dmg; 
        this.color = stats.color; 
        this.effects = stats.effects; 
        this.pierce = stats.pierce || 0; 
        this.hitList = [];
        this.trail = []; 
        
        const angle = Math.atan2(target.y - y, target.x - x);
        const speed = stats.speed;
        this.vx = Math.cos(angle) * speed; 
        this.vy = Math.sin(angle) * speed;
        
        this.life = 120;
        this.rotation = Math.random() * Math.PI * 2;
        
        if (this.color === '#f44336') {
            this.type = 'fire';
            this.rotationSpeed = 0.2;
            this.radius = 6;
        } else if (this.color === '#00bcd4') {
            this.type = 'ice';
            this.rotationSpeed = -0.1;
            this.radius = 5;
        } else if (this.color === '#4caf50') {
            this.type = 'sniper';
            this.radius = 3;
        } else {
            this.type = 'normal';
            this.radius = 4;
        }
    }

    reset() {
        this.x = 0; this.y = 0;
        this.hitList = [];
        this.alive = false;
        this.trail = [];
    }

    move() {
        if (!this.alive) return;
        
        this.trail.unshift({x: this.x, y: this.y});
        if (this.trail.length > this.MAX_TRAIL) {
            this.trail.pop();
        }

        this.x += this.vx; 
        this.y += this.vy; 
        this.rotation += this.rotationSpeed;
        
        this.life--;
        if(this.life <= 0) this.alive = false;
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;

        // 1. Рисуем Хвост (Изолировано!)
        if (this.trail.length > 1) {
            ctx.save(); // <--- ВАЖНО: Сохраняем состояние контекста
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for(let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.lineCap = 'round';
            ctx.lineWidth = this.radius; 
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.restore(); // <--- ВАЖНО: Восстанавливаем (сбрасываем lineWidth)
        }

        // 2. Рисуем тело
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;

        if (this.type === 'fire') {
            ctx.beginPath();
            const pulse = Math.sin(this.life * 0.5) * 2;
            ctx.arc(0, 0, this.radius + pulse, 0, Math.PI*2);
            ctx.fill();
        } else if (this.type === 'ice') {
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 1.5);
            ctx.lineTo(this.radius, 0);
            ctx.lineTo(0, this.radius * 1.5);
            ctx.lineTo(-this.radius, 0);
            ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        } else if (this.type === 'sniper') {
            ctx.rotate(-this.rotation);
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            ctx.fillRect(-10, -2, 20, 4); 
        } else {
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
    }
}