import { CONFIG } from './Config';
import { Assets } from './Assets';

export interface IEnemyConfig {
    id: string;
    health: number;
    speed: number;
    armor?: number;
    x?: number; 
    y?: number;
    path: { x: number, y: number }[];
}

interface IStatus {
    type: 'slow' | 'burn'; 
    duration: number; 
    power: number;   
}

export class Enemy {
    public id: string;
    public typeId: string = 'grunt'; 
    
    public currentHealth: number;
    public maxHealth: number;
    public baseSpeed: number;
    public armor: number;
    
    public x: number;
    public y: number;

    private path: { x: number, y: number }[];
    private pathIndex: number = 0;
    public finished: boolean = false;
    
    public statuses: IStatus[] = [];

    constructor(config: IEnemyConfig) {
        this.id = config.id;
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.baseSpeed = config.speed;
        this.armor = config.armor || 0;
        
        this.x = config.x || (config.path[0] ? config.path[0].x * CONFIG.TILE_SIZE + 32 : 0);
        this.y = config.y || (config.path[0] ? config.path[0].y * CONFIG.TILE_SIZE + 32 : 0);
        this.path = config.path;
    }
    
    public setType(typeId: string) {
        this.typeId = typeId;
    }

    public takeDamage(amount: number) {
        const dmg = Math.max(1, amount - this.armor);
        this.currentHealth -= dmg;
    }

    public applyStatus(type: 'slow' | 'burn', duration: number, power: number) {
        const existing = this.statuses.find(s => s.type === type);
        if (existing) {
            existing.duration = duration; // Обновляем время
        } else {
            this.statuses.push({ type, duration, power });
        }
    }

    // ВАЖНО: Метод update, который искал GameScene
    public update() {
        // Обновляем статусы
        for (let i = this.statuses.length - 1; i >= 0; i--) {
            this.statuses[i].duration--;
            if (this.statuses[i].duration <= 0) {
                this.statuses.splice(i, 1);
            }
        }
        
        this.move();
    }

    private move() {
        let speedMod = 1;
        const slow = this.statuses.find(s => s.type === 'slow');
        if (slow) speedMod -= slow.power;

        const currentSpeed = Math.max(0, this.baseSpeed * speedMod);

        if (this.pathIndex >= this.path.length) {
            this.finished = true;
            return;
        }

        const node = this.path[this.pathIndex];
        // Целевая точка (центр тайла)
        const targetX = node.x * CONFIG.TILE_SIZE + 32;
        const targetY = node.y * CONFIG.TILE_SIZE + 32;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= currentSpeed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
        } else {
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }
    }

    public isAlive(): boolean {
        return this.currentHealth > 0;
    }

    public getHealthPercent(): number {
        return this.currentHealth / this.maxHealth;
    }
    
    public draw(ctx: CanvasRenderingContext2D) {
        const safeType = this.typeId ? this.typeId.toUpperCase() : 'GRUNT';
        const conf = (CONFIG.ENEMY_TYPES as any)[safeType] || (CONFIG.ENEMY_TYPES as any)['GRUNT'];

        ctx.save();
        ctx.translate(this.x, this.y);

        const img = Assets.get(`enemy_${this.typeId}`);
        if (img) {
            ctx.drawImage(img, -24, -24, 48, 48);
        } else {
            ctx.fillStyle = conf.color;
            ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Геттер цвета для Game.ts (если используется там)
    public getColor(): string {
         const safeType = this.typeId ? this.typeId.toUpperCase() : 'GRUNT';
         const conf = (CONFIG.ENEMY_TYPES as any)[safeType] || (CONFIG.ENEMY_TYPES as any)['GRUNT'];
         return conf.color;
    }
}