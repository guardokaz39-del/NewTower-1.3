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
        
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.path = config.path;
    }

    public setType(id: string) {
        this.typeId = id;
    }

    public takeDamage(amount: number): void {
        const actualDamage = Math.max(1, amount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) this.currentHealth = 0;
    }

    // ИСПРАВЛЕНИЕ: метод стал public
    public move(): void {
        let speedMod = 1;
        const slow = this.statuses.find(s => s.type === 'slow');
        if (slow) speedMod -= slow.power;
        
        const currentSpeed = Math.max(0, this.baseSpeed * speedMod);

        if (this.pathIndex >= this.path.length) {
            this.finished = true;
            return;
        }

        const node = this.path[this.pathIndex];
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

    public applyStatus(type: 'slow' | 'burn', duration: number, power: number) {
        const existing = this.statuses.find(s => s.type === type);
        if (existing) {
            existing.duration = duration;
            existing.power = power;
        } else {
            this.statuses.push({ type, duration, power });
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const safeType = this.typeId ? this.typeId.toLowerCase() : 'grunt';
        const typeConf = (CONFIG.ENEMY_TYPES as any)[safeType.toUpperCase()] || (CONFIG.ENEMY_TYPES as any)['GRUNT'];

        ctx.save();
        ctx.translate(this.x, this.y);

        const img = Assets.get(`enemy_${safeType}`);
        if (img) {
            ctx.drawImage(img as any, -24, -24, 48, 48);
        } else {
            ctx.fillStyle = typeConf ? typeConf.color : '#f00';
            ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
        }
        
        // Статусы
        if (this.statuses.some(s => s.type === 'slow')) {
            ctx.fillStyle = 'rgba(0, 200, 255, 0.4)'; 
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
}