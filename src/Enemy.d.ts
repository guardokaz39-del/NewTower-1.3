export interface IEnemyConfig {
    id: string;
    health: number;
    speed: number;
    armor?: number;
    // Добавляем начальные координаты
    x?: number; 
    y?: number;
}

export class Enemy {
    public id: string;
    public currentHealth: number;
    public maxHealth: number;
    public speed: number;
    public armor: number;
    
    // Координаты на экране
    public x: number;
    public y: number;

    constructor(config: IEnemyConfig) {
        this.id = config.id;
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.speed = config.speed;
        this.armor = config.armor || 0;
        
        // Если координаты не передали, ставим 0,0
        this.x = config.x || 0;
        this.y = config.y || 0;
    }

    public takeDamage(amount: number): void {
        const actualDamage = Math.max(1, amount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) this.currentHealth = 0;
    }

    // Метод движения
    public move(): void {
        // Пока просто двигаем вправо
        this.x += this.speed;
    }

    public isAlive(): boolean {
        return this.currentHealth > 0;
    }
}