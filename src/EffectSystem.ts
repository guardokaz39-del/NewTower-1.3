export interface IEffect {
    type: 'explosion' | 'text' | 'particle' | 'scan';
    x: number;
    y: number;
    life: number;     // Сколько кадров живет
    maxLife?: number; // Для анимации прозрачности
    
    // Опциональные параметры
    radius?: number;
    color?: string;
    text?: string;
    vx?: number;
    vy?: number;
}

export class EffectSystem {
    private effects: IEffect[] = [];
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    // Добавить эффект (взрыв, текст и т.д.)
    public add(effect: IEffect) {
        // Устанавливаем maxLife для анимации, если не задано
        if (!effect.maxLife) effect.maxLife = effect.life;
        this.effects.push(effect);
    }

    public update() {
        // Обновляем состояние каждого эффекта
        this.effects.forEach(e => {
            e.life--;

            if (e.type === 'particle' || e.type === 'text') {
                if (e.vx) e.x += e.vx;
                if (e.vy) e.y += e.vy;
            }
        });

        // Удаляем мертвые эффекты
        this.effects = this.effects.filter(e => e.life > 0);
    }

    public draw() {
        this.effects.forEach(e => {
            const progress = e.life / (e.maxLife || 1); // От 1 до 0

            this.ctx.save();
            
            if (e.type === 'explosion') {
                // Взрыв: круг, который становится прозрачным
                this.ctx.fillStyle = e.color || 'orange';
                this.ctx.globalAlpha = progress;
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.radius || 30, 0, Math.PI * 2);
                this.ctx.fill();
            }
            else if (e.type === 'text') {
                // Всплывающий текст (урон, золото)
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.font = "bold 16px Arial";
                this.ctx.globalAlpha = progress;
                this.ctx.fillText(e.text || '', e.x, e.y);
                // Обводка для читаемости
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(e.text || '', e.x, e.y);
            }
            else if (e.type === 'particle') {
                // Мелкие частицы
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.globalAlpha = progress;
                this.ctx.fillRect(e.x, e.y, 4, 4);
            }

            this.ctx.restore();
        });
    }
}