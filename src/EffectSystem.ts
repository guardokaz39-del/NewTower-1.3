export interface IEffect {
    type: 'explosion' | 'text' | 'particle' | 'scan' | 'debris';
    x: number;
    y: number;
    life: number;     
    maxLife?: number; 
    
    // Параметры
    radius?: number;
    size?: number;    // Для частиц
    color?: string;
    text?: string;
    vx?: number;
    vy?: number;
    rotation?: number; // Вращение частицы
    vRot?: number;     // Скорость вращения
}

export class EffectSystem {
    private effects: IEffect[] = [];
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public add(effect: IEffect) {
        if (!effect.maxLife) effect.maxLife = effect.life;
        this.effects.push(effect);
    }

    public update() {
        this.effects.forEach(e => {
            e.life--;

            if (e.type === 'particle' || e.type === 'text' || e.type === 'debris') {
                if (e.vx) e.x += e.vx;
                if (e.vy) e.y += e.vy;
                
                // Физика для осколков (замедление)
                if (e.type === 'debris') {
                    if (e.vx) e.vx *= 0.95;
                    if (e.vy) e.vy *= 0.95;
                    if (e.rotation !== undefined && e.vRot) e.rotation += e.vRot;
                }
            }
        });

        this.effects = this.effects.filter(e => e.life > 0);
    }

    public draw() {
        this.effects.forEach(e => {
            const progress = e.life / (e.maxLife || 1); 

            this.ctx.save();
            this.ctx.globalAlpha = progress;

            if (e.type === 'explosion') {
                this.ctx.fillStyle = e.color || 'orange';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.radius || 30, 0, Math.PI * 2);
                this.ctx.fill();
            }
            else if (e.type === 'text') {
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.font = "bold 16px Arial";
                this.ctx.textAlign = "center";
                this.ctx.fillText(e.text || '', e.x, e.y);
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(e.text || '', e.x, e.y);
            }
            else if (e.type === 'particle') {
                // Искра (круг)
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.radius || 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            else if (e.type === 'debris') {
                // Осколок (квадрат), который крутится
                this.ctx.translate(e.x, e.y);
                if (e.rotation) this.ctx.rotate(e.rotation);
                this.ctx.fillStyle = e.color || '#fff';
                const s = e.size || 4;
                this.ctx.fillRect(-s/2, -s/2, s, s);
            }

            this.ctx.restore();
        });
    }
}