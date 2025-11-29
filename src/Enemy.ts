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
    type: 'slow' | 'burn'; // добавили burn на будущее
    duration: number; 
    power: number;   
}

export class Enemy {
    public id: string;
    public typeId: string;
    public currentHealth: number;
    public maxHealth: number;
    public baseSpeed: number;
    public armor: number;
    
    public x: number;
    public y: number;

    private path: { x: number, y: number }[];
    private pathIndex: number = 0;
    public finished: boolean = false;
    
    private offsetX: number = 0;
    private offsetY: number = 0;

    public statuses: IStatus[] = [];

    constructor(config: IEnemyConfig) {
        this.id = config.id;
        this.typeId = 'grunt'; 
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.baseSpeed = config.speed;
        this.armor = config.armor || 0;
        
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.path = config.path;

        if (this.path && this.path.length > 0) {
            this.x = this.path[0].x * CONFIG.TILE_SIZE + 32;
            this.y = this.path[0].y * CONFIG.TILE_SIZE + 32;
        }
    }
    
    public setType(typeId: string) {
        this.typeId = typeId.toLowerCase();
    }

    public takeDamage(amount: number): void {
        const actualDamage = Math.max(1, amount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) this.currentHealth = 0;
    }

    public applyStatus(type: 'slow' | 'burn', duration: number, power: number) {
        const existing = this.statuses.find(s => s.type === type);
        if (existing) {
            existing.duration = duration; 
            existing.power = Math.max(existing.power, power);
        } else {
            this.statuses.push({ type, duration, power });
        }
    }

    public move(): void {
        // Обновление статусов
        for (let i = this.statuses.length - 1; i >= 0; i--) {
            this.statuses[i].duration--;
            if (this.statuses[i].duration <= 0) {
                this.statuses.splice(i, 1);
            }
        }

        let speedMod = 1;
        const slow = this.statuses.find(s => s.type === 'slow');
        if (slow) speedMod -= slow.power;
        
        const currentSpeed = Math.max(0, this.baseSpeed * speedMod);

        if (this.pathIndex >= this.path.length) {
            this.finished = true;
            return;
        }

        const node = this.path[this.pathIndex];
        const targetX = node.x * CONFIG.TILE_SIZE + 32 + this.offsetX;
        const targetY = node.y * CONFIG.TILE_SIZE + 32 + this.offsetY;

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
        const imgName = `enemy_${this.typeId}`;
        const img = Assets.get(imgName) || Assets.get('enemy_grunt');
        
        // 1. Пульсация (если есть статусы)
        const hasStatus = this.statuses.length > 0;
        let scale = 1;
        
        ctx.save();
        ctx.translate(this.x, this.y);

        if (hasStatus) {
            // Легкая пульсация размера
            scale = 1 + Math.sin(Date.now() / 150) * 0.1;
            ctx.scale(scale, scale);
        }

        // 2. Отрисовка врага
        if (img) {
            ctx.drawImage(img, -24, -24);
        } else {
            ctx.fillStyle = 'purple';
            ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
        }

        // 3. Цветной фильтр статуса (Overlay)
        if (hasStatus) {
            const slow = this.statuses.find(s => s.type === 'slow');
            // const burn = this.statuses.find(s => s.type === 'burn');

            ctx.globalCompositeOperation = 'source-atop'; // Рисуем только поверх врага
            if (slow) {
                ctx.fillStyle = 'rgba(0, 200, 255, 0.4)'; // Синий тинт
                ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
            }
            // сброс
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();

        // 4. Иконки статусов над головой (вращаются)
        if (hasStatus) {
            const time = Date.now() / 500;
            const orbitR = 25;
            
            this.statuses.forEach((s, idx) => {
                const angle = time + (idx * (Math.PI * 2 / this.statuses.length));
                const ix = this.x + Math.cos(angle) * orbitR;
                const iy = this.y + Math.sin(angle) * orbitR * 0.5 - 10; // Эллипс над головой

                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (s.type === 'slow') ctx.fillText('❄️', ix, iy);
                if (s.type === 'burn') ctx.fillText('🔥', ix, iy);
            });
        }
    }
    
    public getColor() { return 'transparent'; }
}