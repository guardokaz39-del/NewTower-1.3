import { CONFIG } from './Config';

export interface IEnemyConfig {
    id: string;
    health: number;
    speed: number;
    armor?: number;
    x?: number; 
    y?: number;
    path: { x: number, y: number }[];
}

// Интерфейс для эффекта (например, замедление)
interface IStatus {
    type: 'slow';
    duration: number; // сколько кадров осталось
    power: number;    // сила эффекта (0.5 = 50% скорости)
}

export class Enemy {
    public id: string;
    public currentHealth: number;
    public maxHealth: number;
    public baseSpeed: number; // Исходная скорость
    public armor: number;
    
    public x: number;
    public y: number;

    private path: { x: number, y: number }[];
    private pathIndex: number = 0;
    public finished: boolean = false;
    
    private offsetX: number = 0;
    private offsetY: number = 0;

    // Список активных эффектов
    public statuses: IStatus[] = [];

    constructor(config: IEnemyConfig) {
        this.id = config.id;
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.baseSpeed = config.speed;
        this.armor = config.armor || 0;
        this.path = config.path;

        if (config.x !== undefined && config.y !== undefined) {
            this.x = config.x;
            this.y = config.y;
        } else {
            this.x = this.path[0].x * CONFIG.TILE_SIZE + 32;
            this.y = this.path[0].y * CONFIG.TILE_SIZE + 32;
        }

        const startNode = this.path[0];
        this.offsetX = this.x - (startNode.x * CONFIG.TILE_SIZE + 32);
        this.offsetY = this.y - (startNode.y * CONFIG.TILE_SIZE + 32);
        this.pathIndex = 1; 
    }

    public takeDamage(amount: number): void {
        const actualDamage = Math.max(1, amount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) this.currentHealth = 0;
    }

    // Добавить эффект (например, от ледяной башни)
    public applyStatus(type: 'slow', duration: number, power: number) {
        // Ищем, есть ли уже такой эффект
        const existing = this.statuses.find(s => s.type === type);
        if (existing) {
            // Обновляем таймер, но не даем замедлять сильнее, чем уже есть
            existing.duration = Math.max(existing.duration, duration);
            existing.power = Math.max(existing.power, power);
        } else {
            this.statuses.push({ type, duration, power });
        }
    }

    public move(): void {
        if (this.finished) return;

        // 1. Обновляем статусы
        this.statuses.forEach(s => s.duration--);
        this.statuses = this.statuses.filter(s => s.duration > 0);

        // 2. Считаем реальную скорость (База * (1 - сила замедления))
        // Если замедление 0.4, то скорость будет 0.6 от нормы
        let speedMod = 1;
        const slow = this.statuses.find(s => s.type === 'slow');
        if (slow) speedMod -= slow.power;
        
        const currentSpeed = Math.max(0, this.baseSpeed * speedMod);

        // 3. Стандартная логика движения (но с currentSpeed)
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

    // Хелпер для отрисовки (синий если заморожен)
    public getColor(): string {
        if (this.statuses.some(s => s.type === 'slow')) return '#00bcd4'; // Лед
        return this.getHealthPercent() > 0.5 ? '#2ecc71' : '#e74c3c'; // Зеленый/Красный
    }
}