export interface IEnemyConfig {
    id: string;
    health: number;
    speed: number;
    armor?: number;
    // Вот эти новые поля, которых не хватало:
    x?: number; 
    y?: number;
}

export class Enemy {
    public id: string;
    public currentHealth: number;
    public maxHealth: number;
    public speed: number;
    public armor: number;
    
    // Координаты
    public x: number;
    public y: number;

    constructor(config: IEnemyConfig) {
        this.id = config.id;
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.speed = config.speed;
        this.armor = config.armor || 0;
        
        // Инициализация координат
        this.x = config.x || 0;
        this.y = config.y || 0;
    }

    public takeDamage(amount: number): void {
        const actualDamage = Math.max(1, amount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) {
            this.currentHealth = 0;
        }
    }

    // Вот метод, который искала игра
    public move(): void {
        this.x += this.speed;
    }

    public isAlive(): boolean {
        return this.currentHealth > 0;
    }

    // И этот метод нужен для отрисовки цвета
    public getHealthPercent(): number {
        return this.currentHealth / this.maxHealth;
    }
}