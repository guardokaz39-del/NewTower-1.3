export class Projectile {
    constructor() {
        this.reset();
    }

    // Инициализация (вместо создания нового через new)
    init(x, y, target, stats) {
        this.x = x; this.y = y; 
        this.radius = 4; 
        this.alive = true;
        this.damage = stats.dmg; 
        this.speed = stats.speed;
        this.color = stats.color; 
        this.effects = stats.effects;
        this.pierce = stats.pierce || 0; 
        this.hitList = [];
        
        const angle = Math.atan2(target.y - y, target.x - x);
        this.vx = Math.cos(angle) * this.speed; 
        this.vy = Math.sin(angle) * this.speed;
        this.life = 100; // Жизнь в кадрах (будем конвертировать)
    }

    reset() {
        this.x = 0; this.y = 0;
        this.hitList = [];
        this.alive = false;
    }

    update(dt, enemies, game) {
        // Нормализация скорости: умножаем на 60, чтобы сохранить баланс конфига
        const timeScale = dt * 60;

        this.x += this.vx * timeScale; 
        this.y += this.vy * timeScale; 
        
        this.life -= timeScale;
        
        if(this.life <= 0 || this.x<0 || this.x>game.canvas.width || this.y<0 || this.y>game.canvas.height) {
            this.alive = false;
        }

        for(let e of enemies) {
            if(this.hitList.includes(e)) continue;
            // Простая проверка коллизии
            if (Math.hypot(e.x - this.x, e.y - this.y) < (e.radius + this.radius)) {
                this.hit(e, game);
                if(this.pierce > 0) { 
                    this.pierce--; 
                    this.hitList.push(e); 
                } else { 
                    this.alive = false; 
                    break; 
                }
            }
        }
    }

    hit(target, game) {
        const splash = this.effects.find(e => e.type === 'splash');
        if (splash) {
            game.addEffect({type: 'explosion', x: target.x, y: target.y, radius: splash.radius, life: 20});
            game.enemies.forEach(o => { 
                if(Math.hypot(o.x - target.x, o.y - target.y) < splash.radius) 
                    o.takeDamage(this.damage, game); 
            });
        } else {
            target.takeDamage(this.damage, game);
        }
        
        const slow = this.effects.find(e => e.type === 'slow');
        if (slow) target.applyStatus('slow', slow.dur);
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color; 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); 
        ctx.fill();
    }
}